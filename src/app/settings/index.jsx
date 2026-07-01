import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import {
    Banknote,
    Bell,
    BookOpen,
    Calendar,
    CalendarCheck,
    CalendarHeart,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    ClipboardList,
    Globe,
    LayoutGrid,
    Package,
    Receipt,
    Smile,
    Sparkles,
    Tag,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    FlatList,
    LayoutAnimation,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { setLanguage } from "../../i18n";
import {
    CURRENCY_LIST,
    HOME_MODULES,
    LANGUAGE_LIST,
    MAX_YEAR_DEFAULT,
    MIN_YEAR_DEFAULT,
    REMIND_DEFAULTS,
    STORAGE_KEYS,
} from "../../utils/constant";
import { hexToRgba, radius, spacing, useTheme } from "../../utils/theme";
import { emit } from "../../utils/events";

const MODULE_ICONS = {
  durable: Package,
  schedule: CalendarCheck,
  bills: ClipboardList,
  diary: BookOpen,
  "important-date": CalendarHeart,
  "mood-trend": Smile,
  "bubble-time-game": Sparkles,
};

function ToggleSwitch({ value }) {
  const { colors } = useTheme();
  const on = !!value;
  const [animValue] = useState(() => new Animated.Value(on ? 1 : 0));

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: on ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 160,
    }).start();
  }, [on, animValue]);

  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 20],
  });

  const tglStyles = useMemo(() => buildToggleStyles(colors), [colors]);

  return (
    <View style={[tglStyles.track, on && tglStyles.trackOn]}>
      <Animated.View
        style={[
          tglStyles.thumb,
          { transform: [{ translateX: thumbTranslateX }] },
        ]}
      />
    </View>
  );
}

function buildToggleStyles(colors) {
  return StyleSheet.create({
    track: {
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.toggle.trackOff,
      justifyContent: "center",
      paddingHorizontal: 2,
    },
    trackOn: {
      backgroundColor: colors.toggle.trackOn,
    },
    thumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.toggle.thumb,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
        },
        web: {
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        },
      }),
    },
  });
}

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const {
    colors,
    shadows,
    themeMode,
    currency,
    setCurrency,
  } = useTheme();
  const router = useRouter();
  const [moduleVisibility, setModuleVisibility] = useState({});
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [scheduleRemindDays, setScheduleRemindDays] = useState(
    REMIND_DEFAULTS.scheduleRemindDays,
  );
  const [durableRemindDays, setDurableRemindDays] = useState(
    REMIND_DEFAULTS.durableRemindDays,
  );
  const [minYear, setMinYear] = useState(MIN_YEAR_DEFAULT);
  const [maxYear, setMaxYear] = useState(MAX_YEAR_DEFAULT);
  const [homeModulesExpanded, setHomeModulesExpanded] = useState(true);


  const styles = useMemo(() => buildStyles(colors, shadows, themeMode), [colors, shadows, themeMode]);

  const currentLanguage =
    LANGUAGE_LIST.find((l) => l.code === i18n.language) || LANGUAGE_LIST[0];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const savedModules = await AsyncStorage.getItem(STORAGE_KEYS.homeModules);
        if (cancelled) return;
        const vis = {};
        HOME_MODULES.forEach((mod) => {
          vis[mod.id] = savedModules
            ? JSON.parse(savedModules).includes(mod.id)
            : true;
        });
        setModuleVisibility(vis);
        // 加载提醒天数配置
        const [savedScheduleDays, savedDurableDays] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.scheduleRemindDays),
          AsyncStorage.getItem(STORAGE_KEYS.durableRemindDays),
        ]);
        if (savedScheduleDays !== null)
          setScheduleRemindDays(Number(savedScheduleDays));
        if (savedDurableDays !== null)
          setDurableRemindDays(Number(savedDurableDays));
        const savedMinYear = await AsyncStorage.getItem(STORAGE_KEYS.minYear);
        if (savedMinYear !== null) setMinYear(Number(savedMinYear));
        const savedMaxYear = await AsyncStorage.getItem(STORAGE_KEYS.maxYear);
        if (savedMaxYear !== null) setMaxYear(Number(savedMaxYear));

      } catch {
        if (!cancelled) {
          const vis = {};
          HOME_MODULES.forEach((mod) => {
            vis[mod.id] = true;
          });
          setModuleVisibility(vis);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleModule = (id) => {
    const visibleCount = Object.values(moduleVisibility).filter(Boolean).length;
    if (moduleVisibility[id] && visibleCount <= 1) return;
    setModuleVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const saveSettings = useCallback(async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error("Auto-save failed:", e);
    }
  }, []);

  const prevModuleVisibility = useRef({});
  useEffect(() => {
    if (Object.keys(moduleVisibility).length === 0) return;
    if (
      JSON.stringify(moduleVisibility) ===
      JSON.stringify(prevModuleVisibility.current)
    )
      return;
    prevModuleVisibility.current = { ...moduleVisibility };
    const visibleIds = HOME_MODULES.filter(
      (mod) => moduleVisibility[mod.id],
    ).map((mod) => mod.id);
    saveSettings(STORAGE_KEYS.homeModules, JSON.stringify(visibleIds));
    emit("modulesChanged");
  }, [moduleVisibility, saveSettings]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t("settings.title"), headerShown: true }}
      /><ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardGroup}>
          <Pressable
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setHomeModulesExpanded((prev) => !prev);
            }}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.moduleItemIcon,
                    { backgroundColor: hexToRgba(colors.primary, 0.12) },
                  ]}
                >
                  <LayoutGrid size={18} color={colors.primary} />
                </View>
                <Text style={styles.groupLabel}>{t("settings.homeModules")}</Text>
                <View style={{ marginLeft: "auto" }}>
                  {homeModulesExpanded ? (
                    <ChevronUp size={18} color={colors.textTertiary} />
                  ) : (
                    <ChevronDown size={18} color={colors.textTertiary} />
                  )}
                </View>
              </View>
              <Text style={styles.groupDesc}>
                {t("settings.homeModulesDesc")}
              </Text>
            </View>
          </Pressable>
          {homeModulesExpanded && (
            <View style={styles.moduleList}>
              {HOME_MODULES.map((mod) => {
                const IconComponent = MODULE_ICONS[mod.id];
                const isVisible = moduleVisibility[mod.id];
                return (
                  <Pressable
                    key={mod.id}
                    style={({ pressed }) => [
                      styles.moduleItem,
                      pressed && styles.moduleItemPressed,
                    ]}
                    onPress={() => toggleModule(mod.id)}
                  >
                    <View style={styles.moduleItemLeft}>
                      <View
                        style={[
                          styles.moduleItemIcon,
                          { backgroundColor: hexToRgba(mod.accent, 0.12) },
                        ]}
                      >
                        {IconComponent &&
                          React.createElement(IconComponent, {
                            size: 18,
                            color: mod.accent,
                          })}
                      </View>
                      <Text style={styles.moduleItemLabel}>{t(mod.i18nKey)}</Text>
                    </View><ToggleSwitch value={isVisible} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* 币种设置 */}
        {/* 币种设置 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.moduleItemIcon,
                  { backgroundColor: hexToRgba("#F0B866", 0.12) },
                ]}
              >
                <Banknote size={18} color="#F0B866" />
              </View>
              <Text style={styles.groupLabel}>{t("settings.currency")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("settings.currencyDesc")}</Text>
          </View>
          <View style={styles.moduleList}>
            <Pressable
              style={({ pressed }) => [
                styles.moduleItem,
                styles.moduleItemLast,
                pressed && styles.moduleItemPressed,
              ]}
              onPress={() => setShowCurrencyModal(true)}
            >
              <View style={styles.moduleItemLeft}>
                <View
                  style={[
                    styles.moduleItemIcon,
                    { backgroundColor: hexToRgba("#F0B866", 0.12) },
                  ]}
                >
                  <Banknote size={18} color="#F0B866" />
                </View><View style={styles.remindRowTextWrap}>
                  <Text style={styles.moduleItemLabel}>
                    {t(currency.i18nKey)} ({currency.icon})
                  </Text>
                  <Text style={styles.remindRowDesc}>{currency.code}</Text>
                </View>
              </View><ChevronDown size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>

        {/* 语言设置 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.moduleItemIcon,
                  { backgroundColor: hexToRgba("#9B8FD4", 0.12) },
                ]}
              >
                <Globe size={18} color="#9B8FD4" />
              </View>
              <Text style={styles.groupLabel}>{t("settings.language")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("settings.languageDesc")}</Text>
          </View>
          <View style={styles.moduleList}>
            <Pressable
              style={({ pressed }) => [
                styles.moduleItem,
                styles.moduleItemLast,
                pressed && styles.moduleItemPressed,
              ]}
              onPress={() => setShowLanguageModal(true)}
            >
              <View style={styles.moduleItemLeft}>
                <View
                  style={[
                    styles.moduleItemIcon,
                    { backgroundColor: hexToRgba("#9B8FD4", 0.12) },
                  ]}
                >
                  <Globe size={18} color="#9B8FD4" />
                </View><View style={styles.remindRowTextWrap}>
                  <Text style={styles.moduleItemLabel}>
                    {currentLanguage.nativeLabel}
                  </Text>
                  <Text style={styles.remindRowDesc}>
                    {t(currentLanguage.i18nKey)}
                  </Text>
                </View>
              </View><ChevronDown size={18} color={colors.textTertiary} />
            </Pressable>
          </View>
        </View>

        {/* 类别管理 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.moduleItemIcon,
                  { backgroundColor: hexToRgba(colors.accent.purple, 0.12) },
                ]}
              >
                <Tag size={18} color={colors.accent.purple} />
              </View>
              <Text style={styles.groupLabel}>
                {t("settings.categoryManagement")}
              </Text>
            </View>
            <Text style={styles.groupDesc}>
              {t("settings.customCategoriesDesc")}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.dataActionItem,
              pressed && styles.moduleItemPressed,
            ]}
            onPress={() => router.push("/settings/categories")}
          >
            <View style={styles.dataActionLeft}>
              <View
                style={[
                  styles.dataActionIcon,
                  { backgroundColor: hexToRgba(colors.accent.purple, 0.12) },
                ]}
              >
                <Tag size={16} color={colors.accent.purple} />
              </View>
              <Text style={styles.dataActionLabel}>{t("settings.customCategories")}</Text>
            </View>
            <ChevronRight size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        {/* 提醒设置 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.moduleItemIcon,
                  { backgroundColor: hexToRgba(colors.primary, 0.12) },
                ]}
              >
                <Bell size={18} color={colors.primary} />
              </View>
              <Text style={styles.groupLabel}>
                {t("settings.reminderSettings")}
              </Text>
            </View>
            <Text style={styles.groupDesc}>
              {t("settings.reminderSettingsDesc")}
            </Text>
          </View>
          <View style={styles.moduleList}>
            <View style={styles.remindRow}>
              <View style={styles.remindRowLeft}>
                <View
                  style={[
                    styles.moduleItemIcon,
                    { backgroundColor: hexToRgba("#7B9FD4", 0.12) },
                  ]}
                >
                  <CalendarCheck size={18} color="#7B9FD4" />
                </View>
                <View style={styles.remindRowTextWrap}>
                  <Text style={styles.moduleItemLabel}>
                    {t("settings.scheduleRemind")}
                  </Text>
                  <Text style={styles.remindRowDesc}>
                    {t("settings.scheduleRemindDesc", {
                      days: scheduleRemindDays,
                    })}
                  </Text>
                </View>
              </View><View style={styles.stepperRow}>
                <Pressable
                  style={[
                    styles.stepperBtn,
                    scheduleRemindDays <= 0 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => {
                    if (scheduleRemindDays > 0) {
                      const v = scheduleRemindDays - 1;
                      setScheduleRemindDays(v);
                      saveSettings(STORAGE_KEYS.scheduleRemindDays, String(v));
                    }
                  }}
                  disabled={scheduleRemindDays <= 0}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{scheduleRemindDays}</Text>
                <Pressable
                  style={[
                    styles.stepperBtn,
                    scheduleRemindDays >= 7 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => {
                    if (scheduleRemindDays < 7) {
                      const v = scheduleRemindDays + 1;
                      setScheduleRemindDays(v);
                      saveSettings(STORAGE_KEYS.scheduleRemindDays, String(v));
                    }
                  }}
                  disabled={scheduleRemindDays >= 7}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View><View style={[styles.remindRow, styles.remindRowLast]}>
              <View style={styles.remindRowLeft}>
                <View
                  style={[
                    styles.moduleItemIcon,
                    { backgroundColor: hexToRgba("#8AB8A0", 0.12) },
                  ]}
                >
                  <Package size={18} color="#8AB8A0" />
                </View>
                <View style={styles.remindRowTextWrap}>
                  <Text style={styles.moduleItemLabel}>
                    {t("settings.durableRemind")}
                  </Text>
                  <Text style={styles.remindRowDesc}>
                    {t("settings.durableRemindDesc", {
                      days: durableRemindDays,
                    })}
                  </Text>
                </View>
              </View><View style={styles.stepperRow}>
                <Pressable
                  style={[
                    styles.stepperBtn,
                    durableRemindDays <= 0 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => {
                    if (durableRemindDays > 0) {
                      const v = durableRemindDays - 1;
                      setDurableRemindDays(v);
                      saveSettings(STORAGE_KEYS.durableRemindDays, String(v));
                    }
                  }}
                  disabled={durableRemindDays <= 0}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperValue}>{durableRemindDays}</Text>
                <Pressable
                  style={[
                    styles.stepperBtn,
                    durableRemindDays >= 7 && styles.stepperBtnDisabled,
                  ]}
                  onPress={() => {
                    if (durableRemindDays < 7) {
                      const v = durableRemindDays + 1;
                      setDurableRemindDays(v);
                      saveSettings(STORAGE_KEYS.durableRemindDays, String(v));
                    }
                  }}
                  disabled={durableRemindDays >= 7}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* 记录年份 */}
        <View style={styles.cardGroup}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.moduleItemIcon,
                  { backgroundColor: hexToRgba(colors.primary, 0.12) },
                ]}
              >
                <Calendar size={18} color={colors.primary} />
              </View>
              <Text style={styles.groupLabel}>{t("settings.minYear")}</Text>
            </View>
            <Text style={styles.groupDesc}>{t("settings.minYearDesc")}</Text>
          </View>
          <View style={styles.moduleList}>
            {/* 最小年份 */}
            <YearStepperRow
              label={t("settings.minYearLabel")}
              value={minYear}
              min={1900}
              max={new Date().getFullYear()}
              onChange={(v) => {
                setMinYear(v);
                saveSettings(STORAGE_KEYS.minYear, String(v));
              }}
              colors={colors}
              styles={styles}
            />
            {/* 最大年份 */}
            <YearStepperRow
              label={t("settings.maxYearLabel")}
              value={maxYear}
              min={new Date().getFullYear()}
              max={9999}
              onChange={(v) => {
                setMaxYear(v);
                saveSettings(STORAGE_KEYS.maxYear, String(v));
              }}
              colors={colors}
              styles={styles}
              isLast
            />
          </View>
        </View>

      </ScrollView>

      {/* 币种选择弹窗 */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCurrencyModal(false)}
        >
          <Pressable
            style={styles.currencyModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.currencyModalTitle}>
              {t("settings.selectCurrency")}
            </Text>
            <FlatList
              data={CURRENCY_LIST}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = currency.code === item.code;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.currencyItem,
                      isSelected && styles.currencyItemSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setCurrency(item);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <View style={styles.currencyItemLeft}>
                      <View
                        style={[
                          styles.currencyIconWrap,
                          isSelected && {
                            backgroundColor: hexToRgba(colors.primary, 0.15),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyIconText,
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {item.icon}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.currencyItemLabel,
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {t(item.i18nKey)}
                        </Text>
                        <Text style={styles.currencyItemCode}>{item.code}</Text>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
      {/* 语言选择弹窗 */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable
            style={styles.currencyModalCard}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.currencyModalTitle}>
              {t("settings.selectLanguage")}
            </Text>
            <FlatList
              data={LANGUAGE_LIST}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = i18n.language === item.code;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.currencyItem,
                      isSelected && styles.currencyItemSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      setLanguage(item.code);
                      setShowLanguageModal(false);
                    }}
                  >
                    <View style={styles.currencyItemLeft}>
                      <View
                        style={[
                          styles.currencyIconWrap,
                          isSelected && {
                            backgroundColor: hexToRgba(colors.primary, 0.15),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyIconText,
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {item.nativeLabel.slice(0, 2)}
                        </Text>
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.currencyItemLabel,
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {item.nativeLabel}
                        </Text>
                        <Text style={styles.currencyItemCode}>
                          {t(item.i18nKey)}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={18} color={colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function YearStepperRow({ label, value, min, max, onChange, colors, styles, isLast }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleSubmit = () => {
    const parsed = parseInt(draft, 10);
    if (isNaN(parsed) || parsed < 1000 || parsed > 9999) {
      setDraft(String(value));
    } else {
      const clamped = Math.max(min, Math.min(max, parsed));
      if (clamped !== value) {
        onChange(clamped);
      } else {
        setDraft(String(value));
      }
    }
    setEditing(false);
  };

  const disabledDec = value <= min;
  const disabledInc = value >= max;

  return (
    <View style={[styles.remindRow, isLast && styles.remindRowLast]}>
      <View style={styles.remindRowLeft}>
        <View
          style={[
            styles.moduleItemIcon,
            { backgroundColor: hexToRgba(colors.primary, 0.12) },
          ]}
        >
          <Receipt size={18} color={colors.primary} />
        </View>
        <View style={styles.remindRowTextWrap}>
          <Text style={styles.moduleItemLabel}>{label}</Text>
          <Text style={styles.remindRowDesc}>
            {value} {t("settings.year")}
          </Text>
        </View>
      </View><View style={styles.stepperRow}>
        <Pressable
          style={[styles.stepperBtn, disabledDec && styles.stepperBtnDisabled]}
          onPress={handleDecrease}
          disabled={disabledDec}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </Pressable>
        {editing ? (
          <TextInput
            style={[styles.stepperValue, styles.stepperInput]}
            value={draft}
            onChangeText={setDraft}
            onBlur={handleSubmit}
            onSubmitEditing={handleSubmit}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={4}
            autoFocus
          />
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.stepperValue}>{value}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.stepperBtn, disabledInc && styles.stepperBtnDisabled]}
          onPress={handleIncrease}
          disabled={disabledInc}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildStyles(colors, shadows, themeMode) {
  const isCandy = themeMode === "candy";
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.xl,
      paddingBottom: spacing.huge,
      gap: spacing.xxl,
    },
    cardGroup: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: isCandy ? radius.xxl : radius.xl,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: isCandy ? 2 : 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardHeader: {
      gap: 6,
      padding: spacing.xl,
      paddingBottom: 0,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    groupLabel: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 22,
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    groupDesc: {
      color: colors.textTertiary,
      fontSize: 13,
      fontWeight: "400",
      lineHeight: 18,
    },
    moduleList: {
      overflow: "hidden",
      marginTop: 4,
    },
    moduleItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    moduleItemPressed: {
      backgroundColor: colors.surface,
    },
    moduleItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    moduleItemIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    moduleItemLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      flexShrink: 1,
    },
    moduleItemLast: {
      borderBottomWidth: 0,
    },
    // ── Remind Settings ──
    remindRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    remindRowLast: {
      borderBottomWidth: 0,
    },
    remindRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    remindRowTextWrap: {
      flexShrink: 1,
    },
    remindRowDesc: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "400",
      marginTop: 2,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    stepperBtn: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperBtnDisabled: {
      opacity: 0.35,
    },
    stepperBtnText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "500",
      lineHeight: 20,
    },
    stepperValue: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      minWidth: 22,
      textAlign: "center",
    },
    stepperInput: {
      borderBottomWidth: 1,
      borderBottomColor: colors.primary,
      paddingVertical: 0,
      paddingHorizontal: 4,
      minWidth: 48,
      maxWidth: 64,
      height: 28,
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      textAlign: "center",
    },
    // ── Data Management ──
    // ── Theme Picker ──
    themePickerRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
      paddingTop: 8,
    },
    themePickerItem: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 8,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
    },
    themePickerItemActive: {
      borderWidth: 2,
    },
    themePickerIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    themePickerLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
    },
    themePickerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    dataActionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.xl,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    dataActionItemLast: {
      borderBottomWidth: 0,
    },
    dataActionLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    dataActionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    dataActionText: {
      flex: 1,
      gap: 2,
    },
    dataActionLabel: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 20,
    },
    dataActionDesc: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "400",
      lineHeight: 16,
    },
    // ── Confirm Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    modalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.modalBg,
      borderRadius: isCandy ? radius.xxl : radius.xl,
      borderCurve: "continuous",
      padding: 24,
      gap: 12,
      alignItems: "center",
      borderWidth: isCandy ? 2 : 1,
      borderColor: colors.border,
      ...shadows.xl,
    },
    modalIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.dangerBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      textAlign: "center",
    },
    modalDesc: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "400",
      lineHeight: 22,
      textAlign: "center",
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
      marginTop: 8,
    },
    modalCancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
    },
    modalConfirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: colors.accent.red,
      alignItems: "center",
    },
    modalConfirmText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    // ── Export Modal ──
    exportModalCard: {
      width: "100%",
      maxWidth: 360,
      backgroundColor: colors.modalBg,
      borderRadius: isCandy ? radius.xxl : radius.xl,
      borderCurve: "continuous",
      padding: 24,
      gap: 16,
      borderWidth: isCandy ? 2 : 1,
      borderColor: colors.border,
      ...shadows.xl,
    },
    exportModalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    exportModeRow: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: 3,
      gap: 3,
    },
    exportModeBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: radius.sm,
      alignItems: "center",
    },
    exportModeBtnActive: {
      backgroundColor: colors.modeSwitchBg,
      ...shadows.sm,
    },
    exportModeText: {
      color: colors.textTertiary,
      fontSize: 14,
      fontWeight: "600",
    },
    exportModeTextActive: {
      color: colors.primary,
    },
    exportPickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    exportPickerLabel: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "500",
    },
    exportPickerControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    exportArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exportPickerValue: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "700",
      minWidth: 60,
      textAlign: "center",
    },
    exportHint: {
      color: colors.textTertiary,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
    },
    exportImageRow: {
      alignItems: "center",
      paddingVertical: 8,
      alignSelf: "stretch",
    },
    exportImageLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      flexShrink: 1,
    },
    exportModuleSection: {
      alignSelf: "stretch",
      gap: 8,
      paddingVertical: 4,
    },
    exportModuleTitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
      textAlign: "center",
    },
    exportModuleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start",
      gap: 8,
    },
    exportModuleChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceFrost,
    },
    exportModuleChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryBgMedium,
    },
    exportModuleRadio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.textTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    exportModuleRadioActive: {
      borderColor: colors.primary,
    },
    exportModuleRadioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    exportModuleChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 18,
    },
    exportModuleChipTextActive: {
      color: colors.primary,
    },
    exportModuleHint: {
      color: colors.accent.red,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
      textAlign: "center",
    },
    exportConfirmBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: colors.primary,
      alignItems: "center",
      ...shadows.glow,
    },
    // ── Currency Modal ──
    currencyModalCard: {
      width: "100%",
      maxWidth: 360,
      maxHeight: "70%",
      backgroundColor: colors.modalBg,
      borderRadius: isCandy ? radius.xxl : radius.xl,
      borderCurve: "continuous",
      padding: 20,
      gap: 12,
      borderWidth: isCandy ? 2 : 1,
      borderColor: colors.border,
      ...shadows.xl,
    },
    currencyModalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: 4,
    },
    currencyItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: radius.md,
      borderCurve: "continuous",
    },
    currencyItemSelected: {
      backgroundColor: hexToRgba(colors.primary, 0.06),
    },
    currencyItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    currencyIconWrap: {
      width: 56,
      height: 36,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    currencyIconText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "700",
    },
    currencyItemLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    currencyItemCode: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "400",
      marginTop: 1,
    },
  });
}
