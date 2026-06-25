import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, STORAGE_KEYS } from "../utils/constant";

import en from "./locales/en";
import zhCN from "./locales/zh-CN";

const resources = {
  en: { translation: en },
  "zh-CN": { translation: zhCN },
};

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  compatibilityJSON: "v4",
  interpolation: {
    escapeValue: false,
  },
});

/**
 * Detect system language and map to available resource codes.
 */
function getSystemLanguage() {
  try {
    const locales = Localization.getLocales();
    if (!locales || locales.length === 0) return null;
    const locale = locales[0];
    const languageTag = locale.languageTag;
    const languageCode = locale.languageCode;
    if (!languageTag && !languageCode) return null;
    if (resources[languageTag]) return languageTag;
    if (languageCode === "zh") return "zh-CN";
    const match = Object.keys(resources).find(
      (code) => code === languageCode || code.startsWith(languageCode + "-"),
    );
    if (match) return match;
    return null;
  } catch {
    return null;
  }
}

/**
 * Load language preference from AsyncStorage or fall back to system language.
 * Call this once at app startup.
 */
export async function loadSavedLanguage() {
  try {
    const savedLang = await AsyncStorage.getItem(STORAGE_KEYS.language);
    if (savedLang && resources[savedLang]) {
      await i18n.changeLanguage(savedLang);
      return;
    }
    const sysLang = getSystemLanguage();
    if (sysLang) {
      await i18n.changeLanguage(sysLang);
    }
  } catch {
    // ignore, keep default language
  }
}

/**
 * Change language and persist to AsyncStorage.
 */
export async function setLanguage(langCode) {
  if (!resources[langCode]) return;
  await i18n.changeLanguage(langCode);
  await AsyncStorage.setItem(STORAGE_KEYS.language, langCode);
}

export default i18n;
