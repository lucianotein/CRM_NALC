# deals/views.py
from datetime import datetime, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal
from .serializers import (
    DealSerializer,
    ActivitySerializer,
    DealAttachmentSerializer,
    DealBarterItemSerializer,
    ProposalSerializer,
)


class DealViewSet(ModelViewSet):
    queryset = Deal.objects.select_related("account", "project").order_by("-id")
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # ✅ só do usuário logado
        return (
            Deal.objects.select_related("account", "project")
            .filter(owner=self.request.user)
            .order_by("-id")
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ActivityViewSet(ModelViewSet):
    queryset = Activity.objects.all()  # ✅ necessário pro router descobrir basename
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Activity.objects.select_related("deal", "created_by")
            .filter(deal__owner=self.request.user)
            .order_by("-created_at")
        )

        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

        # ✅ filtro opcional por status: ?status=PENDING
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        return qs

    def perform_create(self, serializer):
        deal = serializer.validated_data.get("deal")
        if deal and deal.owner_id != self.request.user.id:
            raise PermissionDenied(
                "Você não pode registrar atividades em um Deal que não é seu."
            )
        serializer.save(created_by=self.request.user)

    # =========================================================
    # ✅ COMPROMISSOS DO DIA
    # GET /api/activities/commitments/?date=YYYY-MM-DD
    # - se date não vier: hoje (timezone local do servidor)
    # - retorna: status=PENDING e scheduled_for dentro do dia
    # =========================================================
    @action(detail=False, methods=["get"], url_path="commitments")
    def commitments(self, request):
        date_str = request.query_params.get("date") or ""
        d = parse_date(date_str) if date_str else None
        if not d:
            d = timezone.localdate()

        start = timezone.make_aware(datetime(d.year, d.month, d.day, 0, 0, 0))
        end = start + timedelta(days=1)

        qs = (
            self.get_queryset()
            .filter(
                status=Activity.Status.PENDING,
                scheduled_for__isnull=False,
                scheduled_for__gte=start,
                scheduled_for__lt=end,
            )
            .order_by("scheduled_for")
        )

        return Response(self.get_serializer(qs, many=True).data)

    # =========================================================
    # ✅ MARCAR COMO CONCLUÍDA
    # POST /api/activities/{id}/mark-done/
    # - seta status DONE
    # - se occurred_at vazio, preenche agora
    # - limpa scheduled_for (opcional) -> vou manter, pq ajuda a histórico
    # =========================================================
    @action(detail=True, methods=["post"], url_path="mark-done")
    def mark_done(self, request, pk=None):
        obj: Activity = self.get_object()

        obj.status = Activity.Status.DONE
        if not obj.occurred_at:
            obj.occurred_at = timezone.now()

        # ✅ importante: compromisso concluído não fica mais agendado
        obj.scheduled_for = None

        obj.save(update_fields=["status", "occurred_at", "scheduled_for"])
        return Response(self.get_serializer(obj).data)

    # =========================================================
    # ✅ MARCAR COMO PENDENTE (REABRIR)
    # POST /api/activities/{id}/mark-pending/
    # - útil se o usuário clicou errado
    # =========================================================
    @action(detail=True, methods=["post"], url_path="mark-pending")
    def mark_pending(self, request, pk=None):
        obj: Activity = self.get_object()

        obj.status = Activity.Status.PENDING
        if not obj.scheduled_for:
            obj.scheduled_for = timezone.now() + timedelta(hours=1)

        obj.occurred_at = None
        obj.save(update_fields=["status", "scheduled_for", "occurred_at"])
        return Response(self.get_serializer(obj).data)


    @action(detail=True, methods=["post"], url_path="reschedule")
    def reschedule(self, request, pk=None):
        obj: Activity = self.get_object()

        scheduled_for = request.data.get("scheduled_for")
        note = (request.data.get("note") or "").strip()

        if not scheduled_for:
            return Response(
                {"detail": "scheduled_for é obrigatório."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        # DRF geralmente manda ISO. Vamos tentar converter.
        try:
            dt = timezone.datetime.fromisoformat(scheduled_for.replace("Z", "+00:00"))
        except Exception:
            return Response(
                {"detail": "scheduled_for inválido. Envie ISO (ex: 2026-03-15T18:00:00Z)."},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())

        obj.status = Activity.Status.PENDING
        obj.scheduled_for = dt
        obj.occurred_at = None

        # ✅ comentário: você escolhe onde guardar.
        # Eu sugiro concatenar em notes (mantém histórico simples).
        if note:
            prefix = f"[REABERTO {timezone.localtime().strftime('%d/%m/%Y %H:%M')}] "
            obj.notes = (prefix + note + "\n\n" + (obj.notes or "")).strip()

        obj.save(update_fields=["status", "scheduled_for", "occurred_at", "notes"])
        return Response(self.get_serializer(obj).data)


class DealAttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = DealAttachmentSerializer
    permission_classes = [IsAuthenticated]
    queryset = DealAttachment.objects.all()

    def get_queryset(self):
        qs = (
            DealAttachment.objects.select_related("deal", "created_by")
            .filter(deal__owner=self.request.user)
            .order_by("-created_at")
        )
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        return qs

    def perform_create(self, serializer):
        deal = serializer.validated_data.get("deal")
        if deal.owner_id != self.request.user.id:
            raise PermissionDenied(
                "Você não pode anexar arquivos em um Deal que não é seu."
            )
        serializer.save(created_by=self.request.user)


class DealBarterItemViewSet(ModelViewSet):
    queryset = DealBarterItem.objects.select_related("deal").all().order_by("-created_at")
    serializer_class = DealBarterItemSerializer
    permission_classes = [IsAuthenticated]


class ProposalViewSet(ModelViewSet):
    queryset = Proposal.objects.all().order_by("-created_at")
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            super()
            .get_queryset()
            .select_related("deal", "created_by")
            .prefetch_related("projects")
            .filter(deal__owner=self.request.user)
        )
        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


