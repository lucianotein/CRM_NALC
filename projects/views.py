from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Project
from .serializers import ProjectSerializer


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.select_related("account").all().order_by("-updated_at")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.select_related("account").all().order_by("-updated_at")

        # ✅ staff/admin vê tudo (opcional)
        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs

        # ✅ só projects de accounts do usuário
        return qs.filter(account__owner=self.request.user)

    def perform_create(self, serializer):
        account = serializer.validated_data.get("account")
        if not account:
            raise PermissionDenied("account é obrigatório")

        # ✅ impede criar project em account de outro usuário
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            if account.owner_id != self.request.user.id:
                raise PermissionDenied(
                    "Você não pode criar empreendimentos em uma construtora de outro usuário."
                )

        serializer.save()