from django.contrib.auth import get_user_model

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from deals.models import Deal

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