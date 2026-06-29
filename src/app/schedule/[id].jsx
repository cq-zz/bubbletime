import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { Bell, CalendarDays, CheckCircle, Circle, Clock, Loader2, Pencil, Trash2 } from "lucide-react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import ConfirmModal from "../../components/ConfirmModal";
import ImagePreviewModal from "../../components/ImagePreviewModal";
import { fetchScheduleDetail, fetchSubmitSchedule, fetchDeleteSchedule } from "../../services/schedule";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ScheduleDetailScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [schedule, setSchedule] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const deleteActionRef = useRef(null);

  // 动态获取优先级配置
  const PRIORITY_CONFIG = useMemo(() => ({
    high: { label: t("schedule.highPriority"), bg: hexToRgba(colors.accent.red, 0.12), color: colors.accent.red },
    medium: { label: t("schedule.mediumPriority"), bg: hexToRgba(colors.accent.yellow, 0.12), color: colors.accent.yellow },
    low: { label: t("schedule.lowPriority"), bg: hexToRgba(colors.accent.green, 0.12), color: colors.accent.green },
  }), [t, colors]);

  // 动态获取状态样式
  const STATUS_STYLE = useMemo(() => ({
    not_started: { label: t("schedule.notStarted"), bg: hexToRgba(colors.textTertiary, 0.1), color: colors.textTertiary },
    todo: { label: t("schedule.notStarted"), bg: hexToRgba(colors.textTertiary, 0.1), color: colors.textTertiary },
    in_progress: { label: t("schedule.inProgress"), bg: hexToRgba(colors.accent.yellow, 0.12), color: colors.accent.yellow },
    done: { label: t("schedule.done"), bg: hexToRgba(colors.accent.green, 0.12), color: colors.accent.green },
    incomplete: { label: t("schedule.incomplete"), bg: hexToRgba(colors.accent.red, 0.12), color: colors.accent.red },
  }), [t, colors]);

  // 动态获取状态选项
  const SCHEDULE_STATUS_OPTIONS = useMemo(() => [
    { value: "not_started", i18nKey: "schedule.notStarted" },
    { value: "in_progress", i18nKey: "schedule.inProgress" },
    { value: "done", i18nKey: "schedule.done" },
    { value: "incomplete", i18nKey: "schedule.incomplete" },
  ], []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const loadDetail = async () => {
    const res = await fetchScheduleDetail(id);
    if (res?.code === 200 && res.data) {
      setSchedule(res.data);
    }
  };

  useEffect(() => { loadDetail(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!schedule) return;
    await fetchSubmitSchedule({ id: schedule.id, status: newStatus });
    loadDetail();
  };

  const handleToggleReminder = async () => {
    if (!schedule) return;
    await fetchSubmitSchedule({ id: schedule.id, reminderEnabled: !schedule.reminderEnabled });
    loadDetail();
  };

  const handleDelete = () => {
    deleteActionRef.current = async () => {
      const res = await fetchDeleteSchedule(id);
      if (res?.code !== 200) return;
      router.back();
    };
    setShowDeleteModal(true);
  };

  if (!schedule) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("nav.scheduleDetail"), headerShown: true }} />
        <View style={styles.loadingWrap}><Loader2 size={24} color={colors.primary} /><Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text></View>
      </View>
    );
  }

  const priConfig = PRIORITY_CONFIG[schedule.priority] || PRIORITY_CONFIG.medium;
  const daysLeft = daysUntil(schedule.endDate);

  const stStyle = STATUS_STYLE[schedule.status] || STATUS_STYLE.not_started;
  const daysText = daysLeft === null ? t("common.notSet") : daysLeft > 0 ? `${daysLeft} ${t("schedule.days")}` : daysLeft === 0 ? t("common.today") : t("common.expired");

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("nav.scheduleDetail"), headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 主信息卡片 */}
        <View style={styles.detailCard}>
          {/* 相关图片 */}
          {schedule.image ? (
            <Pressable onPress={() => setPreviewImage(schedule.image)}>
              <Image
                source={{ uri: schedule.image }}
                style={styles.detailImage}
                contentFit="contain"
              />
            </Pressable>
          ) : null}

          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.detailName}>{schedule.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: stStyle.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: stStyle.color }]}>
                    {stStyle.label}
                  </Text>
                </View>
              </View>
              <View style={styles.dateRow}>
                <CalendarDays size={14} color={colors.textSecondary} />
                <Text style={styles.dateText}>
                  {schedule.startDate || ""}{schedule.startDate && schedule.endDate ? " — " : ""}{schedule.endDate || ""}
                </Text>
              </View>
            </View>
            <View style={styles.detailCostWrap}>
              <Text style={[
                styles.detailCost,
                daysLeft != null && daysLeft < 0 && { color: colors.accent.red },
                daysLeft === 0 && { color: colors.accent.orange },
              ]}>
                {daysText}
              </Text>
              <Text style={styles.detailCostLabel}>{t("schedule.remainingTime")}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("schedule.priority")}</Text>
              <View style={styles.statValueRow}>
                <View style={[styles.priorityDot, { backgroundColor: priConfig.color }]} />
                <Text style={styles.statValue}>{priConfig.label.replace(t("schedule.prioritySuffix"), "")}</Text>
              </View>
            </View>
            <View style={styles.reminderToggleItem}>
              <View style={styles.reminderToggleLeft}>
                <Bell size={14} color={schedule.reminderEnabled ? colors.primary : colors.textTertiary} />
                <Text style={styles.statLabel}>{t("schedule.reminder")}</Text>
              </View>
              <Switch
                value={schedule.reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: colors.primaryBgMedium }}
                thumbColor={schedule.reminderEnabled ? colors.primary : colors.textInverse}
              />
            </View>
            <View style={styles.statItem} />
            {schedule.notes ? (
              <View style={styles.notesSection}>
                <Text style={styles.statLabel}>{t("schedule.notes")}</Text>
                <Text style={styles.notesText}>{schedule.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 状态切换 - 始终显示 */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>{t("schedule.quickActions")}</Text>
          <View style={styles.quickStatusRow}>
            {(() => {
              const STATUS_ICON_MAP = { not_started: Clock, todo: Clock, in_progress: Loader2, done: CheckCircle, incomplete: Circle };
              return SCHEDULE_STATUS_OPTIONS.filter(o => o.value !== schedule.status).map((opt) => {
                const st = STATUS_STYLE[opt.value] || STATUS_STYLE.not_started;
                const StatusIcon = STATUS_ICON_MAP[opt.value] || Circle;
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.quickStatusBtn,
                      { backgroundColor: st.bg, borderColor: hexToRgba(st.color, 0.3) },
                      pressed && styles.quickStatusBtnPressed,
                    ]}
                    onPress={() => handleStatusChange(opt.value)}
                  >
                    <StatusIcon size={16} color={st.color} />
                    <Text style={[styles.quickStatusText, { color: st.color }]}>
                      {t(opt.i18nKey)}
                    </Text>
                  </Pressable>
                );
              });
            })()}
          </View>
        </View>

      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
            onPress={handleDelete}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Trash2 size={18} color={colors.accent.red} />
              <Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => router.push(`/schedule/add?id=${id}`)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Pencil size={14} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{t("common.edit")}</Text>
            </View>
          </Pressable>
        </View>
      </View>
      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const action = deleteActionRef.current;
          deleteActionRef.current = null;
          if (action) await action();
          setShowDeleteModal(false);
        }}
        title={t("common.tip")}
        description={t("schedule.deleteConfirm")}
      />
      <ImagePreviewModal
        imageUri={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },

  // ── Detail Image ──
  detailImage: {
    width: "100%",
    height: 180,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.primaryBg,
  },

  // ── Detail Card ──
  detailCard: {
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  detailHeaderLeft: { flex: 1, minWidth: 0, gap: 8 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  detailName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { color: colors.textTertiary, fontSize: 13, fontWeight: "500", lineHeight: 20 },
  detailCostWrap: { alignItems: "flex-end" },
  detailCost: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },
  detailCostLabel: {
    color: colors.input.text,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 0,
  },
  statItem: { width: "50%", paddingVertical: spacing.sm, gap: 4 },
  statLabel: {
    color: colors.input.text,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 16,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  reminderToggleItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  reminderToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notesSection: {
    width: "100%",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 22,
  },

  // ── Section Title ──
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 16,
  },

  // ── Quick Status ──
  quickStatusRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  quickStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: 1.5,
  },
  quickStatusBtnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  quickStatusText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },

  // ── Bottom Bar ──
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceFrost,
  },
  bottomRow: { flexDirection: "row", gap: spacing.md },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: hexToRgba(colors.accent.red, 0.3),
    alignItems: "center",
  },
  deleteBtnText: { color: colors.accent.red, fontSize: 13, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
  },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  });
}