#accounts/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Account, ContactPerson

User = get_user_model()

class CRMUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "full_name", "role")

    def get_full_name(self, obj):
        return obj.get_full_name() or ""

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        return getattr(profile, "role", "COMERCIAL")


class AccountSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    comercial_responsavel_name = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = ("owner", "created_at", "updated_at")

    def get_owner_name(self, obj):
        if not obj.owner:
            return None
        return obj.owner.get_full_name() or obj.owner.username

    def get_comercial_responsavel_name(self, obj):
        if not obj.comercial_responsavel:
            return None
        return obj.comercial_responsavel.get_full_name() or obj.comercial_responsavel.username


class ContactPersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactPerson
        fields = "__all__"
        read_only_fields = ("created_at",)

    def validate_account(self, account):
        return account