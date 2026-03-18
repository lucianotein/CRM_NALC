from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from deals.models import Deal, Activity

from .models import Account, ContactPerson
from .serializers import (
    AccountSerializer,
    ContactPersonSerializer,
    CRMUserSerializer,
)
from .permissions import is_crm_admin, get_user_role

User = get_user_model()


class CRMUserViewSet(ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = CRMUserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]



class AccountViewSet(ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Account.objects.all().order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(
            owner=self.request.user,
            comercial_responsavel=self.request.user,
        )

    def perform_destroy(self, instance):
        can_delete = is_crm_admin(self.request.user) or instance.owner_id == self.request.user.id

        if not can_delete:
            raise PermissionDenied(
                "Apenas o criador da construtora ou um administrador pode excluí-la."
            )

        instance.delete()

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        account = self.get_object()

        current_comercial = getattr(account, "comercial_responsavel", None)

        # Pode transferir:
        # - admin do CRM
        # - comercial responsável atual
        if not is_crm_admin(request.user):
            if not current_comercial or current_comercial.id != request.user.id:
                raise PermissionDenied(
                    "Você não tem permissão para transferir esta construtora."
                )

        new_comercial_id = request.data.get("new_comercial_id")
        if not new_comercial_id:
            return Response(
                {"detail": "new_comercial_id é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_comercial_id = int(new_comercial_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "new_comercial_id inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            new_comercial = User.objects.get(id=new_comercial_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "Usuário informado não foi encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if get_user_role(new_comercial) != "COMERCIAL":
            return Response(
                {"detail": "A construtora só pode ser transferida para um usuário com perfil COMERCIAL."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_comercial and current_comercial.id == new_comercial.id:
            return Response(
                {"detail": "Esta construtora já está atribuída a esse comercial."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Atualiza o comercial responsável da construtora
        account.comercial_responsavel = new_comercial
        account.save(update_fields=["comercial_responsavel", "updated_at"])

        # Atualiza apenas oportunidades abertas
        transferred_count = (
            Deal.objects.filter(account=account)
            .exclude(stage__in=[Deal.Stage.FECHADO_GANHO, Deal.Stage.PERDIDO])
            .update(owner=new_comercial)
        )

        return Response(
            {
                "detail": "Construtora transferida com sucesso.",
                "account_id": account.id,
                "account_name": account.name,
                "new_comercial_id": new_comercial.id,
                "new_comercial_username": new_comercial.username,
                "transferred_open_deals": transferred_count,
            },
            status=status.HTTP_200_OK,
        )


class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_crm_admin(request.user):
            raise PermissionDenied("Acesso restrito a administradores.")

        days = max(1, min(int(request.query_params.get("days", 10)), 365))
        since = timezone.now() - timedelta(days=days)

        users = User.objects.select_related("profile").order_by("first_name", "username")

        result = []
        for user in users:
            acts_period = Activity.objects.filter(created_by=user, created_at__gte=since)

            by_type = {}
            for t in Activity.Type.values:
                by_type[t] = acts_period.filter(type=t).count()

            last_act = (
                Activity.objects.filter(created_by=user)
                .order_by("-created_at")
                .values_list("created_at", flat=True)
                .first()
            )

            result.append({
                "id": user.id,
                "username": user.username,
                "full_name": user.get_full_name() or user.username,
                "role": get_user_role(user),
                "stats": {
                    "activities_total": acts_period.count(),
                    "activities_by_type": by_type,
                    "activities_done": acts_period.filter(status=Activity.Status.DONE).count(),
                    "activities_pending": acts_period.filter(status=Activity.Status.PENDING).count(),
                    "deals_total": Deal.objects.filter(owner=user).count(),
                    "accounts_created": Account.objects.filter(owner=user).count(),
                    "accounts_comercial": Account.objects.filter(comercial_responsavel=user).count(),
                    "last_activity_at": last_act.isoformat() if last_act else None,
                },
            })

        return Response({"days": days, "since": since.isoformat(), "users": result})


class ContactPersonViewSet(ModelViewSet):
    queryset = ContactPerson.objects.all()
    serializer_class = ContactPersonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ContactPerson.objects.select_related("account").all().order_by("-created_at")

    def perform_create(self, serializer):
        account = serializer.validated_data.get("account")
        if not account:
            raise PermissionDenied("account é obrigatório")

        serializer.save()