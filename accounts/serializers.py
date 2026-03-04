from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import Account, ContactPerson


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = ("owner", "created_at", "updated_at")


class ContactPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactPerson
        fields = "__all__"
        read_only_fields = ("created_at",)

    def validate_account(self, account):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return account

        user = request.user
        if user.is_staff or user.is_superuser:
            return account

        if account.owner_id != user.id:
            raise ValidationError("Você não pode usar uma construtora de outro usuário.")
        return account