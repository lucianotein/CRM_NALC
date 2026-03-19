from datetime import datetime, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets, status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import is_crm_admin

from .models import Deal, Activity, DealAttachment, DealBarterItem, Proposal
from .serializers import (
    DealSerializer,
    ActivitySerializer,
    DealAttachmentSerializer,
    DealBarterItemSerializer,
    ProposalSerializer,
)


class DealViewSet(ModelViewSet):
    queryset = (
        Deal.objects.select_related("account", "project", "owner", "created_by")
        .prefetch_related("projects")
        .order_by("-id")
    )
    serializer_class = DealSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Deal.objects.select_related("account", "project", "owner", "created_by")
            .prefetch_related("projects")
            .order_by("-id")
        )

        if is_crm_admin(self.request.user):
            return qs

        return qs.filter(owner=self.request.user)

    def perform_create(self, serializer):
        account = serializer.validated_data.get("account")
        if not account:
            raise PermissionDenied("account é obrigatório")

        comercial_responsavel = getattr(account, "comercial_responsavel", None)
        if not comercial_responsavel:
            raise PermissionDenied("A construtora precisa ter um comercial responsável.")

        if not is_crm_admin(self.request.user) and comercial_responsavel.id != self.request.user.id:
            raise PermissionDenied(
                "Esta construtora está atribuída a outro comercial. Solicite a transferência antes de cadastrar uma oportunidade."
            )

        serializer.save(
            owner=comercial_responsavel,
            created_by=self.request.user,
        )


class ActivityViewSet(ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Activity.objects.select_related(
            "deal", "deal__account", "created_by"
        ).order_by("-created_at")

        if not is_crm_admin(self.request.user):
            qs = qs.filter(deal__owner=self.request.user)

        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        activity_type = self.request.query_params.get("type")
        if activity_type:
            qs = qs.filter(type=activity_type)

        created_by = self.request.query_params.get("created_by")
        if created_by and is_crm_admin(self.request.user):
            qs = qs.filter(created_by_id=created_by)

        since = self.request.query_params.get("since")
        if since:
            qs = qs.filter(created_at__gte=since)

        return qs

    def perform_create(self, serializer):
        deal = serializer.validated_data.get("deal")
        if deal and not is_crm_admin(self.request.user) and deal.owner_id != self.request.user.id:
            raise PermissionDenied(
                "Você não pode registrar atividades em um Deal que não é seu."
            )
        serializer.save(created_by=self.request.user)

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

    @action(detail=True, methods=["post"], url_path="mark-done")
    def mark_done(self, request, pk=None):
        obj: Activity = self.get_object()

        obj.status = Activity.Status.DONE
        if not obj.occurred_at:
            obj.occurred_at = timezone.now()

        obj.scheduled_for = None

        obj.save(update_fields=["status", "occurred_at", "scheduled_for"])
        return Response(self.get_serializer(obj).data)

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
        qs = DealAttachment.objects.select_related("deal", "created_by").order_by("-created_at")

        if not is_crm_admin(self.request.user):
            qs = qs.filter(deal__owner=self.request.user)

        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

        return qs

    def perform_create(self, serializer):
        deal = serializer.validated_data.get("deal")
        if not is_crm_admin(self.request.user) and deal.owner_id != self.request.user.id:
            raise PermissionDenied(
                "Você não pode anexar arquivos em um Deal que não é seu."
            )
        serializer.save(created_by=self.request.user)


class DealBarterItemViewSet(ModelViewSet):
    queryset = DealBarterItem.objects.select_related("deal").all().order_by("-created_at")
    serializer_class = DealBarterItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DealBarterItem.objects.select_related("deal").order_by("-created_at")

        if is_crm_admin(self.request.user):
            return qs

        return qs.filter(deal__owner=self.request.user)


class ProposalViewSet(ModelViewSet):
    queryset = Proposal.objects.all().order_by("-created_at")
    serializer_class = ProposalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            super()
            .get_queryset()
            .select_related("deal", "created_by")
            .prefetch_related("projects", "attachments")
        )

        if not is_crm_admin(self.request.user):
            qs = qs.filter(deal__owner=self.request.user)

        deal_id = self.request.query_params.get("deal")
        if deal_id:
            qs = qs.filter(deal_id=deal_id)

        return qs

    def destroy(self, request, *args, **kwargs):
        if not is_crm_admin(request.user):
            return Response({"detail": "Apenas administradores podem excluir propostas."}, status=403)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)