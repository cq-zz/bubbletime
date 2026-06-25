import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { Bell, Heart, Loader2, Pencil, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import ConfirmModal from "../../components/ConfirmModal";
import { fetchImportantDateDetail, fetchSubmitImportantDate, fetchDeleteImportantDate } from "../../services/importantDate";

export default function DetailScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deleteActionRef = useRef(null);

  const CATEGORY_CONFIG = useMemo(() => ({
    birthday: { label: t("importantDate.categoryBirthday"), bg: hexToRgba(colors.accent.red, 0.12), color: colors.accent.red },
    wedding: { label: t("importantDate.categoryWedding"), bg: hexToRgba(colors.accent.pink || "#E93D82", 0.12), color: colors.accent.pink || "#E93D82" },
    holiday: { label: t("importantDate.categoryHoliday"), bg: hexToRgba(colors.accent.orange || "#FF8A4C", 0.12), color: colors.accent.orange || "#FF8A4C" },
    work: { label: t("importantDate.categoryWork"), bg: hexToRgba(colors.primary, 0.12), color: colors.primary },
    other: { label: t("importantDate.categoryOther"), bg: hexToRgba(colors.textTertiary, 0.12), color: colors.textTertiary },
  }), [t, colors]);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const loadDetail = useCallback(() => {
    fetchImportantDateDetail(id).then((res) => {
      if (res?.code === 200 && res.data) setItem(res.data);
    });
  }, [id]);

  useFocusEffect(loadDetail);

  const handleToggleReminder = async () => {
    if (!item) return;
    await fetchSubmitImportantDate({ id: item.id, ...item, reminderEnabled: !item.reminderEnabled });
    loadDetail();
  };

  const handleDelete = () => {
    deleteActionRef.current = async () => {
      const res = await fetchDeleteImportantDate(id);
      if (res?.code !== 200) return;
      router.back();
    };
    setShowDeleteModal(true);
  };

  if (!item) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("nav.importantDateDetail"), headerShown: true }} /><View style={styles.loadingWrap}><Loader2 size={24} color={colors.primary} /><Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text></View>
      </View>
    );
  }

  const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;

  let daysText = "";
  let daysColor = colors.textSecondary;
  if (item.daysUntil != null) {
    if (item.daysUntil <= 0) { daysText = t("importantDate.today"); daysColor = colors.accent.orange || "#FF8A4C"; }
    else { daysText = t("importantDate.daysLeft", { count: item.daysUntil }); daysColor = colors.primary; }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("nav.importantDateDetail"), headerShown: true }} /><ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.detailImage} contentFit="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Heart size={40} color={colors.primaryBgMedium} />
            </View>
          )}
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <Text style={styles.detailName}>{item.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: catConfig.bg }]}>
                <Text style={[styles.categoryBadgeText, { color: catConfig.color }]}>{catConfig.label}</Text>
              </View>
            </View><View style={styles.detailCostWrap}>
              <Text style={[styles.detailCost, { color: daysColor }]}>{daysText}</Text>
              <Text style={styles.detailCostLabel}>{t("importantDate.countdown")}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("importantDate.date")}</Text>
              <Text style={styles.statValue}>{item.date || t("common.notSet")}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("importantDate.type")}</Text>
              <Text style={styles.statValue}>{item.type === "annual" ? t("importantDate.typeAnnual") : t("importantDate.typeOnce")}</Text>
            </View>
            <View style={styles.reminderToggleItem}>
              <View style={styles.reminderToggleLeft}>
                <Bell size={14} color={item.reminderEnabled ? colors.primary : colors.textTertiary} />
                <Text style={styles.statLabel}>{t("importantDate.reminder")}</Text>
              </View>
              <Switch
                value={item.reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: colors.primaryBgMedium }}
                thumbColor={item.reminderEnabled ? colors.primary : colors.textInverse}
              />
            </View>
            {item.notes ? (
              <View style={styles.notesSection}>
                <Text style={styles.statLabel}>{t("importantDate.notes")}</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}
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
              <Trash2 size={14} color={colors.accent.red} /><Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
            </View>
          </Pressable><Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => router.push(`/important-date/add?id=${id}`)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Pencil size={14} color="#FFFFFF" /><Text style={styles.saveBtnText}>{t("common.edit")}</Text>
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
        description={t("importantDate.deleteConfirm")}
      />
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.huge, gap: spacing.xl },
    detailImage: { width: "100%", height: 180, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.primaryBg },
    imagePlaceholder: { width: "100%", height: 180, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center" },
    detailCard: {
      backgroundColor: colors.surfaceFrost, borderRadius: radius.lg, borderCurve: "continuous",
      padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card,
    },
    detailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md },
    detailHeaderLeft: { flex: 1, minWidth: 0, gap: 8 },
    detailName: { color: colors.textPrimary, fontSize: 22, fontWeight: "700", lineHeight: 30 },
    categoryBadge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.full, alignSelf: "flex-start" },
    categoryBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
    detailCostWrap: { alignItems: "flex-end" },
    detailCost: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
    detailCostLabel: { color: colors.input.text, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    statItem: { width: "50%", paddingVertical: spacing.sm, gap: 4 },
    statLabel: { color: colors.input.text, fontSize: 11, fontWeight: "500", lineHeight: 16 },
    statValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", lineHeight: 20 },
    reminderToggleItem: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm },
    reminderToggleLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
    notesSection: { width: "100%", gap: spacing.sm, paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    notesText: { color: colors.textPrimary, fontSize: 14, fontWeight: "400", lineHeight: 22 },
    bottomBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceFrost },
    bottomRow: { flexDirection: "row", gap: spacing.md },
    deleteBtn: {
      flex: 1, paddingVertical: 10, borderRadius: radius.lg, borderCurve: "continuous",
      borderWidth: 1, borderColor: hexToRgba(colors.accent.red, 0.3), alignItems: "center",
    },
    deleteBtnText: { color: colors.accent.red, fontSize: 13, fontWeight: "700" },
    saveBtn: { flex: 2, paddingVertical: 10, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", ...shadows.lg },
    saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  });
}
