import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Platform } from "react-native";
import { CURRENCY_LIST, DEFAULT_CURRENCY, STORAGE_KEYS } from "./constant";

// ─────────────────────────────────────────────────────────
// Color Palettes
// ─────────────────────────────────────────────────────────

const DARK_COLORS = {
  primary: "#A677B6",
  primaryLight: "#C49DD4",
  primaryDark: "#8B5FA0",
  primaryBg: "rgba(166, 119, 182, 0.10)",
  primaryBgMedium: "rgba(166, 119, 182, 0.18)",
  primaryBgStrong: "rgba(166, 119, 182, 0.28)",

  background: "#0B0B1A",
  surface: "rgba(255, 255, 255, 0.07)",
  surfaceSubtle: "rgba(255, 255, 255, 0.04)",
  surfaceFrost: "rgba(255, 255, 255, 0.11)",

  textPrimary: "#F0EDF5",
  textSecondary: "#B8B0CC",
  textTertiary: "#7A7299",
  textInverse: "#FFFFFF",

  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.05)",
  divider: "rgba(255, 255, 255, 0.06)",

  accent: {
    purple: "#A677B6",
    blue: "#7B9FD4",
    pink: "#E8A0C8",
    yellow: "#E8C76A",
    green: "#6BCB9E",
    red: "#E56060",
    orange: "#E89060",
    sage: "#8AB8A0",
  },

  input: {
    bg: "rgba(255, 255, 255, 0.06)",
    bgFocus: "rgba(255, 255, 255, 0.10)",
    border: "rgba(255, 255, 255, 0.10)",
    borderFocus: "#A677B6",
    placeholder: "#5A5270",
    text: "#F0EDF5",
    icon: "#7A7299",
    iconActive: "#A677B6",
  },

  toggle: {
    trackOff: "rgba(255, 255, 255, 0.15)",
    trackOn: "#A677B6",
    thumb: "#FFFFFF",
  },

  error: {
    text: "#E56060",
    bg: "rgba(229, 96, 96, 0.12)",
    border: "rgba(229, 96, 96, 0.20)",
  },

  shadow: "rgba(166, 119, 182, 0.08)",
  shadowMd: "rgba(166, 119, 182, 0.14)",
  shadowLg: "rgba(166, 119, 182, 0.20)",

  modalBg: "#1A1A2E",
  modalOverlay: "rgba(0,0,0,0.55)",
  modeSwitchBg: "rgba(255,255,255,0.12)",
  dangerBg: "rgba(229, 69, 69, 0.08)",
  statusBar: "light-content",
};

const CANDY_COLORS = {
  primary: "#FF6BA6",
  primaryLight: "#FF9EC6",
  primaryDark: "#E04E8A",
  primaryBg: "rgba(255, 107, 166, 0.14)",
  primaryBgMedium: "rgba(255, 107, 166, 0.24)",
  primaryBgStrong: "rgba(255, 107, 166, 0.36)",

  background: "#FFF0F6",
  surface: "rgba(255, 107, 166, 0.08)",
  surfaceSubtle: "rgba(255, 210, 130, 0.08)",
  surfaceFrost: "#FFF8FB",

  textPrimary: "#2D1B42",
  textSecondary: "#6B4D80",
  textTertiary: "#A888C0",
  textInverse: "#FFFFFF",

  border: "rgba(255, 107, 166, 0.30)",
  borderLight: "rgba(255, 107, 166, 0.16)",
  divider: "rgba(255, 107, 166, 0.18)",

  accent: {
    purple: "#B96EFF",
    blue: "#5EB8FF",
    pink: "#FF6BA6",
    yellow: "#FFC233",
    green: "#56C98F",
    red: "#FF5252",
    orange: "#FF8C42",
    sage: "#7BC8A4",
  },

  input: {
    bg: "rgba(255, 107, 166, 0.08)",
    bgFocus: "rgba(255, 107, 166, 0.16)",
    border: "rgba(255, 107, 166, 0.30)",
    borderFocus: "#FF6BA6",
    placeholder: "#A888C0",
    text: "#2D1B42",
    icon: "#A888C0",
    iconActive: "#FF6BA6",
  },

  toggle: {
    trackOff: "rgba(255, 107, 166, 0.22)",
    trackOn: "#FF6BA6",
    thumb: "#FFFFFF",
  },

  error: {
    text: "#FF5252",
    bg: "rgba(255, 82, 82, 0.12)",
    border: "rgba(255, 82, 82, 0.28)",
  },

  shadow: "rgba(255, 107, 166, 0.16)",
  shadowMd: "rgba(255, 107, 166, 0.24)",
  shadowLg: "rgba(255, 107, 166, 0.32)",

  modalBg: "#FFF8FB",
  modalOverlay: "rgba(45, 27, 66, 0.45)",
  modeSwitchBg: "rgba(255, 107, 166, 0.14)",
  dangerBg: "rgba(255, 82, 82, 0.10)",
  statusBar: "dark-content",
};

const LIGHT_COLORS = {
  primary: "#9055A8",
  primaryLight: "#B080C8",
  primaryDark: "#7A4090",
  primaryBg: "rgba(144, 85, 168, 0.08)",
  primaryBgMedium: "rgba(144, 85, 168, 0.14)",
  primaryBgStrong: "rgba(144, 85, 168, 0.22)",

  background: "#F5F2F9",
  surface: "rgba(0, 0, 0, 0.04)",
  surfaceSubtle: "rgba(0, 0, 0, 0.02)",
  surfaceFrost: "rgba(255, 255, 255, 0.85)",

  textPrimary: "#1C1528",
  textSecondary: "#5A5068",
  textTertiary: "#9088A0",
  textInverse: "#FFFFFF",

  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.05)",
  divider: "rgba(0, 0, 0, 0.06)",

  accent: {
    purple: "#9055A8",
    blue: "#5A80C0",
    pink: "#D080A8",
    yellow: "#C8A040",
    green: "#50A878",
    red: "#D04040",
    orange: "#D07040",
    sage: "#709880",
  },

  input: {
    bg: "rgba(0, 0, 0, 0.04)",
    bgFocus: "rgba(0, 0, 0, 0.07)",
    border: "rgba(0, 0, 0, 0.10)",
    borderFocus: "#9055A8",
    placeholder: "#9088A0",
    text: "#1C1528",
    icon: "#9088A0",
    iconActive: "#9055A8",
  },

  toggle: {
    trackOff: "rgba(0, 0, 0, 0.15)",
    trackOn: "#9055A8",
    thumb: "#FFFFFF",
  },

  error: {
    text: "#D04040",
    bg: "rgba(208, 64, 64, 0.10)",
    border: "rgba(208, 64, 64, 0.20)",
  },

  shadow: "rgba(100, 60, 130, 0.08)",
  shadowMd: "rgba(100, 60, 130, 0.12)",
  shadowLg: "rgba(100, 60, 130, 0.18)",

  modalBg: "#FFFFFF",
  modalOverlay: "rgba(0,0,0,0.40)",
  modeSwitchBg: "rgba(0,0,0,0.08)",
  dangerBg: "rgba(208, 64, 64, 0.06)",
  statusBar: "dark-content",
};

// ─────────────────────────────────────────────────────────
// Static tokens (non-color)
// ─────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 26,
  xxxl: 32,
  huge: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 40,
  full: 999,
};

export const hexToRgba = (hex, alpha = 1) => {
  if (!hex || typeof hex !== "string") return "rgba(0,0,0,0)";
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "rgba(0,0,0,0)";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "rgba(0,0,0,0)";
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ─────────────────────────────────────────────────────────
// Builders (depend on colors)
// ─────────────────────────────────────────────────────────

function buildTypography(colors) {
  return {
    hero: { fontSize: 32, fontWeight: "800", lineHeight: 40, letterSpacing: -0.8, color: colors.textPrimary },
    heroSub: { fontSize: 15, fontWeight: "600", lineHeight: 22, color: colors.textSecondary },
    h1: { fontSize: 26, fontWeight: "700", lineHeight: 34, letterSpacing: -0.5, color: colors.textPrimary },
    h2: { fontSize: 22, fontWeight: "700", lineHeight: 30, color: colors.textPrimary },
    h3: { fontSize: 18, fontWeight: "600", lineHeight: 26, color: colors.textPrimary },
    body: { fontSize: 15, fontWeight: "500", lineHeight: 22, color: colors.textSecondary },
    bodySmall: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: colors.textTertiary },
    caption: { fontSize: 11, fontWeight: "600", lineHeight: 16, letterSpacing: 0.5, color: colors.textTertiary },
    label: { fontSize: 13, fontWeight: "600", lineHeight: 18, letterSpacing: 0.3, color: colors.textSecondary },
    button: { fontSize: 17, fontWeight: "700", lineHeight: 22, color: colors.textInverse },
    buttonSmall: { fontSize: 14, fontWeight: "700", lineHeight: 18, color: colors.textInverse },
    tabIcon: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2, lineHeight: 14 },
    tabIconActive: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2, lineHeight: 14 },
  };
}

function buildShadows(mode) {
  const isCandy = mode === "candy";
  const shadowColor = isCandy ? "#FF6BA6" : "#A677B6";
  const intensity = isCandy ? 1.4 : 1;
  return {
    sm: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14 * intensity, shadowRadius: 10 }, default: { boxShadow: `0 3px 10px ${shadowColor}26` } }),
    md: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18 * intensity, shadowRadius: 18 }, default: { boxShadow: `0 5px 18px ${shadowColor}30` } }),
    lg: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22 * intensity, shadowRadius: 30 }, default: { boxShadow: `0 8px 30px ${shadowColor}38` } }),
    xl: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28 * intensity, shadowRadius: 44 }, default: { boxShadow: `0 14px 44px ${shadowColor}48` } }),
    glow: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35 * intensity, shadowRadius: 24 }, default: { boxShadow: `0 0 24px ${shadowColor}58` } }),
    card: Platform.select({ ios: { shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.13 * intensity, shadowRadius: 16 }, default: { boxShadow: `0 3px 16px ${shadowColor}22` } }),
  };
}

function buildCardStyles(colors, shadows, mode) {
  const isCandy = mode === "candy";
  const bw = isCandy ? 2 : 1;
  const r = isCandy
    ? { glass: radius.xxxl, elevated: radius.xxl, frosted: radius.xxl }
    : { glass: radius.xxl, elevated: radius.xl, frosted: radius.xl };
  return {
    glass: { backgroundColor: colors.surface, borderRadius: r.glass, borderCurve: "continuous", borderWidth: bw, borderColor: colors.border, ...shadows.card },
    elevated: { backgroundColor: colors.surfaceFrost, borderRadius: r.elevated, borderCurve: "continuous", ...shadows.lg },
    frosted: { backgroundColor: colors.surfaceFrost, borderRadius: r.frosted, borderCurve: "continuous", borderWidth: bw, borderColor: colors.border, ...shadows.md },
  };
}

// ─────────────────────────────────────────────────────────
// Currency sync cache (for non-React service layer)
// ─────────────────────────────────────────────────────────

let _currencyCache = DEFAULT_CURRENCY;

export function getCurrencyIcon() {
  return _currencyCache.icon;
}

export function getCurrency() {
  return _currencyCache;
}

// ─────────────────────────────────────────────────────────
// Theme Context
// ─────────────────────────────────────────────────────────

const ThemeContext = createContext({
  colors: DARK_COLORS,
  themeMode: "dark",
  isDark: true,
  isCandy: false,
  typography: buildTypography(DARK_COLORS),
  shadows: buildShadows("dark"),
  cardStyles: buildCardStyles(DARK_COLORS, buildShadows("dark"), "dark"),
  setThemeMode: () => {},
  toggleTheme: () => {},
  currency: DEFAULT_CURRENCY,
  currencyIcon: DEFAULT_CURRENCY.icon,
  setCurrency: () => {},
});

function resolveColors(mode) {
  if (mode === "candy") return CANDY_COLORS;
  if (mode === "light") return LIGHT_COLORS;
  return DARK_COLORS;
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeModeState] = useState("dark");
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.themeMode),
      AsyncStorage.getItem(STORAGE_KEYS.currency),
    ])
      .then(([themeVal, currencyVal]) => {
        if (themeVal === "light" || themeVal === "dark" || themeVal === "candy")
          setThemeModeState(themeVal);
        if (currencyVal) {
          const found = CURRENCY_LIST.find((c) => c.code === currencyVal);
          if (found) {
            setCurrencyState(found);
            _currencyCache = found;
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = useCallback((mode) => {
    AsyncStorage.setItem(STORAGE_KEYS.themeMode, mode).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode) => {
    setThemeModeState(mode);
    persist(mode);
  }, [persist]);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const order = ["dark", "light", "candy"];
      const next = order[(order.indexOf(prev) + 1) % order.length];
      persist(next);
      return next;
    });
  }, [persist]);

  const setCurrency = useCallback((currencyObj) => {
    setCurrencyState(currencyObj);
    _currencyCache = currencyObj;
    AsyncStorage.setItem(STORAGE_KEYS.currency, currencyObj.code).catch(() => {});
  }, []);

  const value = useMemo(() => {
    const c = resolveColors(themeMode);
    const t = buildTypography(c);
    const s = buildShadows(themeMode);
    const cs = buildCardStyles(c, s, themeMode);
    return {
      colors: c,
      themeMode,
      isDark: themeMode === "dark",
      isCandy: themeMode === "candy",
      typography: t,
      shadows: s,
      cardStyles: cs,
      setThemeMode,
      toggleTheme,
      currency,
      currencyIcon: currency.icon,
      setCurrency,
    };
  }, [themeMode, setThemeMode, toggleTheme, currency, setCurrency]);

  if (!loaded) return null;
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
