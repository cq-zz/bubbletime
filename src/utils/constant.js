import {
    Baby,
    Banknote,
    Bell,
    BookOpen,
    Briefcase,
    Building,
    Bus,
    CalendarCheck,
    CalendarHeart,
    Camera,
    Car,
    Clapperboard,
    ClipboardList,
    Coffee,
    Computer,
    CreditCard,
    DollarSign,
    Droplets,
    Dumbbell,
    Gamepad,
    Gem,
    Gift,
    GraduationCap,
    Heart,
    Home,
    Hospital,
    Landmark,
    Laptop,
    Leaf,
    Moon,
    Music,
    Package,
    PawPrint,
    PiggyBank,
    Plane,
    Shirt,
    Shield,
    ShoppingBag,
    Smile,
    Smartphone,
    Sparkles,
    Star,
    Stethoscope,
    Sun,
    Tag,
    Tv,
    UtensilsCrossed,
    Wifi,
    Zap,
    Sun as WeatherSun,
    Cloud,
    CloudSun,
    CloudDrizzle,
    CloudRain,
    CloudLightning,
    CloudSnow,
    CloudHail,
    CloudFog,
    Cloudy,
    Haze,
    Wind,
    Tornado,
    Rainbow,
} from "lucide-react-native";

// ═══════════════════════════════════════════════
// Storage Keys
// ═══════════════════════════════════════════════

export const STORAGE_KEYS = {
  nickname: "bubbletime_nickname",
  avatar: "bubbletime_avatar",
  homeModules: "bubbletime_home_modules",
  scheduleRemindDays: "bubbletime_schedule_remind_days",
  durableRemindDays: "bubbletime_durable_remind_days",
  importantDateRemindDays: "bubbletime_important_date_remind_days",
  minYear: "bubbletime_min_year",
  maxYear: "bubbletime_max_year",
  currency: "bubbletime_currency",
  language: "bubbletime_language",
  themeMode: "bubbletime_theme_mode",
  checkinEnabled: "bubbletime_checkin_enabled",
};

/** 提醒天数默认值 */
export const REMIND_DEFAULTS = {
  scheduleRemindDays: 1,
  durableRemindDays: 2,
  importantDateRemindDays: 1,
};

/** 年份选择最小年份默认值 */
export const MIN_YEAR_DEFAULT = new Date().getFullYear() - 10;

/** 年份选择最大年份默认值 */
export const MAX_YEAR_DEFAULT = new Date().getFullYear() + 20;

// ═══════════════════════════════════════════════
// Database
// ═══════════════════════════════════════════════

export const DB_CONFIG = {
  storagePrefix: "bubbletime_db_",
  baseDbName: "bubbletime",
};

export const DB_TABLES = {
  durables: "durables",
  bills: "bills",
  schedules: "schedules",
  reminders: "reminders",
  importantDates: "important_dates",
  diaries: "diaries",
  settings: "settings",
};

// ═══════════════════════════════════════════════
// Image Upload Validation
// ═══════════════════════════════════════════════

export const IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// ═══════════════════════════════════════════════
// Categories (English keys, display via i18n)
// ═══════════════════════════════════════════════

/** 通用类别枚举（物品管理 + 记账共用，英文 key） */
export const ITEM_CATEGORIES = [
  "food",
  "clothing",
  "transport",
  "medical",
  "home",
  "appliance",
  "digital",
  "entertainment",
  "daily",
  "education",
  "other",
];

/** 类别图标映射（英文 key → 图标组件） */
export const CATEGORY_ICON = {
  food: UtensilsCrossed,
  clothing: ShoppingBag,
  transport: Bus,
  medical: Hospital,
  home: Home,
  appliance: Tv,
  digital: Computer,
  entertainment: Clapperboard,
  daily: ShoppingBag,
  education: BookOpen,
  other: Tag,
};

/** 图标名称 → 组件映射（用于自定义类别） */
export const CATEGORY_ICON_NAME_MAP = {
  UtensilsCrossed, ShoppingBag, Bus, Hospital, Home, Tv, Computer,
  Clapperboard, BookOpen, Tag, Package, ClipboardList, CalendarCheck,
  CalendarHeart, Banknote, Bell, Gift, Heart, Shield, Zap, Sun, Moon,
  Star, Coffee, Car, Plane, Dumbbell, Wifi, Droplets, PiggyBank, Building,
  Stethoscope, GraduationCap, Shirt, Smartphone, Laptop, Gamepad, Music,
  Camera, PawPrint, Baby, Briefcase, CreditCard, DollarSign, Landmark,
  Leaf, Gem,
};

/** 供图标选择器使用 */
export const ICON_SELECTOR_OPTIONS = [
  "UtensilsCrossed", "ShoppingBag", "Bus", "Hospital", "Home", "Tv", "Computer",
  "Clapperboard", "BookOpen", "Tag", "Package", "Banknote", "Bell", "Gift",
  "Heart", "Shield", "Zap", "Sun", "Moon", "Star", "Coffee", "Car", "Plane",
  "Dumbbell", "Wifi", "Droplets", "PiggyBank", "Building", "Stethoscope",
  "GraduationCap", "Shirt", "Smartphone", "Laptop", "Gamepad", "Music",
  "Camera", "PawPrint", "Baby", "Briefcase", "CreditCard", "DollarSign",
  "Landmark", "Leaf", "Gem",
];

// ═══════════════════════════════════════════════
// Durable 模块常量
// ═══════════════════════════════════════════════

/** 物品筛选类别（英文 key，用于 filter value） */
export const DURABLE_FILTER_KEYS = {
  all: "all",
  inUse: "in_use",
  expired: "expired",
  scrapped: "scrapped",
  transferred: "transferred",
};

export const DURABLE_STATUS_STYLES = {
  active: { bg: "#D1FADF", text: "#0F6B3A", color: "#46A758" },
  expired: { bg: "#FEF3C7", text: "#92400E", color: "#F59E0B" },
  deprecated: { bg: "#D9D9D9", text: "#646467", color: "#B0B0B0" },
  transferred: { bg: "#D6E4F0", text: "#2C5282", color: "#3B82F6" },
};

/** 物品状态选项（value 为 DB 存储值，i18nKey 用于显示） */
export const DURABLE_STATUS_OPTIONS = [
  { value: "in_use", i18nKey: "durable.inUse" },
  { value: "expired", i18nKey: "durable.expired" },
  { value: "scrapped", i18nKey: "durable.scrapped" },
  { value: "transferred", i18nKey: "durable.transferred" },
];

/** Maps status DB value → style key for DURABLE_STATUS_STYLES lookup */
export const DURABLE_STATUS_STYLE_MAP = {
  in_use: "active",
  expired: "expired",
  scrapped: "deprecated",
  transferred: "transferred",
};

export function getDurableStatusStyle(value) {
  const key = DURABLE_STATUS_STYLE_MAP[value] || "active";
  return DURABLE_STATUS_STYLES[key] || DURABLE_STATUS_STYLES.active;
}

// ═══════════════════════════════════════════════
// Schedule 模块常量
// ═══════════════════════════════════════════════

/** 计划筛选类别（英文 key，用于 filter value） */
export const SCHEDULE_FILTER_KEYS = {
  all: "all",
  notStarted: "not_started",
  inProgress: "in_progress",
  done: "done",
  incomplete: "incomplete",
};

/** 计划状态选项（value 为 DB 存储值，i18nKey 用于显示） */
export const SCHEDULE_STATUS_OPTIONS = [
  { value: "not_started", i18nKey: "schedule.notStarted" },
  { value: "in_progress", i18nKey: "schedule.inProgress" },
  { value: "done", i18nKey: "schedule.done" },
  { value: "incomplete", i18nKey: "schedule.incomplete" },
];

// ═══════════════════════════════════════════════
// Home 页面常量
// ═══════════════════════════════════════════════

export const HOME_MODULES = [
  {
    id: "durable",
    i18nKey: "home.durable",
    accent: "#C78B4A",
    icon: Package,
    metaColor: "#C78B4A",
  },
  {
    id: "schedule",
    i18nKey: "home.schedule",
    accent: "#7B9FD4",
    icon: CalendarCheck,
    metaColor: "#7B9FD4",
  },
  {
    id: "bills",
    i18nKey: "home.bills",
    accent: "#A77DCD",
    icon: ClipboardList,
    metaColor: "#A77DCD",
  },
  {
    id: "diary",
    i18nKey: "home.diary",
    accent: "#D4A574",
    icon: BookOpen,
    metaColor: "#D4A574",
  },
  {
    id: "important-date",
    i18nKey: "home.importantDate",
    accent: "#E93D82",
    icon: CalendarHeart,
    metaColor: "#E93D82",
  },
  {
    id: "mood-trend",
    i18nKey: "moodTrend.title",
    accent: "#46A758",
    icon: Smile,
    metaColor: "#46A758",
  },
  {
    id: "bubble-time-game",
    i18nKey: "home.bubbleTimeGame",
    accent: "#38BDF8",
    icon: Sparkles,
    metaColor: "#38BDF8",
  },
];

// ═══════════════════════════════════════════════
// Language
// ═══════════════════════════════════════════════

export const LANGUAGE_LIST = [
  { code: "zh-CN", i18nKey: "language.zhCN", nativeLabel: "简体中文" },
  { code: "en", i18nKey: "language.en", nativeLabel: "English" },
];

/**
 * 默认语言
 * 注意:应用启动时会优先检测系统语言,此值仅作为最终回退值
 */
export const DEFAULT_LANGUAGE = "en";

// ═══════════════════════════════════════════════
// Currency
// ═══════════════════════════════════════════════

export const CURRENCY_LIST = [
  { code: "CNY", i18nKey: "currency.cny", icon: "¥" },
  { code: "USD", i18nKey: "currency.usd", icon: "$" },
  { code: "EUR", i18nKey: "currency.eur", icon: "€" },
  { code: "GBP", i18nKey: "currency.gbp", icon: "£" },
  { code: "JPY", i18nKey: "currency.jpy", icon: "JP¥" },
  { code: "KRW", i18nKey: "currency.krw", icon: "₩" },
  { code: "HKD", i18nKey: "currency.hkd", icon: "HK$" },
  { code: "MOP", i18nKey: "currency.mop", icon: "MOP$" },
  { code: "TWD", i18nKey: "currency.twd", icon: "NT$" },
  { code: "SGD", i18nKey: "currency.sgd", icon: "S$" },
  { code: "AUD", i18nKey: "currency.aud", icon: "A$" },
  { code: "NZD", i18nKey: "currency.nzd", icon: "NZ$" },
  { code: "CAD", i18nKey: "currency.cad", icon: "C$" },
  { code: "CHF", i18nKey: "currency.chf", icon: "CHF" },
  { code: "RUB", i18nKey: "currency.rub", icon: "₽" },
  { code: "INR", i18nKey: "currency.inr", icon: "₹" },
  { code: "IDR", i18nKey: "currency.idr", icon: "Rp" },
  { code: "THB", i18nKey: "currency.thb", icon: "฿" },
  { code: "VND", i18nKey: "currency.vnd", icon: "₫" },
  { code: "PHP", i18nKey: "currency.php", icon: "₱" },
  { code: "MYR", i18nKey: "currency.myr", icon: "RM" },
  { code: "TRY", i18nKey: "currency.try", icon: "₺" },
  { code: "AED", i18nKey: "currency.aed", icon: "AED" },
  { code: "SAR", i18nKey: "currency.sar", icon: "SAR" },
  { code: "QAR", i18nKey: "currency.qar", icon: "QAR" },
  { code: "BRL", i18nKey: "currency.brl", icon: "R$" },
  { code: "MXN", i18nKey: "currency.mxn", icon: "MX$" },
  { code: "ARS", i18nKey: "currency.ars", icon: "AR$" },
  { code: "CLP", i18nKey: "currency.clp", icon: "CLP$" },
  { code: "COP", i18nKey: "currency.cop", icon: "COP$" },
  { code: "PEN", i18nKey: "currency.pen", icon: "S/" },
  { code: "ZAR", i18nKey: "currency.zar", icon: "R" },
  { code: "EGP", i18nKey: "currency.egp", icon: "E£" },
  { code: "NGN", i18nKey: "currency.ngn", icon: "₦" },
  { code: "KES", i18nKey: "currency.kes", icon: "KSh" },
  { code: "SEK", i18nKey: "currency.sek", icon: "SEKkr" },
  { code: "NOK", i18nKey: "currency.nok", icon: "NOKkr" },
  { code: "DKK", i18nKey: "currency.dkk", icon: "DKKkr" },
  { code: "ISK", i18nKey: "currency.isk", icon: "ISKkr" },
  { code: "PLN", i18nKey: "currency.pln", icon: "zł" },
  { code: "CZK", i18nKey: "currency.czk", icon: "Kč" },
  { code: "HUF", i18nKey: "currency.huf", icon: "Ft" },
  { code: "RON", i18nKey: "currency.ron", icon: "lei" },
  { code: "BGN", i18nKey: "currency.bgn", icon: "лв" },
  { code: "UAH", i18nKey: "currency.uah", icon: "₴" },
  { code: "ILS", i18nKey: "currency.ils", icon: "₪" },
  { code: "PKR", i18nKey: "currency.pkr", icon: "₨" },
  { code: "BDT", i18nKey: "currency.bdt", icon: "৳" },
  { code: "LKR", i18nKey: "currency.lkr", icon: "Rs" },
  { code: "NPR", i18nKey: "currency.npr", icon: "₨" },
  { code: "MMK", i18nKey: "currency.mmk", icon: "Ks" },
  { code: "KHR", i18nKey: "currency.khr", icon: "៛" },
  { code: "LAK", i18nKey: "currency.lak", icon: "₭" },
];

export const DEFAULT_CURRENCY = CURRENCY_LIST[0];

// ═══════════════════════════════════════════════
// Mood / Check-in 常量
// ═══════════════════════════════════════════════

/** 签到心情选项（emoji 渲染，key 用于 i18n，score 用于趋势分析 1-5） */
export const MOODS = [
  { emoji: "🥰", key: "loved", score: 5 },
  { emoji: "🤩", key: "excited", score: 5 },
  { emoji: "😆", key: "joyful", score: 5 },
  { emoji: "🤗", key: "grateful", score: 5 },
  { emoji: "🤯", key: "amazed", score: 5 },
  { emoji: "😊", key: "happy", score: 5 },
  { emoji: "😇", key: "peaceful", score: 4 },
  { emoji: "😌", key: "relaxed", score: 4 },
  { emoji: "😏", key: "amused", score: 4 },
  { emoji: "😎", key: "proud", score: 4 },
  { emoji: "🥺", key: "hopeful", score: 4 },
  { emoji: "🤔", key: "thoughtful", score: 3 },
  { emoji: "😐", key: "neutral", score: 3 },
  { emoji: "😴", key: "sleepy", score: 2 },
  { emoji: "😰", key: "anxious", score: 2 },
  { emoji: "😞", key: "disappointed", score: 2 },
  { emoji: "😣", key: "stressed", score: 1 },
  { emoji: "😢", key: "sad", score: 1 },
  { emoji: "😤", key: "angry", score: 1 },
  { emoji: "😫", key: "exhausted", score: 1 },
];

// ═══════════════════════════════════════════════
// Diary 模块常量
// ═══════════════════════════════════════════════

export const WEATHER_OPTIONS = [
  { value: "sunny", icon: "WeatherSun", emoji: "☀️" },
  { value: "clearNight", icon: "Moon", emoji: "🌙" },
  { value: "partlyCloudy", icon: "CloudSun", emoji: "⛅" },
  { value: "cloudy", icon: "Cloud", emoji: "☁️" },
  { value: "overcast", icon: "Cloudy", emoji: "☁️" },
  { value: "drizzle", icon: "CloudDrizzle", emoji: "🌦️" },
  { value: "rainy", icon: "CloudRain", emoji: "🌧️" },
  { value: "thunderstorm", icon: "CloudLightning", emoji: "⛈️" },
  { value: "snowy", icon: "CloudSnow", emoji: "❄️" },
  { value: "sleet", icon: "CloudSnow", emoji: "🌨️" },
  { value: "hail", icon: "CloudHail", emoji: "🌨️" },
  { value: "foggy", icon: "CloudFog", emoji: "🌫️" },
  { value: "hazy", icon: "Haze", emoji: "🌁" },
  { value: "windy", icon: "Wind", emoji: "💨" },
  { value: "tornado", icon: "Tornado", emoji: "🌪️" },
  { value: "rainbow", icon: "Rainbow", emoji: "🌈" },
];

export const WEATHER_ICON_MAP = {
  sunny: WeatherSun,
  clearNight: Moon,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  overcast: Cloudy,
  drizzle: CloudDrizzle,
  rainy: CloudRain,
  thunderstorm: CloudLightning,
  snowy: CloudSnow,
  sleet: CloudSnow,
  hail: CloudHail,
  foggy: CloudFog,
  hazy: Haze,
  windy: Wind,
  tornado: Tornado,
  rainbow: Rainbow,
};

// ═══════════════════════════════════════════════
// Important Date 模块常量
// ═══════════════════════════════════════════════

export const IMPORTANT_DATE_CATEGORIES = {
  all: "all",
  birthday: "birthday",
  wedding: "wedding",
  holiday: "holiday",
  work: "work",
  other: "other",
};
