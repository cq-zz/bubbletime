import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { Bell, CalendarCheck, CalendarDays, CheckCircle, Circle, Clock, Loader2, Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import { fetchScheduleList, fetchSubmitSchedule } from "../../services/schedule";
import { SCHEDULE_FILTER_KEYS } from "../../utils/constant";
import YearMonthPicker from "../../components/YearMonthPicker";

const CURRENT_YEAR = new Date().getFullYear();

export default function ScheduleListScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const router = useRouter();
  const [activeKey, setActiveKey] = useState(SCHEDULE_FILTER_KEYS.all);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // 动态获取筛选分类
  const SCHEDULE_FILTER_CATEGORIES = useMemo(() => {
    const filterLabels = { not_started: "notStarted", in_progress: "inProgress" };
    return Object.values(SCHEDULE_FILTER_KEYS).map(key => ({
      key,
      label: key === "all" ? t("common.all") : t(`schedule.${filterLabels[key] || key}`)
    }));
  }, [t]);

  const enrichTask = (task) => {
    const priorityMap = {
      high: { label: t("schedule.highPriority"), bg: hexToRgba(colors.accent.red, 0.12), accent: colors.accent.red },
      medium: { label: t("schedule.mediumPriority"), bg: hexToRgba(colors.accent.yellow, 0.12), accent: colors.accent.yellow },
      low: { label: t("schedule.lowPriority"), bg: hexToRgba(colors.accent.green, 0.12), accent: colors.accent.green },
    };
    const statusMap = {
      not_started: { label: t("schedule.notStarted"), color: colors.textTertiary, icon: "Clock" },
      todo: { label: t("schedule.notStarted"), color: colors.textTertiary, icon: "Clock" },
      in_progress: { label: t("schedule.inProgress"), color: colors.accent.yellow, icon: "Loader2" },
      done: { label: t("schedule.done"), color: colors.accent.green, icon: "CheckCircle" },
      incomplete: { label: t("schedule.incomplete"), color: colors.accent.red, icon: "Loader2" },
    };
    const pri = priorityMap[task.priority] || priorityMap.medium;
    const sta = statusMap[task.status] || statusMap.todo;
    return {
      ...task,
      accent: pri.accent,
      priorityBg: pri.bg,
      priorityLabel: pri.label,
      statusColor: sta.color,
      statusLabel: sta.label,
      statusIcon: sta.icon === "Clock" ? Clock : sta.icon === "Loader2" ? Loader2 : CheckCircle,
    };
  };

  const loadSchedule = useCallback(() => {
    setLoading(true);
    const params = { year: selectedYear };
    if (selectedMonth) params.month = selectedMonth;
    fetchScheduleList(params).then((res) => {
      if (res?.code === 200) setTasks((res.data || []).map(enrichTask));
    }).catch((e) => {
      console.error(t("schedule.loadFailed"), e);
    }).finally(() => setLoading(false));
  }, [t, selectedYear, selectedMonth]);

  useFocusEffect(useCallback(() => { loadSchedule(); }, [loadSchedule]));

  const filteredTasks = tasks.filter((task) => {
    if (activeKey !== SCHEDULE_FILTER_KEYS.all) {
      if (activeKey === SCHEDULE_FILTER_KEYS.notStarted && task.status !== "not_started" && task.status !== "todo") return false;
      if (activeKey === SCHEDULE_FILTER_KEYS.inProgress && task.status !== "in_progress") return false;
      if (activeKey === SCHEDULE_FILTER_KEYS.done && task.status !== "done") return false;
      if (activeKey === SCHEDULE_FILTER_KEYS.incomplete && task.status !== "incomplete") return false;
    }
    if (search && !task.title.includes(search)) return false;
    return true;
  });

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const handleDateChange = useCallback(({ year, month }) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const renderCategory = (cat) => (
    <Pressable
      key={cat.key}
      style={[
        styles.filterPill,
        activeKey === cat.key && styles.filterPillActive,
      ]}
      onPress={() => setActiveKey(cat.key)}
    >
      <Text
        style={[
          styles.filterPillText,
          activeKey === cat.key && styles.filterPillTextActive,
        ]}
      >
        {cat.label}
      </Text>
    </Pressable>
  );

  const nextStatus = (current) => {
    if (current === "not_started" || current === "todo" || current === "incomplete") return "in_progress";
    if (current === "in_progress") return "done";
    if (current === "done") return "not_started";
    return "not_started";
  };

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: item.accent },
        pressed && styles.cardPressed,
      ]}
      onPress={() => router.push(`/schedule/${item.id}`)}
    >
      {/* Top Row: Priority Badge */}
      <View style={styles.cardTop}>
        <View
          style={[styles.priorityBadge, { backgroundColor: item.priorityBg }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {item.priority === "high" ? (
              <Circle size={10} color={colors.accent.red} fill={colors.accent.red} />
            ) : item.priority === "medium" ? (
              <Circle size={10} color={colors.accent.yellow} fill={colors.accent.yellow} />
            ) : (
              <Circle size={10} color={colors.accent.green} fill={colors.accent.green} />
            )}<Text style={[styles.priorityBadgeText, { color: item.accent }]}>
              {item.priorityLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Date Range */}
      <View style={styles.dateRow}>
        <CalendarDays size={14} color={colors.textSecondary} /><Text style={styles.dateText}>{item.dateRange}</Text>
      </View>

      {/* Bottom: Status Pill + Reminder Toggle */}
      <View style={styles.cardBottom}>
        <Pressable
          onPress={() => {
            const newStatus = nextStatus(item.status);
            fetchSubmitSchedule({ id: item.id, status: newStatus });
            loadSchedule();
          }}
          style={({ pressed }) => [
            styles.statusPill,
            { backgroundColor: hexToRgba(item.statusColor, 0.12), borderColor: hexToRgba(item.statusColor, 0.3) },
            pressed && styles.statusPillPressed,
          ]}
        >
          {(() => { const StatusIcon = item.statusIcon; return <StatusIcon size={14} color={item.statusColor} />; })()}<Text style={[styles.statusPillText, { color: item.statusColor }]}>
            {item.statusLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            fetchSubmitSchedule({ id: item.id, reminderEnabled: !item.reminderEnabled });
            loadSchedule();
          }}
          style={styles.reminderToggleRow}
        >
          <Bell size={14} color={item.reminderEnabled ? colors.primary : colors.textTertiary} /><Switch
            value={item.reminderEnabled}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primaryBgMedium }}
            thumbColor={item.reminderEnabled ? colors.primary : colors.textInverse}
          />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <YearMonthPicker
          year={selectedYear}
          month={selectedMonth}
          onChange={handleDateChange}
        />
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textTertiary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("schedule.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {SCHEDULE_FILTER_CATEGORIES.map(renderCategory)}
        </ScrollView>
      </View>



      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyWrap}>
            <CalendarCheck size={48} color={hexToRgba(colors.textTertiary, 0.3)} />
            <Text style={styles.emptyText}>{t("schedule.empty")}</Text>
          </View>
        ) : null}
      />
      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/schedule/add")}
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
  headerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.input.bg,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    color: colors.textTertiary,
    marginRight: 10,
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

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: spacing.huge,
  },
  card: {
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: 10,
    marginBottom: spacing.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.lg,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  statusPillPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateIcon: {
    fontSize: 14,
    opacity: 0.5,
  },
  dateText: {
    color: colors.textTertiary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  reminderToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  emptyWrap: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 60, gap: 12,
  },
  emptyText: {
    fontSize: 14, fontWeight: "600", color: colors.textTertiary, textAlign: "center",
  },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  });
}