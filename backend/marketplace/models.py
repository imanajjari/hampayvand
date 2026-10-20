import secrets
import string
import uuid
from decimal import Decimal

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone


phone_validator = RegexValidator(r"^09\d{9}$", "شمارهٔ همراه باید با قالب 09xxxxxxxxx وارد شود.")


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError("شمارهٔ همراه الزامی است.")
        phone = phone.strip().replace(" ", "")
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self.create_user(phone, password, **extra_fields)


class User(AbstractUser):
    username = None
    phone = models.CharField("شمارهٔ همراه", max_length=11, unique=True, validators=[phone_validator])
    user_code = models.CharField("شناسهٔ کاربری", max_length=18, unique=True, blank=True, editable=False)
    full_name = models.CharField("نام نمایشی", max_length=120, blank=True)
    city = models.CharField("شهر", max_length=80, blank=True)
    bio = models.TextField("معرفی", blank=True)
    contact_email = models.EmailField("ایمیل ارتباطی", blank=True)
    telegram_url = models.URLField("پیوند تلگرام", blank=True)
    whatsapp_url = models.URLField("پیوند واتساپ", blank=True)
    linkedin_url = models.URLField("پیوند لینکدین", blank=True)
    resume_url = models.URLField("پیوند رزومه", blank=True)
    website_url = models.URLField("وب‌سایت شخصی", blank=True)
    other_links = models.JSONField("پیوندهای دیگر", default=list, blank=True)
    phone_verified = models.BooleanField("شمارهٔ همراه تأییدشده", default=False)
    identity_verified = models.BooleanField("هویت تأییدشده", default=False)
    business_verified = models.BooleanField("کسب‌وکار/دارایی تأییدشده", default=False)
    contact_visibility = models.CharField(
        "نمایش عمومی اطلاعات تماس", max_length=16,
        choices=[("all", "عمومی"), ("logged", "کاربران واردشده"), ("members", "افراد مجاز"), ("none", "فقط پیام داخلی")],
        default="members",
    )
    contact_preferences = models.JSONField("تنظیمات مستقل راه‌های تماس", default=dict, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    objects = UserManager()
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"
        ordering = ["-date_joined"]

    def __str__(self):
        return self.full_name or self.user_code or self.phone

    def save(self, *args, **kwargs):
        if not self.user_code:
            alphabet = string.ascii_uppercase + string.digits
            for _ in range(12):
                candidate = "HP-" + "".join(secrets.choice(alphabet) for _ in range(7))
                if not User.objects.filter(user_code=candidate).exists():
                    self.user_code = candidate
                    break
        if not self.full_name:
            self.full_name = "کاربر هم‌پیوند"
        super().save(*args, **kwargs)


class Listing(models.Model):
    class ListingType(models.TextChoices):
        JOB = "job", "استخدام نیروی انسانی"
        RESOURCE = "resource", "ملک و تجهیزات"
        SKILL = "skill", "مهارت و خدمت"
        SUPPLY = "supply", "تأمین کالا و مصالح"
        CAPITAL = "capital", "سرمایه و مشارکت"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "عمومی"
        UNLISTED = "unlisted", "مخفی با لینک اختصاصی"
        PRIVATE = "private", "خصوصی و دعوت‌محور"

    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        PUBLISHED = "published", "منتشرشده"
        PAUSED = "paused", "متوقف"
        ARCHIVED = "archived", "بایگانی‌شده"
        EXPIRED = "expired", "منقضی‌شده"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full", "تمام‌وقت"
        PART_TIME = "part", "پاره‌وقت"
        SHIFT = "shift", "شیفتی"
        PROJECT = "project", "پروژه‌ای"
        TEMPORARY = "temporary", "موقت"
        CONTRACT = "contract", "قراردادی"

    class GenderRequirement(models.TextChoices):
        ANY = "any", "بدون محدودیت"
        MALE = "male", "آقا"
        FEMALE = "female", "خانم"

    class Insurance(models.TextChoices):
        YES = "yes", "دارد"
        NO = "no", "ندارد"
        NEGOTIABLE = "negotiable", "قابل مذاکره"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listings", verbose_name="مالک آگهی")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    listing_type = models.CharField("نوع آگهی", max_length=16, choices=ListingType.choices)
    category = models.CharField("دسته‌بندی", max_length=100, blank=True)
    title = models.CharField("عنوان", max_length=180)
    description = models.TextField("شرح آگهی")
    city = models.CharField("شهر", max_length=80, db_index=True)
    area = models.CharField("محدوده یا نشانی عمومی", max_length=240, blank=True)
    latitude = models.DecimalField("عرض جغرافیایی", max_digits=9, decimal_places=6, null=True, blank=True, validators=[MinValueValidator(Decimal("-90")), MaxValueValidator(Decimal("90"))])
    longitude = models.DecimalField("طول جغرافیایی", max_digits=9, decimal_places=6, null=True, blank=True, validators=[MinValueValidator(Decimal("-180")), MaxValueValidator(Decimal("180"))])
    show_exact_location = models.BooleanField("نمایش موقعیت دقیق", default=False)
    visibility = models.CharField("سطح دسترسی", max_length=12, choices=Visibility.choices, default=Visibility.PUBLIC, db_index=True)
    share_token = models.UUIDField("شناسهٔ لینک خصوصی", default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField("وضعیت", max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    quantity = models.DecimalField("مقدار", max_digits=14, decimal_places=3, null=True, blank=True, validators=[MinValueValidator(Decimal("0.001"))])
    unit = models.CharField("واحد اندازه‌گیری", max_length=40, blank=True)
    currency = models.CharField("واحد پول", max_length=12, default="تومان")
    price_min = models.DecimalField("حداقل قیمت", max_digits=18, decimal_places=0, null=True, blank=True)
    price_max = models.DecimalField("حداکثر قیمت", max_digits=18, decimal_places=0, null=True, blank=True)
    employment_type = models.CharField("نوع همکاری", max_length=12, choices=EmploymentType.choices, blank=True)
    gender_requirement = models.CharField("شرط جنسیت", max_length=8, choices=GenderRequirement.choices, default=GenderRequirement.ANY)
    salary_min = models.DecimalField("حداقل حقوق ماهانه", max_digits=15, decimal_places=0, null=True, blank=True)
    salary_max = models.DecimalField("حداکثر حقوق ماهانه", max_digits=15, decimal_places=0, null=True, blank=True)
    working_days = models.CharField("روزهای کاری", max_length=120, blank=True)
    working_hours = models.CharField("ساعت کاری", max_length=120, blank=True)
    insurance = models.CharField("وضعیت بیمه", max_length=12, choices=Insurance.choices, default=Insurance.NEGOTIABLE)
    starts_at = models.DateTimeField("شروع دسترس‌پذیری", null=True, blank=True)
    ends_at = models.DateTimeField("پایان دسترس‌پذیری", null=True, blank=True)
    attributes = models.JSONField("مشخصات تکمیلی دسته‌بندی", default=dict, blank=True)
    expires_at = models.DateTimeField("انقضای آگهی", null=True, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    class Meta:
        verbose_name = "آگهی"
        verbose_name_plural = "آگهی‌ها"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["listing_type", "status", "visibility"]), models.Index(fields=["city", "listing_type"])]

    def __str__(self):
        return self.title

    @property
    def is_active(self):
        return self.status == self.Status.PUBLISHED and (self.expires_at is None or self.expires_at > timezone.now())


class ListingAccessGrant(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="access_grants", verbose_name="آگهی")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listing_access_grants", verbose_name="کاربر دعوت‌شده")
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listing_invites_sent", verbose_name="دعوت‌کننده")
    active = models.BooleanField("دسترسی فعال", default=True)
    expires_at = models.DateTimeField("انقضای دسترسی", null=True, blank=True)
    created_at = models.DateTimeField("زمان دعوت", auto_now_add=True)
    revoked_at = models.DateTimeField("زمان لغو", null=True, blank=True)

    class Meta:
        verbose_name = "دعوت به آگهی خصوصی"
        verbose_name_plural = "دعوت‌های آگهی خصوصی"
        constraints = [models.UniqueConstraint(fields=["listing", "user"], name="unique_listing_invite")]

    def __str__(self):
        return f"{self.user} → {self.listing}"

    @property
    def is_active(self):
        return self.active and (not self.expires_at or self.expires_at > timezone.now())


class Project(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = "public", "عمومی"
        UNLISTED = "unlisted", "مخفی با لینک اختصاصی"
        PRIVATE = "private", "خصوصی و دعوت‌محور"

    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        RECRUITING = "recruiting", "در حال جذب همکار"
        ACTIVE = "active", "در حال اجرا"
        PAUSED = "paused", "متوقف"
        COMPLETED = "completed", "تکمیل‌شده"
        ARCHIVED = "archived", "بایگانی‌شده"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects", verbose_name="سازندهٔ پروژه")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField("عنوان پروژه", max_length=180)
    description = models.TextField("شرح پروژه")
    city = models.CharField("شهر", max_length=80, blank=True, db_index=True)
    area = models.CharField("محدودهٔ عمومی", max_length=240, blank=True)
    latitude = models.DecimalField("عرض جغرافیایی", max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField("طول جغرافیایی", max_digits=9, decimal_places=6, null=True, blank=True)
    show_exact_location = models.BooleanField("نمایش موقعیت دقیق", default=False)
    visibility = models.CharField("سطح دسترسی", max_length=12, choices=Visibility.choices, default=Visibility.PUBLIC, db_index=True)
    share_token = models.UUIDField("شناسهٔ لینک خصوصی", default=uuid.uuid4, unique=True, editable=False)
    status = models.CharField("وضعیت پروژه", max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    start_date = models.DateField("تاریخ شروع", null=True, blank=True)
    target_end_date = models.DateField("تاریخ هدف پایان", null=True, blank=True)
    attributes = models.JSONField("اطلاعات تکمیلی", default=dict, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    class Meta:
        verbose_name = "پروژه"
        verbose_name_plural = "پروژه‌ها"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ProjectMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "سازنده"
        MANAGER = "manager", "مدیر پروژه"
        MEMBER = "member", "عضو پذیرفته‌شده"
        VIEWER = "viewer", "مشاهده‌گر"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members", verbose_name="پروژه")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="project_memberships", verbose_name="کاربر")
    role = models.CharField("نقش", max_length=10, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField("زمان عضویت", auto_now_add=True)
    active = models.BooleanField("عضویت فعال", default=True)

    class Meta:
        verbose_name = "عضو پروژه"
        verbose_name_plural = "اعضای پروژه"
        constraints = [models.UniqueConstraint(fields=["project", "user"], name="unique_project_member")]

    def __str__(self):
        return f"{self.user} - {self.project}"


class ProjectNeed(models.Model):
    class NeedType(models.TextChoices):
        JOB = "job", "نیروی انسانی"
        RESOURCE = "resource", "ملک یا فضای کار"
        EQUIPMENT = "equipment", "دستگاه و تجهیزات"
        SUPPLY = "supply", "کالا و مواد اولیه"
        CAPITAL = "capital", "سرمایه"
        SKILL = "skill", "مهارت یا خدمت"

    class CapacityMode(models.TextChoices):
        SINGLE = "single", "یک تأمین‌کننده/پیشنهاد نهایی"
        MULTIPLE = "multiple", "پذیرش چند تأمین‌کننده"

    class Status(models.TextChoices):
        OPEN = "open", "باز برای پیشنهاد"
        NEGOTIATING = "negotiating", "در حال مذاکره"
        FULFILLED = "fulfilled", "تأمین‌شده"
        PAUSED = "paused", "متوقف"
        CANCELLED = "cancelled", "لغوشده"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="needs", verbose_name="پروژه")
    need_type = models.CharField("نوع نیاز", max_length=12, choices=NeedType.choices)
    title = models.CharField("عنوان نیاز", max_length=180)
    description = models.TextField("شرح نیاز", blank=True)
    quantity_required = models.DecimalField("مقدار موردنیاز", max_digits=14, decimal_places=3, default=Decimal("1"), validators=[MinValueValidator(Decimal("0.001"))])
    quantity_fulfilled = models.DecimalField("مقدار تأمین‌شده", max_digits=14, decimal_places=3, default=Decimal("0"), validators=[MinValueValidator(Decimal("0"))])
    unit = models.CharField("واحد", max_length=40, default="مورد")
    capacity_mode = models.CharField("روش تأمین", max_length=10, choices=CapacityMode.choices, default=CapacityMode.SINGLE)
    max_providers = models.PositiveSmallIntegerField("حداکثر تأمین‌کننده", null=True, blank=True)
    price_min = models.DecimalField("حداقل بودجه", max_digits=18, decimal_places=0, null=True, blank=True)
    price_max = models.DecimalField("حداکثر بودجه", max_digits=18, decimal_places=0, null=True, blank=True)
    currency = models.CharField("واحد پول", max_length=12, default="تومان")
    starts_at = models.DateTimeField("زمان موردنیاز از", null=True, blank=True)
    ends_at = models.DateTimeField("زمان موردنیاز تا", null=True, blank=True)
    mandatory_fields = models.JSONField("فیلدهای الزامی فرم پیشنهاد", default=list, blank=True)
    attributes = models.JSONField("شرایط تخصصی", default=dict, blank=True)
    status = models.CharField("وضعیت نیاز", max_length=12, choices=Status.choices, default=Status.OPEN, db_index=True)
    position = models.PositiveSmallIntegerField("ترتیب نمایش", default=0)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین ویرایش", auto_now=True)

    class Meta:
        verbose_name = "نیاز پروژه"
        verbose_name_plural = "نیازهای پروژه"
        ordering = ["position", "created_at"]

    def __str__(self):
        return f"{self.project.title} - {self.title}"

    @property
    def remaining_quantity(self):
        return max(Decimal("0"), self.quantity_required - self.quantity_fulfilled)


class Application(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "جدید"
        NEGOTIATING = "negotiating", "در حال مذاکره"
        SHORTLISTED = "shortlisted", "پذیرفته‌شدهٔ اولیه"
        CONFIRMED = "confirmed", "توافق نهایی"
        REJECTED = "rejected", "ردشده"
        WITHDRAWN = "withdrawn", "انصراف"
        ARCHIVED = "archived", "بایگانی‌شده"
        EXPIRED = "expired", "منقضی‌شده"

    applicant = models.ForeignKey(User, on_delete=models.CASCADE, related_name="applications", verbose_name="متقاضی")
    listing = models.ForeignKey(Listing, null=True, blank=True, on_delete=models.CASCADE, related_name="applications", verbose_name="آگهی مستقل")
    need = models.ForeignKey(ProjectNeed, null=True, blank=True, on_delete=models.CASCADE, related_name="applications", verbose_name="نیاز پروژه")
    offered_listing = models.ForeignKey(Listing, null=True, blank=True, on_delete=models.SET_NULL, related_name="offered_in_applications", verbose_name="منبع/مهارت پیشنهادی")
    cover_message = models.TextField("پیام یا شرح پیشنهاد", blank=True)
    proposed_quantity = models.DecimalField("مقدار پیشنهادی", max_digits=14, decimal_places=3, null=True, blank=True)
    proposed_amount = models.DecimalField("مبلغ پیشنهادی", max_digits=18, decimal_places=0, null=True, blank=True)
    currency = models.CharField("واحد پول", max_length=12, default="تومان")
    proposed_terms = models.JSONField("شرایط پیشنهادی", default=dict, blank=True)
    status = models.CharField("وضعیت درخواست", max_length=14, choices=Status.choices, default=Status.NEW, db_index=True)
    owner_note = models.TextField("یادداشت خصوصی مدیر آگهی", blank=True)
    owner_decided_at = models.DateTimeField("زمان تصمیم مدیر", null=True, blank=True)
    applicant_confirmed_at = models.DateTimeField("زمان تأیید متقاضی", null=True, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین تغییر", auto_now=True)

    class Meta:
        verbose_name = "درخواست همکاری"
        verbose_name_plural = "درخواست‌های همکاری"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["need", "applicant"], condition=models.Q(need__isnull=False), name="unique_applicant_per_need"),
            models.UniqueConstraint(fields=["listing", "applicant"], condition=models.Q(listing__isnull=False), name="unique_applicant_per_listing"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if bool(self.listing_id) == bool(self.need_id):
            raise ValidationError("درخواست باید دقیقاً به یک آگهی مستقل یا یک نیاز پروژه متصل باشد.")
        owner = self.listing.owner if self.listing_id else self.need.project.owner
        if self.applicant_id and owner.pk == self.applicant_id:
            raise ValidationError("نمی‌توانی برای آگهی یا نیاز خودت درخواست بفرستی.")

    def save(self, *args, **kwargs):
        self.full_clean(exclude=None)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"درخواست {self.applicant} ({self.get_status_display()})"


class Conversation(models.Model):
    class ConversationType(models.TextChoices):
        PRIVATE = "private", "گفت‌وگوی درخواست"
        PROJECT_ROOM = "project", "روم تیم پروژه"

    conversation_type = models.CharField("نوع گفتگو", max_length=10, choices=ConversationType.choices, default=ConversationType.PRIVATE)
    title = models.CharField("عنوان گفتگو", max_length=180, blank=True)
    application = models.ForeignKey(Application, null=True, blank=True, on_delete=models.SET_NULL, related_name="conversations", verbose_name="درخواست مرتبط")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="conversations", verbose_name="پروژهٔ مرتبط")
    participants = models.ManyToManyField(User, related_name="conversations", verbose_name="شرکت‌کنندگان")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="created_conversations", verbose_name="سازندهٔ گفتگو")
    is_archived = models.BooleanField("بایگانی‌شده", default=False)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    updated_at = models.DateTimeField("آخرین فعالیت", auto_now=True)

    class Meta:
        verbose_name = "گفتگو / روم"
        verbose_name_plural = "گفتگوها و روم‌ها"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or f"گفتگوی شمارهٔ {self.pk or 'جدید'}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages", verbose_name="گفتگو")
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sent_messages", verbose_name="فرستنده")
    body = models.TextField("متن پیام", max_length=10000)
    attachment = models.FileField("پیوست", upload_to="chat/%Y/%m/", null=True, blank=True)
    read_by = models.ManyToManyField(User, related_name="read_messages", blank=True, verbose_name="خوانده‌شده توسط")
    created_at = models.DateTimeField("زمان ارسال", auto_now_add=True)
    edited_at = models.DateTimeField("زمان ویرایش", null=True, blank=True)
    is_deleted = models.BooleanField("حذف‌شده", default=False)

    class Meta:
        verbose_name = "پیام"
        verbose_name_plural = "پیام‌ها"
        ordering = ["created_at"]

    def __str__(self):
        return f"پیام {self.pk} در گفتگو {self.conversation_id}"


class ContactAccessGrant(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "فعال"
        REVOKED = "revoked", "لغوشده"
        EXPIRED = "expired", "منقضی‌شده"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contact_grants_created", verbose_name="صاحب اطلاعات تماس")
    viewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contact_grants_received", verbose_name="کاربر دریافت‌کنندهٔ مجوز")
    listing = models.ForeignKey(Listing, null=True, blank=True, on_delete=models.CASCADE, related_name="contact_grants", verbose_name="آگهی مرتبط")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="contact_grants", verbose_name="پروژهٔ مرتبط")
    allowed_fields = models.JSONField("راه‌های تماس مجاز", default=list, blank=True)
    status = models.CharField("وضعیت دسترسی", max_length=10, choices=Status.choices, default=Status.ACTIVE)
    expires_at = models.DateTimeField("انقضای مجوز", null=True, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)
    revoked_at = models.DateTimeField("زمان لغو", null=True, blank=True)

    class Meta:
        verbose_name = "مجوز دسترسی به اطلاعات تماس"
        verbose_name_plural = "مجوزهای اطلاعات تماس"

    def clean(self):
        from django.core.exceptions import ValidationError
        if bool(self.listing_id) == bool(self.project_id):
            raise ValidationError("مجوز باید به یک آگهی یا یک پروژه متصل باشد.")
        if self.owner_id == self.viewer_id:
            raise ValidationError("مالک نیازی به اعطای مجوز به خودش ندارد.")

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE and (not self.expires_at or self.expires_at > timezone.now())


class CalendarEvent(models.Model):
    class EventType(models.TextChoices):
        MEETING = "meeting", "جلسه / مذاکره"
        DEADLINE = "deadline", "مهلت پاسخ"
        START = "start", "شروع همکاری"
        DELIVERY = "delivery", "تحویل کالا یا تجهیز"
        OTHER = "other", "سایر"

    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name="calendar_events", verbose_name="سازنده رویداد")
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name="calendar_events", verbose_name="پروژه")
    application = models.ForeignKey(Application, null=True, blank=True, on_delete=models.CASCADE, related_name="calendar_events", verbose_name="درخواست")
    participants = models.ManyToManyField(User, related_name="calendar_invitations", blank=True, verbose_name="شرکت‌کنندگان")
    event_type = models.CharField("نوع رویداد", max_length=10, choices=EventType.choices, default=EventType.MEETING)
    title = models.CharField("عنوان", max_length=180)
    description = models.TextField("توضیحات", blank=True)
    starts_at = models.DateTimeField("شروع", db_index=True)
    ends_at = models.DateTimeField("پایان", null=True, blank=True)
    timezone_name = models.CharField("منطقهٔ زمانی", max_length=64, default="Asia/Tehran")
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)

    class Meta:
        verbose_name = "رویداد تقویم"
        verbose_name_plural = "رویدادهای تقویم"
        ordering = ["starts_at"]

    def __str__(self):
        return self.title


class AdPlacement(models.Model):
    key = models.SlugField("شناسهٔ جایگاه", unique=True)
    name = models.CharField("نام جایگاه", max_length=120)
    description = models.CharField("توضیحات", max_length=240, blank=True)
    page = models.CharField("صفحه", max_length=60, blank=True)
    is_active = models.BooleanField("فعال", default=True)
    max_width = models.PositiveIntegerField("حداکثر عرض", null=True, blank=True)
    max_height = models.PositiveIntegerField("حداکثر ارتفاع", null=True, blank=True)

    class Meta:
        verbose_name = "جایگاه تبلیغاتی"
        verbose_name_plural = "جایگاه‌های تبلیغاتی"

    def __str__(self):
        return self.name


class Advertisement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        ACTIVE = "active", "فعال"
        PAUSED = "paused", "متوقف"
        ENDED = "ended", "پایان‌یافته"

    title = models.CharField("عنوان تبلیغ", max_length=180)
    advertiser_name = models.CharField("نام تبلیغ‌دهنده", max_length=180)
    image = models.ImageField("تصویر تبلیغ", upload_to="ads/%Y/%m/", null=True, blank=True)
    target_url = models.URLField("پیوند مقصد")
    placements = models.ManyToManyField(AdPlacement, related_name="advertisements", verbose_name="جایگاه‌ها")
    starts_at = models.DateTimeField("شروع نمایش", null=True, blank=True)
    ends_at = models.DateTimeField("پایان نمایش", null=True, blank=True)
    status = models.CharField("وضعیت", max_length=10, choices=Status.choices, default=Status.DRAFT)
    impressions = models.PositiveBigIntegerField("تعداد نمایش", default=0)
    clicks = models.PositiveBigIntegerField("تعداد کلیک", default=0)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)

    class Meta:
        verbose_name = "تبلیغ"
        verbose_name_plural = "تبلیغات"

    def __str__(self):
        return self.title


class OTPCode(models.Model):
    phone = models.CharField("شمارهٔ همراه", max_length=11, db_index=True, validators=[phone_validator])
    code_hash = models.CharField("هش کد", max_length=256)
    expires_at = models.DateTimeField("انقضا", db_index=True)
    attempts = models.PositiveSmallIntegerField("تعداد تلاش", default=0)
    consumed_at = models.DateTimeField("زمان مصرف", null=True, blank=True)
    created_at = models.DateTimeField("زمان ایجاد", auto_now_add=True)

    class Meta:
        verbose_name = "کد ورود یک‌بارمصرف"
        verbose_name_plural = "کدهای ورود یک‌بارمصرف"
        ordering = ["-created_at"]

    @property
    def is_valid(self):
        return self.consumed_at is None and self.expires_at > timezone.now() and self.attempts < 5
