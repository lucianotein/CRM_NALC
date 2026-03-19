# deals/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone


class Deal(models.Model):
    class Stage(models.TextChoices):
        LEAD = "LEAD", "Lead"
        CONTATO = "CONTATO", "Contato"
        PROPOSTA = "PROPOSTA", "Proposta"
        NEGOCIACAO = "NEGOCIACAO", "Negociação"
        FECHADO_GANHO = "FECHADO_GANHO", "Fechado (Ganho)"
        PERDIDO = "PERDIDO", "Perdido"
        PAUSADO = "PAUSADO", "Pausado"

    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="deals"
    )
    project = models.ForeignKey(
        "projects.Project",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="deals",
    )

    projects = models.ManyToManyField(
        "projects.Project",
        blank=True,
        related_name="multi_deals",
    )

    title = models.CharField(max_length=220)
    stage = models.CharField(
        max_length=20, choices=Stage.choices, default=Stage.LEAD, db_index=True
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_deals"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="deals_created",
        null=True,
        blank=True,
    )

    elevador_entrega_prevista = models.DateField(null=True, blank=True)

    valor_total = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    valor_entrada = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )

    tem_permuta = models.BooleanField(default=False)
    permuta_tipo = models.CharField(
        max_length=20, blank=True, default=""
    )  # parcial/total

    tipo_elevador = models.CharField(max_length=120, blank=True, default="")
    paradas = models.PositiveIntegerField(null=True, blank=True)
    quantidade_elevadores = models.PositiveIntegerField(null=True, blank=True)

    next_action_at = models.DateTimeField(null=True, blank=True, db_index=True)
    next_action_note = models.CharField(max_length=220, blank=True, default="")
    last_contact_at = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class DealBarterItem(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="barter_items")
    label = models.CharField(max_length=220)
    kind = models.CharField(max_length=60, blank=True, default="APARTAMENTO")
    valor_estimado = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)


def deal_attachment_upload_to(instance, filename: str) -> str:
    return f"deals/{instance.deal_id}/{filename}"


class DealAttachment(models.Model):
    class Type(models.TextChoices):
        PROPOSTA = "PROPOSTA", "Proposta"
        CONTRATO = "CONTRATO", "Contrato"
        MEMORIAL = "MEMORIAL", "Memorial"
        OUTRO = "OUTRO", "Outro"

    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="attachments")
    proposal = models.ForeignKey(
        "deals.Proposal",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attachments",
    )
    type = models.CharField(
        max_length=20, choices=Type.choices, default=Type.PROPOSTA, db_index=True
    )
    version_label = models.CharField(max_length=20, blank=True, default="")
    file = models.FileField(upload_to=deal_attachment_upload_to)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class Activity(models.Model):
    class Type(models.TextChoices):
        VISITA = "VISITA", "Visita"
        WHATSAPP = "WHATSAPP", "WhatsApp"
        LIGACAO = "LIGACAO", "Ligação"
        REUNIAO = "REUNIAO", "Reunião"
        EMAIL = "EMAIL", "E-mail"
        TAREFA = "TAREFA", "Tarefa"

    class Status(models.TextChoices):
        DONE = "DONE", "Feito"
        PENDING = "PENDING", "Pendente"
        CANCELED = "CANCELED", "Cancelado"

    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="activities")

    type = models.CharField(max_length=20, choices=Type.choices, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DONE, db_index=True
    )

    # Quando aconteceu (ou quando foi concluído)
    occurred_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Quando está agendado (compromisso)
    scheduled_for = models.DateTimeField(null=True, blank=True, db_index=True)

    result = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_activities",
    )

    def save(self, *args, **kwargs):
        """
        Regras do CRM:
        - Se scheduled_for está no futuro e status não é CANCELED, vira PENDING automaticamente.
        - Se status = DONE e occurred_at vazio, seta occurred_at = now.
        - Se DONE e não é TAREFA, atualiza Deal.last_contact_at.
        - Se PENDING com scheduled_for, atualiza Deal.next_action_at e next_action_note.
        """
        now = timezone.now()

        # 1) Se tem agendamento futuro, vira pendente automaticamente (a não ser que esteja cancelado)
        if self.scheduled_for and self.scheduled_for > now and self.status != self.Status.CANCELED:
            self.status = self.Status.PENDING

        # 2) Se concluído, garante occurred_at
        if self.status == self.Status.DONE and self.occurred_at is None:
            self.occurred_at = now

        super().save(*args, **kwargs)

        # 3) Atualiza "último contato" do deal quando concluído (exceto tarefa)
        if self.status == self.Status.DONE and self.type != self.Type.TAREFA and self.occurred_at:
            Deal.objects.filter(id=self.deal_id).update(last_contact_at=self.occurred_at)

        # 4) Atualiza "próxima ação" do deal quando pendente
        if self.status == self.Status.PENDING and self.scheduled_for:
            note = (self.result or "").strip()
            if not note:
                note = (self.notes or "").strip()

            if note:
                note = note.replace("\n", " ")
                note = note[:220]

            Deal.objects.filter(id=self.deal_id).update(
                next_action_at=self.scheduled_for,
                next_action_note=note or "",
            )


class Proposal(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        SENT = "SENT", "Enviada"
        ACCEPTED = "ACCEPTED", "Aceita"
        REJECTED = "REJECTED", "Recusada"

    deal = models.ForeignKey("deals.Deal", on_delete=models.CASCADE, related_name="proposals")

    # ✅ 1 ou muitos empreendimentos
    projects = models.ManyToManyField("projects.Project", blank=True, related_name="proposals")

    version_label = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)

    valor_total = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    valor_entrada = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    tem_permuta = models.BooleanField(default=False)
    permuta_tipo = models.CharField(max_length=20, blank=True, default="")
    valor_permuta = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)

    obra_entrega_prevista = models.CharField(max_length=7, blank=True, default="")
    elevador_entrega_prevista = models.CharField(max_length=7, blank=True, default="")

    notes = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)