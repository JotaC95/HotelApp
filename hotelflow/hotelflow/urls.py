from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import MeView
from scheduling.views import SupervisorSummaryView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/housekeeping/", include("housekeeping.urls")),
    path("api/auth/", include("rest_framework.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/scheduling/", include("scheduling.urls")),
    path("api/housekeeping/", include("scheduling.api_urls")),
    path("api/housekeeping/accounts/me/", MeView.as_view()),
    path("api/housekeeping/scheduling/supervisor/summary/", SupervisorSummaryView.as_view()),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)