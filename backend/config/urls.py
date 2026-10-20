from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from marketplace.views import (
    ApplicationViewSet,
    CalendarEventViewSet,
    ContactAccessGrantViewSet,
    ConversationViewSet,
    ListingViewSet,
    MessageViewSet,
    ProjectNeedViewSet,
    ProjectViewSet,
    contact_info,
    current_user,
    logout_user,
    request_otp,
    verify_otp,
)

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="listing")
router.register("projects", ProjectViewSet, basename="project")
router.register("needs", ProjectNeedViewSet, basename="need")
router.register("applications", ApplicationViewSet, basename="application")
router.register("conversations", ConversationViewSet, basename="conversation")
router.register("messages", MessageViewSet, basename="message")
router.register("calendar-events", CalendarEventViewSet, basename="calendar-event")
router.register("contact-grants", ContactAccessGrantViewSet, basename="contact-grant")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/request-otp/", request_otp, name="request-otp"),
    path("api/auth/verify-otp/", verify_otp, name="verify-otp"),
    path("api/auth/me/", current_user, name="current-user"),
    path("api/auth/logout/", logout_user, name="logout"),
    path("api/users/<int:user_id>/contact/", contact_info, name="contact-info"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
