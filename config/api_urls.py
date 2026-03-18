#config/api_urls.py
from django.urls import path
from rest_framework.routers import DefaultRouter
from accounts.views import CRMUserViewSet, AccountViewSet, ContactPersonViewSet, AdminStatsView
from projects.views import ProjectViewSet
from deals.views import (
    DealViewSet,
    ActivityViewSet,
    DealAttachmentViewSet,
    DealBarterItemViewSet,
    ProposalViewSet,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet)
router.register("contacts", ContactPersonViewSet)
router.register("projects", ProjectViewSet)
router.register("deals", DealViewSet)
router.register("activities", ActivityViewSet)
router.register("attachments", DealAttachmentViewSet)
router.register("barter-items", DealBarterItemViewSet)
router.register("proposals", ProposalViewSet)
router.register("users", CRMUserViewSet, basename="users")

urlpatterns = router.urls + [
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
]