import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { BarChart3, Calendar, ChevronDown, ChevronUp, Clock, RefreshCw, Search, TrendingDown, TrendingUp } from "lucide-react-native";
import { getCurrency, useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import { fetchBillList, fetchBillMonthlyTrend, fetchBillCategoryBreakdown } from "../../services/bills";
import { syncAllDurableBills } from "../../services/durable";
import { CATEGORY_ICON, ITEM_CATEGORIES } from "../../utils/constant";
import ChartRangePicker from "../../components/ChartRangePicker";
import YearMonthPicker from "../../components/YearMonthPicker";
import { DonutChart, BarLineChart } from "../../components/charts";
import { useTranslation } from "react-i18next";
import useBillScheduler from "../../hooks/useBillScheduler";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const DEFAULT_START_MONTH = CURRENT_MONTH - 5 <= 0 ? CURRENT_MONTH - 5 + 12 : CURRENT_MONTH - 5;
const DEFAULT_START_YEAR = CURRENT_MONTH - 5 <= 0 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
const GRID_GAP = spacing.md;
const GRID_CARD_WIDTH = (Dimensions.get("window").width - spacing.xl * 2 - GRID_GAP) / 2;


export default function BillsListScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  useBillScheduler();
  const [activeCategory, setActiveCategory] = useState(t("common.all"));
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [failedImages, setFailedImages] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(null); // null = 全年
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [prevMonthData, setPrevMonthData] = useState([]);
  const [yoyMonthData, setYoyMonthData] = useState([]);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [chartYearMode, setChartYearMode] = useState(false);
  const [chartStartYear, setChartStartYear] = useState(DEFAULT_START_YEAR);
  const [chartStartMonth, setChartStartMonth] = useState(DEFAULT_START_MONTH);
  const [chartEndYear, setChartEndYear] = useState(CURRENT_YEAR);
  const [chartEndMonth, setChartEndMonth] = useState(CURRENT_MONTH);
  const [chartExpenseBreakdown, setChartExpenseBreakdown] = useState([]);
  const [chartIncomeBreakdown, setChartIncomeBreakdown] = useState([]);
  const [chartExpenseTrend, setChartExpenseTrend] = useState([]);
  const [chartIncomeTrend, setChartIncomeTrend] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartRangeWidth, setChartRangeWidth] = useState(0);

  const loadBills = useCallback(() => {
    setLoading(true);
    const params = { year: selectedYear };
    if (selectedMonth) params.month = selectedMonth;
    Promise.all([
      fetchBillList(params),
      selectedMonth ? fetchBillList({ year: selectedMonth === 1 ? selectedYear - 1 : selectedYear, month: selectedMonth === 1 ? 12 : selectedMonth - 1 }) : Promise.resolve(null),
      selectedMonth ? fetchBillList({ year: selectedYear - 1, month: selectedMonth }) : Promise.resolve(null),
    ]).then(([listRes, prevRes, yoyRes]) => {
      if (listRes?.code === 200) setItems(listRes.data);
      if (prevRes?.code === 200) {
        setPrevMonthData(prevRes.data.filter(i => i.type === "record"));
      } else {
        setPrevMonthData([]);
      }
      if (yoyRes?.code === 200) {
        setYoyMonthData(yoyRes.data.filter(i => i.type === "record"));
      } else {
        setYoyMonthData([]);
      }
    }).catch((e) => {
      console.error(t("bills.loadFailed"), e);
    }).finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  const expenseChartColors = [
    colors.accent.red, colors.accent.orange, colors.accent.yellow,
    colors.accent.pink, colors.accent.purple, colors.textTertiary,
    "#E54D2E", "#FF8A4C", "#D6409F",
  ];
  const incomeChartColors = [
    colors.accent.green, colors.accent.blue, colors.accent.sage,
    "#30A46C", "#5B8DEF", "#6BCB9E",
    "#4CC38A", "#7CE2A8", "#86E8B4",
  ];

  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    const rangeParams = {
      startYear: chartStartYear, startMonth: chartStartMonth,
      endYear: chartEndYear, endMonth: chartEndMonth,
    };
    try {
      const [catRes, trendRes] = await Promise.all([
        fetchBillCategoryBreakdown(rangeParams),
        fetchBillMonthlyTrend(rangeParams),
      ]);
      if (catRes?.code === 200) {
        const cats = catRes.data;
        const expEntries = Object.entries(cats)
          .filter(([, v]) => v.expense > 0)
          .sort(([, a], [, b]) => b.expense - a.expense);
        const expTotal = expEntries.reduce((s, [, v]) => s + v.expense, 0);
        setChartExpenseBreakdown(
          expEntries.map(([key, val], i) => ({
            key,
            value: val.expense,
            color: expenseChartColors[i % expenseChartColors.length],
            label: t(`categories.${key}`),
            pct: expTotal > 0 ? (val.expense / expTotal * 100).toFixed(0) : "0",
          })),
        );
        const incEntries = Object.entries(cats)
          .filter(([, v]) => v.income > 0)
          .sort(([, a], [, b]) => b.income - a.income);
        const incTotal = incEntries.reduce((s, [, v]) => s + v.income, 0);
        setChartIncomeBreakdown(
          incEntries.map(([key, val], i) => ({
            key,
            value: val.income,
            color: incomeChartColors[i % incomeChartColors.length],
            label: t(`categories.${key}`),
            pct: incTotal > 0 ? (val.income / incTotal * 100).toFixed(0) : "0",
          })),
        );
      }
      if (trendRes?.code === 200) {
        const raw = trendRes.data;
        if (chartYearMode) {
          const byYear = {};
          for (const m of raw) {
            const y = m.month.slice(0, 4);
            if (!byYear[y]) byYear[y] = { expense: 0, income: 0 };
            byYear[y].expense += m.expense;
            byYear[y].income += m.income;
          }
          const years = Object.keys(byYear).sort();
          setChartExpenseTrend(years.map((y) => ({ value: byYear[y].expense, label: y })));
          setChartIncomeTrend(years.map((y) => ({ value: byYear[y].income, label: y })));
        } else {
          setChartExpenseTrend(raw.map((m) => ({ value: m.expense, label: m.month.slice(5) })));
          setChartIncomeTrend(raw.map((m) => ({ value: m.income, label: m.month.slice(5) })));
        }
      }
    } catch {}
    setChartLoading(false);
  }, [chartStartYear, chartStartMonth, chartEndYear, chartEndMonth, chartYearMode, t, colors]);

  useFocusEffect(useCallback(() => { loadBills(); }, [loadBills]));

  useEffect(() => { loadChartData(); }, [loadChartData]);

  // validate & auto-correct end >= start
  useEffect(() => {
    if (chartYearMode) {
      if (chartEndYear < chartStartYear) setChartEndYear(chartStartYear);
      if (chartStartMonth !== null) setChartStartMonth(null);
      if (chartEndMonth !== null) setChartEndMonth(null);
    } else {
      if (chartEndYear < chartStartYear) setChartEndYear(chartStartYear);
      if (chartEndYear === chartStartYear && (chartEndMonth || 0) < (chartStartMonth || 1)) {
        setChartEndMonth(chartStartMonth || 1);
      }
    }
  }, [chartYearMode, chartStartYear, chartStartMonth, chartEndYear, chartEndMonth]);

  const handleSyncDurable = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await syncAllDurableBills();
      if (res?.code === 200) {
        setSyncMsg(res.message || t("bills.syncSuccess"));
        loadBills();
      } else {
        setSyncMsg(res?.message || t("bills.syncFailed"));
      }
    } catch (e) {
      setSyncMsg(t("bills.syncFailed"));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 3000);
    }
  };

  const filteredItems = useMemo(() => items.filter((item) => {
    if (item.type !== "record") return false;
    if (activeCategory !== t("common.all") && item.category !== activeCategory) return false;
    if (search && !item.name.includes(search)) return false;
    return true;
  }), [items, activeCategory, search, t]);

  // 将筛选后的记录两两配对
  const recordPairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < filteredItems.length; i += 2) {
      pairs.push(filteredItems.slice(i, i + 2));
    }
    return pairs;
  }, [filteredItems]);

  const isCurrentYear = selectedYear === CURRENT_YEAR;
  const daysInPeriod = selectedMonth
    ? new Date(selectedYear, selectedMonth, 0).getDate()
    : Math.floor(((isCurrentYear ? new Date() : new Date(selectedYear, 11, 31)) - new Date(selectedYear, 0, 1)) / 86400000) + 1;

  const summary = useMemo(() => {
    let totalExpense = 0, totalIncome = 0, expenseCount = 0, incomeCount = 0;
    for (const item of filteredItems) {
      const amt = parseFloat(item.amount.replace(/^[+\-]/, "")) || 0;
      if (item.billType === "income") { totalIncome += amt; incomeCount++; }
      else { totalExpense += amt; expenseCount++; }
    }
    const elapsedMonths = selectedMonth ? 1 : (isCurrentYear ? CURRENT_MONTH : 12);
    const dailyAvgExp = totalExpense / daysInPeriod;
    const monthlyAvgExp = totalExpense / elapsedMonths;
    const dailyAvgInc = totalIncome / daysInPeriod;
    const monthlyAvgInc = totalIncome / elapsedMonths;

    let prevExpTotal = 0, prevIncTotal = 0;
    for (const item of prevMonthData) {
      const amt = parseFloat(item.amount.replace(/^[+\-]/, "")) || 0;
      if (item.billType === "income") prevIncTotal += amt;
      else prevExpTotal += amt;
    }

    let yoyExpTotal = 0, yoyIncTotal = 0;
    for (const item of yoyMonthData) {
      const amt = parseFloat(item.amount.replace(/^[+\-]/, "")) || 0;
      if (item.billType === "income") yoyIncTotal += amt;
      else yoyExpTotal += amt;
    }

    const currIcon = getCurrency().icon;
    const fmt = (n) => `${currIcon}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtShort = (n) => n >= 10000 ? `${(n / 10000).toFixed(1)}${t("durable.unitTenThousand")}` : n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const fmtShortLabel = (n) => {
      if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}${t("durable.unitBillion")}`;
      if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 2)}${t("durable.unitTenThousand")}`;
      return null;
    };
    let expMomTrend = null, incMomTrend = null;
    let expYoyTrend = null, incYoyTrend = null;
    if (selectedMonth) {
      if (prevExpTotal > 0) expMomTrend = ((totalExpense - prevExpTotal) / prevExpTotal * 100);
      if (prevIncTotal > 0) incMomTrend = ((totalIncome - prevIncTotal) / prevIncTotal * 100);
      if (yoyExpTotal > 0) expYoyTrend = ((totalExpense - yoyExpTotal) / yoyExpTotal * 100);
      if (yoyIncTotal > 0) incYoyTrend = ((totalIncome - yoyIncTotal) / yoyIncTotal * 100);
    }
    return {
      totalExpenseFormatted: fmt(totalExpense),
      totalIncomeFormatted: fmt(totalIncome),
      totalExpenseShort: fmtShortLabel(totalExpense),
      totalIncomeShort: fmtShortLabel(totalIncome),
      expenseCount, incomeCount,
      dailyAvgExp: fmtShort(dailyAvgExp), monthlyAvgExp: fmtShort(monthlyAvgExp),
      dailyAvgInc: fmtShort(dailyAvgInc), monthlyAvgInc: fmtShort(monthlyAvgInc),
      expMomTrend, incMomTrend, expYoyTrend, incYoyTrend,
    };
  }, [filteredItems, prevMonthData, yoyMonthData, daysInPeriod, selectedMonth, t]);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const renderCategory = (cat) => (
    <Pressable
      key={cat}
      style={[
        styles.filterPill,
        activeCategory === cat && styles.filterPillActive,
      ]}
      onPress={() => setActiveCategory(cat)}
    >
      <Text
        style={[
          styles.filterPillText,
          activeCategory === cat && styles.filterPillTextActive,
        ]}
      >
        {cat === t("common.all") ? cat : t(`categories.${cat}`)}
      </Text>
    </Pressable>
  );

  const handleDateChange = useCallback(({ year, month }) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const renderRecordCard = (item) => {
    const CategoryIcon = CATEGORY_ICON[item.category];
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.recordCard,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push(`/bills/${item.id}`)}
      >
        <View style={styles.recordMediaWrap}>
          {item.receiptImage && !failedImages.has(item.id + "_receipt") ? (
            <Image
              source={{ uri: item.receiptImage }}
              style={styles.recordImage}
              contentFit="contain"
              onError={() => setFailedImages((prev) => new Set(prev).add(item.id + "_receipt"))}
            />
          ) : item.durableImage && !failedImages.has(item.id + "_durable") ? (
            <Image
              source={{ uri: item.durableImage }}
              style={styles.recordImage}
              contentFit="contain"
              onError={() => setFailedImages((prev) => new Set(prev).add(item.id + "_durable"))}
            />
          ) : (
            <View style={[styles.recordIconWrap, { backgroundColor: item.iconBg || colors.primaryBg }]}>
              {CategoryIcon ? <CategoryIcon size={22} color={colors.textSecondary} /> : null}
              {failedImages.has(item.id + "_receipt") || failedImages.has(item.id + "_durable") ? (
                <Text style={styles.recordImageBroken}>{t("common.imageBroken")}</Text>
              ) : null}
            </View>
          )}
          </View><Text style={styles.recordName} numberOfLines={1} ellipsizeMode="tail">
          {item.name}
        </Text>{/* */}
        <View style={styles.recordCategoryRow}>
          {CategoryIcon ? <CategoryIcon size={12} color={colors.textTertiary} /> : null}<Text style={styles.recordCategory}>
            {t(`categories.${item.category}`)}
          </Text>
        </View>{/* */}
        <Text style={styles.recordTime}>
          {item.time}
        </Text>{/* */}
        <Text
          style={[
            styles.recordAmount,
            item.billType === "income" && styles.recordAmountIncome,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {getCurrency().icon}{item.amount.replace(/^[+\-]/, "")}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* 年月选择器 */}
      <View style={styles.dateSelector}>
        <YearMonthPicker
          year={selectedYear}
          month={selectedMonth}
          onChange={handleDateChange}
        />
      </View>

      {/* 搜索 + 同步 + 类别筛选 */}
      <View style={styles.headerContent}>
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Search size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t("bills.searchPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View><Pressable
            style={({ pressed }) => [styles.syncBtn, pressed && styles.syncBtnPressed, syncing && styles.syncBtnDisabled]}
            onPress={handleSyncDurable}
            disabled={syncing}
          >
            <RefreshCw size={16} color={syncing ? colors.textTertiary : colors.primary} />
          </Pressable>
        </View>{/* */}
        {syncMsg ? (
          <Text style={styles.syncMsg}>{syncMsg}</Text>
        ) : null}{/* */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {[t("common.all"), ...ITEM_CATEGORIES].map(renderCategory)}
        </ScrollView>
      </View>

      {/* 可滚动内容：汇总卡片 + 列表 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        <View style={styles.summarySection}>
          <View style={[styles.summaryCard, styles.summaryCardExpense]}>
            <View style={styles.summaryTopRow}>
              <View style={[styles.summaryIconWrap, { backgroundColor: hexToRgba(colors.accent.red, 0.1) }]}>
                <TrendingDown size={16} color={colors.accent.red} />
              </View><Text style={styles.summaryLabel}>{t("bills.totalExpense")}</Text><View style={styles.summaryTitleWrap} /><View style={[styles.summaryBadge, { backgroundColor: hexToRgba(colors.accent.blue, 0.15) }]}>
                <Text style={[styles.summaryBadgeText, { color: colors.accent.blue }]}>{t("common.count", { count: summary.expenseCount })}</Text>
              </View>
            </View><View style={styles.summaryAmountRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {summary.totalExpenseFormatted}
                </Text>
                {summary.totalExpenseShort && (
                  <Text style={[styles.summaryShortLabel, { color: colors.textTertiary }]}>
                    ≈ {summary.totalExpenseShort}
                  </Text>
                )}
              </View>
              {summary.expMomTrend !== null || summary.expYoyTrend !== null ? (
                <View style={styles.summaryTrendGroup}>
                  {summary.expMomTrend !== null && (
                    <Text style={[styles.summaryTrend, { color: summary.expMomTrend > 0 ? colors.accent.red : colors.accent.green }]}>
                      {t("home.momTrend")} {summary.expMomTrend > 0 ? "↑" : summary.expMomTrend < 0 ? "↓" : "→"}{Math.abs(summary.expMomTrend).toFixed(0)}%
                    </Text>
                  )}
                  {summary.expYoyTrend !== null && (
                    <Text style={[styles.summaryTrend, { color: summary.expYoyTrend > 0 ? colors.accent.red : colors.accent.green }]}>
                      {t("home.yoyTrend")} {summary.expYoyTrend > 0 ? "↑" : summary.expYoyTrend < 0 ? "↓" : "→"}{Math.abs(summary.expYoyTrend).toFixed(0)}%
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={10} color={colors.accent.orange} /><Text style={styles.statLabel}>{t("bills.dailyAvg")}</Text><Text style={[styles.statValue, { color: colors.accent.orange }]}>{getCurrency().icon}{summary.dailyAvgExp}</Text>
              </View>{!selectedMonth ? <><View style={styles.statDivider} /><View style={styles.statItem}>
                <Calendar size={10} color={colors.accent.green} /><Text style={styles.statLabel}>{t("bills.monthlyAvg")}</Text>
                <Text style={[styles.statValue, { color: colors.accent.green }]}>{getCurrency().icon}{summary.monthlyAvgExp}</Text>
              </View></> : null}
            </View>
          </View><View style={[styles.summaryCard, styles.summaryCardIncome]}>
            <View style={styles.summaryTopRow}>
              <View style={[styles.summaryIconWrap, { backgroundColor: hexToRgba(colors.accent.green, 0.1) }]}>
                <TrendingUp size={16} color={colors.accent.green} />
              </View><Text style={styles.summaryLabel}>{t("bills.totalIncome")}</Text><View style={styles.summaryTitleWrap} /><View style={[styles.summaryBadge, { backgroundColor: hexToRgba(colors.accent.blue, 0.15) }]}>
                <Text style={[styles.summaryBadgeText, { color: colors.accent.blue }]}>{t("common.count", { count: summary.incomeCount })}</Text>
              </View>
            </View><View style={styles.summaryAmountRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {summary.totalIncomeFormatted}
                </Text>
                {summary.totalIncomeShort && (
                  <Text style={[styles.summaryShortLabel, { color: colors.textTertiary }]}>
                    ≈ {summary.totalIncomeShort}
                  </Text>
                )}
              </View>
              {summary.incMomTrend !== null || summary.incYoyTrend !== null ? (
                <View style={styles.summaryTrendGroup}>
                  {summary.incMomTrend !== null && (
                    <Text style={[styles.summaryTrend, { color: summary.incMomTrend > 0 ? colors.accent.green : colors.accent.red }]}>
                      {t("home.momTrend")} {summary.incMomTrend > 0 ? "↑" : summary.incMomTrend < 0 ? "↓" : "→"}{Math.abs(summary.incMomTrend).toFixed(0)}%
                    </Text>
                  )}
                  {summary.incYoyTrend !== null && (
                    <Text style={[styles.summaryTrend, { color: summary.incYoyTrend > 0 ? colors.accent.green : colors.accent.red }]}>
                      {t("home.yoyTrend")} {summary.incYoyTrend > 0 ? "↑" : summary.incYoyTrend < 0 ? "↓" : "→"}{Math.abs(summary.incYoyTrend).toFixed(0)}%
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Clock size={10} color={colors.accent.orange} /><Text style={styles.statLabel}>{t("bills.dailyAvg")}</Text><Text style={[styles.statValue, { color: colors.accent.orange }]}>{getCurrency().icon}{summary.dailyAvgInc}</Text>
              </View>{!selectedMonth ? <><View style={styles.statDivider} /><View style={styles.statItem}>
                <Calendar size={10} color={colors.accent.green} /><Text style={styles.statLabel}>{t("bills.monthlyAvg")}</Text>
                <Text style={[styles.statValue, { color: colors.accent.green }]}>{getCurrency().icon}{summary.monthlyAvgInc}</Text>
              </View></> : null}
            </View>
          </View>
        </View>

        {/* ── 图表区域 ── */}
        <View style={styles.chartCard}>
          <Pressable
            style={styles.chartHeader}
            onPress={() => setChartExpanded((v) => !v)}
          >
            <View style={styles.chartHeaderLeft}>
              <View style={styles.chartTitleRow}>
                <BarChart3 size={16} color={colors.primary} />
                <Text style={styles.chartTitle}>{t("bills.charts", "明细分析")}</Text>
              </View><View style={styles.chartRangeRow}>
                <View style={styles.chartModeToggle}>
                  <Pressable
                    style={[styles.chartModeBtn, !chartYearMode && styles.chartModeBtnActive]}
                    onPress={() => {
                      setChartYearMode(false);
                      setChartStartYear(DEFAULT_START_YEAR);
                      setChartStartMonth(DEFAULT_START_MONTH);
                      setChartEndYear(CURRENT_YEAR);
                      setChartEndMonth(CURRENT_MONTH);
                    }}
                  >
                    <Text style={[styles.chartModeBtnText, !chartYearMode && styles.chartModeBtnTextActive]}>{t("bills.chartMonthMode", "月")}</Text>
                  </Pressable><Pressable
                    style={[styles.chartModeBtn, chartYearMode && styles.chartModeBtnActive]}
                    onPress={() => {
                      setChartYearMode(true);
                      setChartStartYear(CURRENT_YEAR - 5);
                      setChartStartMonth(null);
                      setChartEndYear(CURRENT_YEAR);
                      setChartEndMonth(null);
                    }}
                  >
                    <Text style={[styles.chartModeBtnText, chartYearMode && styles.chartModeBtnTextActive]}>{t("bills.chartYearMode", "年")}</Text>
                  </Pressable>
                </View>
                <ChartRangePicker
                  startYear={chartStartYear}
                  startMonth={chartStartMonth}
                  endYear={chartEndYear}
                  endMonth={chartEndMonth}
                  yearOnly={chartYearMode}
                  onConfirm={({ startYear: sy, startMonth: sm, endYear: ey, endMonth: em }) => {
                    setChartStartYear(sy);
                    setChartStartMonth(sm);
                    setChartEndYear(ey);
                    setChartEndMonth(em);
                  }}
                />
              </View>
            </View>{chartExpanded ? (
              <ChevronUp size={16} color={colors.textTertiary} />
            ) : (
              <ChevronDown size={16} color={colors.textTertiary} />
            )}
          </Pressable>
          {chartExpanded && (
            <View style={styles.chartBody}>
              {chartLoading ? (
                <Text style={styles.chartEmpty}>{t("common.loading", "加载中...")}</Text>
              ) : chartExpenseBreakdown.length === 0 && chartIncomeBreakdown.length === 0 ? (
                <Text style={styles.chartEmpty}>{t("home.noChartData", "暂无数据")}</Text>
              ) : (
                <>
                  {/* 支出分析 */}
                  {(chartExpenseBreakdown.length > 0 || chartExpenseTrend.some(d => d.value > 0)) && (
                    <View style={styles.chartSection}>
                      <View style={styles.chartSectionDivider} /><View style={styles.chartSectionTitleRow}>
                        <TrendingDown size={14} color={colors.accent.red} />
                        <Text style={[styles.chartSectionTitle, { color: colors.accent.red }]}>
                          {t("home.expenseAnalysis", "支出分析")}
                        </Text>
                      </View>{/* */}
                      {chartExpenseBreakdown.length > 0 && (
                        <View style={styles.chartContent}>
                          <View style={styles.chartVisual}>
                            <DonutChart data={chartExpenseBreakdown} size={130} innerRadius={42} />
                          </View><ScrollView style={styles.chartLabelsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            <View style={styles.chartLabels}>
                              {chartExpenseBreakdown.map((item) => (
                                <View key={item.key} style={styles.chartLabelRow}>
                                  <View style={[styles.chartDot, { backgroundColor: item.color }]} /><Text style={styles.chartLabelText} numberOfLines={1}>{item.label}</Text><Text style={[styles.chartLabelPct, { color: colors.textSecondary }]}>{getCurrency().icon}{item.value.toLocaleString()} ({item.pct}%)</Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}{/* */}
                      {chartExpenseTrend.some(d => d.value > 0) && (
                        <View style={styles.chartTrendWrap} onLayout={(e) => setChartRangeWidth(e.nativeEvent.layout.width)}>
                          <BarLineChart
                            data={chartExpenseTrend}
                            height={120}
                            lineColor={colors.accent.orange}
                            containerWidth={chartRangeWidth}
                          />
                        </View>
                      )}
                    </View>
                  )}
                  {/* 收入分析 */}
                  {(chartIncomeBreakdown.length > 0 || chartIncomeTrend.some(d => d.value > 0)) && (
                    <View style={styles.chartSection}>
                      <View style={styles.chartSectionDivider} /><View style={styles.chartSectionTitleRow}>
                        <TrendingUp size={14} color={colors.accent.green} />
                        <Text style={[styles.chartSectionTitle, { color: colors.accent.green }]}>
                          {t("home.incomeAnalysis", "收入分析")}
                        </Text>
                      </View>{/* */}
                      {chartIncomeBreakdown.length > 0 && (
                        <View style={styles.chartContent}>
                          <View style={styles.chartVisual}>
                            <DonutChart data={chartIncomeBreakdown} size={130} innerRadius={42} />
                          </View><ScrollView style={styles.chartLabelsScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            <View style={styles.chartLabels}>
                              {chartIncomeBreakdown.map((item) => (
                                <View key={item.key} style={styles.chartLabelRow}>
                                  <View style={[styles.chartDot, { backgroundColor: item.color }]} /><Text style={styles.chartLabelText} numberOfLines={1}>{item.label}</Text><Text style={[styles.chartLabelPct, { color: colors.textSecondary }]}>{getCurrency().icon}{item.value.toLocaleString()} ({item.pct}%)</Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}{/* */}
                      {chartIncomeTrend.some(d => d.value > 0) && (
                        <View style={styles.chartTrendWrap} onLayout={(e) => setChartRangeWidth(e.nativeEvent.layout.width)}>
                          <BarLineChart
                            data={chartIncomeTrend}
                            height={120}
                            lineColor={colors.accent.sage}
                            containerWidth={chartRangeWidth}
                          />
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* 两列网格列表 */}
        {recordPairs.map((pair, idx) => (
          <View key={idx} style={styles.recordRow}>
            {renderRecordCard(pair[0])}{pair[1] ? (
              renderRecordCard(pair[1])
            ) : (
              <View style={styles.recordCardPlaceholder} />
            )}
          </View>
        ))}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/bills/add")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dateSelector: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  summarySection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  summaryCard: {
    borderRadius: radius.xl,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    overflow: "hidden",
    gap: spacing.sm,
  },
  summaryCardExpense: {
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: hexToRgba(colors.accent.red, 0.1),
  },
  summaryCardIncome: {
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: hexToRgba(colors.accent.green, 0.1),
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  summaryTitleWrap: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  summaryAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryShortLabel: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    opacity: 0.7,
    marginTop: 2,
  },
  summaryTrend: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },
  summaryTrendGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: "rgba(166, 227, 255, 0.2)",
    flexShrink: 0,
  },
  summaryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
    color: colors.accent.blue,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.divider,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textTertiary,
    lineHeight: 14,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
    lineHeight: 16,
  },
  headerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input.bg,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  syncBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceFrost,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  syncBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncMsg: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: 4,
  },
  filterPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    color: colors.input.text,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  filterPillTextActive: {
    color: colors.textInverse,
  },
  // ── 图表 ──
  chartCard: {
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  chartHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chartRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  chartModeToggle: {
    flexDirection: "row",
    backgroundColor: colors.input.bg,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  chartModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chartModeBtnActive: {
    backgroundColor: colors.primaryBgMedium,
  },
  chartModeBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textTertiary,
  },
  chartModeBtnTextActive: {
    color: colors.primary,
  },
  chartBody: {
    paddingHorizontal: spacing.lg,
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
  chartSectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.4,
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
  chartTrendWrap: {
    marginTop: 4,
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
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.huge,
  },
  recordRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: spacing.md,
  },
  recordCardPlaceholder: {
    width: GRID_CARD_WIDTH,
  },
  recordCard: {
    width: GRID_CARD_WIDTH,
    flexDirection: "column",
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  recordMediaWrap: {
    width: "100%",
    height: 96,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  recordIconWrap: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  recordImage: {
    width: "100%",
    height: "100%",
  },
  recordImageBroken: {
    color: colors.textTertiary,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
  recordName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
      overflow: "hidden",
    },
  recordCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recordCategory: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
    flexShrink: 1,
  },
  recordTime: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
  },
  recordAmount: {
    color: colors.accent.red,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  recordAmountTransfer: {
    color: colors.accent.green,
  },
  recordAmountIncome: {
    color: colors.accent.green,
  },
  fab: {
    position: "absolute",
    right: spacing.xxl,
    bottom: spacing.xxxl,
    width: 60,
    height: 60,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  fabPressed: {
    transform: [{ scale: 0.92 }],
  },
  fabIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "400",
    lineHeight: 34,
    marginTop: -2,
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  });
}
