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
    class Meta:
        model = DealAttachment
        fields = "__all__"


class DealBarterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealBarterItem
        fields = "__all__"


class ProposalSerializer(serializers.ModelSerializer):
    project_names = serializers.SerializerMethodField()

    class Meta:
        model = Proposal
        fields = "__all__"

    def get_project_names(self, obj):
        return list(obj.projects.values_list("name", flat=True))