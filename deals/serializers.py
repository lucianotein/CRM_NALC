# deals/serializers.py
from django.utils import timezone
from rest_framework import serializers

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal
from projects.models import Project


class DealSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    projects = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Project.objects.all(),
        required=False,
    )
    project_names = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ("owner", "created_at", "updated_at", "last_contact_at")

    def get_project_names(self, obj):
        return [p.name for p in obj.projects.all()]

    def validate(self, attrs):
        account = attrs.get("account") or getattr(self.instance, "account", None)
        projects = attrs.get("projects", None)

        if projects is not None and account is not None:
            for p in projects:
                if p.account_id != account.id:
                    raise serializers.ValidationError(
                        {"projects": "Todos os empreendimentos devem pertencer à construtora informada."}
                    )

        return attrs

    def create(self, validated_data):
        projects = validated_data.pop("projects", [])
        validated_data.pop("project", None)  # evita duplicidade

        first_project = projects[0] if projects else None

        instance = Deal.objects.create(
            **validated_data,
            project=first_project,
        )

        if projects:
            instance.projects.set(projects)

        return instance

    def update(self, instance, validated_data):
        projects = validated_data.pop("projects", None)
        validated_data.pop("project", None)  # compatibilidade temporária

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if projects is not None:
            instance.project = projects[0] if projects else None

        instance.save()

        if projects is not None:
            instance.projects.set(projects)

        return instance


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = "__all__"
        read_only_fields = ("created_at", "created_by")

    def validate(self, attrs):
        now = timezone.now()

        scheduled_for = attrs.get("scheduled_for")
        status = attrs.get("status")
        occurred_at = attrs.get("occurred_at")

        # Se veio agendamento futuro e não veio status (ou veio DONE), força PENDING
        if scheduled_for and scheduled_for > now:
            if not status or status == Activity.Status.DONE:
                attrs["status"] = Activity.Status.PENDING

        # Se marcar DONE e não veio occurred_at, seta now
        if attrs.get("status") == Activity.Status.DONE and occurred_at is None:
            attrs["occurred_at"] = now

        return attrs


class DealAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    class Meta:
        model = DealAttachment
        fields = "__all__"
        read_only_fields = ("created_at", "created_by")


class DealBarterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealBarterItem
        fields = "__all__"
        read_only_fields = ("created_at",)


class ProposalSerializer(serializers.ModelSerializer):
    projects = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Project.objects.all(), required=False
    )

    class Meta:
        model = Proposal
        fields = "__all__"
        read_only_fields = ("created_at", "created_by")

    def _validate_year_month(self, value, field_label):
        if value in (None, ""):
            return ""

        value = str(value).strip()

        if len(value) != 7 or value[4] != "-":
            raise serializers.ValidationError(
                f"{field_label} deve estar no formato YYYY-MM."
            )

        ano = value[:4]
        mes = value[5:7]

        if not (ano.isdigit() and mes.isdigit()):
            raise serializers.ValidationError(
                f"{field_label} deve estar no formato YYYY-MM."
            )

        mes_int = int(mes)
        if mes_int < 1 or mes_int > 12:
            raise serializers.ValidationError(f"{field_label} com mês inválido.")

        return value

    def validate_obra_entrega_prevista(self, value):
        return self._validate_year_month(value, "Entrega da obra")

    def validate_elevador_entrega_prevista(self, value):
        return self._validate_year_month(value, "Entrega dos elevadores")