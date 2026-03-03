from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "account", "city", "state", "obra_entrega_prevista", "updated_at")
    search_fields = ("name", "account__name")
    list_filter = ("state",)
    autocomplete_fields = ("account",)