import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token

from .models import Application, CalendarEvent, ContactAccessGrant, Conversation, Listing, ListingAccessGrant, Message, OTPCode, Project, ProjectMember, ProjectNeed
from .serializers import (
    ApplicationSerializer,
    CalendarEventSerializer,
    ContactAccessGrantSerializer,
    ConversationSerializer,
    ListingSerializer,
    MessageSerializer,
    ProjectNeedSerializer,
    ProjectSerializer,
    UserProfileSerializer,
)

User = get_user_model()
PHONE_RE = re.compile(r"^09\d{9}$")


def normalized_phone(value):
    value = str(value or "").strip().replace(" ", "").replace("-", "")
    # Permit Persian and Arabic digits copied from a Persian keyboard.
    digit_map = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
    return value.translate(digit_map)


def send_smsir_otp(phone, code):
    """Production adapter boundary for SMS.ir. Configure credentials and implement the current SMS.ir template API here."""
    if not settings.SMSIR_API_KEY or not settings.SMSIR_TEMPLATE_ID:
        raise RuntimeError("SMS.ir credentials are not configured. Set SMSIR_API_KEY and SMSIR_TEMPLATE_ID.")
    # The exact API endpoint/payload must be verified against the account's current SMS.ir documentation.
    # Intentionally fail closed instead of pretending a production SMS was sent.
    raise RuntimeError("SMS.ir adapter is not activated yet. Configure and test the official API payload before production.")


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def request_otp(request):
    phone = normalized_phone(request.data.get("phone"))
    if not PHONE_RE.fullmatch(phone):
        return Response({"detail": "شمارهٔ همراه را با قالب 09xxxxxxxxx وارد کن."}, status=status.HTTP_400_BAD_REQUEST)

    one_hour_ago = timezone.now() - timedelta(hours=1)
    recent_count = OTPCode.objects.filter(phone=phone, created_at__gte=one_hour_ago).count()
    if recent_count >= 5:
        return Response({"detail": "تعداد درخواست کد زیاد است. کمی بعد دوباره تلاش کن."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    code = "123456" if settings.DEBUG else f"{secrets.randbelow(1_000_000):06d}"
    OTPCode.objects.create(phone=phone, code_hash=make_password(code), expires_at=timezone.now() + timedelta(minutes=3))

    if not settings.DEBUG:
        try:
            send_smsir_otp(phone, code)
        except RuntimeError as exc:
            # In production no OTP is exposed to the user and the endpoint does not claim it was delivered.
            OTPCode.objects.filter(phone=phone, consumed_at__isnull=True).update(consumed_at=timezone.now())
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    payload = {"detail": "کد تأیید آماده است.", "demo": settings.DEBUG}
    if settings.DEBUG:
        payload["demo_code"] = code
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
def verify_otp(request):
    phone = normalized_phone(request.data.get("phone"))
    code = str(request.data.get("code", "")).strip()
    if not PHONE_RE.fullmatch(phone) or not re.fullmatch(r"\d{6}", code):
        return Response({"detail": "شمارهٔ همراه یا کد تأیید معتبر نیست."}, status=status.HTTP_400_BAD_REQUEST)

    otp = OTPCode.objects.filter(phone=phone, consumed_at__isnull=True, expires_at__gt=timezone.now()).order_by("-created_at").first()
    if not otp or otp.attempts >= 5:
        return Response({"detail": "کد منقضی شده یا وجود ندارد. کد جدید بگیر."}, status=status.HTTP_400_BAD_REQUEST)

    otp.attempts += 1
    if not check_password(code, otp.code_hash):
        otp.save(update_fields=["attempts"])
        return Response({"detail": "کد تأیید درست نیست."}, status=status.HTTP_400_BAD_REQUEST)

    otp.consumed_at = timezone.now()
    otp.save(update_fields=["attempts", "consumed_at"])
    user = User.objects.filter(phone=phone).first()
    created = user is None
    if created:
        user = User.objects.create_user(phone=phone, full_name="کاربر هم‌پیوند", phone_verified=True)
    elif not user.phone_verified:
        user.phone_verified = True
        user.save(update_fields=["phone_verified"])
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        "token": token.key,
        "user_id": user.pk,
        "user_code": user.user_code,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_new_user": created,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def logout_user(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "از حساب خارج شدی."}, status=status.HTTP_200_OK)


CONTACT_FIELDS = {
    "phone": lambda user: user.phone,
    "contact_email": lambda user: user.contact_email or user.email,
    "telegram_url": lambda user: user.telegram_url,
    "whatsapp_url": lambda user: user.whatsapp_url,
    "linkedin_url": lambda user: user.linkedin_url,
    "resume_url": lambda user: user.resume_url,
    "website_url": lambda user: user.website_url,
}


@api_view(["GET"])
def contact_info(request, user_id):
    target = User.objects.filter(pk=user_id, is_active=True).first()
    if target is None:
        return Response({"detail": "کاربر پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
    if request.user.is_authenticated and request.user.pk == target.pk:
        allowed_fields = set(CONTACT_FIELDS)
    else:
        listing_id = request.query_params.get("listing")
        project_id = request.query_params.get("project")
        share_token = request.query_params.get("share_token")
        grant = None
        allowed_context = False
        context_listing = None
        context_project = None
        if listing_id:
            context_listing = Listing.objects.filter(pk=listing_id, owner=target).first()
            if context_listing:
                if context_listing.visibility == Listing.Visibility.PUBLIC and context_listing.status == Listing.Status.PUBLISHED:
                    allowed_context = True
                elif context_listing.visibility == Listing.Visibility.UNLISTED and str(context_listing.share_token) == str(share_token):
                    allowed_context = True
                elif request.user.is_authenticated and context_listing.visibility == Listing.Visibility.PRIVATE:
                    allowed_context = ListingAccessGrant.objects.filter(listing=context_listing, user=request.user, active=True).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists()
        elif project_id:
            context_project = Project.objects.filter(pk=project_id, owner=target).first()
            if context_project:
                if context_project.visibility == Project.Visibility.PUBLIC and context_project.status in [Project.Status.RECRUITING, Project.Status.ACTIVE]:
                    allowed_context = True
                elif context_project.visibility == Project.Visibility.UNLISTED and str(context_project.share_token) == str(share_token):
                    allowed_context = True
                elif request.user.is_authenticated and context_project.visibility == Project.Visibility.PRIVATE:
                    allowed_context = context_project.members.filter(user=request.user, active=True).exists()
        if not allowed_context and not (context_listing is None and context_project is None and target.contact_visibility in ["all", "logged"]):
            return Response({"detail": "به اطلاعات این آگهی یا پروژه دسترسی نداری."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.is_authenticated and (listing_id or project_id):
            grant_query = ContactAccessGrant.objects.filter(owner=target, viewer=request.user, status=ContactAccessGrant.Status.ACTIVE).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
            if listing_id:
                grant = grant_query.filter(listing_id=listing_id).first()
            elif project_id:
                grant = grant_query.filter(project_id=project_id).first()
        if grant:
            allowed_fields = set(grant.allowed_fields or []) & set(CONTACT_FIELDS)
        else:
            visibility = target.contact_visibility
            permitted = visibility == "all" or (visibility == "logged" and request.user.is_authenticated)
            if visibility == "none" or (visibility == "logged" and not request.user.is_authenticated) or (visibility == "members" and not (request.user.is_authenticated and (
                (context_project and context_project.members.filter(user=request.user, active=True).exists()) or
                (context_listing and ListingAccessGrant.objects.filter(listing=context_listing, user=request.user, active=True).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists())
            ))):
                return Response({"detail": "صاحب پروفایل اجازهٔ نمایش اطلاعات تماس را نداده است."}, status=status.HTTP_403_FORBIDDEN)
            allowed_fields = set(CONTACT_FIELDS) if permitted or visibility == "members" else set()
            preferences = target.contact_preferences or {}
            allowed_fields = {field for field in allowed_fields if preferences.get(field, True)}
    contacts = {field: CONTACT_FIELDS[field](target) for field in allowed_fields if CONTACT_FIELDS[field](target)}
    return Response({"user_code": target.user_code, "full_name": target.full_name, "contacts": contacts})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def current_user(request):
    if request.method == "GET":
        return Response(UserProfileSerializer(request.user, context={"request": request}).data)
    serializer = UserProfileSerializer(request.user, data=request.data, partial=True, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Listing.objects.select_related("owner")
        not_expired = Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        public_active = Q(visibility=Listing.Visibility.PUBLIC, status=Listing.Status.PUBLISHED) & not_expired
        active_grant = Q(access_grants__user=user, access_grants__active=True) & (Q(access_grants__expires_at__isnull=True) | Q(access_grants__expires_at__gt=timezone.now())) if user.is_authenticated else Q(pk__in=[])
        if self.action == "list":
            share_token = self.request.query_params.get("share_token")
            unlisted = Q(visibility=Listing.Visibility.UNLISTED, share_token=share_token, status=Listing.Status.PUBLISHED) & not_expired if share_token else Q(pk__in=[])
            if user.is_authenticated:
                queryset = queryset.filter(public_active | unlisted | active_grant | Q(owner=user)).distinct()
            else:
                queryset = queryset.filter(public_active | unlisted).distinct()
        elif user.is_authenticated:
            queryset = queryset.filter(public_active | Q(owner=user) | active_grant)
            share_token = self.request.query_params.get("share_token")
            if share_token:
                queryset = Listing.objects.select_related("owner").filter(
                    public_active | Q(owner=user) | active_grant
                    | (Q(visibility=Listing.Visibility.UNLISTED, share_token=share_token, status=Listing.Status.PUBLISHED) & not_expired)
                ).distinct()
        else:
            share_token = self.request.query_params.get("share_token")
            queryset = queryset.filter(public_active | (Q(visibility=Listing.Visibility.UNLISTED, share_token=share_token, status=Listing.Status.PUBLISHED) & not_expired)).distinct() if share_token else queryset.filter(public_active)
        if user.is_authenticated and self.request.query_params.get("mine") == "1":
            queryset = Listing.objects.filter(owner=user)
        listing_type = self.request.query_params.get("type")
        city = self.request.query_params.get("city")
        if listing_type:
            queryset = queryset.filter(listing_type=listing_type)
        if city:
            queryset = queryset.filter(city__icontains=city)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.pk:
            raise PermissionDenied("فقط مالک آگهی می‌تواند آن را حذف کند.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def invite(self, request, pk=None):
        listing = self.get_object()
        if listing.owner_id != request.user.id:
            return Response({"detail": "فقط مالک آگهی می‌تواند دعوت ارسال کند."}, status=status.HTTP_403_FORBIDDEN)
        user_code = str(request.data.get("user_code", "")).strip()
        if not user_code:
            return Response({"detail": "شناسهٔ کاربری لازم است."}, status=status.HTTP_400_BAD_REQUEST)
        invited = User.objects.filter(user_code=user_code).first()
        if not invited:
            return Response({"detail": "کاربری با این شناسه پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
        grant, created = ListingAccessGrant.objects.get_or_create(listing=listing, user=invited, defaults={"invited_by": request.user, "active": True})
        if not created and not grant.active:
            grant.active = True
            grant.invited_by = request.user
            grant.revoked_at = None
            grant.save(update_fields=["active", "invited_by", "revoked_at"])
        return Response({"detail": "دسترسی به آگهی داده شد.", "user_code": invited.user_code}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def revoke_invite(self, request, pk=None):
        listing = self.get_object()
        if listing.owner_id != request.user.id:
            return Response({"detail": "فقط مالک آگهی می‌تواند دسترسی را لغو کند."}, status=status.HTTP_403_FORBIDDEN)
        user_code = str(request.data.get("user_code", "")).strip()
        grant = ListingAccessGrant.objects.filter(listing=listing, user__user_code=user_code, active=True).first()
        if not grant:
            return Response({"detail": "دسترسی فعال پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
        grant.active = False
        grant.revoked_at = timezone.now()
        grant.save(update_fields=["active", "revoked_at"])
        return Response({"detail": "دسترسی لغو شد."})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def archive(self, request, pk=None):
        listing = self.get_object()
        if listing.owner_id != request.user.id:
            return Response({"detail": "فقط مالک می‌تواند آگهی را بایگانی کند."}, status=status.HTTP_403_FORBIDDEN)
        listing.status = Listing.Status.ARCHIVED
        listing.save(update_fields=["status", "updated_at"])
        return Response({"detail": "آگهی بایگانی شد."})


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        visible = Q(visibility=Project.Visibility.PUBLIC, status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE])
        queryset = Project.objects.select_related("owner").prefetch_related("needs")
        if self.action == "list":
            share_token = self.request.query_params.get("share_token")
            unlisted = Q(visibility=Project.Visibility.UNLISTED, share_token=share_token, status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE]) if share_token else Q(pk__in=[])
            if user.is_authenticated:
                queryset = queryset.filter(visible | unlisted | Q(owner=user) | Q(members__user=user, members__active=True)).distinct()
            else:
                queryset = queryset.filter(visible | unlisted).distinct()
        elif user.is_authenticated:
            queryset = queryset.filter(visible | Q(owner=user) | Q(members__user=user, members__active=True)).distinct()
            share_token = self.request.query_params.get("share_token")
            if share_token:
                queryset = Project.objects.select_related("owner").prefetch_related("needs").filter(visible | Q(owner=user) | Q(members__user=user, members__active=True) | Q(visibility=Project.Visibility.UNLISTED, share_token=share_token, status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE])).distinct()
        else:
            share_token = self.request.query_params.get("share_token")
            queryset = queryset.filter(visible | (Q(visibility=Project.Visibility.UNLISTED, share_token=share_token, status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE]) if share_token else Q(pk__in=[]))).distinct()
        if user.is_authenticated and self.request.query_params.get("mine") == "1":
            queryset = Project.objects.filter(owner=user).select_related("owner").prefetch_related("needs")
        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city)
        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.pk:
            raise PermissionDenied("فقط سازندهٔ پروژه می‌تواند پروژه را حذف کند.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def invite(self, request, pk=None):
        project = self.get_object()
        if project.owner_id != request.user.id:
            return Response({"detail": "فقط سازندهٔ پروژه می‌تواند دعوت ارسال کند."}, status=status.HTTP_403_FORBIDDEN)
        user_code = request.data.get("user_code")
        if not user_code:
            return Response({"detail": "شناسهٔ کاربری لازم است."}, status=status.HTTP_400_BAD_REQUEST)
        invited = User.objects.filter(user_code=user_code).first()
        if not invited:
            return Response({"detail": "کاربری با این شناسه پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
        member, created = ProjectMember.objects.get_or_create(project=project, user=invited, defaults={"role": ProjectMember.Role.MEMBER, "active": True})
        if not created and not member.active:
            member.active = True
            member.save(update_fields=["active"])
        return Response({"detail": "عضو به پروژه افزوده شد.", "user_code": invited.user_code}, status=status.HTTP_200_OK)


class ProjectNeedViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectNeedSerializer

    def perform_destroy(self, instance):
        user = self.request.user
        is_manager = instance.project.members.filter(user=user, active=True, role__in=["owner", "manager"]).exists()
        if instance.project.owner_id != user.pk and not is_manager:
            raise PermissionDenied("فقط سازنده یا مدیر پروژه می‌تواند نیاز را حذف کند.")
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        queryset = ProjectNeed.objects.select_related("project", "project__owner")
        project_id = self.request.query_params.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        public_projects = Q(project__visibility=Project.Visibility.PUBLIC, project__status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE])
        share_token = self.request.query_params.get("share_token")
        unlisted_project = Q(project__visibility=Project.Visibility.UNLISTED, project__share_token=share_token, project__status__in=[Project.Status.RECRUITING, Project.Status.ACTIVE]) if share_token else Q(pk__in=[])
        if user.is_authenticated:
            queryset = queryset.filter(public_projects | unlisted_project | Q(project__owner=user) | Q(project__members__user=user, project__members__active=True)).distinct()
        else:
            queryset = queryset.filter(public_projects | unlisted_project).distinct()
        if self.action == "list":
            queryset = queryset.filter(status=ProjectNeed.Status.OPEN)
        return queryset


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Application.objects.none()
        user = self.request.user
        queryset = Application.objects.select_related("applicant", "listing", "listing__owner", "need", "need__project", "need__project__owner")
        queryset = queryset.filter(
            Q(applicant=user) | Q(listing__owner=user) | Q(need__project__owner=user) | Q(need__project__members__user=user, need__project__members__active=True, need__project__members__role__in=["owner", "manager"])
        ).distinct()
        return queryset

    def perform_create(self, serializer):
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        application = self.get_object()
        if application.applicant_id != request.user.id:
            return Response({"detail": "ویرایش متن پیشنهاد فقط برای متقاضی مجاز است."}, status=status.HTTP_403_FORBIDDEN)
        if application.status not in [Application.Status.NEW, Application.Status.NEGOTIATING]:
            return Response({"detail": "این درخواست دیگر قابل ویرایش نیست."}, status=status.HTTP_409_CONFLICT)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def transition(self, request, pk=None):
        application = self.get_object()
        operation = str(request.data.get("action", "")).strip().lower()
        user = request.user
        target_owner = application.listing.owner if application.listing_id else application.need.project.owner
        is_owner = target_owner.pk == user.pk or bool(application.need_id and application.need.project.members.filter(user=user, active=True, role__in=["owner", "manager"]).exists())
        is_applicant = application.applicant_id == user.pk

        owner_actions = {"negotiate", "shortlist", "reject", "archive"}
        if operation in owner_actions and not is_owner:
            return Response({"detail": "این اقدام فقط برای مدیر آگهی یا پروژه مجاز است."}, status=status.HTTP_403_FORBIDDEN)
        if operation in {"withdraw", "confirm"} and not is_applicant:
            return Response({"detail": "این اقدام فقط برای متقاضی مجاز است."}, status=status.HTTP_403_FORBIDDEN)

        if operation == "negotiate":
            if application.status not in [Application.Status.NEW, Application.Status.NEGOTIATING]:
                return Response({"detail": "تغییر وضعیت از این مرحله مجاز نیست."}, status=status.HTTP_409_CONFLICT)
            application.status = Application.Status.NEGOTIATING
        elif operation == "shortlist":
            if application.status not in [Application.Status.NEW, Application.Status.NEGOTIATING]:
                return Response({"detail": "این درخواست در مرحلهٔ فعلی قابل انتخاب اولیه نیست."}, status=status.HTTP_409_CONFLICT)
            application.status = Application.Status.SHORTLISTED
            application.owner_decided_at = timezone.now()
        elif operation == "reject":
            if application.status in [Application.Status.CONFIRMED, Application.Status.WITHDRAWN]:
                return Response({"detail": "درخواست نهایی‌شده یا انصراف‌داده قابل رد نیست."}, status=status.HTTP_409_CONFLICT)
            application.status = Application.Status.REJECTED
            application.owner_decided_at = timezone.now()
            application.owner_note = str(request.data.get("note", ""))[:3000]
        elif operation == "archive":
            application.status = Application.Status.ARCHIVED
        elif operation == "withdraw":
            if application.status in [Application.Status.CONFIRMED, Application.Status.REJECTED]:
                return Response({"detail": "درخواست نهایی‌شده یا ردشده قابل انصراف نیست."}, status=status.HTTP_409_CONFLICT)
            application.status = Application.Status.WITHDRAWN
        elif operation == "confirm":
            if application.status != Application.Status.SHORTLISTED or not application.owner_decided_at:
                return Response({"detail": "ابتدا باید مسئول پروژه پیشنهاد را انتخاب اولیه کند."}, status=status.HTTP_409_CONFLICT)
            try:
                with transaction.atomic():
                    if application.need_id:
                        need = ProjectNeed.objects.select_for_update().get(pk=application.need_id)
                        if need.status != ProjectNeed.Status.OPEN:
                            return Response({"detail": "این نیاز دیگر برای توافق باز نیست."}, status=status.HTTP_409_CONFLICT)
                        if need.capacity_mode == ProjectNeed.CapacityMode.SINGLE:
                            another_confirmed = Application.objects.filter(need=need, status=Application.Status.CONFIRMED).exclude(pk=application.pk).exists()
                            if another_confirmed:
                                return Response({"detail": "پیشنهاد دیگری قبلاً برای این نیاز نهایی شده است."}, status=status.HTTP_409_CONFLICT)
                            need.quantity_fulfilled = need.quantity_required
                            need.status = ProjectNeed.Status.FULFILLED
                        else:
                            proposed = application.proposed_quantity or 1
                            remaining = need.quantity_required - need.quantity_fulfilled
                            if proposed > remaining:
                                return Response({"detail": f"مقدار باقی‌مانده فقط {remaining} {need.unit} است."}, status=status.HTTP_409_CONFLICT)
                            need.quantity_fulfilled += proposed
                            if need.quantity_fulfilled >= need.quantity_required:
                                need.status = ProjectNeed.Status.FULFILLED
                            application.proposed_quantity = proposed
                        need.save(update_fields=["quantity_fulfilled", "status", "updated_at"])
                    application.status = Application.Status.CONFIRMED
                    application.applicant_confirmed_at = timezone.now()
                    application.save(update_fields=["status", "applicant_confirmed_at", "proposed_quantity", "updated_at"])
                    return Response(ApplicationSerializer(application, context={"request": request}).data)
            except ProjectNeed.DoesNotExist:
                return Response({"detail": "نیاز پروژه پیدا نشد."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"detail": "اقدام نامعتبر است.", "allowed_actions": sorted(owner_actions | {"withdraw", "confirm"})}, status=status.HTTP_400_BAD_REQUEST)

        application.save(update_fields=["status", "owner_decided_at", "owner_note", "updated_at"])
        return Response(ApplicationSerializer(application, context={"request": request}).data)


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Conversation.objects.none()
        return Conversation.objects.filter(participants=self.request.user).prefetch_related("participants", "messages__sender").distinct()

    def perform_create(self, serializer):
        user = self.request.user
        application = serializer.validated_data.get("application")
        project = serializer.validated_data.get("project")
        requested_ids = set(serializer.validated_data.pop("participant_ids", []))
        conversation = serializer.save(created_by=user)
        if application:
            owner = application.listing.owner if application.listing_id else application.need.project.owner
            participants = {application.applicant_id, owner.pk}
        else:
            eligible_ids = set(ProjectMember.objects.filter(project=project, active=True).values_list("user_id", flat=True)) | {project.owner_id}
            participants = (requested_ids or eligible_ids) | {user.pk, project.owner_id}
        conversation.participants.set(User.objects.filter(pk__in=participants))


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Message.objects.none()
        return Message.objects.filter(conversation__participants=self.request.user, is_deleted=False).select_related("sender", "conversation").distinct()

    def perform_create(self, serializer):
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        message = self.get_object()
        if message.sender_id != request.user.id:
            return Response({"detail": "فقط فرستنده می‌تواند پیام را ویرایش کند."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)


class ContactAccessGrantViewSet(viewsets.ModelViewSet):
    serializer_class = ContactAccessGrantSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        return ContactAccessGrant.objects.filter(Q(owner=self.request.user) | Q(viewer=self.request.user)).select_related("owner", "viewer", "listing", "project").distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        grant = self.get_object()
        if grant.owner_id != request.user.id:
            return Response({"detail": "فقط صاحب اطلاعات تماس می‌تواند این مجوز را ویرایش کند."}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def revoke(self, request, pk=None):
        grant = self.get_object()
        if grant.owner_id != request.user.id:
            return Response({"detail": "فقط صاحب اطلاعات تماس می‌تواند مجوز را لغو کند."}, status=status.HTTP_403_FORBIDDEN)
        grant.status = ContactAccessGrant.Status.REVOKED
        grant.revoked_at = timezone.now()
        grant.save(update_fields=["status", "revoked_at"])
        return Response({"detail": "دسترسی اطلاعات تماس لغو شد."})


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def perform_destroy(self, instance):
        if instance.creator_id != self.request.user.pk:
            raise PermissionDenied("فقط سازندهٔ رویداد می‌تواند آن را حذف کند.")
        instance.delete()

    def get_queryset(self):
        user = self.request.user
        return CalendarEvent.objects.filter(Q(creator=user) | Q(participants=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)
