from django.contrib import admin
from .models import Account, ContactPerson

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("name", "cnpj", "city", "state", "is_active", "owner", "updated_at")
    search_fields = ("name", "cnpj")
    list_filter = ("is_active", "state")

    def save_model(self, request, obj, form, change):
        if not obj.owner_id:
            obj.owner = request.user
        super().save_model(request, obj, form, change)

@admin.register(ContactPerson)
class ContactPersonAdmin(admin.ModelAdmin):
    list_display = ("name", "account", "role", "phone", "email", "is_primary", "created_at")
    search_fields = ("name", "account__name", "phone", "email")
    list_filter = ("is_primary",)