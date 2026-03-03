from rest_framework import serializers
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