from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django import forms
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Advertisement, AdPlacement, Application, CalendarEvent, ContactAccessGrant, ListingAccessGrant,
    Conversation, Listing, Message, OTPCode, Project, ProjectMember, ProjectNeed,
)

User = get_user_model()


class HampayvandUserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label="گذرواژه", widget=forms.PasswordInput, strip=False)
    password2 = forms.CharField(label="تکرار گذرواژه", widget=forms.PasswordInput, strip=False)

    class Meta:
        model = User
        fields = ("phone", "full_name", "is_staff", "is_superuser")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("دو گذرواژه با هم مطابقت ندارند.")
        if password1:
            validate_password(password1, self.instance)
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()
            self.save_m2m()
        return user


class HampayvandUserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(label="گذرواژه", help_text="برای تغییر گذرواژه از پیوند تغییر گذرواژه استفاده کن.")

    class Meta:
        model = User
        fields = "__all__"

    def clean_password(self):
        return self.initial["password"]


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    add_form = HampayvandUserCreationForm
    form = HampayvandUserChangeForm
    list_display = ("phone", "user_code", "full_name", "city", "phone_verified", "identity_verified", "business_verified", "is_staff", "is_active")
    list_filter = ("phone_verified", "identity_verified", "business_verified", "is_staff", "is_active", "contact_visibility")
    search_fields = ("phone", "user_code", "full_name", "contact_email")
    ordering = ("phone",)
    filter_horizontal = ("groups", "user_permissions")
    readonly_fields = ("user_code", "created_at", "updated_at", "date_joined", "last_login")
    fieldsets = (
        ("ورود و حساب", {"fields": ("phone", "password", "user_code", "full_name", "email", "city", "bio")} ),
        ("تأییدها", {"fields": ("phone_verified", "identity_verified", "business_verified")} ),
        ("اطلاعات تماس", {"fields": ("contact_email", "telegram_url", "whatsapp_url", "linkedin_url", "resume_url", "website_url", "other_links", "contact_visibility", "contact_preferences")} ),
        ("مجوزهای مدیریتی", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")} ),
        ("سوابق", {"fields": ("created_at", "updated_at", "date_joined", "last_login")} ),
    )
    add_fieldsets = (
        ("ساخت حساب مدیر", {"classes": ("wide",), "fields": ("phone", "password1", "password2", "full_name", "is_staff", "is_superuser")} ),
    )


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "listing_type", "owner", "city", "visibility", "status", "created_at")
    list_filter = ("listing_type", "visibility", "status", "city", "insurance", "employment_type")
    search_fields = ("title", "description", "owner__phone", "owner__user_code", "city", "area")
    readonly_fields = ("public_id", "share_token", "created_at", "updated_at")
    actions = ["publish_selected", "pause_selected", "archive_selected"]

    @admin.action(description="انتشار آگهی‌های انتخاب‌شده")
    def publish_selected(self, request, queryset):
        queryset.update(status=Listing.Status.PUBLISHED)

    @admin.action(description="توقف آگهی‌های انتخاب‌شده")
    def pause_selected(self, request, queryset):
        queryset.update(status=Listing.Status.PAUSED)

    @admin.action(description="بایگانی آگهی‌های انتخاب‌شده")
    def archive_selected(self, request, queryset):
        queryset.update(status=Listing.Status.ARCHIVED)


class ProjectNeedInline(admin.TabularInline):
    model = ProjectNeed
    extra = 0
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "city", "visibility", "status", "created_at")
    list_filter = ("visibility", "status", "city")
    search_fields = ("title", "description", "owner__phone", "owner__user_code", "city")
    readonly_fields = ("public_id", "share_token", "created_at", "updated_at")
    inlines = [ProjectNeedInline]


@admin.register(ProjectNeed)
class ProjectNeedAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "need_type", "quantity_required", "quantity_fulfilled", "unit", "status", "capacity_mode")
    list_filter = ("need_type", "status", "capacity_mode")
    search_fields = ("title", "project__title", "description")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("id", "applicant", "listing", "need", "status", "proposed_amount", "created_at")
    list_filter = ("status", "currency", "created_at")
    search_fields = ("applicant__phone", "applicant__user_code", "listing__title", "need__title", "need__project__title")
    readonly_fields = ("created_at", "updated_at", "owner_decided_at", "applicant_confirmed_at")


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "role", "active", "joined_at")
    list_filter = ("role", "active")
    search_fields = ("project__title", "user__phone", "user__user_code")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "conversation_type", "application", "project", "is_archived", "updated_at")
    list_filter = ("conversation_type", "is_archived")
    search_fields = ("title", "participants__phone", "participants__user_code")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at", "is_deleted")
    list_filter = ("is_deleted", "created_at")
    search_fields = ("body", "sender__phone", "sender__user_code")
    readonly_fields = ("created_at", "edited_at")


@admin.register(ContactAccessGrant)
class ContactAccessGrantAdmin(admin.ModelAdmin):
    list_display = ("owner", "viewer", "listing", "project", "status", "expires_at", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("owner__phone", "viewer__phone", "owner__user_code", "viewer__user_code")
    readonly_fields = ("created_at", "revoked_at")


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_type", "creator", "starts_at", "project", "application")
    list_filter = ("event_type", "starts_at")
    search_fields = ("title", "creator__phone", "project__title")
    readonly_fields = ("created_at",)


@admin.register(AdPlacement)
class AdPlacementAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "page", "is_active", "max_width", "max_height")
    list_filter = ("page", "is_active")
    search_fields = ("name", "key", "description")


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = ("title", "advertiser_name", "status", "starts_at", "ends_at", "impressions", "clicks")
    list_filter = ("status", "placements")
    search_fields = ("title", "advertiser_name")
    readonly_fields = ("created_at", "impressions", "clicks")


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("phone", "expires_at", "attempts", "consumed_at", "created_at")
    search_fields = ("phone",)
    list_filter = ("created_at", "consumed_at")
    readonly_fields = ("phone", "code_hash", "expires_at", "attempts", "consumed_at", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ListingAccessGrant)
class ListingAccessGrantAdmin(admin.ModelAdmin):
    list_display = ("listing", "user", "invited_by", "active", "expires_at", "created_at")
    list_filter = ("active", "created_at")
    search_fields = ("listing__title", "user__phone", "user__user_code", "invited_by__phone")
    readonly_fields = ("created_at", "revoked_at")
