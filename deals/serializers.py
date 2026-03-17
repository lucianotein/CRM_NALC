from rest_framework import serializers

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal


class DealSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

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


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = "__all__"


class DealAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealAttachment
        fields = "__all__"


class DealBarterItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealBarterItem
        fields = "__all__"


class ProposalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proposal
        fields = "__all__"