from django.contrib import admin
from django.urls import path, include

from config.auth_views import csrf_view, login_view, logout_view, me_view
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/", include("config.api_urls")),

    path("api/auth/csrf/", csrf_view),
    path("api/auth/login/", login_view),
    path("api/auth/logout/", logout_view),
    path("api/auth/me/", me_view),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)