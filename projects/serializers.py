from rest_framework import serializers
from .models import Project
import re
import logging

logger = logging.getLogger(__name__)


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at")

    def validate_account(self, account):
        return account

    def validate_obra_entrega_prevista(self, value):
        logger.warning("validate_obra_entrega_prevista recebeu: %r", value)

        if value in (None, ""):
            return ""

        if not re.match(r"^\d{4}-\d{2}$", value):
            raise serializers.ValidationError(
                "Informe a entrega prevista no formato YYYY-MM."
            )

        ano, mes = value.split("-")
        mes_int = int(mes)

        if mes_int < 1 or mes_int > 12:
            raise serializers.ValidationError("Mês inválido.")

        return value