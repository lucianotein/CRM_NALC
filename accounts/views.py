from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import Account, ContactPerson
from .serializers import AccountSerializer, ContactPersonSerializer

class AccountViewSet(ModelViewSet):
    queryset = Account.objects.all().order_by("-updated_at")
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ContactPersonViewSet(ModelViewSet):
    queryset = ContactPerson.objects.select_related("account").all().order_by("-created_at")
    serializer_class = ContactPersonSerializer
    permission_classes = [IsAuthenticated]