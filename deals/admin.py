from django.contrib import admin
from .models import Deal, DealBarterItem, DealAttachment, Activity

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("title", "stage", "account", "project", "owner", "elevador_entrega_prevista", "last_contact_at", "updated_at")
    search_fields = ("title", "account__name", "project__name")
    list_filter = ("stage",)
    autocomplete_fields = ("account", "project")
    date_hierarchy = "updated_at"

    def save_model(self, request, obj, form, change):
        if not obj.owner_id:
            obj.owner = request.user
        super().save_model(request, obj, form, change)

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("deal", "type", "status", "occurred_at", "scheduled_for", "created_at", "created_by")
    list_filter = ("type", "status")
    search_fields = ("deal__title", "notes", "result")
    autocomplete_fields = ("deal",)

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(DealAttachment)
class DealAttachmentAdmin(admin.ModelAdmin):
    list_display = ("deal", "type", "version_label", "created_at", "created_by")
    list_filter = ("type",)
    autocomplete_fields = ("deal",)

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(DealBarterItem)
class DealBarterItemAdmin(admin.ModelAdmin):
    list_display = ("deal", "label", "kind", "valor_estimado", "created_at")
    search_fields = ("deal__title", "label")
    autocomplete_fields = ("deal",)