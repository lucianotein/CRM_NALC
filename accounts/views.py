from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Account, ContactPerson
from .serializers import AccountSerializer, ContactPersonSerializer


class AccountViewSet(ModelViewSet):
    queryset = Account.objects.all()  # ✅ necessário pro router
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Account.objects.all().order_by("-updated_at")

        # ✅ staff/admin vê tudo (opcional)
        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs

        # ✅ usuário normal: só o que ele criou
        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ContactPersonViewSet(ModelViewSet):
    queryset = ContactPerson.objects.all()  # ✅ necessário pro router
    serializer_class = ContactPersonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ContactPerson.objects.select_related("account").all().order_by("-created_at")

        # ✅ staff/admin vê tudo (opcional)
        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs

        # ✅ só contatos de accounts do usuário
        return qs.filter(account__owner=self.request.user)

    def perform_create(self, serializer):
        account = serializer.validated_data.get("account")
        if not account:
            raise PermissionDenied("account é obrigatório")

        # ✅ impede criar contato em account de outro usuário
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            if account.owner_id != self.request.user.id:
                raise PermissionDenied(
                    "Você não pode adicionar contatos em uma construtora de outro usuário."
                )

        serializer.save()