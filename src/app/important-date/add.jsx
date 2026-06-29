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
    fetchImportantDateDetail,
    fetchSubmitImportantDate,
} from "../../services/importantDate";
import { useTheme, radius, spacing } from "../../utils/theme";

export default function AddEditScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isEditing = Boolean(id);
  const title = isEditing ? t("nav.editImportantDate") : t("nav.addImportantDate");

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("annual");
  const [category, setCategory] = useState("other");
  const [image, setImage] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [nameError, setNameError] = useState(false);
  const [dateError, setDateError] = useState(false);

  const TYPE_OPTIONS = useMemo(() => [
    { value: "annual", i18nKey: "importantDate.typeAnnual" },
    { value: "once", i18nKey: "importantDate.typeOnce" },
  ], []);

  const CATEGORY_OPTIONS = useMemo(() => [
    { value: "birthday", i18nKey: "importantDate.categoryBirthday" },
    { value: "wedding", i18nKey: "importantDate.categoryWedding" },
    { value: "holiday", i18nKey: "importantDate.categoryHoliday" },
    { value: "work", i18nKey: "importantDate.categoryWork" },
    { value: "other", i18nKey: "importantDate.categoryOther" },
  ], []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    if (!id) return;
    fetchImportantDateDetail(id).then((res) => {
      if (res?.code !== 200 || !res.data) return;
      const d = res.data;
      setName(d.name || "");
      setDate(d.date || "");
      setType(d.type || "annual");
      setCategory(d.category || "other");
      setImage(d.image || "");
      setReminderEnabled(d.reminderEnabled || false);
      setReminderDaysBefore(String(d.reminderDaysBefore ?? 1));
      setNotes(d.notes || "");
    }).catch(() => {});
  }, [id]);

  const handleSave = async () => {
    if (!name.trim()) { setNameError(true); setTimeout(() => setNameError(false), 2000); return; }
    if (!date.trim()) { setDateError(true); setTimeout(() => setDateError(false), 2000); return; }
    setSaving(true);
    setSaveError("");
    const res = await fetchSubmitImportantDate({
      id, name, date, type, category, image, reminderEnabled,
      reminderDaysBefore: parseInt(reminderDaysBefore, 10) || 1, notes,
    });
    setSaving(false);
    if (res?.code !== 200) { setSaveError(res?.message || t("common.saveFailed")); setTimeout(() => setSaveError(""), 3000); return; }
    setSaved(true);
    setTimeout(() => router.back(), 800);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.name")} <Text style={styles.fieldRequired}>*</Text></Text>
          <TextInput
            style={[styles.textInput, nameError && styles.textInputError]}
            placeholder={t("importantDate.namePlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={name}
            onChangeText={(t) => { setName(t); setNameError(false); }}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.date")} <Text style={styles.fieldRequired}>*</Text></Text>
          <WheelPicker
            value={date}
            onChange={(v) => { setDate(v); setDateError(false); }}
            level="date"
          />
          {dateError ? (
            <Text style={styles.fieldError}>{t("importantDate.dateRequired")}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.type")}</Text>
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, type === opt.value && styles.chipActive]}
                onPress={() => setType(opt.value)}
              >
                <Text style={[styles.chipText, type === opt.value && styles.chipTextActive]}>{t(opt.i18nKey)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.category")}</Text>
          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, category === opt.value && styles.chipActive]}
                onPress={() => setCategory(opt.value)}
              >
                <Text style={[styles.chipText, category === opt.value && styles.chipTextActive]}>{t(opt.i18nKey)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.attachment")}</Text>
          <ImageUploadField
            value={image}
            onChange={setImage}
            placeholder={t("importantDate.attachmentPlaceholder")}
            hint={t("importantDate.attachmentHint")}
          />
        </View>

        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Bell size={18} color={colors.primary} />
            </View>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>{t("importantDate.enableReminder")}</Text>
              <Text style={styles.toggleSubtitle}>{t("importantDate.reminderSubtitle")}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.border, true: colors.primaryBgMedium }}
              thumbColor={reminderEnabled ? colors.primary : colors.textInverse}
            />
          </View>
          {reminderEnabled && (
            <View style={styles.reminderDaysRow}>
              <Text style={styles.reminderDaysLabel}>{t("importantDate.reminderDaysBefore")}</Text>
              <TextInput
                style={styles.reminderDaysInput}
                value={reminderDaysBefore}
                onChangeText={setReminderDaysBefore}
                keyboardType="number-pad"
                placeholderTextColor={colors.input.placeholder}
              />
            </View>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("importantDate.notes")}</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder={t("importantDate.notesPlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {saveError !== "" && (
        <View style={styles.errorBar}><Text style={styles.errorBarText}>{saveError}</Text></View>
      )}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.saveButton, saved && styles.saveButtonSuccess, pressed && !saved && styles.saveButtonPressed]}
          onPress={handleSave}
          disabled={saving || saved}
        >
          {saved ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saved")}</Text>
            </View>
          ) : saving ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Loader2 size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saving")}</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
    fieldGroup: { gap: spacing.sm },
    fieldLabel: { color: colors.input.text, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, lineHeight: 16, marginLeft: 4 },
    fieldRequired: { color: colors.accent.red },
    fieldError: { color: colors.accent.red, fontSize: 12, fontWeight: "500", lineHeight: 16, marginLeft: 4 },
    textInput: {
      backgroundColor: colors.input.bg, borderRadius: radius.md, borderCurve: "continuous",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 14,
      fontWeight: "500", color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    },
    textInputError: { borderWidth: 2, borderColor: colors.accent.red },
    textArea: { minHeight: 120 },
    chipRow: {
      flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.surfaceFrost,
      borderRadius: radius.lg, borderCurve: "continuous", padding: 4, gap: 4, borderWidth: 1, borderColor: colors.border,
    },
    chip: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: "continuous", alignItems: "center" },
    chipActive: { backgroundColor: colors.primary, ...shadows.sm },
    chipText: { color: colors.input.text, fontSize: 13, fontWeight: "600", letterSpacing: 0.5, lineHeight: 18 },
    chipTextActive: { color: "#FFFFFF" },
    toggleCard: {
      backgroundColor: colors.surfaceFrost, borderRadius: radius.lg, borderCurve: "continuous",
      padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card, gap: spacing.md,
    },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    toggleIconWrap: {
      width: 40, height: 40, borderRadius: radius.md, borderCurve: "continuous",
      backgroundColor: colors.primaryBgMedium, alignItems: "center", justifyContent: "center",
    },
    toggleInfo: { flex: 1, gap: 2 },
    toggleTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600", lineHeight: 22 },
    toggleSubtitle: { color: colors.textTertiary, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, lineHeight: 16 },
    reminderDaysRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: 52 },
    reminderDaysLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "500", lineHeight: 20 },
    reminderDaysInput: {
      backgroundColor: colors.input.bg, borderRadius: radius.md, borderCurve: "continuous",
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, fontWeight: "500",
      color: colors.textPrimary, borderWidth: 1, borderColor: colors.border, width: 60, textAlign: "center",
    },
    errorBar: {
      marginHorizontal: spacing.xl, marginBottom: spacing.md, paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.accent.red + "18",
    },
    errorBarText: { color: colors.accent.red, fontSize: 13, fontWeight: "600", textAlign: "center" },
    bottomBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: colors.surfaceFrost, borderTopWidth: 1, borderTopColor: colors.border },
    saveButton: {
      width: "100%", paddingVertical: spacing.lg, borderRadius: radius.lg, borderCurve: "continuous",
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadows.glow,
    },
    saveButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    saveButtonSuccess: { backgroundColor: colors.primary, opacity: 0.8 },
    saveButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", lineHeight: 24 },
  });
}
