# deals/serializers.py
from django.utils import timezone
from rest_framework import serializers

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal
from projects.models import Project


class DealSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ("owner", "created_at", "updated_at", "last_contact_at")


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