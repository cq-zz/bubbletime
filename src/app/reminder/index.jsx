import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Bell, BellOff, CalendarCheck, CalendarHeart, Package, ChevronRight, Clock } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import { fetchMessageList } from "../../services/reminder";

export default function ReminderListScreen() {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const enrichItem = (item) => {
    const priorityMap = {
      high: { label: t("schedule.highPriority"), bg: hexToRgba(colors.accent.red, 0.12), accent: colors.accent.red },
      medium: { label: t("schedule.mediumPriority"), bg: hexToRgba(colors.accent.yellow, 0.12), accent: colors.accent.yellow },
      low: { label: t("schedule.lowPriority"), bg: hexToRgba(colors.accent.green, 0.12), accent: colors.accent.green },
    };
    const pri = priorityMap[item.priority] || priorityMap.medium;
    const typeConfig = item.moduleType === "durable"
      ? { typeLabel: t("reminder.durableExpiry"), typeIcon: Package, typeColor: colors.accent.sage }
      : item.moduleType === "important_date"
        ? { typeLabel: t("home.importantDate"), typeIcon: CalendarHeart, typeColor: "#E93D82" }
        : { typeLabel: t("reminder.scheduleReminder"), typeIcon: CalendarCheck, typeColor: colors.accent.blue };
    return {
      ...item,
      accent: pri.accent,
      priorityBg: pri.bg,
      priorityLabel: pri.label,
      reminderTime: item.desc ? t(item.desc, item.descCount != null ? { count: item.descCount } : undefined) : item.daysLeft || t("common.today"),
      ...typeConfig,
    };
  };

  const loadMessages = useCallback(() => {
    setLoading(true);
    fetchMessageList()
      .then((res) => {
        if (res?.code === 200) {
          setTasks((res.data || []).map(enrichItem));
        }
      })
      .catch((e) => {
        console.error("加载消息提醒失败:", e);
      })
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { loadMessages(); }, [loadMessages]));

  const handlePress = (item) => {
    if (item.moduleType === "durable") {
      router.push(`/durable/${item.moduleId}`);
    } else if (item.moduleType === "important_date") {
      router.push(`/important-date/${item.moduleId}`);
    } else {
      router.push(`/schedule/${item.moduleId}`);
    }
  };

  const renderItem = ({ item }) => {
    const TypeIcon = item.typeIcon;
    const isOverdue = item.daysLeftNum !== undefined && item.daysLeftNum < 0;
    const descColor = isOverdue ? colors.accent.red : colors.textSecondary;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { borderLeftColor: item.accent },
          pressed && styles.cardPressed,
        ]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.cardTop}>
          <View
            style={[styles.priorityBadge, { backgroundColor: item.priorityBg }]}
          >
            <Text style={[styles.priorityBadgeText, { color: item.accent }]}>
              {item.priorityLabel}
            </Text>
          </View><ChevronRight size={16} color={colors.textTertiary} />
        </View>

        <View style={styles.cardTitleRow}>
          <View style={[styles.titleIconWrap, { backgroundColor: `${item.typeColor}18` }]}>
            <TypeIcon size={14} color={item.typeColor} />
          </View><Text style={styles.cardTitle}>{item.title}</Text>
        </View>

        <View style={styles.dateRow}>
          <Clock size={13} color={descColor} /><Text style={[styles.dateText, { color: descColor }]}>{t(item.desc, item.descCount != null ? { count: item.descCount } : undefined)}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.statusRow}>
            <TypeIcon size={12} color={item.typeColor} /><Text style={[styles.statusText, { color: item.typeColor }]}>
              {item.typeLabel}
            </Text>
          </View><View style={[styles.reminderBadge, isOverdue && styles.reminderBadgeOverdue]}>
            <Bell size={10} color={isOverdue ? colors.accent.red : colors.primary} /><Text style={[styles.reminderBadgeText, isOverdue && { color: colors.accent.red }]}>
              {isOverdue ? t("reminder.pending") : t("reminder.reminding")}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const nextReminder = tasks[0];

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  return (
    <View style={styles.container}>
      {/* 最近提醒 */}
      {nextReminder && (
        <View style={styles.pinnedReminder}>
          <Pressable style={styles.nextReminderCard} onPress={() => handlePress(nextReminder)}>
            <View style={styles.nextReminderLeft}>
              <Bell size={24} color={colors.primary} /><View style={{ flex: 1 }}>
                <Text style={styles.nextReminderLabel}>{t("reminder.recentReminders")}</Text>
                <Text style={styles.nextReminderTitle}>
                  {nextReminder.title}
                </Text>
              </View>
            </View><Text style={[
              styles.nextReminderTime,
              (nextReminder.daysLeft === t("common.expired") || nextReminder.daysLeft === t("schedule.incomplete")) && styles.reminderTimeExpired,
            ]}>
              {nextReminder.reminderTime}
            </Text>
          </Pressable>
        </View>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {!loading && tasks.length === 0 && (
        <View style={styles.emptyWrap}>
          <BellOff size={40} color={colors.textTertiary} /><Text style={styles.emptyTitle}>{t("reminder.noReminder")}</Text>{/* */}
          <Text style={styles.emptyDesc}>
            {t("reminder.noReminderDesc")}
          </Text>
        </View>
      )}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pinnedReminder: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: 0, paddingBottom: 80 },

  nextReminderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.xxl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  nextReminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  nextReminderLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  nextReminderTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  nextReminderTime: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  reminderTimeExpired: { color: colors.accent.red },

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
  cardPressed: { transform: [{ scale: 0.97 }] },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg },
  priorityBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
    flex: 1,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dateText: {
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
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  reminderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.lg,
    backgroundColor: hexToRgba(colors.accent.blue, 0.12),
  },
  reminderBadgeOverdue: {
    backgroundColor: hexToRgba(colors.accent.red, 0.12),
  },
  reminderBadgeText: { color: colors.primary, fontSize: 10, fontWeight: "700" },
  emptyWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: spacing.xxxl, gap: spacing.md,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, fontWeight: "500", textAlign: "center" },
  loadingWrap: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  });
}
