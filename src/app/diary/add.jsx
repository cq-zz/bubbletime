import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Loader2, Save } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useTranslation } from "react-i18next";
import WheelPicker from "../../components/WheelPicker";
import ImageUploadField from "../../components/ImageUploadField";
import { fetchDiaryDetail, fetchSubmitDiary } from "../../services/diary";
import { useTheme, radius, spacing } from "../../utils/theme";
import { WEATHER_OPTIONS } from "../../utils/constant";

const WEATHER_EMOJI = {};
WEATHER_OPTIONS.forEach((w) => { WEATHER_EMOJI[w.value] = w.emoji; });

export default function AddEditScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isEditing = Boolean(id);
  const title = isEditing ? t("nav.editDiary") : t("nav.addDiary");

  const [titleText, setTitleText] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [contentError, setContentError] = useState(false);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    if (!id) return;
    fetchDiaryDetail(id).then((res) => {
      if (res?.code !== 200 || !res.data) return;
      const d = res.data;
      setTitleText(d.title || "");
      setContent(d.content || "");
      setDate(d.date || new Date().toISOString().slice(0, 10));
      setWeather(d.weather || "");
      setImage(d.image || "");
    }).catch(() => {});
  }, [id]);

  const handleSave = async () => {
    let hasError = false;
    if (!titleText.trim()) { setTitleError(true); setTimeout(() => setTitleError(false), 2000); hasError = true; }
    if (!date) { setDateError(true); setTimeout(() => setDateError(false), 2000); hasError = true; }
    if (!content.trim()) { setContentError(true); setTimeout(() => setContentError(false), 2000); hasError = true; }
    if (hasError) return;
    setSaving(true);
    setSaveError("");
    const res = await fetchSubmitDiary({ id, title: titleText, content, date, weather, image });
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
          <Text style={styles.fieldLabel}>{t("diary.title")} <Text style={styles.fieldRequired}>*</Text></Text>
          <TextInput
            style={[styles.textInput, titleError && styles.textInputError]}
            placeholder={t("diary.titlePlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={titleText}
            onChangeText={(t) => { setTitleText(t.slice(0, 20)); setTitleError(false); }}
            maxLength={20}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("diary.date")} <Text style={styles.fieldRequired}>*</Text></Text>
          <View style={dateError && styles.wheelPickerError}>
            <WheelPicker
              value={date}
              onChange={(d) => { setDate(d); setDateError(false); }}
              level="date"
              maxDate={new Date()}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("diary.weather")}</Text>
          <View style={styles.chipRow}>
            {WEATHER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, weather === opt.value && styles.chipActive]}
                onPress={() => setWeather(weather === opt.value ? "" : opt.value)}
              >
                <Text style={[styles.chipText, weather === opt.value && styles.chipTextActive]}>
                  {WEATHER_EMOJI[opt.value]} {t(`diary.weather${opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("diary.content")} <Text style={styles.fieldRequired}>*</Text></Text>
          <TextInput
            style={[styles.textInput, styles.textArea, contentError && styles.textInputError]}
            placeholder={t("diary.contentPlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("diary.attachment")}</Text>
          <ImageUploadField
            value={image}
            onChange={setImage}
            placeholder={t("diary.attachmentPlaceholder")}
            hint={t("diary.attachmentHint")}
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
    textInput: {
      backgroundColor: colors.input.bg, borderRadius: radius.md, borderCurve: "continuous",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md, fontSize: 14,
      fontWeight: "500", color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    },
    textInputError: { borderWidth: 2, borderColor: colors.accent.red },
    wheelPickerError: {
      borderRadius: radius.md, overflow: "hidden",
      borderWidth: 2, borderColor: colors.accent.red,
    },
    textArea: { minHeight: 200 },
    chipRow: {
      flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.surfaceFrost,
      borderRadius: radius.lg, borderCurve: "continuous", padding: 4, gap: 4, borderWidth: 1, borderColor: colors.border,
    },
    chip: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: "continuous", alignItems: "center" },
    chipActive: { backgroundColor: colors.primary, ...shadows.sm },
    chipText: { color: colors.input.text, fontSize: 13, fontWeight: "600", letterSpacing: 0.5, lineHeight: 18 },
    chipTextActive: { color: "#FFFFFF" },
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
