from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from .models import Application, CalendarEvent, ContactAccessGrant, Conversation, Listing, ListingAccessGrant, Message, Project, ProjectMember, ProjectNeed

User = get_user_model()


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "user_code", "full_name", "city", "bio", "phone_verified", "identity_verified", "business_verified", "date_joined"]
        read_only_fields = fields


class ContactAccessGrantSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    viewer = PublicUserSerializer(read_only=True)
    viewer_user_code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ContactAccessGrant
        fields = ["id", "owner", "viewer", "viewer_user_code", "listing", "project", "allowed_fields", "status", "expires_at", "created_at", "revoked_at"]
        read_only_fields = ["id", "owner", "viewer", "status", "created_at", "revoked_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        listing = attrs.get("listing", getattr(self.instance, "listing", None))
        project = attrs.get("project", getattr(self.instance, "project", None))
        user_code = attrs.get("viewer_user_code")
        if self.instance is None and not user_code:
            raise serializers.ValidationError({"viewer_user_code": "شناسهٔ کاربری دریافت‌کننده لازم است."})
        if bool(listing) == bool(project):
            raise serializers.ValidationError("مجوز باید دقیقاً به یک آگهی یا یک پروژه متصل باشد.")
        if user and listing and listing.owner_id != user.pk:
            raise serializers.ValidationError({"listing": "فقط مالک آگهی می‌تواند دسترسی تماس بدهد."})
        if user and project and project.owner_id != user.pk:
            raise serializers.ValidationError({"project": "فقط سازندهٔ پروژه می‌تواند دسترسی تماس بدهد."})
        if user_code:
            viewer = User.objects.filter(user_code=user_code).first()
            if not viewer:
                raise serializers.ValidationError({"viewer_user_code": "کاربری با این شناسه پیدا نشد."})
            if user and viewer.pk == user.pk:
                raise serializers.ValidationError({"viewer_user_code": "نمی‌توانی به خودت مجوز بدهی."})
        fields = attrs.get("allowed_fields", [])
        allowed = {"phone", "contact_email", "telegram_url", "whatsapp_url", "linkedin_url", "resume_url", "website_url"}
        if not set(fields).issubset(allowed):
            raise serializers.ValidationError({"allowed_fields": "یکی از راه‌های تماس انتخاب‌شده معتبر نیست."})
        return attrs

    def create(self, validated_data):
        user_code = validated_data.pop("viewer_user_code")
        viewer = User.objects.get(user_code=user_code)
        grant, created = ContactAccessGrant.objects.get_or_create(
            owner=self.context["request"].user, viewer=viewer, listing=validated_data.get("listing"), project=validated_data.get("project"),
            defaults={"allowed_fields": validated_data.get("allowed_fields", []), "expires_at": validated_data.get("expires_at"), "status": ContactAccessGrant.Status.ACTIVE},
        )
        if not created:
            for field, value in validated_data.items():
                setattr(grant, field, value)
            grant.status = ContactAccessGrant.Status.ACTIVE
            grant.revoked_at = None
            grant.save()
        return grant

    def update(self, instance, validated_data):
        validated_data.pop("viewer_user_code", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "phone", "user_code", "full_name", "email", "city", "bio", "contact_email",
            "telegram_url", "whatsapp_url", "linkedin_url", "resume_url", "website_url", "other_links",
            "phone_verified", "identity_verified", "business_verified", "contact_visibility", "contact_preferences", "created_at",
        ]
        read_only_fields = ["id", "phone", "user_code", "phone_verified", "identity_verified", "business_verified", "created_at"]


class ListingSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    share_token = serializers.UUIDField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "public_id", "share_token", "owner", "listing_type", "category", "title", "description",
            "city", "area", "latitude", "longitude", "show_exact_location", "visibility", "status", "quantity",
            "unit", "currency", "price_min", "price_max", "employment_type", "gender_requirement", "salary_min",
            "salary_max", "working_days", "working_hours", "insurance", "starts_at", "ends_at", "attributes",
            "expires_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "public_id", "share_token", "owner", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance and request and request.user != self.instance.owner:
            raise serializers.ValidationError("فقط مالک آگهی می‌تواند آن را ویرایش کند.")
        request = self.context.get("request")
        if request and attrs.get("status", getattr(self.instance, "status", None)) == Listing.Status.PUBLISHED and not request.user.phone_verified:
            raise serializers.ValidationError("برای انتشار آگهی ابتدا شمارهٔ همراه را تأیید کن.")
        if attrs.get("price_min") and attrs.get("price_max") and attrs["price_min"] > attrs["price_max"]:
            raise serializers.ValidationError({"price_max": "حداکثر قیمت باید برابر یا بیشتر از حداقل قیمت باشد."})
        if attrs.get("salary_min") and attrs.get("salary_max") and attrs["salary_min"] > attrs["salary_max"]:
            raise serializers.ValidationError({"salary_max": "حداکثر حقوق باید برابر یا بیشتر از حداقل حقوق باشد."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        if validated_data.get("status") == Listing.Status.PUBLISHED and not request.user.phone_verified:
            raise serializers.ValidationError("برای انتشار آگهی ابتدا شمارهٔ همراه را تأیید کن.")
        return super().create(validated_data)


class ProjectNeedSerializer(serializers.ModelSerializer):
    remaining_quantity = serializers.DecimalField(max_digits=14, decimal_places=3, read_only=True)

    class Meta:
        model = ProjectNeed
        fields = [
            "id", "project", "need_type", "title", "description", "quantity_required", "quantity_fulfilled",
            "remaining_quantity", "unit", "capacity_mode", "max_providers", "price_min", "price_max", "currency",
            "starts_at", "ends_at", "mandatory_fields", "attributes", "status", "position", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "quantity_fulfilled", "created_at", "updated_at"]

    def validate_project(self, project):
        request = self.context.get("request")
        if request and not (project.owner_id == request.user.id or project.members.filter(user=request.user, active=True, role__in=["owner", "manager"]).exists()):
            raise serializers.ValidationError("برای مدیریت نیازهای این پروژه دسترسی نداری.")
        return project

    def validate(self, attrs):
        if attrs.get("price_min") and attrs.get("price_max") and attrs["price_min"] > attrs["price_max"]:
            raise serializers.ValidationError({"price_max": "حداکثر بودجه باید برابر یا بیشتر از حداقل بودجه باشد."})
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    owner = PublicUserSerializer(read_only=True)
    needs = ProjectNeedSerializer(many=True, read_only=True)
    public_id = serializers.UUIDField(read_only=True)
    share_token = serializers.UUIDField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id", "public_id", "share_token", "owner", "title", "description", "city", "area", "latitude", "longitude",
            "show_exact_location", "visibility", "status", "start_date", "target_end_date", "attributes", "needs", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "public_id", "share_token", "owner", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance and request and request.user != self.instance.owner:
            raise serializers.ValidationError("فقط سازندهٔ پروژه می‌تواند اطلاعات اصلی آن را تغییر دهد.")
        if attrs.get("start_date") and attrs.get("target_end_date") and attrs["target_end_date"] < attrs["start_date"]:
            raise serializers.ValidationError({"target_end_date": "تاریخ پایان نمی‌تواند پیش از شروع باشد."})
        return attrs

    def create(self, validated_data):
        return Project.objects.create(owner=self.context["request"].user, **validated_data)


class ApplicationSerializer(serializers.ModelSerializer):
    applicant = PublicUserSerializer(read_only=True)
    listing_title = serializers.SerializerMethodField()
    need_title = serializers.SerializerMethodField()
    project_title = serializers.SerializerMethodField()
    share_token = serializers.UUIDField(write_only=True, required=False)

    def get_listing_title(self, obj):
        return obj.listing.title if obj.listing_id else None

    def get_need_title(self, obj):
        return obj.need.title if obj.need_id else None

    def get_project_title(self, obj):
        return obj.need.project.title if obj.need_id else None

    class Meta:
        model = Application
        fields = [
            "id", "applicant", "listing", "listing_title", "need", "need_title", "project_title", "offered_listing",
            "cover_message", "proposed_quantity", "proposed_amount", "currency", "proposed_terms", "share_token", "status",
            "owner_note", "owner_decided_at", "applicant_confirmed_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "applicant", "status", "owner_note", "owner_decided_at", "applicant_confirmed_at", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        listing = attrs.get("listing", getattr(self.instance, "listing", None))
        need = attrs.get("need", getattr(self.instance, "need", None))
        if self.instance is None and bool(listing) == bool(need):
            raise serializers.ValidationError("درخواست باید دقیقاً به یک آگهی یا یک نیاز پروژه متصل باشد.")
        offered_listing = attrs.get("offered_listing", getattr(self.instance, "offered_listing", None))
        if request and offered_listing and offered_listing.owner_id != request.user.pk:
            raise serializers.ValidationError({"offered_listing": "فقط می‌توانی منبع یا مهارتی را پیشنهاد بدهی که مالک آن هستی."})
        if request and offered_listing and offered_listing.status != Listing.Status.PUBLISHED:
            raise serializers.ValidationError({"offered_listing": "آگهی منبع پیشنهادی باید منتشر شده باشد."})
        if request and self.instance is None:
            target_owner = listing.owner if listing else need.project.owner
            if target_owner.pk == request.user.pk:
                raise serializers.ValidationError("نمی‌توانی برای آگهی یا نیاز خودت درخواست بفرستی.")
            if listing and (listing.status != Listing.Status.PUBLISHED or (listing.expires_at and listing.expires_at <= timezone.now())):
                raise serializers.ValidationError("این آگهی در حال حاضر درخواست جدید نمی‌پذیرد یا منقضی شده است.")
            if listing and Application.objects.filter(listing=listing, applicant=request.user).exists():
                raise serializers.ValidationError("برای این آگهی قبلاً درخواست فرستاده‌ای.")
            if need and Application.objects.filter(need=need, applicant=request.user).exists():
                raise serializers.ValidationError("برای این نیاز قبلاً درخواست فرستاده‌ای.")
            if listing and listing.visibility == Listing.Visibility.PRIVATE and not ListingAccessGrant.objects.filter(listing=listing, user=request.user, active=True).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())).exists():
                raise serializers.ValidationError({"listing": "برای این آگهی خصوصی دعوت نشده‌ای."})
            if listing and listing.visibility == Listing.Visibility.UNLISTED:
                supplied_token = attrs.get("share_token") or request.query_params.get("share_token")
                if not supplied_token or str(supplied_token) != str(listing.share_token):
                    raise serializers.ValidationError({"share_token": "برای اقدام به آگهی مخفی، لینک اختصاصی معتبر لازم است."})
            if need and need.status != ProjectNeed.Status.OPEN:
                raise serializers.ValidationError("این نیاز در حال حاضر درخواست جدید نمی‌پذیرد.")
            if need and need.project.visibility == Project.Visibility.PRIVATE and not need.project.members.filter(user=request.user, active=True).exists():
                raise serializers.ValidationError("برای ارسال درخواست به این پروژه دعوت نشده‌ای.")
            if need and need.project.visibility == Project.Visibility.UNLISTED:
                supplied_token = attrs.get("share_token") or request.query_params.get("share_token")
                if not supplied_token or str(supplied_token) != str(need.project.share_token):
                    raise serializers.ValidationError({"share_token": "برای اقدام به پروژهٔ مخفی، لینک اختصاصی معتبر لازم است."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("share_token", None)
        return Application.objects.create(applicant=self.context["request"].user, **validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("share_token", None)
        return super().update(instance, validated_data)


class MessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "conversation", "sender", "body", "attachment", "created_at", "edited_at", "is_deleted"]
        read_only_fields = ["id", "sender", "created_at", "edited_at", "is_deleted"]

    def validate(self, attrs):
        request = self.context.get("request")
        conversation = attrs.get("conversation", getattr(self.instance, "conversation", None))
        if request and conversation and not conversation.participants.filter(pk=request.user.pk).exists():
            raise serializers.ValidationError("به این گفتگو دسترسی نداری.")
        return attrs

    def create(self, validated_data):
        return Message.objects.create(sender=self.context["request"].user, **validated_data)


class ConversationSerializer(serializers.ModelSerializer):
    participants = PublicUserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    participant_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)

    class Meta:
        model = Conversation
        fields = ["id", "conversation_type", "title", "application", "project", "participants", "participant_ids", "last_message", "created_by", "is_archived", "created_at", "updated_at"]
        read_only_fields = ["id", "participants", "last_message", "created_by", "created_at", "updated_at"]

    def get_last_message(self, obj):
        message = obj.messages.filter(is_deleted=False).select_related("sender").last()
        return MessageSerializer(message, context=self.context).data if message else None

    def validate(self, attrs):
        app = attrs.get("application")
        project = attrs.get("project")
        if bool(app) == bool(project):
            raise serializers.ValidationError("گفتگو باید به یک درخواست یا یک پروژه متصل باشد.")
        user = self.context["request"].user
        if app:
            owner = app.listing.owner if app.listing_id else app.need.project.owner
            if user.pk not in {app.applicant_id, owner.pk}:
                raise serializers.ValidationError("فقط طرفین درخواست می‌توانند گفتگو را ایجاد کنند.")
        if project:
            is_manager = project.owner_id == user.pk or project.members.filter(user=user, active=True, role__in=["owner", "manager"]).exists()
            if not is_manager:
                raise serializers.ValidationError("فقط مدیر پروژه می‌تواند روم تیم ایجاد کند.")
            requested_ids = set(attrs.get("participant_ids", []))
            eligible_ids = set(ProjectMember.objects.filter(project=project, active=True).values_list("user_id", flat=True)) | {project.owner_id}
            if requested_ids and not requested_ids.issubset(eligible_ids):
                raise serializers.ValidationError({"participant_ids": "فقط اعضای فعال پروژه می‌توانند به روم اضافه شوند."})
        return attrs


class CalendarEventSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)

    class Meta:
        model = CalendarEvent
        fields = ["id", "creator", "project", "application", "participants", "event_type", "title", "description", "starts_at", "ends_at", "timezone_name", "created_at"]
        read_only_fields = ["id", "creator", "created_at"]

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        project = attrs.get("project", getattr(self.instance, "project", None))
        application = attrs.get("application", getattr(self.instance, "application", None))
        if project and user and not (project.owner_id == user.pk or project.members.filter(user=user, active=True).exists()):
            raise serializers.ValidationError({"project": "به این پروژه دسترسی نداری."})
        if application and user:
            owner = application.listing.owner if application.listing_id else application.need.project.owner
            if user.pk not in {application.applicant_id, owner.pk} and not (application.need_id and application.need.project.members.filter(user=user, active=True).exists()):
                raise serializers.ValidationError({"application": "به این درخواست دسترسی نداری."})
        participants = attrs.get("participants", [])
        if participants and user:
            participant_ids = {p.pk for p in participants}
            if project:
                eligible_ids = set(ProjectMember.objects.filter(project=project, active=True).values_list("user_id", flat=True)) | {project.owner_id}
                if not participant_ids.issubset(eligible_ids):
                    raise serializers.ValidationError({"participants": "فقط اعضای فعال پروژه را می‌توان دعوت کرد."})
            elif application:
                owner = application.listing.owner if application.listing_id else application.need.project.owner
                allowed_ids = {application.applicant_id, owner.pk}
                if application.need_id:
                    allowed_ids |= set(ProjectMember.objects.filter(project=application.need.project, active=True).values_list("user_id", flat=True))
                if not participant_ids.issubset(allowed_ids):
                    raise serializers.ValidationError({"participants": "فقط طرف‌های مجاز همکاری را می‌توان دعوت کرد."})
        if attrs.get("starts_at") and attrs.get("ends_at") and attrs["ends_at"] < attrs["starts_at"]:
            raise serializers.ValidationError({"ends_at": "زمان پایان نمی‌تواند قبل از شروع باشد."})
        return attrs
