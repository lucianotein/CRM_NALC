#/projects/models.py
from django.db import models

class Project(models.Model):
    account = models.ForeignKey("accounts.Account", on_delete=models.CASCADE, related_name="projects")
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=120, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")

    obra_entrega_prevista = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name