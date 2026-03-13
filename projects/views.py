from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
import logging

from .models import Project
from .serializers import ProjectSerializer

logger = logging.getLogger(__name__)


class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.select_related("account").all().order_by("-updated_at")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.select_related("account").all().order_by("-updated_at")

        if self.request.user.is_staff or self.request.user.is_superuser:
            return qs

        return qs.filter(account__owner=self.request.user)

    def create(self, request, *args, **kwargs):
        logger.warning("PROJECT CREATE request.data = %s", request.data)
        logger.warning(
            "PROJECT serializer field type = %s",
            type(self.get_serializer().fields["obra_entrega_prevista"]).__name__,
        )
        logger.warning(
            "PROJECT serializer field repr = %s",
            repr(self.get_serializer().fields["obra_entrega_prevista"]),
        )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        account = serializer.validated_data.get("account")
        if not account:
            raise PermissionDenied("account é obrigatório")

        if not (self.request.user.is_staff or self.request.user.is_superuser):
            if account.owner_id != self.request.user.id:
                raise PermissionDenied(
                    "Você não pode criar empreendimentos em uma construtora de outro usuário."
                )

        serializer.save()