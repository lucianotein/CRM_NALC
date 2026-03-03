from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Project
from .serializers import ProjectSerializer

class ProjectViewSet(ModelViewSet):
    queryset = Project.objects.select_related("account").all().order_by("-updated_at")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]