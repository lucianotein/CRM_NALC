from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Account, ContactPerson, UserProfile

User = get_user_model()


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "cnpj", "owner", "is_active", "created_at")
    search_fields = ("name", "cnpj", "owner__username")
    list_filter = ("is_active", "created_at")


@admin.register(ContactPerson)
class ContactPersonAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "account", "role", "phone", "email", "is_primary")
    search_fields = ("name", "account__name", "email", "phone")
    list_filter = ("is_primary",)


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    verbose_name_plural = "Perfil CRM"
    fk_name = "user"


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)