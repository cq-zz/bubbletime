import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    BarChart3,
    Bell,
    BellOff,
    CalendarCheck,
    CalendarHeart,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    LayoutGrid,
    Package,
    Radio,
    Settings,
    Smile,
    Sparkles,
    TrendingDown,
    TrendingUp,
    User,
    Zap,
} from "lucide-react-native";
import { BarLineChart, DonutChart } from "../../components/charts";
import MoodCalendarModal from "../../components/MoodCalendarModal";
import {
    fetchBillCategoryBreakdown,
    fetchBillMonthlyTrend,
    fetchBillSummary,
} from "../../services/bills";
import { fetchCheckInRange } from "../../services/checkIn";
import { getAll } from "../../services/database";
import { fetchReminderList } from "../../services/reminder";
import { HOME_MODULES, MOODS, STORAGE_KEYS } from "../../utils/constant";
import { on } from "../../utils/events";
import {
    getCurrency,
    getCurrencyIcon,
    hexToRgba,
    radius,
    spacing,
    useTheme,
} from "../../utils/theme";

const brandImage = require("../../../assets/images/system/logo.png");

// COMPACT_CARDS 和 MODULE_DESC 将在组件内使用 t() 函数动态获取

function PulseDot({ color }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[pulseStyles.dot, { backgroundColor: color, opacity }]}
    />
  );
}

const pulseStyles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    left: 2,
    top: "50%",
    marginTop: -4,
  },
});

function Orb({ size, color, top, left, delay = 0 }) {
  const pulse = React.useRef(new Animated.Value(0.6)).current;
  const drift = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3500 + delay * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 3500 + delay * 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 6000 + delay * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 6000 + delay * 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  const ty = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <Animated.View
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulse,
        transform: [{ translateY: ty }],
      }}
    />
  );
}

function GridLines({ color }) {
  const lines = Array.from({ length: 8 }, (_, i) => i);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {lines.map((i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: `${(i + 1) * 12}%`,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const MODULE_ACCENTS = {
  durable: "#C78B4A",
  schedule: "#7B9FD4",
  bills: "#A77DCD",
  diary: "#D4A574",
  "important-date": "#E93D82",
};

/** 格式化金额：带千分位分隔符和两位小数 */
function formatAmount(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return String(raw);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 简写标签：>=1亿显示"x亿"，>=1万显示"x万"，否则返回null */
function formatShortLabel(raw, t) {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 10000) return null;
  if (n >= 100000000)
    return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}${t("durable.unitBillion")}`;
  return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 2)}${t("durable.unitTenThousand")}`;
}

async function getModuleCounts() {
  try {
    const [durables, schedules] = await Promise.all([
      getAll("durables"),
      getAll("schedules"),
    ]);

    // 只统计当前币种的物品价值
    const currentCurrency = getCurrency().code;
    const currencyIcon = getCurrencyIcon();
    const filteredDurables = durables.filter((d) => {
      const c = (d.currency || "").trim();
      return !c || c === currentCurrency;
    });
    const totalDurableValue = filteredDurables.reduce(
      (sum, d) => sum + (d.purchase_price || 0),
      0,
    );

    const inUseDurables = filteredDurables.filter((d) => d.status === "in_use");
    const inUseAssetValue = inUseDurables.reduce(
      (sum, d) => sum + (d.purchase_price || 0),
      0,
    );

    const inProgressSchedules = schedules.filter((s) => s.status !== "done");
    const doneSchedules = schedules.filter((s) => s.status === "done");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const [summaryRes, prevSummaryRes, yoySummaryRes] = await Promise.all([
      fetchBillSummary({ year, month }),
      fetchBillSummary({ year: prevYear, month: prevMonth }),
      fetchBillSummary({ year: year - 1, month }),
    ]);

    const ok = summaryRes?.code === 200;
    const prevOk = prevSummaryRes?.code === 200;
    const yoyOk = yoySummaryRes?.code === 200;
    const monthExpense = ok
      ? summaryRes.data.totalExpenseFormatted.replace(currencyIcon, "")
      : "0.00";
    const monthIncome = ok
      ? summaryRes.data.totalIncomeFormatted.replace(currencyIcon, "")
      : "0.00";
    const currExpense = ok ? summaryRes.data.totalExpense : 0;
    const currIncome = ok ? summaryRes.data.totalIncome : 0;
    const expenseCount = ok ? summaryRes.data.expenseCount : 0;
    const incomeCount = ok ? summaryRes.data.incomeCount : 0;
    const dayOfMonth = now.getDate();
    const expDailyAvg = dayOfMonth > 0 ? currExpense / dayOfMonth : 0;
    const incDailyAvg = dayOfMonth > 0 ? currIncome / dayOfMonth : 0;
    const prevExpense = prevOk ? prevSummaryRes.data.totalExpense : 0;
    const prevIncome = prevOk ? prevSummaryRes.data.totalIncome : 0;
    const yoyExpense = yoyOk ? yoySummaryRes.data.totalExpense : 0;
    const yoyIncome = yoyOk ? yoySummaryRes.data.totalIncome : 0;

    let expMomTrend = null,
      incMomTrend = null;
    if (prevExpense > 0)
      expMomTrend = ((currExpense - prevExpense) / prevExpense) * 100;
    if (prevIncome > 0)
      incMomTrend = ((currIncome - prevIncome) / prevIncome) * 100;

    let expYoyTrend = null,
      incYoyTrend = null;
    if (yoyExpense > 0)
      expYoyTrend = ((currExpense - yoyExpense) / yoyExpense) * 100;
    if (yoyIncome > 0)
      incYoyTrend = ((currIncome - yoyIncome) / yoyIncome) * 100;

    const inUseValueShort =
      inUseAssetValue >= 10000
        ? `${(inUseAssetValue / 10000).toFixed(inUseAssetValue % 10000 === 0 ? 0 : 1)}w`
        : Math.round(inUseAssetValue).toString();

    return {
      durableCount: filteredDurables.length,
      durableValue:
        totalDurableValue >= 10000
          ? `${(totalDurableValue / 10000).toFixed(1)}w`
          : String(Math.round(totalDurableValue)),
      inUseCount: inUseDurables.length,
      inUseValue: inUseAssetValue,
      inUseValueShort,
      assetValue: `${currencyIcon}${inUseValueShort}`,
      scheduleActive: inProgressSchedules.length,
      scheduleDone: doneSchedules.length,
      scheduleTotal: schedules.length,
      scheduleRate:
        schedules.length > 0
          ? Math.round((doneSchedules.length / schedules.length) * 100)
          : 0,
      billsExpense: monthExpense,
      billsIncome: monthIncome,
      expenseCount,
      incomeCount,
      expDailyAvg:
        expDailyAvg >= 10000
          ? `${(expDailyAvg / 10000).toFixed(1)}w`
          : expDailyAvg.toFixed(expDailyAvg >= 100 ? 0 : 2),
      incDailyAvg:
        incDailyAvg >= 10000
          ? `${(incDailyAvg / 10000).toFixed(1)}w`
          : incDailyAvg.toFixed(incDailyAvg >= 100 ? 0 : 2),
      expMomTrend,
      incMomTrend,
      expYoyTrend,
      incYoyTrend,
    };
  } catch {
    return {
      durableCount: 0,
      durableValue: "0",
      assetValue: "0",
      scheduleActive: 0,
      scheduleDone: 0,
      scheduleTotal: 0,
      scheduleRate: 0,
      billsExpense: "0.00",
      billsIncome: "0.00",
      expenseCount: 0,
      incomeCount: 0,
      expDailyAvg: "0",
      incDailyAvg: "0",
      expMomTrend: null,
      incMomTrend: null,
      expYoyTrend: null,
      incYoyTrend: null,
    };
  }
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, typography, shadows, cardStyles, currencyIcon } = useTheme();

  const styles = useMemo(
    () => buildStyles(colors, typography, shadows, cardStyles),
    [colors, typography, shadows, cardStyles],
  );

  // 动态获取国际化文本
  const COMPACT_CARDS = useMemo(
    () => [
      {
        key: "durableCount",
        label: t("home.totalItems"),
        icon: Package,
        suffix: t("home.itemLabel"),
        color: "#8AB8A0",
      },
      {
        key: "scheduleActive",
        label: t("home.activePlans"),
        icon: CalendarCheck,
        suffix: t("home.planLabel"),
        color: "#7B9FD4",
      },
    ],
    [t],
  );

  const MODULE_DESC = useMemo(
    () => ({
      durable: t("home.durableDesc"),
      schedule: t("home.scheduleDesc"),
      bills: t("home.billsDesc"),
      diary: t("home.diaryDesc"),
      "important-date": t("home.importantDateDesc"),
    }),
    [t],
  );

  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [visibleModules, setVisibleModules] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [moduleMetas, setModuleMetas] = useState({});
  const [moodTrend, setMoodTrend] = useState([]);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [expenseBreakdown, setExpenseBreakdown] = useState([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState([]);
  const [expenseTrend, setExpenseTrend] = useState([]);
  const [incomeTrend, setIncomeTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const loadCharts = useCallback(async () => {
    setTrendLoading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const expenseColors = [
      colors.accent.red,
      colors.accent.orange,
      colors.accent.yellow,
      colors.accent.pink,
      colors.accent.purple,
      colors.textTertiary,
      "#E54D2E",
      "#FF8A4C",
      "#D6409F",
    ];
    const incomeColors = [
      colors.accent.green,
      colors.accent.blue,
      colors.accent.sage,
      "#30A46C",
      "#5B8DEF",
      "#6BCB9E",
      "#4CC38A",
      "#7CE2A8",
      "#86E8B4",
    ];
    try {
      const [catRes, trendRes] = await Promise.all([
        fetchBillCategoryBreakdown({ year, month }),
        fetchBillMonthlyTrend({ months: 6 }),
      ]);
      if (catRes?.code === 200) {
        const cats = catRes.data;
        const expEntries = Object.entries(cats)
          .filter(([, v]) => v.expense > 0)
          .sort(([, a], [, b]) => b.expense - a.expense);
        const expTotal = expEntries.reduce((s, [, v]) => s + v.expense, 0);
        setExpenseBreakdown(
          expEntries.map(([key, val], i) => ({
            key,
            value: val.expense,
            color: expenseColors[i % expenseColors.length],
            label: t(`categories.${key}`),
            pct:
              expTotal > 0 ? ((val.expense / expTotal) * 100).toFixed(0) : "0",
          })),
        );
        const incEntries = Object.entries(cats)
          .filter(([, v]) => v.income > 0)
          .sort(([, a], [, b]) => b.income - a.income);
        const incTotal = incEntries.reduce((s, [, v]) => s + v.income, 0);
        setIncomeBreakdown(
          incEntries.map(([key, val], i) => ({
            key,
            value: val.income,
            color: incomeColors[i % incomeColors.length],
            label: t(`categories.${key}`),
            pct:
              incTotal > 0 ? ((val.income / incTotal) * 100).toFixed(0) : "0",
          })),
        );
      }
      if (trendRes?.code === 200) {
        const data = trendRes.data;
        setExpenseTrend(
          data.map((m) => ({ value: m.expense, label: m.month.slice(5) })),
        );
        setIncomeTrend(
          data.map((m) => ({ value: m.income, label: m.month.slice(5) })),
        );
      }
    } catch {}
    setTrendLoading(false);
  }, [t, colors]);

  const loadMoodTrend = useCallback(async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const start = sevenDaysAgo.toISOString().slice(0, 10);
    const end = today.toISOString().slice(0, 10);
    try {
      const moodRes = await fetchCheckInRange(start, end);
      if (moodRes.code === 0) {
        const records = moodRes.data || [];
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const record = records.find((r) => r.check_date === dateStr);
          const mood = record ? MOODS.find((m) => m.key === record.mood) : null;
          days.push({
            dateStr,
            dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
            mood: mood || null,
            score: mood ? mood.score : null,
            checked: !!record,
          });
        }
        setMoodTrend(days);
        const scores = days.filter((d) => d.checked).map((d) => d.score);
        const avg =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
      }
    } catch {}
  }, []);

  useEffect(() => {
    const unsub = on("checkin", loadMoodTrend);
    return unsub;
  }, [loadMoodTrend]);

  useEffect(() => {
    const unsub = on("dataReset", () => {
      setNickname("");
      setAvatar(null);
      setVisibleModules(HOME_MODULES.map((m) => m.id));
      loadMoodTrend();
      loadCharts();
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [savedNickname, savedAvatar, savedModules, reminderRes, counts] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.nickname),
          AsyncStorage.getItem(STORAGE_KEYS.avatar),
          AsyncStorage.getItem(STORAGE_KEYS.homeModules),
          fetchReminderList({}),
          getModuleCounts(),
        ]);
      if (savedNickname) setNickname(savedNickname);
      if (savedAvatar) setAvatar(savedAvatar);
      setVisibleModules(
        savedModules ? JSON.parse(savedModules) : HOME_MODULES.map((m) => m.id),
      );
      if (reminderRes.code === 200) {
        setReminders((reminderRes.data || []).slice(0, 3));
      }
      setModuleMetas(counts);
      loadCharts();
      loadMoodTrend();
    } catch {
      setVisibleModules(HOME_MODULES.map((m) => m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener("focus", loadData);
    return () => unsubscribe();
  }, [navigation, loadData]);

  const hPad = width < 380 ? 16 : 20;

  // ── Animated values ──
  const scanY = React.useRef(new Animated.Value(0)).current;
  const scanOpacity = React.useRef(new Animated.Value(0)).current;
  const shimmerX = React.useRef(new Animated.Value(-200)).current;
  const ringPulse = React.useRef(new Animated.Value(1)).current;
  const [layoutH, setLayoutH] = React.useState(800);
  const [dateStr, setDateStr] = React.useState("");

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scanOpacity, {
            toValue: 0.12,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scanY, {
            toValue: layoutH,
            duration: 4500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scanOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scanY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [layoutH]);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: width + 200,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -200,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [width]);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  React.useEffect(() => {
    const update = () => {
      const d = new Date();
      setDateStr(
        `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`,
      );
    };
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, []);

  const gradientColors =
    colors.background === "#0B0B1A"
      ? ["#0B0B1A", "#14102A", "#1A1035", "#14102A", "#0B0B1A"]
      : colors.background === "#FFF0F6"
        ? ["#FFF0F6", "#FFE8F2", "#FFDFED", "#FFE8F2", "#FFF0F6"]
        : ["#F5F2F9", "#EDE7F5", "#E8E0F2", "#EDE7F5", "#F5F2F9"];

  // ── Custom header ──

  const displayedModules = visibleModules
    ? HOME_MODULES.filter(
        (mod) => visibleModules.includes(mod.id) && mod.id !== "mood-trend",
      )
    : HOME_MODULES.filter((mod) => mod.id !== "mood-trend");

  const moduleLabelFontSize = (text) =>
    text.length <= 8 ? 14 : text.length <= 14 ? 13 : 12;

  const moduleDescFontSize = (text) =>
    text.length <= 15 ? 11 : text.length <= 22 ? 10 : 9;

  const renderModuleCard = (mod) => {
    const accentColor = MODULE_ACCENTS[mod.id] || mod.accent;
    const desc = MODULE_DESC[mod.id] || "";
    const label = t(mod.i18nKey);
    return (
      <Pressable
        key={mod.id}
        onPress={() => router.push(`/${mod.id}`)}
        style={({ pressed }) => [
          styles.moduleCard,
          pressed && styles.moduleCardPressed,
        ]}
      >
        <LinearGradient
          colors={[hexToRgba(accentColor, 0.12), hexToRgba(accentColor, 0.04)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.moduleDeco,
            { backgroundColor: hexToRgba(accentColor, 0.06) },
          ]}
        />
        <View
          style={[styles.moduleAccentBar, { backgroundColor: accentColor }]}
        />
        <View style={styles.moduleCardInner}>
          <View
            style={[
              styles.moduleIconWrap,
              { backgroundColor: hexToRgba(accentColor, 0.2) },
            ]}
          >
            {React.createElement(mod.icon, { size: 18, color: accentColor })}
          </View>
          <View style={styles.moduleTextWrap}>
            <Text
              style={[
                styles.moduleLabel,
                { color: accentColor, fontSize: moduleLabelFontSize(label) },
              ]}
              numberOfLines={2}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.moduleDesc,
                { fontSize: moduleDescFontSize(desc) },
              ]}
              numberOfLines={2}
            >
              {desc}
            </Text>
          </View>
          <ChevronRight size={16} color={hexToRgba(accentColor, 0.5)} />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      style={styles.screen}
      onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
    >
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Orb
        size={160}
        color={hexToRgba(colors.accent.purple, 0.07)}
        top={60}
        left={-40}
        delay={0}
      />
      <Orb
        size={120}
        color={hexToRgba(colors.accent.blue, 0.06)}
        top={450}
        left={width - 60}
        delay={1}
      />
      <Orb
        size={100}
        color={hexToRgba(colors.accent.pink, 0.05)}
        top={850}
        left={50}
        delay={2}
      />
      <GridLines color={hexToRgba(colors.primary, 0.03)} />
      <Animated.View
        style={[
          styles.scanLine,
          { pointerEvents: "none" },
          {
            transform: [{ translateY: scanY }],
            opacity: scanOpacity,
            width: width - hPad * 2,
          },
        ]}
      />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatarWrap}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={styles.headerAvatar}
                contentFit="contain"
              />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <User size={16} color={colors.textTertiary} />
              </View>
            )}
          </View>
          <Text style={styles.headerNickname} numberOfLines={1}>
            {nickname || t("common.newUser")}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          style={({ pressed }) => [
            styles.headerIconBtn,
            pressed && styles.headerIconBtnPressed,
          ]}
        >
          <Settings size={18} color={colors.primary} />
        </Pressable>
      </View>
      <AnimatedRN.View
        entering={FadeInDown.duration(400).springify()}
        style={styles.statusBar}
      >
        <View style={styles.statusGroup}>
          <View
            style={[styles.statusDot, { backgroundColor: colors.accent.green }]}
          />
          <Text style={[styles.statusText, { color: colors.accent.green }]}>
            SYS
          </Text>
          <Text style={[styles.statusDim, { color: colors.textTertiary }]}>
            ONLINE
          </Text>
        </View>
        <Text style={[styles.statusDate, { color: colors.textTertiary }]}>
          {dateStr}
        </Text>
        <View style={styles.statusGroup}>
          <Radio size={10} color={colors.primary} />
          <Text style={[styles.statusDim, { color: colors.primary }]}>
            {t("home.brand")}
          </Text>
        </View>
      </AnimatedRN.View>
      <View style={styles.contentWrap}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: hPad,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* ── 紧凑 Hero ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .springify()
                .damping(16)
                .stiffness(140)}
              style={styles.heroChip}
            >
              <Animated.View
                style={[
                  styles.heroGlowRing,
                  { transform: [{ scale: ringPulse }] },
                ]}
              />
              <LinearGradient
                colors={[
                  hexToRgba(colors.accent.purple, 0.06),
                  hexToRgba(colors.accent.blue, 0.04),
                  hexToRgba(colors.accent.pink, 0.06),
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Image
                accessibilityLabel="BubbleTime"
                contentFit="contain"
                source={brandImage}
                style={styles.heroChipAvatar}
              />
              <View style={styles.heroChipText}>
                <Text style={styles.heroChipBrand}>{t("home.brand")}</Text>
                <Sparkles size={11} color={colors.accent.yellow} />
                <Text style={styles.heroChipSub}>{t("home.slogan")}</Text>
                <Sparkles size={11} color={colors.accent.yellow} />
              </View>
              <Animated.View
                style={[
                  styles.shimmerOverlay,
                  { transform: [{ translateX: shimmerX }] },
                ]}
              />
            </AnimatedRN.View>

            {/* ── 紧凑统计芯片 (物品总数 + 进行中计划) ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(50)
                .springify()
                .damping(16)}
              style={styles.compactRow}
            >
              {COMPACT_CARDS.map((card) => {
                const Icon = card.icon;
                const raw = moduleMetas[card.key] ?? "0";
                return (
                  <View key={card.key} style={styles.compactChip}>
                    <View
                      style={[
                        styles.compactDeco,
                        { backgroundColor: card.color },
                      ]}
                    />
                    <View
                      style={[
                        styles.compactIcon,
                        { backgroundColor: hexToRgba(card.color, 0.15) },
                      ]}
                    >
                      <Icon size={16} color={card.color} />
                    </View>
                    <View style={styles.compactTextWrap}>
                      <View style={styles.compactTopRow}>
                        <Text style={styles.compactValue}>{raw}</Text>
                        <Text style={styles.compactSuffix}>{card.suffix}</Text>
                      </View>
                      <Text style={styles.compactLabel}>{card.label}</Text>
                    </View>
                  </View>
                );
              })}
            </AnimatedRN.View>

            {/* ── 第二行统计 (资产总值 + 计划完成率) ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(65)
                .springify()
                .damping(16)}
              style={styles.compactRow}
            >
              <View style={styles.compactChip}>
                <View
                  style={[styles.compactDeco, { backgroundColor: "#C78B4A" }]}
                />
                <View
                  style={[
                    styles.compactIcon,
                    { backgroundColor: hexToRgba("#C78B4A", 0.15) },
                  ]}
                >
                  <Package size={16} color="#C78B4A" />
                </View>
                <View style={styles.compactTextWrap}>
                  <View style={styles.compactTopRow}>
                    <Text style={styles.compactValue}>
                      {moduleMetas.assetValue ?? "0"}
                    </Text>
                  </View>
                  <Text style={styles.compactLabel}>
                    {t("home.assetValue")}
                  </Text>
                </View>
              </View>
              <View style={styles.compactChip}>
                <View
                  style={[styles.compactDeco, { backgroundColor: "#5B8DEF" }]}
                />
                <View
                  style={[
                    styles.compactIcon,
                    { backgroundColor: hexToRgba("#5B8DEF", 0.15) },
                  ]}
                >
                  <BarChart3 size={16} color="#5B8DEF" />
                </View>
                <View style={styles.compactTextWrap}>
                  <View style={styles.compactTopRow}>
                    <Text style={styles.compactValue}>
                      {moduleMetas.scheduleRate ?? 0}%
                    </Text>
                    <Text style={styles.compactSuffix}>
                      ({moduleMetas.scheduleDone ?? 0}/
                      {moduleMetas.scheduleTotal ?? 0})
                    </Text>
                  </View>
                  <Text style={styles.compactLabel}>
                    {t("home.scheduleRate")}
                  </Text>
                </View>
              </View>
            </AnimatedRN.View>

            {/* ── 本月支出 (独占一行) ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(80)
                .springify()
                .damping(16)}
              style={[styles.billCard, styles.expenseCard]}
            >
              <LinearGradient
                colors={[hexToRgba(colors.accent.red, 0.03), "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.billAccentBar,
                  { backgroundColor: colors.accent.red },
                ]}
              />
              <View style={styles.billCardTop}>
                <View
                  style={[
                    styles.billIconWrap,
                    { backgroundColor: hexToRgba(colors.accent.red, 0.1) },
                  ]}
                >
                  <TrendingDown size={16} color={colors.accent.red} />
                </View>
                <Text style={styles.billCardLabel}>
                  {t("home.thisMonthExpense")}
                </Text>
              </View>
              <View style={styles.billAmountRow}>
                <Text
                  style={[styles.billAmount, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {currencyIcon}
                  {formatAmount(moduleMetas.billsExpense ?? "0.00")}
                </Text>
              </View>
              {(moduleMetas.expMomTrend != null ||
                moduleMetas.expYoyTrend != null ||
                formatShortLabel(moduleMetas.billsExpense ?? "0", t)) && (
                <View style={styles.billTrendRow}>
                  {formatShortLabel(moduleMetas.billsExpense ?? "0", t) && (
                    <Text
                      style={[
                        styles.billShortLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      ≈ {formatShortLabel(moduleMetas.billsExpense ?? "0", t)}
                    </Text>
                  )}
                  <View style={styles.billTrendGroup}>
                    {moduleMetas.expMomTrend != null && (
                      <Text
                        style={[
                          styles.billTrend,
                          {
                            color:
                              moduleMetas.expMomTrend > 0
                                ? colors.accent.red
                                : colors.accent.green,
                          },
                        ]}
                      >
                        {t("home.momTrend")}{" "}
                        {moduleMetas.expMomTrend > 0
                          ? "↑"
                          : moduleMetas.expMomTrend < 0
                            ? "↓"
                            : "→"}
                        {Math.abs(moduleMetas.expMomTrend).toFixed(0)}%
                      </Text>
                    )}
                    {moduleMetas.expYoyTrend != null && (
                      <Text
                        style={[
                          styles.billTrend,
                          {
                            color:
                              moduleMetas.expYoyTrend > 0
                                ? colors.accent.red
                                : colors.accent.green,
                          },
                        ]}
                      >
                        {t("home.yoyTrend")}{" "}
                        {moduleMetas.expYoyTrend > 0
                          ? "↑"
                          : moduleMetas.expYoyTrend < 0
                            ? "↓"
                            : "→"}
                        {Math.abs(moduleMetas.expYoyTrend).toFixed(0)}%
                      </Text>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.billStatsRow}>
                <View style={styles.billStatItem}>
                  <Text
                    style={[
                      styles.billStatValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {moduleMetas.expenseCount ?? 0}
                  </Text>
                  <Text
                    style={[
                      styles.billStatLabel,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t("common.item")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.billStatDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.billStatItem}>
                  <Text
                    style={[
                      styles.billStatValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {currencyIcon}
                    {moduleMetas.expDailyAvg ?? "0"}
                  </Text>
                  <Text
                    style={[
                      styles.billStatLabel,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t("bills.dailyAvg")}
                  </Text>
                </View>
              </View>
            </AnimatedRN.View>

            {/* ── 本月收入 (独占一行) ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(110)
                .springify()
                .damping(16)}
              style={[styles.billCard, styles.incomeCard]}
            >
              <LinearGradient
                colors={[hexToRgba(colors.accent.green, 0.03), "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.billAccentBar,
                  { backgroundColor: colors.accent.green },
                ]}
              />
              <View style={styles.billCardTop}>
                <View
                  style={[
                    styles.billIconWrap,
                    { backgroundColor: hexToRgba(colors.accent.green, 0.1) },
                  ]}
                >
                  <TrendingUp size={16} color={colors.accent.green} />
                </View>
                <Text style={styles.billCardLabel}>
                  {t("home.thisMonthIncome")}
                </Text>
              </View>
              <View style={styles.billAmountRow}>
                <Text
                  style={[styles.billAmount, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {currencyIcon}
                  {formatAmount(moduleMetas.billsIncome ?? "0.00")}
                </Text>
              </View>
              {(moduleMetas.incMomTrend != null ||
                moduleMetas.incYoyTrend != null ||
                formatShortLabel(moduleMetas.billsIncome ?? "0", t)) && (
                <View style={styles.billTrendRow}>
                  {formatShortLabel(moduleMetas.billsIncome ?? "0", t) && (
                    <Text
                      style={[
                        styles.billShortLabel,
                        { color: colors.textTertiary },
                      ]}
                    >
                      ≈ {formatShortLabel(moduleMetas.billsIncome ?? "0", t)}
                    </Text>
                  )}
                  <View style={styles.billTrendGroup}>
                    {moduleMetas.incMomTrend != null && (
                      <Text
                        style={[
                          styles.billTrend,
                          {
                            color:
                              moduleMetas.incMomTrend > 0
                                ? colors.accent.green
                                : colors.accent.red,
                          },
                        ]}
                      >
                        {t("home.momTrend")}{" "}
                        {moduleMetas.incMomTrend > 0
                          ? "↑"
                          : moduleMetas.incMomTrend < 0
                            ? "↓"
                            : "→"}
                        {Math.abs(moduleMetas.incMomTrend).toFixed(0)}%
                      </Text>
                    )}
                    {moduleMetas.incYoyTrend != null && (
                      <Text
                        style={[
                          styles.billTrend,
                          {
                            color:
                              moduleMetas.incYoyTrend > 0
                                ? colors.accent.green
                                : colors.accent.red,
                          },
                        ]}
                      >
                        {t("home.yoyTrend")}{" "}
                        {moduleMetas.incYoyTrend > 0
                          ? "↑"
                          : moduleMetas.incYoyTrend < 0
                            ? "↓"
                            : "→"}
                        {Math.abs(moduleMetas.incYoyTrend).toFixed(0)}%
                      </Text>
                    )}
                  </View>
                </View>
              )}
              <View style={styles.billStatsRow}>
                <View style={styles.billStatItem}>
                  <Text
                    style={[
                      styles.billStatValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {moduleMetas.incomeCount ?? 0}
                  </Text>
                  <Text
                    style={[
                      styles.billStatLabel,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t("common.item")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.billStatDivider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={styles.billStatItem}>
                  <Text
                    style={[
                      styles.billStatValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {currencyIcon}
                    {moduleMetas.incDailyAvg ?? "0"}
                  </Text>
                  <Text
                    style={[
                      styles.billStatLabel,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {t("bills.dailyAvg")}
                  </Text>
                </View>
              </View>
            </AnimatedRN.View>

            {/* ── 收支分析 ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(130)
                .springify()
                .damping(16)}
              style={styles.chartCard}
            >
              <Pressable
                style={styles.chartHeader}
                onPress={() => setChartExpanded((v) => !v)}
              >
                <View style={styles.chartHeaderLeft}>
                  <View style={styles.chartTitleRow}>
                    <BarChart3 size={16} color={colors.primary} />
                    <View
                      style={[
                        styles.chartHeaderDeco,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text style={styles.chartTitle}>
                      {t("home.charts")}
                    </Text>
                  </View>
                  <Text style={styles.chartHint}>
                    {t("home.chartHint")}
                  </Text>
                </View>
                {chartExpanded ? (
                  <ChevronUp size={16} color={colors.textTertiary} />
                ) : (
                  <ChevronDown size={16} color={colors.textTertiary} />
                )}
              </Pressable>
              {chartExpanded && (
                <View style={styles.chartBody}>
                  {trendLoading ? (
                    <Text style={styles.chartEmpty}>
                      {t("common.loading", "加载中...")}
                    </Text>
                  ) : expenseBreakdown.length === 0 &&
                    incomeBreakdown.length === 0 ? (
                    <Text style={styles.chartEmpty}>
                      {t("home.noChartData")}
                    </Text>
                  ) : (
                    <>
                      {/* 支出分析 */}
                      {(expenseBreakdown.length > 0 ||
                        expenseTrend.some((d) => d.value > 0)) && (
                        <View style={styles.chartSection}>
                          <View style={styles.chartSectionDivider} />
                          <View style={styles.chartSectionTitleRow}>
                            <TrendingDown size={14} color={colors.accent.red} />
                            <Text
                              style={[
                                styles.chartSectionTitle,
                                { color: colors.accent.red },
                              ]}
                            >
                              {t("home.expenseAnalysis")}
                            </Text>
                          </View>
                          {expenseBreakdown.length > 0 && (
                            <View style={styles.chartContent}>
                              <View style={styles.chartVisual}>
                                <DonutChart
                                  data={expenseBreakdown}
                                  size={130}
                                  innerRadius={42}
                                />
                              </View>
                              <ScrollView
                                style={styles.chartLabelsScroll}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                              >
                                <View style={styles.chartLabels}>
                                  {expenseBreakdown.map((item) => (
                                    <View
                                      key={item.key}
                                      style={styles.chartLabelRow}
                                    >
                                      <View
                                        style={[
                                          styles.chartDot,
                                          { backgroundColor: item.color },
                                        ]}
                                      />
                                      <Text
                                        style={styles.chartLabelText}
                                        numberOfLines={1}
                                      >
                                        {item.label}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.chartLabelPct,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {getCurrency().icon}
                                        {item.value.toLocaleString()} (
                                        {item.pct}%)
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                          )}
                          {expenseTrend.some((d) => d.value > 0) && (
                            <View
                              style={styles.chartTrendWrap}
                              onLayout={(e) =>
                                setChartWidth(e.nativeEvent.layout.width)
                              }
                            >
                              <BarLineChart
                                data={expenseTrend}
                                height={120}
                                lineColor={colors.accent.orange}
                                containerWidth={chartWidth}
                              />
                            </View>
                          )}
                        </View>
                      )}
                      {/* 收入分析 */}
                      {(incomeBreakdown.length > 0 ||
                        incomeTrend.some((d) => d.value > 0)) && (
                        <View style={styles.chartSection}>
                          <View style={styles.chartSectionDivider} />
                          <View style={styles.chartSectionTitleRow}>
                            <TrendingUp size={14} color={colors.accent.green} />
                            <Text
                              style={[
                                styles.chartSectionTitle,
                                { color: colors.accent.green },
                              ]}
                            >
                              {t("home.incomeAnalysis")}
                            </Text>
                          </View>
                          {incomeBreakdown.length > 0 && (
                            <View style={styles.chartContent}>
                              <View style={styles.chartVisual}>
                                <DonutChart
                                  data={incomeBreakdown}
                                  size={130}
                                  innerRadius={42}
                                />
                              </View>
                              <ScrollView
                                style={styles.chartLabelsScroll}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                              >
                                <View style={styles.chartLabels}>
                                  {incomeBreakdown.map((item) => (
                                    <View
                                      key={item.key}
                                      style={styles.chartLabelRow}
                                    >
                                      <View
                                        style={[
                                          styles.chartDot,
                                          { backgroundColor: item.color },
                                        ]}
                                      />
                                      <Text
                                        style={styles.chartLabelText}
                                        numberOfLines={1}
                                      >
                                        {item.label}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.chartLabelPct,
                                          { color: colors.textSecondary },
                                        ]}
                                      >
                                        {getCurrency().icon}
                                        {item.value.toLocaleString()} (
                                        {item.pct}%)
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                          )}
                          {incomeTrend.some((d) => d.value > 0) && (
                            <View
                              style={styles.chartTrendWrap}
                              onLayout={(e) =>
                                setChartWidth(e.nativeEvent.layout.width)
                              }
                            >
                              <BarLineChart
                                data={incomeTrend}
                                height={120}
                                lineColor={colors.accent.sage}
                                containerWidth={chartWidth}
                              />
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}
            </AnimatedRN.View>

            {/* ── 功能模块 ── */}
            {displayedModules.length > 0 && (
              <AnimatedRN.View
                entering={FadeInDown.duration(450)
                  .delay(100)
                  .springify()
                  .damping(16)}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <LayoutGrid size={16} color={colors.primary} />
                    <View
                      style={[
                        styles.sectionHeaderDeco,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                    <Text style={styles.sectionTitle}>{t("home.modules")}</Text>
                    <View
                      style={[
                        styles.sectionAccentLine,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.moduleGrid}>
                  {Array.from(
                    { length: Math.ceil(displayedModules.length / 2) },
                    (_, i) => i * 2,
                  ).map((start) => (
                    <View key={start} style={styles.moduleRow}>
                      <View style={styles.moduleCell}>
                        {renderModuleCard(displayedModules[start])}
                      </View>
                      {displayedModules[start + 1] ? (
                        <View style={styles.moduleCell}>
                          {renderModuleCard(displayedModules[start + 1])}
                        </View>
                      ) : (
                        <View style={styles.moduleCell} />
                      )}
                    </View>
                  ))}
                </View>
              </AnimatedRN.View>
            )}

            {/* ── 今日提醒 ── */}
            <AnimatedRN.View
              entering={FadeInDown.duration(450)
                .delay(150)
                .springify()
                .damping(16)}
              style={styles.section}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Bell size={16} color={colors.primary} />
                  <View
                    style={[
                      styles.sectionHeaderDeco,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                  <Text style={styles.sectionTitle}>
                    {t("home.todayReminder")}
                  </Text>
                  <View
                    style={[
                      styles.sectionAccentLine,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() => router.push("/reminder")}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.sectionLink}>{t("common.viewAll")}</Text>
                </Pressable>
              </View>
              {reminders.length > 0 ? (
                <View style={styles.reminderList}>
                  {reminders.map((r) => {
                    const isDurable = r.moduleType === "durable";
                    const isImportantDate = r.moduleType === "important_date";
                    const accentColor = isDurable
                      ? "#E54D2E"
                      : isImportantDate
                        ? "#E93D82"
                        : "#5B8DEF";
                    const isOverdue =
                      r.daysLeft === t("common.expired") ||
                      r.daysLeft === t("schedule.incomplete");
                    const barColor = isOverdue
                      ? colors.accent.red
                      : accentColor;
                    const TypeIcon = isDurable
                      ? Package
                      : isImportantDate
                        ? CalendarHeart
                        : CalendarCheck;
                    const typeLabel = isDurable
                      ? t("home.itemLabel")
                      : isImportantDate
                        ? t("home.importantDate")
                        : t("home.planLabel");
                    const descColor = isOverdue
                      ? colors.accent.red
                      : colors.textSecondary;
                    return (
                      <AnimatedRN.View
                        key={r.id}
                        entering={FadeInDown.duration(350)
                          .springify()
                          .damping(14)}
                      >
                        <Pressable
                          style={({ pressed }) => [
                            styles.reminderItem,
                            pressed && styles.reminderItemPressed,
                          ]}
                          onPress={() => {
                            let type = r.moduleType || "schedule";
                            if (type === "important_date")
                              type = "important-date";
                            const id = r.moduleId || r.id;
                            router.push(`/${type}/${id}`);
                          }}
                        >
                          <PulseDot color={barColor} />
                          <View
                            style={[
                              styles.reminderBar,
                              { backgroundColor: barColor },
                            ]}
                          />
                          <View
                            style={[
                              styles.reminderIconChip,
                              { backgroundColor: hexToRgba(accentColor, 0.12) },
                            ]}
                          >
                            <TypeIcon size={16} color={accentColor} />
                          </View>
                          <View style={styles.reminderBody}>
                            <View style={styles.reminderTitleRow}>
                              <Text style={styles.reminderTitle}>
                                {r.title}
                              </Text>
                              <View
                                style={[
                                  styles.reminderTypeTag,
                                  {
                                    backgroundColor: hexToRgba(
                                      accentColor,
                                      0.1,
                                    ),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.reminderTypeTagText,
                                    { color: accentColor },
                                  ]}
                                >
                                  {typeLabel}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.reminderDescRow}>
                              <Clock size={11} color={descColor} />
                              <Text
                                style={[
                                  styles.reminderSubtitle,
                                  { color: descColor },
                                ]}
                              >
                                {t(
                                  r.desc,
                                  r.descCount != null
                                    ? { count: r.descCount }
                                    : undefined,
                                )}
                              </Text>
                            </View>
                          </View>
                          <ChevronRight size={16} color={colors.textTertiary} />
                        </Pressable>
                      </AnimatedRN.View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.reminderEmpty}>
                  <BellOff
                    size={28}
                    color={hexToRgba(colors.textTertiary, 0.5)}
                  />
                  <Text style={styles.reminderEmptyText}>
                    {t("home.noReminder")}
                  </Text>
                  {/* */}
                  <Text style={styles.reminderEmptyDesc}>
                    {t("home.noReminderDesc")}
                  </Text>
                </View>
              )}
            </AnimatedRN.View>

            {/* ── 心情走势 ── */}
            {(!visibleModules || visibleModules.includes("mood-trend")) && (
              <MoodCalendarModal
                renderTrigger={({ open }) => (
                  <AnimatedRN.View
                    entering={FadeInDown.duration(450)
                      .delay(170)
                      .springify()
                      .damping(16)}
                    style={styles.moodTrendCard}
                  >
                    <Pressable style={styles.moodTrendHeader} onPress={open}>
                      <View style={styles.sectionTitleRow}>
                        <Smile size={16} color={colors.primary} />
                        <View
                          style={[
                            styles.sectionHeaderDeco,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                        <Text style={styles.moodTrendTitle}>
                          {t("moodTrend.title")}
                        </Text>
                        <Text style={styles.moodTrendSubtitle}>
                          {t("moodTrend.last7Days")}
                          {moodTrend.length > 0 &&
                            ` (${moodTrend[0].dateStr.replace(/-/g, "/")}-${moodTrend[moodTrend.length - 1].dateStr.replace(/-/g, "/")})`}
                        </Text>
                      </View>
                    </Pressable>
                    <>
                      <View style={styles.moodTrendBars}>
                        {moodTrend.map((day) => {
                          const barH = day.score ? (day.score / 5) * 100 : 0;
                          const barColor =
                            day.score >= 5
                              ? "#FFC53D"
                              : day.score >= 4
                                ? "#46A758"
                                : day.score >= 3
                                  ? "#5B8DD9"
                                  : day.score >= 2
                                    ? "#E8933B"
                                    : "#CD3D64";
                          return (
                            <View
                              key={day.dateStr}
                              style={styles.moodTrendBarCol}
                            >
                              <View style={styles.moodTrendBarWrap}>
                                {day.checked ? (
                                  <View
                                    style={[
                                      styles.moodTrendBar,
                                      {
                                        height: barH + "%",
                                        backgroundColor: barColor,
                                      },
                                    ]}
                                  />
                                ) : (
                                  <View style={styles.moodTrendBarEmpty} />
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.moodTrendDayEmoji,
                                  !day.mood && styles.moodTrendDayEmojiEmpty,
                                ]}
                              >
                                {day.mood?.emoji || "—"}
                              </Text>
                              {day.mood ? (
                                <Text
                                  style={styles.moodTrendMoodName}
                                  numberOfLines={1}
                                >
                                  {t("checkIn.mood." + day.mood.key)}
                                </Text>
                              ) : (
                                <Text style={styles.moodTrendDayLabel}>
                                  {day.dayLabel}
                                </Text>
                              )}
                              {day.score ? (
                                <Text
                                  style={[
                                    styles.moodTrendScore,
                                    { color: barColor },
                                  ]}
                                >
                                  {day.score}
                                </Text>
                              ) : (
                                <Text style={styles.moodTrendNoScore}>-</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                      <View style={styles.moodTrendLegend}>
                        <View
                          style={[
                            styles.moodTrendLegendDot,
                            { backgroundColor: "#FFC53D" },
                          ]}
                        />
                        <Text style={styles.moodTrendLegendText}>5</Text>
                        <View
                          style={[
                            styles.moodTrendLegendDot,
                            { backgroundColor: "#46A758" },
                          ]}
                        />
                        <Text style={styles.moodTrendLegendText}>4</Text>
                        <View
                          style={[
                            styles.moodTrendLegendDot,
                            { backgroundColor: "#5B8DD9" },
                          ]}
                        />
                        <Text style={styles.moodTrendLegendText}>3</Text>
                        <View
                          style={[
                            styles.moodTrendLegendDot,
                            { backgroundColor: "#E8933B" },
                          ]}
                        />
                        <Text style={styles.moodTrendLegendText}>2</Text>
                        <View
                          style={[
                            styles.moodTrendLegendDot,
                            { backgroundColor: "#CD3D64" },
                          ]}
                        />
                        <Text style={styles.moodTrendLegendText}>1</Text>
                      </View>
                      <View style={styles.moodTrendMsgWrap}>
                        <Text style={styles.moodTrendMsg}>
                          {moodTrend.some((d) => d.checked)
                            ? (() => {
                                const scores = moodTrend
                                  .filter((d) => d.checked)
                                  .map((d) => d.score);
                                const avg =
                                  scores.length > 0
                                    ? scores.reduce((a, b) => a + b, 0) /
                                      scores.length
                                    : 0;
                                let msgKey = "neutral";
                                if (avg >= 4.5) msgKey = "excellent";
                                else if (avg >= 3.5) msgKey = "good";
                                else if (avg >= 2.5) msgKey = "neutral";
                                else if (avg >= 1.5) msgKey = "low";
                                else msgKey = "veryLow";
                                return t("moodTrend." + msgKey);
                              })()
                            : t("moodTrend.noData")}
                        </Text>
                      </View>
                    </>
                  </AnimatedRN.View>
                )}
              />
            )}

            <View style={styles.footer}>
              <View style={styles.footerDivider}>
                <View style={styles.footerCornerL} />
                <View style={styles.footerDividerLine} />
                <Zap size={10} color={colors.primary} />
                <View style={styles.footerDividerLine} />
                <View style={styles.footerCornerR} />
              </View>
              <Text style={styles.footerBrand}>{t("home.footer")}</Text>
              <View style={styles.footerDots}>
                <View
                  style={[
                    styles.footerDot,
                    { backgroundColor: colors.accent.purple },
                  ]}
                />
                <View
                  style={[
                    styles.footerDot,
                    { backgroundColor: colors.accent.blue },
                  ]}
                />
                <View
                  style={[
                    styles.footerDot,
                    { backgroundColor: colors.accent.pink },
                  ]}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function buildStyles(colors, typography, shadows, cardStyles) {
  return StyleSheet.create({
    screen: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1, alignItems: "center" },
    // ── Header ──
    customHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 16,
    },
    headerAvatarWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerAvatar: {
      width: "100%",
      height: "100%",
    },
    headerAvatarPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    headerNickname: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      maxWidth: 160,
    },
    headerIconBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: colors.surfaceFrost,
      marginRight: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerIconBtnPressed: { opacity: 0.7, backgroundColor: colors.surface },
    content: { width: "100%", gap: spacing.lg },
    // ── 紧凑 Hero ──
    heroChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xxl,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    heroChipAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    heroChipText: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
    },
    heroChipBrand: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.textPrimary,
      letterSpacing: 0.3,
      marginRight: 2,
    },
    heroChipSub: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textTertiary,
      flexShrink: 1,
    },
    // ── 紧凑统计芯片 ──
    compactRow: {
      flexDirection: "row",
      gap: 10,
    },
    compactChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      ...shadows.card,
    },
    compactTextWrap: {
      flexDirection: "column",
      gap: 2,
      flexShrink: 1,
      minWidth: 0,
    },
    compactTopRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      flexShrink: 1,
      flexWrap: "wrap",
    },
    compactIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    compactValue: {
      fontSize: 17,
      fontWeight: "800",
      color: colors.textPrimary,
      lineHeight: 22,
    },
    compactSuffix: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textPrimary,
      lineHeight: 22,
    },
    compactLabel: {
      fontSize: 10,
      fontWeight: "500",
      color: colors.textTertiary,
      lineHeight: 13,
    },
    compactDeco: {
      position: "absolute",
      top: 0,
      alignSelf: "center",
      width: 28,
      height: 3,
      borderRadius: 1.5,
      opacity: 0.5,
    },
    // ── 收支卡片 (独占一行) ──
    billCard: {
      borderRadius: radius.xl,
      borderCurve: "continuous",
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 10,
      borderWidth: 1,
      backgroundColor: colors.surfaceFrost,
      overflow: "hidden",
      ...shadows.card,
    },
    expenseCard: {
      borderColor: colors.border,
    },
    incomeCard: {
      borderColor: colors.border,
    },
    billAccentBar: {
      position: "absolute",
      left: 0,
      top: 10,
      bottom: 10,
      width: 3,
      borderRadius: 1.5,
      opacity: 0.5,
    },
    billCardTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    billIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    billCardLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      lineHeight: 18,
    },
    billAmountRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 10,
    },
    billAmount: {
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    billTrend: {
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },
    billTrendRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    billTrendGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexShrink: 0,
      marginLeft: "auto",
    },
    billShortLabel: {
      fontSize: 12,
      fontWeight: "600",
      opacity: 0.7,
      lineHeight: 16,
    },
    billStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    billStatItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    billStatValue: {
      fontSize: 13,
      fontWeight: "700",
    },
    billStatLabel: {
      fontSize: 11,
      fontWeight: "500",
    },
    billStatDivider: {
      width: 1,
      height: 12,
      opacity: 0.5,
    },
    section: { gap: 10 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    sectionHeaderDeco: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      opacity: 0.3,
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
      overflow: "hidden",
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700",
      lineHeight: 24,
      color: colors.textPrimary,
    },
    sectionLink: {
      ...typography.label,
      color: colors.primary,
    },
    sectionLinkPressed: { opacity: 0.7 },
    // ── 功能模块 ──
    moduleGrid: { width: "100%", gap: 10 },
    moduleRow: { width: "100%", flexDirection: "row", gap: 10 },
    moduleCell: { flex: 1, flexBasis: 0, minWidth: 0 },
    moduleCard: {
      borderRadius: radius.xl,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
      backgroundColor: colors.surfaceFrost,
      flex: 1,
    },
    moduleDeco: {
      position: "absolute",
      top: -10,
      left: -10,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    moduleAccentBar: {
      position: "absolute",
      top: 0,
      right: 16,
      width: 24,
      height: 2.5,
      borderRadius: 1.25,
      opacity: 0.35,
    },
    moduleCardPressed: { opacity: 0.85 },
    moduleCardInner: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 72,
    },
    moduleIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    moduleTextWrap: {
      flex: 1,
      gap: 1,
      minWidth: 0,
    },
    moduleLabel: {
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 18,
    },
    moduleDesc: {
      fontSize: 11,
      color: colors.textTertiary,
      lineHeight: 15,
    },
    reminderList: { gap: 10 },
    reminderItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingLeft: 20,
      paddingRight: 12,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
      gap: 10,
    },
    reminderItemPressed: { opacity: 0.85 },
    reminderBar: { width: 3, height: 40, borderRadius: 2 },
    reminderIconChip: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    reminderBody: { flex: 1, minWidth: 0, gap: 4 },
    reminderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    reminderTitle: {
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
      color: colors.textPrimary,
      flex: 1,
    },
    reminderTypeTag: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    reminderTypeTagText: {
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    reminderDescRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    reminderSubtitle: {
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 17,
    },
    reminderEmpty: {
      alignItems: "center",
      paddingVertical: 28,
      gap: 6,
    },
    reminderEmptyText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textTertiary,
    },
    reminderEmptyDesc: {
      fontSize: 12,
      color: colors.textTertiary,
      opacity: 0.6,
    },
    footer: {
      alignItems: "center",
      paddingVertical: 28,
      gap: 8,
    },
    footerDivider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
      width: "40%",
    },
    footerDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    footerDividerDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    footerBrand: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 16,
      opacity: 0.5,
    },
    // ── Visual effects ──
    effectsWrap: { flex: 1, overflow: "hidden" },
    contentWrap: { flex: 1 },
    scanLine: {
      position: "absolute",
      height: 1.5,
      left: 0,
      zIndex: 2,
      backgroundColor: hexToRgba(colors.primary, 0.5),
    },
    heroGlowRing: {
      position: "absolute",
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: radius.xxl + 4,
      borderCurve: "continuous",
      borderWidth: 1.5,
      borderColor: hexToRgba(colors.primary, 0.25),
    },
    shimmerOverlay: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 80,
      backgroundColor: hexToRgba(colors.primary, 0.08),
      borderRadius: radius.xxl,
      borderCurve: "continuous",
    },

    // ── Tech status bar ──
    statusBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 8,
    },
    statusGroup: { flexDirection: "row", alignItems: "center", gap: 5 },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    statusText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
    statusDim: { fontSize: 9, fontWeight: "600", letterSpacing: 0.8 },
    statusDate: {
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 0.5,
      fontVariant: ["tabular-nums"],
    },
    // ── Section accent ──
    // ── 图表区域 ──
    chartCard: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      ...shadows.card,
    },
    chartHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    chartTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    chartHeaderDeco: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      opacity: 0.3,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    chartBody: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 16,
    },
    chartEmpty: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textTertiary,
      textAlign: "center",
      paddingVertical: 20,
    },
    chartSection: {
      gap: 10,
    },
    chartSectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    chartSectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    chartContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    chartVisual: {
      alignItems: "center",
      justifyContent: "center",
    },
    chartLabelsScroll: {
      maxHeight: 130,
      flex: 1,
    },
    chartLabels: {
      gap: 4,
    },
    chartLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    chartDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    chartLabelText: {
      flex: 1,
      fontSize: 11,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    chartLabelPct: {
      fontSize: 11,
      fontWeight: "700",
      flexShrink: 0,
    },
    chartHeaderLeft: {
      flex: 1,
      gap: 2,
    },
    chartHint: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textTertiary,
      marginLeft: 22,
    },
    chartSectionDivider: {
      height: 1,
      backgroundColor: colors.border,
      opacity: 0.4,
    },
    chartTrendWrap: {
      marginTop: 4,
    },
    sectionAccentLine: {
      flex: 1,
      height: 1,
      opacity: 0.12,
      marginLeft: 8,
      borderRadius: 0.5,
    },
    // ── Mood Trend ──
    moodTrendCard: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      ...shadows.card,
    },
    moodTrendHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    moodTrendTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    moodTrendSubtitle: {
      fontSize: 9,
      fontWeight: "500",
      color: colors.textTertiary,
      marginLeft: "auto",
    },
    moodTrendBars: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 10,
      gap: 6,
    },
    moodTrendBarCol: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    moodTrendBarWrap: {
      height: 60,
      width: "100%",
      maxWidth: 20,
      borderRadius: 4,
      backgroundColor: colors.border,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    moodTrendBar: {
      width: "100%",
      borderRadius: 4,
      minHeight: 4,
    },
    moodTrendBarEmpty: {
      width: "100%",
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    moodTrendDayEmoji: {
      fontSize: 16,
      lineHeight: 20,
    },
    moodTrendDayLabel: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.textTertiary,
    },
    moodTrendScore: {
      fontSize: 10,
      fontWeight: "800",
    },
    moodTrendMsgWrap: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    moodTrendMsg: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textSecondary,
      lineHeight: 18,
      textAlign: "center",
    },
    moodTrendEmpty: {
      paddingVertical: 20,
      alignItems: "center",
    },
    moodTrendEmptyText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textTertiary,
    },
    moodTrendDayEmojiEmpty: {
      color: colors.textTertiary,
      opacity: 0.5,
    },
    moodTrendMoodName: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.textSecondary,
      lineHeight: 12,
    },
    moodTrendNoScore: {
      fontSize: 9,
      fontWeight: "500",
      color: colors.textTertiary,
      lineHeight: 14,
    },
    moodTrendLegend: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    moodTrendLegendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    moodTrendLegendText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.textTertiary,
      marginRight: 4,
    },
    // ── Footer enhanced ──
    footerCornerL: {
      width: 6,
      height: 6,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderColor: colors.primary,
      borderTopLeftRadius: 2,
    },
    footerCornerR: {
      width: 6,
      height: 6,
      borderTopWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.primary,
      borderTopRightRadius: 2,
    },
    footerDots: { flexDirection: "row", gap: 6, marginTop: 6 },
    footerDot: { width: 3, height: 3, borderRadius: 1.5, opacity: 0.4 },
  });
}
