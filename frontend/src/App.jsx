import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Search, Bell, Menu, X, UserRound, Plus, MapPin, Users, Building2,
  Package, Truck, CircleDollarSign, BriefcaseBusiness, Wrench, Clock3,
  ShieldCheck, SlidersHorizontal, Eye, MessageCircle, CalendarDays,
  LayoutDashboard, FolderKanban, Bookmark, Send, CheckCircle2, LockKeyhole,
  Mail, Phone, Link2, BadgeCheck, TrendingUp, FileText, LogOut, Settings,
  Globe, Megaphone, ChevronDown, ArrowUpLeft, Star, Map, Handshake,
  Boxes, Building, Laptop, Wallet, CircleHelp, Filter, CalendarCheck,
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink, UserCheck, EyeOff, Clock,
} from 'lucide-react'
import MapPicker from './components/MapPicker.jsx'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false'
const toEnglishDigits = (value = '') => String(value).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
const authConfig = () => { const token = sessionStorage.getItem('hampayvand_token'); return token && token !== 'demo-session' ? { headers: { Authorization: `Token ${token}` } } : {} }

const sampleItems = [
  {
    id: 1, type: 'project', eyebrow: 'پروژهٔ در حال تکمیل تیم', title: 'راه‌اندازی تولیدی لیوان کاغذی',
    description: 'برای تکمیل تیم و تأمین تجهیزات یک کارگاه تولیدی، به چند همکار قابل‌اعتماد نیاز داریم.', city: 'تهران', area: 'شهرک صنعتی شمس‌آباد',
    owner: 'علی رضایی', initials: 'ع‌ر', color: 'mint', tags: ['تولید', 'همکاری بلندمدت'], needs: 4, filled: 2, time: '۲ ساعت پیش', visibility: 'public',
  },
  {
    id: 2, type: 'resource', eyebrow: 'سوله و فضای صنعتی', title: 'سولهٔ ۸۰۰ متری با برق سه‌فاز',
    description: 'مناسب کارگاه سبک و خط تولید. دسترسی ماشین سنگین و فضای بارگیری دارد.', city: 'تهران', area: 'جادهٔ مخصوص کرج',
    owner: 'مریم احمدی', initials: 'م‌ا', color: 'amber', price: 'قابل مذاکره', tags: ['۸۰۰ مترمربع', 'برق سه‌فاز'], time: 'امروز', visibility: 'public',
  },
  {
    id: 3, type: 'skill', eyebrow: 'نیروی متخصص', title: 'اپراتور دستگاه تولید و بسته‌بندی',
    description: 'آشنا با کنترل کیفیت، تنظیم دستگاه و ثبت گزارش تولید؛ آموزش تکمیلی امکان‌پذیر است.', city: 'تهران', area: 'محدودهٔ غرب تهران',
    owner: 'گروه صنعتی آریا', initials: 'آ', color: 'blue', salary: 'حقوق توافقی', tags: ['تمام‌وقت', 'بیمه'], time: 'امروز',
  },
  {
    id: 4, type: 'supply', eyebrow: 'تأمین کالا و مواد اولیه', title: 'تأمین رول کاغذ مخصوص لیوان',
    description: 'امکان تأمین مرحله‌ای و ارسال نمونه پیش از ثبت سفارش؛ مشخصات فنی در صفحهٔ جزئیات.', city: 'البرز', area: 'کرج و ارسال سراسری',
    owner: 'بازرگانی سپهر', initials: 'س', color: 'violet', price: 'استعلام قیمت', tags: ['تحویل مرحله‌ای', 'فاکتور رسمی'], time: 'دیروز',
  },
  {
    id: 5, type: 'resource', eyebrow: 'ماشین‌آلات و تجهیزات', title: 'دستگاه چاپ و برش لیوان کاغذی',
    description: 'دستگاه قابل بازدید، مناسب کارگاه در حال توسعه؛ اجاره یا مشارکت قابل بررسی است.', city: 'قزوین', area: 'شهرک صنعتی لیا',
    owner: 'رضا محمدی', initials: 'ر‌م', color: 'blue', price: 'اجاره / مشارکت', tags: ['قابل بازدید', 'ظرفیت صنعتی'], time: '۲ روز پیش',
  },
  {
    id: 6, type: 'capital', eyebrow: 'سرمایه و مشارکت', title: 'همراهی سرمایه‌گذار برای توسعهٔ کارگاه',
    description: 'به‌دنبال شریک مالی برای توسعهٔ ظرفیت تولید هستیم. مدل مشارکت و گزارش مالی در مذاکره بررسی می‌شود.', city: 'تهران', area: 'قابل مذاکره',
    owner: 'توسعه‌گران فردا', initials: 'ف', color: 'mint', price: 'شرایط در جزئیات', tags: ['مشارکت', 'کسب‌وکار فعال'], time: '۳ روز پیش',
  },
]

const categories = [
  { id: 'project', title: 'پروژه و همکاری', description: 'نیازها را یکجا جمع کن', icon: FolderKanban, tone: 'mint', count: 'پروژه‌ها' },
  { id: 'job', title: 'نیروی انسانی', description: 'استخدام و مهارت', icon: BriefcaseBusiness, tone: 'blue', count: 'فرصت شغلی' },
  { id: 'resource', title: 'ملک و تجهیزات', description: 'سوله، زمین و دستگاه', icon: Building2, tone: 'amber', count: 'منابع' },
  { id: 'supply', title: 'کالا و مصالح', description: 'تأمین با مقدار مشخص', icon: Boxes, tone: 'violet', count: 'تأمین‌کننده' },
  { id: 'capital', title: 'سرمایه و مشارکت', description: 'همکار مالی و تجاری', icon: CircleDollarSign, tone: 'green', count: 'فرصت سرمایه' },
  { id: 'skill', title: 'خدمت و تخصص', description: 'توانایی‌ات را ارائه کن', icon: Wrench, tone: 'rose', count: 'مهارت‌ها' },
]

const typeOptions = [
  { id: 'project', label: 'پروژه' }, { id: 'job', label: 'استخدام' }, { id: 'resource', label: 'منبع / تجهیز' },
  { id: 'skill', label: 'مهارت / خدمت' }, { id: 'supply', label: 'تأمین کالا' }, { id: 'capital', label: 'سرمایه' },
]

const listingTone = (type) => ({ resource: 'amber', supply: 'violet', capital: 'mint', skill: 'blue', job: 'blue' }[type] || 'mint')
const dateLabel = (value) => {
  if (!value) return 'تازه'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'تازه' : new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(date)
}
const mapServerListing = (data) => ({
  id: `listing-${data.id}`, backendListingId: data.id, apiKind: 'listing', isDemo: false, type: data.listing_type,
  eyebrow: data.category || (typeOptions.find((x) => x.id === data.listing_type)?.label || 'آگهی'), title: data.title,
  description: data.description, city: data.city, area: data.area, owner: data.owner?.full_name || 'کاربر هم‌پیوند',
  initials: (data.owner?.full_name || 'ه').slice(0, 2), color: listingTone(data.listing_type), visibility: data.visibility,
  status: data.status, time: dateLabel(data.created_at), quantity: data.quantity, unit: data.unit,
  price: data.price_min ? `${faNumber(data.price_min)} تومان` : (data.attributes?.amount || undefined),
  salary: data.attributes?.salary_text || (data.salary_min ? `${faNumber(data.salary_min)} تومان` : undefined),
  tags: [data.employment_type ? ({full:'تمام‌وقت',part:'پاره‌وقت',shift:'شیفتی',project:'پروژه‌ای',temporary:'موقت',contract:'قراردادی'}[data.employment_type] || data.employment_type) : '', data.insurance === 'yes' ? 'بیمه' : '', data.quantity ? `${faNumber(data.quantity)} ${data.unit || 'مورد'}` : ''].filter(Boolean),
  shareToken: data.share_token, latitude: data.latitude, longitude: data.longitude,
})
const mapServerProject = (data) => {
  const needRows = data.needs || []
  const filled = needRows.filter((need) => need.status === 'fulfilled').length
  return {
    id: `project-${data.id}`, backendProjectId: data.id, apiKind: 'project', apiPublicId: data.public_id, shareToken: data.share_token,
    isDemo: false, type: 'project', eyebrow: 'پروژهٔ در حال تکمیل تیم', title: data.title, description: data.description,
    city: data.city || 'بدون شهر', area: data.area, owner: data.owner?.full_name || 'کاربر هم‌پیوند', initials: (data.owner?.full_name || 'ه').slice(0, 2),
    color: 'mint', visibility: data.visibility, status: data.status, needs: needRows.length, filled, needsData: needRows,
    time: dateLabel(data.created_at), tags: needRows.slice(0, 2).map((need) => need.title),
  }
}
const faNumber = (value) => new Intl.NumberFormat('fa-IR').format(value)
const dateToYMD = (date) => date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : null
const dateToISOAtNoon = (date, late = false) => {
  if (!date) return null
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate(), late ? 23 : 12, late ? 59 : 0, late ? 59 : 0)
  return value.toISOString()
}

function Brand({ compact = false, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 text-right" aria-label="رفتن به صفحهٔ اصلی">
      <span className="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-[15px]">
        <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
          <path d="M7 15 17 9l10 6v12l-10 6L7 27Z" fill="#21B5A5" />
          <path d="m21 22 10-6 10 6v12l-10 6-10-6Z" fill="#F3B74F" />
          <path d="m17 21 7-4 7 4v8l-7 4-7-4Z" fill="#fff" />
          <circle cx="24" cy="25" r="3" fill="#172B4D" />
        </svg>
      </span>
      {!compact && <span className="flex flex-col leading-tight">
        <span className="text-[21px] font-black tracking-tight text-[#172B4D]">هم‌پیوند</span>
        <span className="mt-1 text-[10px] font-medium text-slate-500">آدم‌ها، منابع و فرصت‌ها؛ کنار هم</span>
      </span>}
    </button>
  )
}

function AdSlot({ title = 'محل نمایش تبلیغات شماست', detail = 'این جایگاه برای کسب‌وکارهای مرتبط در نظر گرفته شده است.', compact = false }) {
  return (
    <div className={`ad-slot ${compact ? 'ad-slot-compact' : ''}`}>
      <div className="flex items-center justify-center gap-2 text-[#5D708A]">
        <Megaphone size={compact ? 16 : 20} />
        <span className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>{title}</span>
      </div>
      {!compact && <p className="mt-1 text-center text-xs text-slate-400">{detail}</p>}
      <span className="ad-chip">جایگاه تبلیغاتی</span>
    </div>
  )
}

function Badge({ children, tone = 'slate' }) {
  const styles = {
    slate: 'bg-slate-100 text-slate-600', mint: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-800', violet: 'bg-violet-50 text-violet-700', green: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone] || styles.slate}`}>{children}</span>
}

function CategoryIcon({ icon: Icon, tone }) {
  return <span className={`category-icon category-${tone}`}><Icon size={23} strokeWidth={1.9} /></span>
}

function ListingCard({ item, onClick, onSave, saved }) {
  const tone = item.color || 'mint'
  const iconMap = { project: FolderKanban, resource: Building2, skill: BriefcaseBusiness, supply: Boxes, capital: CircleDollarSign, job: BriefcaseBusiness }
  const Icon = iconMap[item.type] || Package
  return (
    <article className="listing-card group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-start gap-3">
        <div className={`listing-symbol listing-${tone}`}><Icon size={22} /></div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={tone}>{item.eyebrow}</Badge>
            {item.type === 'project' && <Badge tone="green">در حال جذب همکار</Badge>}
          </div>
          <button onClick={() => onClick(item)} className="text-right text-[15px] font-bold leading-7 text-[#172B4D] decoration-teal-600 underline-offset-4 hover:underline">{item.title}</button>
        </div>
        <button aria-label="ذخیره آگهی" onClick={() => onSave(item.id)} className={`rounded-xl p-2 transition ${saved ? 'bg-rose-50 text-rose-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[44px] text-sm leading-6 text-slate-500">{item.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(item.tags || []).map((tag) => <span key={tag} className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-500">{tag}</span>)}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin size={14} className="shrink-0 text-slate-400" />
        <span>{item.city} {item.area ? `· ${item.area}` : ''}</span>
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`avatar avatar-${tone}`}>{item.initials}</span>
            <span className="truncate text-xs font-medium text-slate-600">{item.owner}</span>
            {item.verified && <BadgeCheck size={14} className="shrink-0 text-teal-600" />}
          </div>
          <span className="shrink-0 text-[10px] text-slate-400">{item.time}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#172B4D]">{item.price || item.salary || (item.type === 'project' ? `${faNumber(item.filled)} از ${faNumber(item.needs)} نیاز تأمین شده` : 'جزئیات آگهی')}</span>
          <button onClick={() => onClick(item)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-50">مشاهده <ArrowUpLeft size={14} /></button>
        </div>
      </div>
    </article>
  )
}

function Field({ label, required, children, hint }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500">*</span>}</span>{children}{hint && <span className="mt-1 block text-xs leading-5 text-slate-400">{hint}</span>}</label>
}

function LoginModal({ onClose, onLogin }) {
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [demo, setDemo] = useState(false)

  const requestCode = async (event) => {
    event.preventDefault()
    const normalizedPhone = toEnglishDigits(phone).replaceAll(' ', '').replaceAll('-', '')
    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setMessage('شمارهٔ همراه را با قالب ۰۹۱۲۳۴۵۶۷۸۹ وارد کن.')
      return
    }
    setLoading(true); setMessage('')
    try {
      const res = await axios.post(`${API_BASE}/api/auth/request-otp/`, { phone: normalizedPhone }, { timeout: 2500 })
      setDemo(Boolean(res.data.demo));
      setStep('code');
      if (res.data.demo && res.data.demo_code) setMessage(`کد آزمایشی: ${res.data.demo_code}`)
      else setMessage('کد تأیید ارسال شد.');
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data?.detail || 'ارسال کد تأیید ناموفق بود. بعداً دوباره تلاش کن.')
      } else {
        setDemo(true); setStep('code'); setMessage('حالت پیش‌نمایش فعال است؛ کد آزمایشی ۱۲۳۴۵۶ را وارد کن.')
      }
    } finally { setLoading(false) }
  }
  const verify = async (event) => {
    event.preventDefault()
    if (code.trim() !== '123456' && demo) { setMessage('کد آزمایشی صحیح نیست. برای پیش‌نمایش از ۱۲۳۴۵۶ استفاده کن.'); return }
    setLoading(true); setMessage('')
    try {
      const normalizedPhone = toEnglishDigits(phone).replaceAll(' ', '').replaceAll('-', '')
      const res = await axios.post(`${API_BASE}/api/auth/verify-otp/`, { phone: normalizedPhone, code: toEnglishDigits(code) }, { timeout: 2500 })
      if (res.data.token) sessionStorage.setItem('hampayvand_token', res.data.token)
      onLogin({ phone: res.data.phone || normalizedPhone, userCode: res.data.user_code || 'HP-10482', name: res.data.full_name || 'کاربر هم‌پیوند' })
    } catch (error) {
      if (!error.response && code.trim() === '123456') {
        sessionStorage.setItem('hampayvand_token', 'demo-session')
        onLogin({ phone, userCode: 'HP-10482', name: 'کاربر هم‌پیوند' })
      } else setMessage(error.response?.data?.detail || 'کد واردشده درست نیست. در پیش‌نمایش از ۱۲۳۴۵۶ استفاده کن.')
    } finally { setLoading(false) }
  }

  return <ModalShell onClose={onClose} wide={false}>
    <div className="p-6 sm:p-8">
      <div className="mb-5 flex items-center justify-between"><Brand onClick={() => {}} /><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
      <div className="mb-6"><Badge tone="mint">ورود امن</Badge><h2 className="mt-3 text-2xl font-black text-[#172B4D]">{step === 'phone' ? 'خوش آمدی!' : 'کد تأیید را وارد کن'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{step === 'phone' ? 'با شمارهٔ همراه وارد شو تا بتوانی درخواست بفرستی، پیام بدهی و آگهی ثبت کنی.' : `کد شش‌رقمی برای ${phone} را وارد کن.`}</p></div>
      {step === 'phone' ? <form onSubmit={requestCode} className="space-y-4">
        <Field label="شمارهٔ تلفن همراه" required><div className="relative"><Phone size={18} className="absolute right-3 top-3.5 text-slate-400" /><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" className="form-input pr-10 text-left" /></div></Field>
        <button disabled={loading} className="primary-btn w-full">{loading ? 'در حال ارسال…' : 'دریافت کد تأیید'} <ArrowLeft size={17} /></button>
      </form> : <form onSubmit={verify} className="space-y-4">
        <Field label="کد یک‌بارمصرف" required><input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(toEnglishDigits(e.target.value).replace(/\D/g, ''))} dir="ltr" placeholder="۱۲۳۴۵۶" className="form-input text-center text-xl tracking-[.4em]" /></Field>
        <button disabled={loading || code.length < 6} className="primary-btn w-full">{loading ? 'در حال بررسی…' : 'ورود به هم‌پیوند'} <ArrowLeft size={17} /></button>
        <button type="button" onClick={() => { setStep('phone'); setCode(''); setMessage('') }} className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-teal-700">اصلاح شمارهٔ تلفن</button>
      </form>}
      {message && <div className={`mt-4 rounded-xl px-3 py-2 text-xs leading-6 ${demo ? 'bg-amber-50 text-amber-800' : 'bg-teal-50 text-teal-800'}`}>{message}</div>}
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-teal-700" /><span>کد آزمایشی فقط برای اجرای محلی و پیش‌نمایش است. پیش از انتشار، ارسال و اعتبارسنجی واقعی کد باید فعال باشد.</span></div>
    </div>
  </ModalShell>
}

function ModalShell({ children, onClose, wide = true }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><div className={`modal-panel ${wide ? 'max-w-3xl' : 'max-w-md'}`} role="dialog" aria-modal="true">{children}</div></div>
}

function PersianDatePicker({ label, value, onChange, placeholder = 'انتخاب تاریخ شمسی' }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(() => value || new Date())
  const cells = getPersianCalendarCells(anchor)
  const monthTitle = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(anchor)
  const shownValue = value ? new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(value) : ''
  return <div className="relative"><label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label><button type="button" onClick={() => setOpen((state) => !state)} className="form-input flex items-center justify-between gap-2 text-right"><span className={value ? 'text-slate-700' : 'text-slate-400'}>{shownValue || placeholder}</span><CalendarDays size={16} className="shrink-0 text-slate-400" /></button>{open && <div className="absolute right-0 top-full z-50 mt-2 w-[min(320px,85vw)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl"><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => setAnchor((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 30, 12))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><ArrowRight size={15} /></button><span className="text-xs font-black text-slate-700">{monthTitle}</span><button type="button" onClick={() => setAnchor((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 30, 12))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft size={15} /></button></div><div className="mt-2 grid grid-cols-7 gap-1 text-center"><div className="col-span-7 grid grid-cols-7 pb-1 text-[10px] font-bold text-slate-400">{['ش','ی','د','س','چ','پ','ج'].map((day) => <span key={day}>{day}</span>)}</div>{cells.map((cell, i) => <button type="button" key={i} onClick={() => { onChange(cell.date); setOpen(false) }} className={`aspect-square rounded-lg text-xs ${value && cell.date.toDateString() === value.toDateString() ? 'bg-teal-700 font-bold text-white' : cell.today ? 'border border-teal-300 bg-teal-50 text-teal-800' : cell.inMonth ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-300 hover:bg-slate-50'}`}>{cell.day}</button>)}</div><div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2"><button type="button" onClick={() => { onChange(null); setOpen(false) }} className="text-[11px] font-semibold text-rose-600">پاک‌کردن</button><button type="button" onClick={() => { const now = new Date(); onChange(now); setAnchor(now); setOpen(false) }} className="text-[11px] font-bold text-teal-700">امروز</button></div></div>}</div>
}

function CreateModal({ onClose, onPublish, onOpenMap }) {
  const [form, setForm] = useState({ type: 'project', title: '', city: 'تهران', area: '', description: '', visibility: 'public', amount: '', unit: 'نفر', gender: 'any', workType: 'full', hours: '', insurance: 'negotiable', salary: '', lat: 35.6892, lng: 51.3890, locationLabel: '', quantity: '1', workingDays: '', startDate: null, endDate: null, deadline: null, projectNeeds: [{ need_type: 'job', title: '', quantity_required: '1', unit: 'نفر', capacity_mode: 'multiple', description: '', price_min: '', price_max: '' }] })
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }))
  const updateNeed = (index, key, value) => update('projectNeeds', form.projectNeeds.map((need, i) => i === index ? { ...need, [key]: value } : need))
  const addNeed = () => update('projectNeeds', [...form.projectNeeds, { need_type: 'supply', title: '', quantity_required: '1', unit: 'مورد', capacity_mode: 'multiple', description: '', price_min: '', price_max: '' }])
  const removeNeed = (index) => update('projectNeeds', form.projectNeeds.filter((_, i) => i !== index))
  const isJob = form.type === 'job'
  const isSupply = form.type === 'supply'
  const isResource = form.type === 'resource'
  const isCapital = form.type === 'capital'
  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim()) { setError('عنوان و توضیحات را تکمیل کن.'); setStep(1); return }
    if (form.type === 'project' && !form.projectNeeds.some((need) => need.title.trim())) { setError('برای ساخت پروژه دست‌کم یک نیاز را تعریف کن.'); setStep(2); return }
    setError('')
    onPublish({ ...form, projectNeeds: form.projectNeeds.filter((need) => need.title.trim()), id: Date.now(), eyebrow: typeOptions.find((v) => v.id === form.type)?.label || 'آگهی', owner: 'کاربر هم‌پیوند', initials: 'ه', time: 'همین حالا', color: form.type === 'capital' ? 'mint' : form.type === 'resource' ? 'amber' : form.type === 'supply' ? 'violet' : 'blue', needsData: form.type === 'project' ? form.projectNeeds.filter((need) => need.title.trim()).map((need) => ({ ...need, id: null, quantity_required: Number(need.quantity_required || 1), status: 'open' })) : [], needs: form.projectNeeds.filter((need) => need.title.trim()).length, filled: 0, city: form.city, tags: [form.visibility === 'public' ? 'عمومی' : form.visibility === 'unlisted' ? 'لینک اختصاصی' : 'خصوصی', isJob ? form.workType === 'full' ? 'تمام‌وقت' : 'پاره‌وقت' : isSupply ? `${form.quantity} ${form.unit}` : 'قابل مذاکره'], price: isCapital ? form.amount || 'مبلغ در مذاکره' : isResource || isSupply ? form.amount || 'قابل مذاکره' : undefined, salary: isJob ? form.salary || 'حقوق توافقی' : undefined, location: { lat: form.lat, lng: form.lng, label: form.locationLabel }, workingDays: form.workingDays, startDate: form.startDate, endDate: form.endDate, deadline: form.deadline })
  }
  const titleType = typeOptions.find((v) => v.id === form.type)?.label
  return <ModalShell onClose={onClose}>
    <form onSubmit={submit}>
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-8">
        <div><Badge tone="mint">ثبت آگهی</Badge><h2 className="mt-2 text-xl font-black text-[#172B4D]">{step === 1 ? 'چه چیزی می‌خواهی ثبت کنی؟' : step === 2 ? 'شرایط و موقعیت' : 'دسترسی و انتشار'}</h2><p className="mt-1 text-xs text-slate-500">فرم متناسب با نوع آگهی تغییر می‌کند.</p></div>
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
      </div>
      <div className="px-6 py-5 sm:px-8">
        <div className="mb-6 flex gap-2">{[1,2,3].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${step >= n ? 'bg-teal-500' : 'bg-slate-100'}`} />)}</div>
        {step === 1 && <div className="space-y-5">
          <Field label="نوع آگهی" required><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{typeOptions.map((option) => <button key={option.id} type="button" onClick={() => update('type', option.id)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${form.type === option.id ? 'border-teal-400 bg-teal-50 text-teal-800 ring-2 ring-teal-100' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>{option.label}</button>)}</div></Field>
          <Field label="عنوان آگهی" required><input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder={form.type === 'project' ? 'مثلاً راه‌اندازی خط تولید...' : isJob ? 'مثلاً استخدام اپراتور دستگاه' : isSupply ? 'مثلاً تأمین ۲۰۰ تن سیمان' : 'عنوان روشن و کوتاه بنویس'} className="form-input" /></Field>
          <Field label="شرح و جزئیات" required hint="شرایط، انتظارات و اطلاعات مهم را توضیح بده."><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="توضیحات آگهی..." className="form-input resize-y" /></Field>
          {isJob && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="جنسیت موردنیاز"><select value={form.gender} onChange={(e) => update('gender', e.target.value)} className="form-input"><option value="any">بدون محدودیت</option><option value="male">آقا</option><option value="female">خانم</option></select></Field>
            <Field label="نوع همکاری"><select value={form.workType} onChange={(e) => update('workType', e.target.value)} className="form-input"><option value="full">تمام‌وقت</option><option value="part">پاره‌وقت</option><option value="shift">شیفتی</option><option value="project">پروژه‌ای</option><option value="temporary">موقت</option></select></Field>
          </div>}
          {isJob && <div className="grid gap-4 sm:grid-cols-2">
            <Field label="حقوق ماهانه (تومان)"><input value={form.salary} onChange={(e) => update('salary', e.target.value)} placeholder="مثلاً ۱۸ تا ۲۲ میلیون" className="form-input" /></Field>
            <Field label="بیمه"><select value={form.insurance} onChange={(e) => update('insurance', e.target.value)} className="form-input"><option value="yes">دارد</option><option value="no">ندارد</option><option value="negotiable">قابل مذاکره</option></select></Field>
            <Field label="روزهای کاری"><input value={form.workingDays} onChange={(e) => update('workingDays', e.target.value)} placeholder="مثلاً شنبه تا پنجشنبه" className="form-input" /></Field>
            <Field label="ساعت کاری"><input value={form.hours} onChange={(e) => update('hours', e.target.value)} placeholder="مثلاً ۸ تا ۱۶" className="form-input" /></Field>
            <Field label="تعداد نیروی موردنیاز"><input type="number" min="1" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} className="form-input" /></Field>
          </div>}
          {(isSupply || isCapital) && <div className="grid gap-4 sm:grid-cols-2"><Field label={isCapital ? 'مبلغ سرمایه (تومان)' : 'مقدار یا بودجهٔ موردنیاز'}><input value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder={isCapital ? 'مثلاً ۳٬۰۰۰٬۰۰۰٬۰۰۰' : 'مثلاً ۲۰۰'} className="form-input" /></Field>{isSupply && <Field label="واحد اندازه‌گیری"><select value={form.unit} onChange={(e) => update('unit', e.target.value)} className="form-input"><option>کیلوگرم</option><option>تن</option><option>عدد</option><option>متر</option><option>مترمربع</option><option>لیتر</option><option>بسته</option></select></Field>}</div>}
        </div>}
        {step === 2 && <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="شهر" required><input value={form.city} onChange={(e) => update('city', e.target.value)} className="form-input" /></Field><Field label="محدوده یا نشانی عمومی"><input value={form.area} onChange={(e) => update('area', e.target.value)} placeholder="مثلاً شهرک صنعتی شمس‌آباد" className="form-input" /></Field></div>
          <div className="rounded-2xl border border-slate-200 p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">موقعیت روی نقشه</p><p className="mt-1 text-xs leading-5 text-slate-500">موقعیت دقیق را انتخاب کن و مشخص کن چه کسانی آن را ببینند.</p></div><Map size={21} className="text-teal-700" /></div><button type="button" onClick={() => onOpenMap((point) => { update('lat', point.lat); update('lng', point.lng); update('locationLabel', point.label) })} className="secondary-btn w-full"><MapPin size={17} /> انتخاب موقعیت روی نقشه</button>{form.locationLabel && <p className="mt-2 text-xs text-teal-700">نقطه انتخاب شده: {form.locationLabel}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2">{form.type === 'project' ? <><PersianDatePicker label="تاریخ هدف شروع پروژه" value={form.startDate} onChange={(value) => update('startDate', value)} /><PersianDatePicker label="تاریخ هدف پایان پروژه" value={form.endDate} onChange={(value) => update('endDate', value)} /></> : <><PersianDatePicker label="شروع ارائه / همکاری" value={form.startDate} onChange={(value) => update('startDate', value)} /><PersianDatePicker label="پایان بازهٔ ارائه" value={form.endDate} onChange={(value) => update('endDate', value)} /></>}</div>
          {form.type !== 'project' && <PersianDatePicker label="آخرین مهلت درخواست (اختیاری)" value={form.deadline} onChange={(value) => update('deadline', value)} />}
          {form.type === 'project' && <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4"><div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-black text-slate-800">نیازهای این پروژه</p><p className="mt-1 text-xs leading-5 text-slate-500">هر ردیف یک نیاز است؛ یک پروژه می‌تواند چند نیاز و چند تأمین‌کننده داشته باشد.</p></div><Badge tone="mint">ضروری</Badge></div><div className="space-y-3">{form.projectNeeds.map((need, index) => <div key={index} className="rounded-xl border border-slate-200 bg-white p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-black text-slate-500">نیاز شمارهٔ {faNumber(index + 1)}</span>{form.projectNeeds.length > 1 && <button type="button" onClick={() => removeNeed(index)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">حذف نیاز</button>}</div><div className="grid gap-3 sm:grid-cols-2"><Field label="نوع نیاز"><select value={need.need_type} onChange={(e) => updateNeed(index, 'need_type', e.target.value)} className="form-input !py-2 !text-xs"><option value="job">نیروی انسانی</option><option value="resource">ملک یا فضای کار</option><option value="equipment">دستگاه و تجهیزات</option><option value="supply">کالا و مواد اولیه</option><option value="capital">سرمایه</option><option value="skill">مهارت یا خدمت</option></select></Field><Field label="عنوان نیاز" required><input value={need.title} onChange={(e) => updateNeed(index, 'title', e.target.value)} placeholder="مثلاً اپراتور دستگاه" className="form-input !py-2 !text-xs" /></Field><Field label={need.need_type === 'capital' ? 'مبلغ موردنیاز' : 'مقدار موردنیاز'}><input type="number" min="0.001" step="any" value={need.quantity_required} onChange={(e) => updateNeed(index, 'quantity_required', e.target.value)} className="form-input !py-2 !text-xs" /></Field><Field label="واحد"><select value={need.unit} onChange={(e) => updateNeed(index, 'unit', e.target.value)} className="form-input !py-2 !text-xs"><option>نفر</option><option>مورد</option><option>دستگاه</option><option>مترمربع</option><option>تن</option><option>کیلوگرم</option><option>عدد</option><option>لیتر</option><option>تومان</option></select></Field><Field label="حداقل بودجه یا قیمت (تومان)"><input type="number" min="0" step="any" value={need.price_min} onChange={(e) => updateNeed(index, 'price_min', e.target.value)} placeholder="اختیاری" className="form-input !py-2 !text-xs" /></Field><Field label="حداکثر بودجه یا قیمت (تومان)"><input type="number" min="0" step="any" value={need.price_max} onChange={(e) => updateNeed(index, 'price_max', e.target.value)} placeholder="اختیاری" className="form-input !py-2 !text-xs" /></Field><Field label="روش تأمین"><select value={need.capacity_mode} onChange={(e) => updateNeed(index, 'capacity_mode', e.target.value)} className="form-input !py-2 !text-xs"><option value="single">یک پیشنهاد نهایی</option><option value="multiple">چند تأمین‌کننده تا تکمیل مقدار</option></select></Field><Field label="توضیحات تکمیلی"><input value={need.description} onChange={(e) => updateNeed(index, 'description', e.target.value)} placeholder="مشخصات یا شرایط موردنیاز" className="form-input !py-2 !text-xs" /></Field></div></div>)}</div><button type="button" onClick={addNeed} className="secondary-btn mt-3 w-full !border-teal-200 !bg-white !text-teal-800"><Plus size={15} /> افزودن نیاز دیگر</button></div>}
          {isResource && <Field label="نوع ارائه"><select className="form-input"><option>اجاره</option><option>فروش</option><option>مشارکت</option><option>ارائهٔ موقت</option></select></Field>}
          <div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-bold text-slate-700">اطلاعات تکمیلی</p><p className="text-xs leading-6 text-slate-500">در نسخهٔ بعدی، مشخصات فنی اختصاصی ملک، دستگاه، مصالح و خدمات بر اساس دسته‌بندی در این مرحله نمایش داده می‌شود. آگهی‌های نیروی انسانی فیلدهای بیمه، حقوق، شیفت و شرح وظایف دارند.</p></div>
        </div>}
        {step === 3 && <div className="space-y-5">
          <Field label="چه کسانی آگهی را ببینند؟" required><div className="space-y-2">{[{id:'public',title:'عمومی',desc:'همه در جست‌وجو و صفحهٔ اصلی می‌بینند.',Icon:Globe},{id:'unlisted',title:'مخفی با لینک',desc:'در جست‌وجو نیست؛ دسترسی با لینک اختصاصی.',Icon:Link2},{id:'private',title:'خصوصی و دعوت‌محور',desc:'فقط افراد دعوت‌شده و اعضای مجاز می‌بینند.',Icon:LockKeyhole}].map((v) => <button key={v.id} type="button" onClick={() => update('visibility', v.id)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-right ${form.visibility === v.id ? 'border-teal-400 bg-teal-50/70' : 'border-slate-200 hover:border-slate-300'}`}><v.Icon size={20} className={form.visibility === v.id ? 'text-teal-700' : 'text-slate-400'} /><span className="flex-1"><span className="block text-sm font-bold text-slate-800">{v.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{v.desc}</span></span>{form.visibility === v.id && <CheckCircle2 size={18} className="text-teal-700" />}</button>)}</div></Field>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><ShieldCheck size={16} className="ml-1 inline" /> شماره تلفن، ایمیل و پیام‌رسان‌ها به‌طور پیش‌فرض عمومی نمی‌شوند. دسترسی به اطلاعات تماس از تنظیمات پروفایل و مجوز هر آگهی کنترل می‌شود.</div>
          <div className="rounded-xl bg-slate-50 p-4"><p className="font-bold text-slate-800">پیش‌نمایش</p><p className="mt-1 text-sm text-slate-600">{form.title || `آگهی جدید: ${titleType}`} · {form.city} · {form.visibility === 'public' ? 'عمومی' : form.visibility === 'unlisted' ? 'مخفی با لینک' : 'خصوصی'}</p></div>
        </div>}
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </div>
      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:px-8"><button type="button" onClick={() => step === 1 ? onClose() : setStep((s) => s - 1)} className="secondary-btn">{step === 1 ? 'انصراف' : 'مرحلهٔ قبل'}</button>{step < 3 ? <button type="button" onClick={() => { setError(''); setStep((s) => s + 1) }} className="primary-btn">ادامه <ArrowLeft size={16} /></button> : <button type="submit" className="primary-btn"><Plus size={17} /> انتشار آگهی آزمایشی</button>}</div>
    </form>
  </ModalShell>
}

function DetailModal({ item, onClose, onApply, onLogin }) {
  const [tab, setTab] = useState('detail')
  if (!item) return null
  const isProject = item.type === 'project'
  return <ModalShell onClose={onClose}>
    <div className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className={`listing-symbol listing-${item.color || 'mint'}`}><FolderKanban size={23} /></div><div><Badge tone={item.color || 'mint'}>{item.eyebrow}</Badge><h2 className="mt-2 text-xl font-black leading-8 text-[#172B4D]">{item.title}</h2><p className="mt-1 text-xs text-slate-500">ثبت‌شده توسط {item.owner} · {item.time}</p></div></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div>
      <div className="my-5 flex gap-1 border-b border-slate-100"><button onClick={() => setTab('detail')} className={`tab-btn ${tab === 'detail' ? 'tab-active' : ''}`}>جزئیات آگهی</button><button onClick={() => setTab('needs')} className={`tab-btn ${tab === 'needs' ? 'tab-active' : ''}`}>{isProject ? 'نیازهای پروژه' : 'شرایط و موقعیت'}</button></div>
      {tab === 'detail' ? <div><p className="text-sm leading-8 text-slate-600">{item.description}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-400">شهر و محدوده</span><p className="mt-1 text-sm font-bold text-slate-700">{item.city} · {item.area || 'در جزئیات'}</p></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-400">نوع دسترسی</span><p className="mt-1 text-sm font-bold text-slate-700">{item.visibility === 'private' ? 'خصوصی' : item.visibility === 'unlisted' ? 'مخفی با لینک' : 'عمومی'}</p></div></div>{item.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{item.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div>}</div> : isProject ? <div className="space-y-3">{(item.needsData?.length ? item.needsData.map((need) => ({...need, detail: `${faNumber(need.quantity_required || 1)} ${need.unit || 'مورد'} · ${{open:'در انتظار پیشنهاد',negotiating:'در حال مذاکره',fulfilled:'تأمین‌شده',paused:'متوقف',cancelled:'لغوشده'}[need.status] || 'باز برای پیشنهاد'}`, filled: need.status === 'fulfilled' ? 100 : 0})) : [{title:'سوله یا فضای صنعتی',detail:'۱ مورد · منتظر پیشنهاد',filled:0},{title:'دستگاه تولید',detail:'۱ مورد · در حال مذاکره',filled:55},{title:'اپراتور دستگاه',detail:'۲ نفر · ۱ نفر در مرحله بررسی',filled:50},{title:'مواد اولیه',detail:'تأمین مرحله‌ای پذیرفته می‌شود',filled:25}]).map((need) => <div key={need.id || need.title} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-800">{need.title}</p><p className="mt-1 text-xs text-slate-500">{need.detail}</p></div><button onClick={() => onApply(item, need.id ? need : null)} className="shrink-0 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100">پیشنهاد همکاری</button></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${need.filled}%` }} /></div></div>)}</div> : <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm leading-7 text-slate-600">شرایط، مقدار و موقعیت دقیق با توجه به سطح دسترسی صاحب آگهی نمایش داده می‌شود. برای هماهنگی، می‌توانی درخواست همکاری ارسال کنی یا از پیام داخلی استفاده کنی.</p></div>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row"><button onClick={() => onApply(item, item.type === 'project' && item.needsData?.length ? item.needsData[0] : null)} className="primary-btn flex-1"><Send size={16} /> {isProject ? 'درخواست همکاری در پروژه' : 'ارسال درخواست / پیشنهاد'}</button><button onClick={() => onLogin()} className="secondary-btn"><MessageCircle size={16} /> پیام به صاحب آگهی</button></div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-100 p-3 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-teal-700" />اطلاعات تماس فقط در صورت اجازهٔ صاحب آگهی و داشتن دسترسی لازم نمایش داده می‌شود.</div>
    </div>
  </ModalShell>
}

function MapModal({ onClose, onSelect }) {
  const [point, setPoint] = useState({ lat: 35.6892, lng: 51.3890, label: 'مرکز تهران' })
  return <ModalShell onClose={onClose}>
    <div className="p-5 sm:p-7"><div className="mb-4 flex items-start justify-between"><div><h2 className="text-xl font-black text-[#172B4D]">انتخاب موقعیت روی نقشه</h2><p className="mt-1 text-sm text-slate-500">روی نقشه کلیک کن تا نقطهٔ محل انتخاب شود.</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button></div><MapPicker point={point} onChange={setPoint} /><div className="mt-4 flex items-center justify-between gap-2"><div className="text-xs leading-6 text-slate-500">عرض: {point.lat.toFixed(5)} · طول: {point.lng.toFixed(5)}<br />نشانی دقیق را پس از انتخاب می‌توان در فرم تکمیل کرد.</div><button onClick={() => { onSelect(point); onClose() }} className="primary-btn"><MapPin size={16} /> تأیید موقعیت</button></div><p className="mt-3 text-[11px] leading-5 text-slate-400">نقشه از سرویس کاشی OpenStreetMap استفاده می‌کند. نمایش نقشه به اتصال اینترنت نیاز دارد.</p></div>
  </ModalShell>
}

function Dashboard({ user, items, saved, onPage, onViewItem, onCreate, onLogout }) {
  const [dashboardTab, setDashboardTab] = useState('overview')
  const ownedItems = items.filter((i) => i.owner === user.name || i.owner === 'کاربر هم‌پیوند')
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-teal-700">پنل کاربری</p><h1 className="mt-1 text-2xl font-black text-[#172B4D]">سلام، {user.name}</h1><p className="mt-2 text-sm text-slate-500">نمای کلی فعالیت‌ها و همکاری‌های تو در هم‌پیوند.</p></div><button onClick={onCreate} className="primary-btn"><Plus size={17} /> ثبت آگهی جدید</button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{label:'پروژه‌های من',val:'۰۲',icon:FolderKanban,tone:'mint'},{label:'درخواست‌های دریافتی',val:'۱۲',icon:Users,tone:'blue'},{label:'درخواست‌های ارسالی',val:'۰۶',icon:Send,tone:'amber'},{label:'گفت‌وگوهای فعال',val:'۰۳',icon:MessageCircle,tone:'violet'}].map((s) => <div key={s.label} className="stat-card"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{s.label}</span><CategoryIcon icon={s.icon} tone={s.tone} /></div><p className="mt-3 text-3xl font-black text-[#172B4D]">{s.val}</p><p className="mt-1 text-[11px] text-slate-400">آمار نمایشی نسخهٔ اولیه</p></div>)}</div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-black text-[#172B4D]">مدیریت فعالیت‌ها</h2><button onClick={() => onPage('messages')} className="text-xs font-bold text-teal-700">مشاهده پیام‌ها</button></div><div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-100">{[{id:'overview',title:'همه'},{id:'projects',title:'پروژه‌ها'},{id:'requests',title:'درخواست‌ها'},{id:'saved',title:'ذخیره‌شده‌ها'}].map((tab) => <button key={tab.id} onClick={() => setDashboardTab(tab.id)} className={`tab-btn whitespace-nowrap ${dashboardTab === tab.id ? 'tab-active' : ''}`}>{tab.title}</button>)}</div>
        {dashboardTab === 'saved' ? saved.length ? <div className="space-y-2">{items.filter((i) => saved.includes(i.id)).map((item) => <button key={item.id} onClick={() => onViewItem(item)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-right hover:bg-slate-50"><span className="text-sm font-bold">{item.title}</span><ArrowLeft size={16} className="text-slate-400" /></button>)}</div> : <EmptyState title="هنوز آگهی ذخیره نکرده‌ای" detail="برای دسترسی سریع‌تر، آگهی‌های موردعلاقه‌ات را ذخیره کن." /> : dashboardTab === 'requests' ? <div className="space-y-3">{[{name:'پیشنهاد اجارهٔ دستگاه',status:'در حال مذاکره',tone:'amber'},{name:'درخواست اپراتور تولید',status:'منتظر بررسی',tone:'blue'},{name:'تأمین ۸۰ تن مواد اولیه',status:'پیشنهاد ارسال شده',tone:'mint'}].map((r) => <div key={r.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div><p className="text-sm font-bold text-slate-700">{r.name}</p><p className="mt-1 text-xs text-slate-400">آخرین تغییر: امروز</p></div><Badge tone={r.tone}>{r.status}</Badge></div>)}</div> : <div className="space-y-2">{(dashboardTab === 'projects' ? items.filter((i) => i.type === 'project') : ownedItems).slice(0, 4).map((item) => <button key={item.id} onClick={() => onViewItem(item)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-right hover:border-teal-200 hover:bg-teal-50/30"><span className={`listing-symbol listing-${item.color || 'mint'} !h-10 !w-10 !rounded-xl`}><FolderKanban size={19} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-700">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.city} · {item.time}</span></span><ArrowLeft size={16} className="text-slate-400" /></button>)}</div>}
      </section>
      <aside className="space-y-4"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black">میان‌برها</h3><div className="mt-3 space-y-1">{[{icon:Package,label:'منابع و مهارت‌های من',fn:() => onPage('my-items')},{icon:MessageCircle,label:'پیام‌ها و روم‌ها',fn:() => onPage('messages')},{icon:CalendarDays,label:'تقویم شمسی',fn:() => onPage('calendar')},{icon:Settings,label:'تنظیمات تماس و حریم خصوصی',fn:() => onPage('settings')}].map((entry) => <button key={entry.label} onClick={entry.fn} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-right text-sm text-slate-600 hover:bg-slate-50 hover:text-teal-800"><entry.icon size={18} className="text-slate-400" />{entry.label}<ArrowLeft size={15} className="mr-auto text-slate-300" /></button>)}</div></div><AdSlot title="محل نمایش تبلیغات شماست" compact /></aside>
    </div>
  </div>
}

function EmptyState({ title, detail }) {
  return <div className="flex flex-col items-center py-10 text-center"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><FileText size={22} /></span><p className="mt-3 font-bold text-slate-700">{title}</p><p className="mt-1 max-w-xs text-xs leading-6 text-slate-400">{detail}</p></div>
}

function MessagesPage({ onBack }) {
  const [active, setActive] = useState(0)
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([{ mine: false, body: 'سلام، دربارهٔ شرایط ارائهٔ دستگاه می‌خواستم چند سؤال بپرسم.', time: '۱۰:۲۴' }, { mine: true, body: 'سلام، حتماً. دستگاه آمادهٔ بازدید است و دربارهٔ اجاره یا مشارکت هم گفت‌وگو می‌کنیم.', time: '۱۰:۲۷' }])
  const rooms = [{ name: 'رضا محمدی', topic: 'پیشنهاد دستگاه تولید', initials: 'ر‌م', unread: 2 }, { name: 'گروه تولیدی آریا', topic: 'نیاز به اپراتور', initials: 'آ', unread: 0 }, { name: 'مریم احمدی', topic: 'سولهٔ ۸۰۰ متری', initials: 'م‌ا', unread: 0 }]
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; setMessages((old) => [...old, { mine: true, body: text.trim(), time: 'همین حالا' }]); setText('') }
  return <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8"><div className="mb-5 flex items-center gap-3"><button onClick={onBack} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft size={18} /></button><div><h1 className="text-2xl font-black text-[#172B4D]">پیام‌ها و روم‌ها</h1><p className="mt-1 text-sm text-slate-500">گفت‌وگوهای خصوصی مرتبط با درخواست‌ها و پروژه‌ها</p></div></div><div className="grid h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[300px_1fr]"><aside className={`border-l border-slate-100 ${active !== null ? 'hidden md:block' : ''}`}><div className="border-b border-slate-100 p-4"><div className="relative"><Search size={17} className="absolute right-3 top-3 text-slate-400" /><input placeholder="جست‌وجوی گفتگو" className="form-input !py-2 !pr-9 !text-xs" /></div></div>{rooms.map((room, i) => <button onClick={() => setActive(i)} key={room.name} className={`flex w-full items-center gap-3 border-b border-slate-50 p-4 text-right ${active === i ? 'bg-teal-50/60' : 'hover:bg-slate-50'}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{room.initials}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-700">{room.name}</span><span className="mt-1 block truncate text-xs text-slate-400">{room.topic}</span></span>{room.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-600 px-1 text-[10px] text-white">{faNumber(room.unread)}</span>}</button>)}</aside><section className="flex min-h-0 flex-col"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="font-bold text-slate-800">{rooms[active]?.name}</p><p className="mt-1 text-xs text-slate-400">{rooms[active]?.topic}</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><Eye size={18} /></button></header><div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">{messages.map((msg, i) => <div key={`${msg.time}-${i}`} className={`flex ${msg.mine ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${msg.mine ? 'rounded-tr-sm bg-teal-700 text-white' : 'rounded-tl-sm border border-slate-100 bg-white text-slate-700'}`}><p className="text-sm leading-7">{msg.body}</p><p className={`mt-1 text-left text-[10px] ${msg.mine ? 'text-teal-100' : 'text-slate-400'}`}>{msg.time}</p></div></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-slate-100 bg-white p-4"><input value={text} onChange={(e) => setText(e.target.value)} placeholder="پیامت را بنویس…" className="form-input flex-1 !py-2.5" /><button className="primary-btn !px-4" aria-label="ارسال پیام"><Send size={18} /></button></form></section></div><p className="mt-3 text-xs text-slate-400">پیام‌رسان این نسخه یک نمونهٔ تعاملی است؛ برای چندکاربره و لحظه‌ای‌شدن به API و کانال WebSocket نیاز دارد.</p></div>
}

function getPersianCalendarCells(anchor) {
  const monthParts = (date) => {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric' }).formatToParts(date)
    return { year: Number(parts.find((p) => p.type === 'year')?.value), month: Number(parts.find((p) => p.type === 'month')?.value) }
  }
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12)
  const target = monthParts(base)
  let first = new Date(base)
  for (let i = 0; i < 35; i++) {
    const previous = new Date(first); previous.setDate(first.getDate() - 1)
    const parts = monthParts(previous)
    if (parts.year !== target.year || parts.month !== target.month) break
    first = previous
  }
  const offset = (first.getDay() + 1) % 7 // Saturday is the first day in the Persian week.
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart); date.setDate(gridStart.getDate() + index)
    const parts = monthParts(date)
    return {
      date,
      day: new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric' }).format(date),
      inMonth: parts.year === target.year && parts.month === target.month,
      today: date.toDateString() === new Date().toDateString(),
    }
  })
}

function CalendarPage({ onBack }) {
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [showAddEvent, setShowAddEvent] = useState(false)
  const cells = getPersianCalendarCells(anchor)
  const monthTitle = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' }).format(anchor)
  const selectedLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selected)
  const eventData = [
    { date: new Date(Date.now() + 3 * 86400000), time: '۱۰:۳۰', title: 'جلسه دربارهٔ ارائهٔ دستگاه' },
    { date: new Date(Date.now() + 5 * 86400000), time: '۱۶:۰۰', title: 'بررسی پیشنهاد تأمین‌کننده' },
    { date: new Date(Date.now() + 8 * 86400000), time: '۱۲:۰۰', title: 'مهلت پاسخ به درخواست' },
  ]
  return <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6"><button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> بازگشت</button><h1 className="text-2xl font-black text-[#172B4D]">تقویم همکاری‌ها</h1><p className="mt-2 text-sm text-slate-500">تاریخ‌ها با تقویم شمسی نمایش داده می‌شوند.</p><div className="mt-5 grid gap-4 md:grid-cols-[1fr_300px]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between gap-2"><button onClick={() => setAnchor((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - 30, 12))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="ماه قبل"><ArrowRight size={16} /></button><div className="text-center"><p className="font-black">{monthTitle}</p><p className="mt-1 text-xs text-slate-400">انتخاب تاریخ · شمسی</p></div><button onClick={() => setAnchor((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 30, 12))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="ماه بعد"><ArrowLeft size={16} /></button></div><div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 pb-2 font-bold text-slate-400">{['ش','ی','د','س','چ','پ','ج'].map((d) => <span key={d}>{d}</span>)}</div>{cells.map((cell, i) => <button key={i} onClick={() => setSelected(cell.date)} className={`relative grid aspect-square place-items-center rounded-xl text-sm transition ${cell.date.toDateString() === selected.toDateString() ? 'bg-teal-700 font-bold text-white' : cell.today ? 'border border-teal-300 bg-teal-50 font-bold text-teal-800' : cell.inMonth ? 'text-slate-600 hover:bg-slate-50' : 'text-slate-300 hover:bg-slate-50'}`}>{cell.day}{cell.inMonth && (i % 9 === 3 || i % 13 === 4) && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${cell.date.toDateString() === selected.toDateString() ? 'bg-amber-200' : 'bg-amber-500'}`} />}</button>)}</div><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"><div><p className="text-xs text-slate-400">تاریخ انتخاب‌شده</p><p className="mt-1 text-sm font-bold text-slate-700">{selectedLabel}</p></div><button onClick={() => setSelected(new Date())} className="text-xs font-bold text-teal-700">امروز</button></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black">رویدادهای پیش‌رو</h3><p className="mt-1 text-xs text-slate-400">نمونهٔ جلسه‌ها و مهلت‌های کاری</p><div className="mt-4 space-y-3">{eventData.map((ev) => <div key={ev.title} className="flex gap-3"><div className="min-w-[62px] rounded-lg bg-teal-50 px-2 py-2 text-center"><p className="text-xs font-bold text-teal-800">{new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'short' }).format(ev.date)}</p><p className="mt-1 text-[10px] text-teal-700">{ev.time}</p></div><p className="pt-1 text-sm leading-6 text-slate-600">{ev.title}</p></div>)}</div><button onClick={() => setShowAddEvent(!showAddEvent)} className="secondary-btn mt-5 w-full"><Plus size={16} /> افزودن رویداد</button>{showAddEvent && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs leading-6 text-slate-500">فرم ثبت رویداد در نسخهٔ بعد به API رویدادها متصل می‌شود. تاریخ نمایشی این بخش شمسی است.</p><input placeholder="عنوان رویداد" className="form-input mt-2 !py-2 !text-xs" /><button onClick={() => setShowAddEvent(false)} className="primary-btn mt-2 w-full !py-2 !text-xs">بستن</button></div>}</div></div></div>
}

function SettingsPage({ user, onBack }) {
  const [publicPhone, setPublicPhone] = useState(false)
  const [email, setEmail] = useState(true)
  const [linkedin, setLinkedin] = useState(true)
  const [whatsapp, setWhatsapp] = useState(false)
  const [telegram, setTelegram] = useState(false)
  const [visibility, setVisibility] = useState('members')
  const rows = [{title:'شمارهٔ تلفن',desc:user.phone || 'شمارهٔ تأییدشده',val:publicPhone,set:setPublicPhone},{title:'ایمیل',desc:'برای هماهنگی‌های کاری',val:email,set:setEmail},{title:'واتساپ',desc:'پیوند ارتباطی واتساپ',val:whatsapp,set:setWhatsapp},{title:'تلگرام',desc:'نام کاربری یا پیوند تلگرام',val:telegram,set:setTelegram},{title:'لینکدین و رزومه',desc:'پروفایل حرفه‌ای و نمونه‌کار',val:linkedin,set:setLinkedin}]
  return <div className="mx-auto max-w-3xl px-4 py-7 sm:px-6"><button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> بازگشت</button><h1 className="text-2xl font-black text-[#172B4D]">راه‌های ارتباطی و حریم خصوصی</h1><p className="mt-2 text-sm leading-6 text-slate-500">انتخاب کن هر راه ارتباطی برای چه کسانی قابل مشاهده باشد. این تنظیمات در نسخهٔ نمایشی روی رابط اثر می‌گذارند.</p><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black">اطلاعات تماس</h3><div className="mt-4 divide-y divide-slate-100">{rows.map((r) => <div key={r.title} className="flex items-center justify-between gap-3 py-4"><div><p className="text-sm font-bold text-slate-700">{r.title}</p><p className="mt-1 text-xs text-slate-400">{r.desc}</p></div><button onClick={() => r.set(!r.val)} role="switch" aria-checked={r.val} className={`relative h-6 w-11 rounded-full transition ${r.val ? 'bg-teal-600' : 'bg-slate-200'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${r.val ? 'right-1' : 'right-6'}`} /></button></div>)}</div><div className="mt-4 border-t border-slate-100 pt-4"><label className="mb-2 block text-sm font-bold text-slate-700">چه کسانی اطلاعات تماس را ببینند؟</label><select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="form-input"><option value="all">همهٔ بازدیدکنندگان</option><option value="logged">فقط کاربران واردشده</option><option value="members">فقط اعضای پروژه یا افراد مجاز</option><option value="none">هیچ‌کس؛ فقط پیام داخلی</option></select><p className="mt-2 text-xs leading-5 text-slate-400">مجوز اختصاصی هر پروژه یا آگهی می‌تواند از این تنظیم عمومی محدودتر باشد.</p></div><button onClick={onBack} className="primary-btn mt-5">ذخیرهٔ تنظیمات نمایشی <Check size={16} /></button></div><div className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-900"><ShieldCheck size={16} className="ml-1 inline" /> در نسخهٔ واقعی، کنترل دسترسی در بک‌اند اعمال می‌شود؛ صرفاً مخفی‌کردن شماره در رابط کاربری حفاظت کافی نیست.</div></div>
}

export default function App() {
  const [items, setItems] = useState(DEMO_MODE ? sampleItems : [])
  const [page, setPage] = useState('home')
  const [loginOpen, setLoginOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapCallback, setMapCallback] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [user, setUser] = useState(null)
  const [saved, setSaved] = useState([])
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('همهٔ شهرها')
  const [activeCategory, setActiveCategory] = useState('all')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [toast, setToast] = useState('')
  const [sort, setSort] = useState('newest')
  const [visibilityFilter, setVisibilityFilter] = useState('all')

  useEffect(() => {
    let active = true
    const savedUser = sessionStorage.getItem('hampayvand_user')
    if (savedUser) { try { setUser(JSON.parse(savedUser)) } catch { sessionStorage.removeItem('hampayvand_user') } }
    const loadRemote = async () => {
      try {
        const [listingResult, projectResult] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/listings/`, { timeout: 3500 }),
          axios.get(`${API_BASE}/api/projects/`, { timeout: 3500 }),
        ])
        if (!active) return
        const listings = listingResult.status === 'fulfilled' ? (listingResult.value.data.results || listingResult.value.data || []).map(mapServerListing) : []
        const projects = projectResult.status === 'fulfilled' ? (projectResult.value.data.results || projectResult.value.data || []).map(mapServerProject) : []
        const remote = [...projects, ...listings]
        if (remote.length) setItems(DEMO_MODE ? [...remote, ...sampleItems] : remote)
      } catch { /* Keep the local demo content when the API is not running. */ }
    }
    loadRemote()
    return () => { active = false }
  }, [])

  const visibleItems = useMemo(() => {
    let result = [...items]
    if (activeCategory !== 'all') result = result.filter((i) => i.type === activeCategory || (activeCategory === 'job' && i.type === 'skill'))
    if (city !== 'همهٔ شهرها') result = result.filter((i) => i.city === city)
    if (visibilityFilter === 'public') result = result.filter((i) => i.visibility !== 'private')
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      result = result.filter((i) => `${i.title} ${i.description} ${i.city} ${i.area || ''} ${i.eyebrow} ${(i.tags || []).join(' ')}`.toLowerCase().includes(q))
    }
    if (sort === 'oldest') result.reverse()
    return result
  }, [items, activeCategory, city, query, sort, visibilityFilter])

  const flash = (message) => { setToast(message); window.setTimeout(() => setToast(''), 3000) }
  const beginLogin = (action = '') => {
    if (user) return true
    setLoginOpen(true)
    if (action) setToast(action)
    return false
  }
  const actCreate = () => { if (!user) { beginLogin('برای ثبت آگهی ابتدا وارد شو.'); return }; setCreateOpen(true) }
  const doApply = async (item, need = null) => {
    if (!user) { setDetailItem(null); setLoginOpen(true); setToast('برای ارسال درخواست ابتدا وارد شو.'); return }
    setDetailItem(null)
    const token = sessionStorage.getItem('hampayvand_token')
    if (token && token !== 'demo-session' && !item.isDemo) {
      let payload = {}
      if (item.apiKind === 'listing' && item.backendListingId) payload = { listing: item.backendListingId, share_token: item.shareToken, cover_message: '' }
      else if (item.apiKind === 'project' && need?.id) payload = { need: need.id, share_token: item.shareToken, cover_message: '' }
      else { flash('برای این مورد نمایشی، درخواست در سرور ثبت نمی‌شود.'); return }
      try {
        await axios.post(`${API_BASE}/api/applications/`, payload, { ...authConfig(), timeout: 5000 })
        flash(`درخواست برای «${item.title}» در سرور ثبت شد.`)
      } catch (error) {
        flash(error.response?.data?.detail || 'ثبت درخواست در سرور انجام نشد؛ لطفاً وضعیت ورود و آگهی را بررسی کن.')
      }
    } else {
      flash(`در نسخهٔ نمایشی، درخواست برای «${item.title}» فقط شبیه‌سازی شد.`)
    }
  }
  const toggleSaved = (id) => { if (!user) { setLoginOpen(true); flash('برای ذخیرهٔ آگهی وارد شو.'); return }; setSaved((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]); flash(saved.includes(id) ? 'از ذخیره‌شده‌ها حذف شد.' : 'آگهی ذخیره شد.') }
  const login = (info) => { setUser(info); sessionStorage.setItem('hampayvand_user', JSON.stringify(info)); setLoginOpen(false); setPage('dashboard'); flash('با موفقیت وارد شدی.') }
  const publish = async (item) => {
    setItems((old) => [item, ...old]); setCreateOpen(false); setPage('home'); setActiveCategory('all'); setQuery('')
    const token = sessionStorage.getItem('hampayvand_token')
    if (!token || token === 'demo-session') { flash('آگهی فقط در پیش‌نمایش این مرورگر ثبت شد؛ برای ذخیرهٔ دائمی، بک‌اند را اجرا کن.'); return }
    try {
      let response
      if (item.type === 'project') {
        const payload = { title: item.title, description: item.description, city: item.city, area: item.area, latitude: item.lat, longitude: item.lng, visibility: item.visibility, status: 'recruiting', show_exact_location: false, start_date: dateToYMD(item.startDate), target_end_date: dateToYMD(item.endDate), attributes: { location_label: item.locationLabel || '' } }
        response = await axios.post(`${API_BASE}/api/projects/`, payload, { ...authConfig(), timeout: 5000 })
        const projectId = response.data.id
        const needResults = await Promise.allSettled((item.projectNeeds || []).map((need) => axios.post(`${API_BASE}/api/needs/`, {
          project: projectId, need_type: need.need_type, title: need.title, description: need.description || '',
          quantity_required: need.quantity_required || '1', unit: need.unit || 'مورد', capacity_mode: need.capacity_mode || 'single',
          price_min: need.price_min || null, price_max: need.price_max || null,
          status: 'open', attributes: {}, mandatory_fields: [],
        }, { ...authConfig(), timeout: 5000 })))
        const storedNeeds = needResults.filter((result) => result.status === 'fulfilled').map((result) => result.value.data)
        let latestProject = { ...response.data, needs: storedNeeds }
        try {
          const refreshed = await axios.get(`${API_BASE}/api/projects/${projectId}/`, { ...authConfig(), timeout: 3000 })
          latestProject = refreshed.data
        } catch { /* Keep the created project and any successfully-created needs in the local state. */ }
        const remote = mapServerProject(latestProject)
        setItems((old) => [remote, ...old.filter((entry) => entry.id !== item.id)])
        if (needResults.some((result) => result.status === 'rejected')) flash('پروژه ذخیره شد؛ برای بعضی نیازها خطا رخ داد و باید دوباره بررسی شوند.')
        else flash('پروژه و نیازهای آن در سرور ذخیره شدند.')
        return
      } else {
        const payload = { listing_type: item.type, title: item.title, category: item.eyebrow, description: item.description, city: item.city, area: item.area, latitude: item.lat, longitude: item.lng, show_exact_location: false, visibility: item.visibility, status: 'published', quantity: item.quantity || '1', unit: item.unit || 'مورد', currency: 'تومان', employment_type: item.workType || '', gender_requirement: item.gender || 'any', working_days: item.workingDays || '', working_hours: item.hours || '', insurance: item.insurance || 'negotiable', starts_at: dateToISOAtNoon(item.startDate), ends_at: dateToISOAtNoon(item.endDate), expires_at: dateToISOAtNoon(item.deadline, true), attributes: { requested_amount: item.amount || '', salary_text: item.salary || '', location_label: item.locationLabel || '' } }
        response = await axios.post(`${API_BASE}/api/listings/`, payload, { ...authConfig(), timeout: 5000 })
        const remote = mapServerListing(response.data)
        setItems((old) => [remote, ...old.filter((entry) => entry.id !== item.id)])
      }
      flash('آگهی در سرور ذخیره شد.')
    } catch (error) {
      flash(error.response?.data?.detail || 'ارتباط با بک‌اند برقرار نشد؛ آگهی فعلاً فقط در پیش‌نمایش این مرورگر است.')
    }
  }
  const openMap = (callback) => { setMapCallback(() => callback); setMapOpen(true) }
  const navigate = (to) => { setMobileMenu(false); if (['dashboard', 'messages', 'calendar', 'settings', 'my-items'].includes(to) && !user) { setLoginOpen(true); flash('برای دسترسی به پنل وارد شو.'); return }; setPage(to); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const navItems = [{id:'home',label:'صفحهٔ اصلی',icon:Globe},{id:'project',label:'پروژه‌ها',icon:FolderKanban},{id:'my-items',label:'منابع و مهارت‌ها',icon:Package},{id:'messages',label:'پیام‌ها',icon:MessageCircle},{id:'dashboard',label:'داشبورد',icon:LayoutDashboard}]

  return <div dir="rtl" className="min-h-screen bg-[#F7F8FA] text-[#172B4D]">
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand onClick={() => navigate('home')} />
        <nav className="hidden items-center gap-1 xl:flex">{navItems.slice(0, 4).map((nav) => <button key={nav.id} onClick={() => nav.id === 'project' ? (setActiveCategory('project'), navigate('home')) : nav.id === 'my-items' ? navigate('my-items') : navigate(nav.id)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${page === nav.id ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50 hover:text-[#172B4D]'}`}>{nav.label}</button>)}</nav>
        <div className="flex items-center gap-2"><button onClick={() => { if (!user) setLoginOpen(true); else navigate('dashboard') }} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:flex">{user ? <><span className="avatar avatar-mint !h-7 !w-7">{user.name?.slice(0, 1)}</span><span>پنل من</span></> : <><UserRound size={16} /> ورود</>}</button><button onClick={actCreate} className="primary-btn !px-3 sm:!px-4"><Plus size={17} /><span className="hidden sm:inline">ثبت آگهی</span><span className="sm:hidden">ثبت</span></button><button onClick={() => setMobileMenu(!mobileMenu)} className="rounded-xl border border-slate-200 p-2 text-slate-600 xl:hidden" aria-label="باز کردن منو">{mobileMenu ? <X size={19} /> : <Menu size={19} />}</button></div>
      </div>
      {mobileMenu && <div className="border-t border-slate-100 bg-white p-3 xl:hidden">{navItems.map((nav) => <button key={nav.id} onClick={() => navigate(nav.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold text-slate-600 hover:bg-slate-50"><nav.icon size={18} />{nav.label}</button>)}</div>}
    </header>

    {page === 'home' && <>
      <main>
        <section className="hero-section relative overflow-hidden"><div className="hero-orb hero-orb-one"/><div className="hero-orb hero-orb-two"/><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm"><span className="h-2 w-2 rounded-full bg-teal-500"/> بازار همکاری و فرصت‌های کسب‌وکار</div><h1 className="text-4xl font-black leading-[1.45] tracking-tight text-[#172B4D] sm:text-5xl lg:text-[52px]">برای ساختن،<br/><span className="text-teal-600">آدم‌های درست</span> را پیدا کن.</h1><p className="mt-5 max-w-xl text-sm leading-8 text-slate-600 sm:text-base">از پیدا کردن همکار و نیروی متخصص تا تأمین سوله، دستگاه، مواد اولیه و سرمایه؛ همهٔ نیازهای کسب‌وکارت را یکجا مدیریت کن.</p><div className="mt-7 flex flex-wrap gap-3"><button onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })} className="primary-btn !px-5 !py-3">جست‌وجوی فرصت‌ها <ArrowLeft size={17}/></button><button onClick={actCreate} className="secondary-btn !px-5 !py-3"><Plus size={17}/> معرفی نیاز یا دارایی</button></div><div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={16} className="text-teal-700"/> کنترل دسترسی و حریم خصوصی</span><span className="inline-flex items-center gap-1.5"><Handshake size={16} className="text-teal-700"/> مذاکره درون‌برنامه‌ای</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={16} className="text-teal-700"/> تقویم شمسی</span></div></div>
          <div className="hero-visual"><div className="hero-grid-pattern"/><div className="hero-card hero-card-main"><div className="flex items-center justify-between"><Badge tone="mint">نمونهٔ پروژه</Badge><span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-teal-500"/> فعال</span></div><div className="mt-4 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><Building2 size={25}/></span><div><h3 className="font-black">راه‌اندازی تولیدی</h3><p className="mt-1 text-xs text-slate-500">۴ نیاز برای تکمیل تیم و منابع</p></div></div><div className="mt-5 space-y-3">{[{label:'فضای صنعتی',done:true},{label:'دستگاه تولید',done:true},{label:'اپراتور دستگاه',done:false},{label:'مواد اولیه',done:false}].map((n) => <div key={n.label} className="flex items-center gap-2.5"><span className={`grid h-5 w-5 place-items-center rounded-full ${n.done ? 'bg-teal-600 text-white' : 'border border-slate-200 bg-white text-slate-300'}`}>{n.done ? <Check size={12}/> : <Plus size={12}/>}</span><span className={`flex-1 text-xs ${n.done ? 'text-slate-500 line-through' : 'font-semibold text-slate-700'}`}>{n.label}</span><span className={`text-[10px] ${n.done ? 'text-teal-700' : 'text-slate-400'}`}>{n.done ? 'تأمین شده' : 'نیازمند همکار'}</span></div>)}</div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-1/2 rounded-full bg-gradient-to-l from-teal-400 to-teal-600"/></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>پیشرفت تأمین منابع</span><span className="font-bold text-teal-700">۵۰٪</span></div></div><div className="hero-floating hero-floating-top"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700"><Package size={18}/></span><span><b className="block text-xs">تجهیزات پیدا شد</b><small className="mt-1 block text-[10px] text-slate-400">پیشنهاد جدید دریافت شد</small></span><CheckCircle2 size={17} className="mr-auto text-teal-600"/></div><div className="hero-floating hero-floating-bottom"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Users size={18}/></span><span><b className="block text-xs">همکار مناسب</b><small className="mt-1 block text-[10px] text-slate-400">در انتظار گفت‌وگو</small></span><MessageCircle size={17} className="mr-auto text-slate-400"/></div></div>
        </div></section>

        <section className="relative z-10 mx-auto -mt-5 max-w-7xl px-4 sm:px-6 lg:px-8"><div className="search-panel rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl shadow-slate-200/40 sm:p-4"><div className="grid gap-2 md:grid-cols-[1fr_190px_auto]"><div className="relative"><Search size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => { setQuery(e.target.value); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }) }} className="h-12 w-full rounded-xl border border-transparent bg-slate-50 pr-11 pl-3 text-sm outline-none transition focus:border-teal-300 focus:bg-white" placeholder="دنبال چه چیزی هستی؟ مثلاً اپراتور، سوله، سرمایه…"/></div><div className="relative"><MapPin size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={city} onChange={(e) => setCity(e.target.value)} className="h-12 w-full appearance-none rounded-xl border border-transparent bg-slate-50 pr-9 pl-8 text-sm text-slate-600 outline-none focus:border-teal-300"><option>همهٔ شهرها</option><option>تهران</option><option>البرز</option><option>قزوین</option></select><ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/></div><button onClick={() => document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })} className="primary-btn h-12 justify-center !px-6"><Search size={17}/> جست‌وجو</button></div><div className="mt-3 flex flex-wrap items-center gap-2 px-1"><span className="ml-1 text-[11px] text-slate-400">جست‌وجوهای پیشنهادی:</span>{['سولهٔ صنعتی','اپراتور دستگاه','تأمین مصالح','سرمایه‌گذار'].map((q) => <button key={q} onClick={() => { setQuery(q); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }) }} className="rounded-full border border-slate-100 px-3 py-1 text-[11px] text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800">{q}</button>)}<button onClick={() => setShowFilters(!showFilters)} className="mr-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"><SlidersHorizontal size={14}/> فیلترهای بیشتر</button></div>{showFilters && <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3"><label className="text-xs font-semibold text-slate-600">نمایش آگهی‌ها<select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="form-input mt-1.5 !py-2 !text-xs"><option value="all">همهٔ آگهی‌های مجاز</option><option value="public">عمومی و لینک‌دار</option></select></label><label className="text-xs font-semibold text-slate-600">مرتب‌سازی<select value={sort} onChange={(e) => setSort(e.target.value)} className="form-input mt-1.5 !py-2 !text-xs"><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌تر</option></select></label><div className="flex items-end"><button onClick={() => { setQuery(''); setCity('همهٔ شهرها'); setActiveCategory('all'); setSort('newest'); setVisibilityFilter('all') }} className="secondary-btn w-full !py-2 !text-xs">پاک‌کردن فیلترها</button></div></div>}</div></section>

        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8"><div className="mb-6 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-teal-700">از کجا شروع کنیم؟</p><h2 className="mt-2 text-2xl font-black text-[#172B4D]">چه چیزی لازم داری؟</h2><p className="mt-2 text-sm text-slate-500">از بین دسته‌ها انتخاب کن تا فرصت‌های مرتبط را ببینی.</p></div><button onClick={() => { setActiveCategory('all'); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' }) }} className="hidden items-center gap-1 text-sm font-bold text-teal-700 sm:flex">همهٔ دسته‌ها <ArrowLeft size={16}/></button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{categories.map((cat) => <button key={cat.id} onClick={() => { setActiveCategory(cat.id); document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={`category-card rounded-2xl border bg-white p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md ${activeCategory === cat.id ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200/80'}`}><CategoryIcon icon={cat.icon} tone={cat.tone}/><span className="mt-3 block text-sm font-black text-[#172B4D]">{cat.title}</span><span className="mt-1 block text-[11px] leading-5 text-slate-400">{cat.description}</span></button>)}</div></section>

        <section id="discover" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-14 sm:px-6 lg:px-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-teal-700">فرصت‌های تازه</p><h2 className="mt-2 text-2xl font-black text-[#172B4D]">آخرین آگهی‌ها و پروژه‌ها</h2><p className="mt-2 text-sm text-slate-500">فرصت‌های مرتبط را پیدا کن و برای همکاری اقدام کن.</p></div><div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{[{id:'all',label:'همه'},{id:'project',label:'پروژه‌ها'},{id:'skill',label:'نیروی انسانی'},{id:'resource',label:'منابع'},{id:'supply',label:'تأمین'}].map((tab) => <button key={tab.id} onClick={() => setActiveCategory(tab.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeCategory === tab.id ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{tab.label}</button>)}</div></div>
          {visibleItems.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map((item, idx) => <div key={item.id}>{idx === 2 && <div className="mb-4 lg:hidden"><AdSlot compact/></div>}<ListingCard item={item} onClick={setDetailItem} onSave={toggleSaved} saved={saved.includes(item.id)} /></div>)}</div> : <div className="rounded-2xl border border-slate-200 bg-white p-10"><EmptyState title="آگهی‌ای با این شرایط پیدا نشد" detail="شهر یا عبارت جست‌وجو را تغییر بده یا همهٔ فیلترها را پاک کن."/><div className="text-center"><button onClick={() => { setQuery(''); setCity('همهٔ شهرها'); setActiveCategory('all') }} className="secondary-btn">پاک‌کردن فیلترها</button></div></div>}
          <div className="mt-7"><AdSlot /></div><div className="mt-5 flex justify-center"><button onClick={() => flash('در نسخهٔ بعدی، صفحه‌بندی نتایج متصل به سرور فعال می‌شود.')} className="secondary-btn">مشاهدهٔ آگهی‌های بیشتر <ArrowLeft size={16}/></button></div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="cta-panel relative overflow-hidden rounded-3xl p-6 sm:p-10"><div className="relative z-10 max-w-2xl"><Badge tone="mint">شروع همکاری</Badge><h2 className="mt-3 text-2xl font-black leading-relaxed text-white sm:text-3xl">یک نیاز داری؟<br/>شاید هم‌پیوند، همکار بعدی‌ات را پیدا کند.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">منبع یا مهارتت را معرفی کن، پروژه بساز و درخواست‌ها را در یک پنل مدیریت کن.</p><button onClick={actCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F2B24F] px-5 py-3 text-sm font-black text-[#172B4D] shadow-lg shadow-black/10 transition hover:bg-amber-300">شروع ثبت آگهی <ArrowLeft size={17}/></button></div><div className="cta-decoration"><span/><span/><span/></div></div></section>
      </main>
      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><div className="flex items-center gap-3"><Brand onClick={() => navigate('home')} compact/><div><p className="font-black">هم‌پیوند</p><p className="mt-1 text-xs text-slate-400">آدم‌ها، منابع و فرصت‌ها؛ کنار هم</p></div></div><div className="flex flex-wrap gap-4 text-xs text-slate-500"><button onClick={() => flash('صفحهٔ راهنما در نسخهٔ بعدی تکمیل می‌شود.')}>راهنما</button><button onClick={() => flash('صفحهٔ قوانین و حریم خصوصی در مرحلهٔ تکمیل محتواست.')}>قوانین و حریم خصوصی</button><button onClick={() => flash('برای نسخهٔ اولیه، فرم پشتیبانی در حال طراحی است.')}>ارتباط با ما</button></div><p className="text-[11px] text-slate-400">© هم‌پیوند · نسخهٔ اولیه</p></div></footer>
    </>}

    {page === 'dashboard' && user && <Dashboard user={user} items={items} saved={saved} onPage={navigate} onViewItem={setDetailItem} onCreate={actCreate} onLogout={() => { setUser(null); sessionStorage.removeItem('hampayvand_token'); sessionStorage.removeItem('hampayvand_user'); setPage('home') }} />}
    {page === 'messages' && user && <MessagesPage onBack={() => navigate('dashboard')} />}
    {page === 'calendar' && user && <CalendarPage onBack={() => navigate('dashboard')} />}
    {page === 'settings' && user && <SettingsPage user={user} onBack={() => navigate('dashboard')} />}
    {page === 'my-items' && user && <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6 flex items-end justify-between"><div><p className="text-sm font-semibold text-teal-700">مدیریت آگهی‌ها</p><h1 className="mt-1 text-2xl font-black">منابع، مهارت‌ها و پروژه‌های من</h1><p className="mt-2 text-sm text-slate-500">از یک بخش، آگهی‌هایت را ویرایش یا بایگانی کن.</p></div><button onClick={actCreate} className="primary-btn"><Plus size={16}/> ثبت مورد جدید</button></div>{items.filter((item) => item.owner === user.name || item.owner === 'کاربر هم‌پیوند').length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.filter((item) => item.owner === user.name || item.owner === 'کاربر هم‌پیوند').map((item) => <ListingCard key={item.id} item={item} onClick={setDetailItem} onSave={toggleSaved} saved={saved.includes(item.id)} />)}</div> : <EmptyState title="هنوز آگهی‌ای ثبت نکرده‌ای" detail="اولین منبع، مهارت یا پروژه‌ات را ثبت کن."/>}</div>}

    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onLogin={login} />}
    {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onPublish={publish} onOpenMap={openMap} />}
    {mapOpen && <MapModal onClose={() => setMapOpen(false)} onSelect={(point) => mapCallback?.(point)} />}
    {detailItem && <DetailModal item={detailItem} onClose={() => setDetailItem(null)} onApply={doApply} onLogin={() => { setDetailItem(null); if (!user) setLoginOpen(true); else navigate('messages') }} />}
    {toast && <div className="toast-message"><CheckCircle2 size={18} className="text-teal-300"/><span>{toast}</span><button onClick={() => setToast('')} className="mr-auto rounded-md p-1 hover:bg-white/10"><X size={15}/></button></div>}
    {user && <button onClick={() => { setUser(null); sessionStorage.removeItem('hampayvand_token'); sessionStorage.removeItem('hampayvand_user'); setPage('home'); flash('از حساب نمایشی خارج شدی.') }} title="خروج از نسخهٔ نمایشی" className="fixed bottom-4 left-4 z-30 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-300/40 transition hover:bg-rose-50 hover:text-rose-600"><LogOut size={17}/></button>}
  </div>
}
