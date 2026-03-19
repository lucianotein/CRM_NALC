from rest_framework import serializers

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal


class DealSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    project_names = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ["owner", "created_by"]

    def get_owner_name(self, obj):
        if not obj.owner:
            return None
        return obj.owner.get_full_name() or obj.owner.username

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username

    def get_account_name(self, obj):
        if not obj.account:
            return None
        return obj.account.name

    def get_project_names(self, obj):
        return list(obj.projects.values_list("name", flat=True))


class ActivitySerializer(serializers.ModelSerializer):
    deal_title = serializers.SerializerMethodField()
    deal_account_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]

    def get_deal_title(self, obj):
        return obj.deal.title if obj.deal else None

    def get_deal_account_name(self, obj):
        if obj.deal and obj.deal.account:
            return obj.deal.account.name
        return None

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username


class DealAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DealAttachment
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class DealBarterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealBarterItem
        fields = "__all__"


class ProposalSerializer(serializers.ModelSerializer):
    project_names = serializers.SerializerMethodField()
    attachment = serializers.SerializerMethodField()

    class Meta:
        model = Proposal
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]

    def get_project_names(self, obj):
        return list(obj.projects.values_list("name", flat=True))

    def get_attachment(self, obj):
        # Tenta via FK direto (novos uploads)
        att = obj.attachments.order_by("-created_at").first()
        if not att and obj.version_label:
            # Fallback para dados legados: busca por deal + version_label
            att = DealAttachment.objects.filter(
                deal=obj.deal,
                type=DealAttachment.Type.PROPOSTA,
                version_label=obj.version_label,
            ).order_by("-created_at").first()
        if not att:
            return None
        return DealAttachmentSerializer(att, context=self.context).data