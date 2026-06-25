import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Bell, Check, Loader2, Save } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useTranslation } from "react-i18next";
import WheelPicker from "../../components/WheelPicker";
import ImageUploadField from "../../components/ImageUploadField";
import {
    fetchScheduleDetail,
    fetchSubmitSchedule,
} from "../../services/schedule";
import { useTheme, radius, spacing } from "../../utils/theme";

export default function AddEditScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isEditing = Boolean(id);
  const title = isEditing ? t("nav.editSchedule") : t("nav.addSchedule");

  const [planName, setPlanName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("high");
  const [status, setStatus] = useState("not_started");
  const [image, setImage] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nameError, setNameError] = useState(false);

  // 动态获取状态和优先级选项
  const SCHEDULE_STATUS_OPTIONS = useMemo(() => [
    { value: "not_started", i18nKey: "schedule.notStarted" },
    { value: "in_progress", i18nKey: "schedule.inProgress" },
    { value: "done", i18nKey: "schedule.done" },
    { value: "incomplete", i18nKey: "schedule.incomplete" },
  ], []);

  const SCHEDULE_PRIORITY_OPTIONS = useMemo(() => [
    { value: "high", i18nKey: "schedule.priorityHigh" },
    { value: "medium", i18nKey: "schedule.priorityMedium" },
    { value: "low", i18nKey: "schedule.priorityLow" },
  ], []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    if (!id) return;
    fetchScheduleDetail(id)
      .then((res) => {
        if (res?.code !== 200 || !res.data) return;
        const d = res.data;
        setPlanName(d.title || "");
        setStartDate(d.startDate || "");
        setEndDate(d.endDate || "");
        setPriority(d.priority || "high");
        setStatus(d.status || "not_started");
        setNotes(d.notes || "");
        setImage(d.image || "");
        setReminderEnabled(d.reminderEnabled !== false);
      })
      .catch((e) => console.error(t("schedule.loadFailed"), e));
  }, [id, t]);

  const handleSave = async () => {
    if (!planName.trim()) {
      setNameError(true);
      setTimeout(() => setNameError(false), 2000);
      return;
    }
    setSaving(true);
    setSaveError("");
    const res = await fetchSubmitSchedule({
      id,
      planName,
      startDate,
      endDate,
      priority,
      status,
      notes,
      reminderEnabled,
      image,
    });
    setSaving(false);
    if (res?.code !== 200) {
      setSaveError(res?.message || t("common.saveFailed"));
      setTimeout(() => setSaveError(""), 3000);
      return;
    }
    setSaved(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {t("schedule.planName")} <Text style={styles.fieldRequired}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, nameError && styles.textInputError]}
            placeholder={t("schedule.planNamePlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={planName}
            onChangeText={(t) => {
              setPlanName(t);
              setNameError(false);
            }}
          />
        </View>

        {/* Date Selectors — full width for datetime */}
        <View style={styles.fieldGroup}>
          <WheelPicker
            label={t("schedule.startDate")}
            value={startDate}
            onChange={setStartDate}
            level="minute"
          />
          <View style={{ height: spacing.lg }} />
          <WheelPicker
            label={t("schedule.endDate")}
            value={endDate}
            onChange={setEndDate}
            level="minute"
          />
        </View>

        {/* Status */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("schedule.status")}</Text>
          <View style={styles.statusRow}>
            {SCHEDULE_STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.statusChip,
                  status === opt.value && styles.statusChipActive,
                ]}
                onPress={() => setStatus(opt.value)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    status === opt.value && styles.statusChipTextActive,
                  ]}
                >
                  {t(opt.i18nKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Priority */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("schedule.priority")}</Text>
          <View style={styles.priorityRow}>
            {SCHEDULE_PRIORITY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.priorityChip,
                  priority === opt.value && styles.priorityChipActive,
                ]}
                onPress={() => setPriority(opt.value)}
              >
                <Text
                  style={[
                    styles.priorityChipText,
                    priority === opt.value && styles.priorityChipTextActive,
                  ]}
                >
                  {t(opt.i18nKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Image Upload */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("schedule.image")}</Text>
          <ImageUploadField
            value={image}
            onChange={setImage}
            placeholder={t("schedule.imagePlaceholder")}
            hint={t("schedule.imageHint")}
          />
        </View>

        {/* Reminder Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Bell size={18} color={colors.primary} />
            </View>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>{t("schedule.enableReminder")}</Text>
              <Text style={styles.toggleSubtitle}>{t("schedule.reminderSubtitle")}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primaryBgMedium }}
              thumbColor={reminderEnabled ? colors.primary : colors.textInverse}
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("schedule.notes")}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={t("schedule.notesPlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Save Error */}
      {saveError !== "" && (
        <View style={styles.errorBar}>
          <Text style={styles.errorBarText}>{saveError}</Text>
        </View>
      )}
      {/* Bottom Save */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            saved && styles.saveButtonSuccess,
            pressed && !saved && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saved ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saved")}</Text>
            </View>
          ) : saving ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Loader2 size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saving")}</Text>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saveRecord")}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.input.text,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 16,
    marginLeft: 4,
  },
  fieldRequired: {
    color: colors.accent.red,
  },
  textInput: {
    backgroundColor: colors.input.bg,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    fontWeight: "500",
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.input.border,
  },
  textInputError: {
    borderWidth: 2,
    borderColor: colors.accent.red,
  },
  textArea: {
    minHeight: 120,
  },
  twoCol: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderCurve: "continuous",
    alignItems: "center",
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  statusChipText: {
    color: colors.input.text,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  priorityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityChip: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderCurve: "continuous",
    alignItems: "center",
  },
  priorityChipActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  priorityChipText: {
    color: colors.input.text,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  priorityChipTextActive: {
    color: "#FFFFFF",
  },
  toggleCard: {
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  toggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderCurve: "continuous",
    backgroundColor: colors.primaryBgMedium,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleIcon: {
    fontSize: 18,
    color: colors.input.text,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  toggleSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  errorBar: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.accent.red + "18",
  },
  errorBarText: {
    color: colors.accent.red,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceFrost,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    width: "100%",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.glow,
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonSuccess: {
    backgroundColor: colors.primary,
    opacity: 0.8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  });
}