import { Image } from "expo-image";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { AlertTriangle, Package, Pencil, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ConfirmModal from "../../components/ConfirmModal";
import { fetchDeleteDurable, fetchDurableDetail } from "../../services/durable";
import { getCustomCategories, resolveCategoryIcon } from "../../services/category";
import { CATEGORY_ICON, DURABLE_STATUS_OPTIONS, getDurableStatusStyle } from "../../utils/constant";
import { getCurrency, hexToRgba, radius, spacing, useTheme } from "../../utils/theme";

function normalizeParam(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

export default function DurableDetailScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const itemId = normalizeParam(id);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customCats, setCustomCats] = useState([]);
  const deleteActionRef = useRef(null);

  useEffect(() => { getCustomCategories().then(setCustomCats); }, []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const loadDetail = useCallback(() => {
    if (!itemId) {
      setDetail(null);
      setError(t("durable.invalidId"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    fetchDurableDetail(itemId)
      .then((res) => {
        if (res?.code === 200 && res.data) {
          setDetail(res.data);
          return;
        }

        setDetail(null);
        setError(res?.message || t("durable.itemNotFound"));
      })
      .catch((e) => {
        setDetail(null);
        setError(e?.message || t("durable.loadFailed"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [itemId, t]);

  useFocusEffect(loadDetail);

  const handleDelete = () => {
    deleteActionRef.current = async () => {
      const res = await fetchDeleteDurable(itemId);
      if (res?.code === 200) {
        router.replace(`/durable?refresh=${Date.now()}`);
        return;
      }
      setError(res?.message || t("common.deleteFailed"));
    };
    setShowDeleteModal(true);
  };

  if (loading || !detail) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{ title: t("nav.durableDetail"), headerShown: true }}
        /><View style={styles.stateWrap}>
          <Text style={styles.stateTitle}>
            {loading
              ? t("durable.loadingDetail")
              : error || t("durable.itemNotFound")}
          </Text>{/* */}
          {!loading ? (
            <Pressable
              style={({ pressed }) => [
                styles.stateButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.replace(`/durable?refresh=${Date.now()}`)}
            >
              <Text style={styles.stateButtonText}>
                {t("common.backToList")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t("nav.durableDetail"), headerShown: true }}
      /><ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroWrap, !detail.image && styles.heroWrapEmpty]}>
          {detail.image ? (
            <Image source={detail.image} style={styles.heroImage} contentFit="contain" />
          ) : (
            <View style={styles.heroIconWrap}>
              {(() => {
                const builtinIcon = CATEGORY_ICON[detail.category];
                const CatIcon = builtinIcon || (() => {
                  const cc = customCats.find((c) => c.key === detail.category);
                  return cc ? resolveCategoryIcon(detail.category, cc.icon) : Package;
                })();
                return <CatIcon size={48} color={colors.primary} />;
              })()}
            </View>
          )}<View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {detail.category ? (() => {
                const isB = ["food","clothing","transport","medical","home","appliance","digital","entertainment","daily","education","other"].includes(detail.category);
                if (isB) return t("categories." + detail.category);
                const cc = customCats.find((c) => c.key === detail.category);
                return cc?.name || detail.category;
              })() : ""}
            </Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <View style={styles.nameRow}>
                <Text style={styles.detailName}>{detail.name}</Text>{/* */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getDurableStatusStyle(detail.status).bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getDurableStatusStyle(detail.status).text },
                    ]}
                  >
                    {(() => {
                      const opt = DURABLE_STATUS_OPTIONS.find(
                        (o) => o.value === detail.status,
                      );
                      return opt ? t(opt.i18nKey) : detail.status;
                    })()}
                  </Text>
                </View>{/* */}
              </View>
            </View><View style={styles.detailCostWrap}>
              <Text style={styles.detailCost}>{detail.totalCost}</Text>
              <Text style={styles.detailCostLabel}>
                {t("durable.totalCost")}
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.category")}</Text>
              <Text style={styles.statValue}>
                {detail.itemType
                  ? t("categories." + detail.itemType)
                  : t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.purchaseDate")}</Text>
              <Text style={styles.statValue}>
                {detail.purchaseDate || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.purchasePrice")}</Text>
              <Text style={styles.statValue}>
                {detail.initialPrice || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.usedDuration")}</Text>
              <Text style={styles.statValue}>
                {detail.usedDuration || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.dailyAvgValue")}</Text>
              <Text style={[styles.statValue, styles.statValuePrimary]}>
                {detail.dailyAvg || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {t("durable.expectedLifespan")}
              </Text>
              <Text style={styles.statValue}>
                {detail.expectedLifespan || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>
                {t("durable.expectedDailyAvg")}
              </Text>
              <Text style={[styles.statValue, styles.statValuePrimary]}>
                {detail.expectedDailyAvg || t("common.notSet")}
              </Text>
            </View><View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("durable.expiryDate")}</Text>
              <Text style={styles.statValue}>
                {detail.expiryDate || t("common.notSet")}
              </Text>
            </View>{/* */}
            {detail.notes ? (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>{t("bills.notes")}</Text>
                <Text style={styles.notesText}>{detail.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {detail.otherExpenses && detail.otherExpenses.length > 0 ? (
          <View style={styles.detailCard}>
            <View style={styles.expensesTable}>
              <Text style={styles.expensesSectionTitle}>
                {t("durable.otherExpenses")}
              </Text>
              {detail.otherExpenses.map((expense, idx) => {
                const ExpCatIcon = CATEGORY_ICON[expense.category];
                return (
                  <View key={idx} style={styles.expenseItemBlock}>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.index")}: </Text>
                      <Text style={styles.expenseFieldValue}>{idx + 1}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.itemName")}: </Text>
                      <Text style={styles.expenseFieldValue}>{expense.name}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.category")}: </Text>
                      {ExpCatIcon ? <ExpCatIcon size={11} color={colors.accent.red} /> : null}
                      <Text style={styles.expenseFieldValue}> {expense.category ? t("categories." + expense.category) : t("categories.other")}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.date")}: </Text>
                      <Text style={styles.expenseFieldValue}>{expense.date || t("common.notSet")}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.amount")}: </Text>
                      <Text style={styles.expenseFieldValue}>{getCurrency().icon}{Number(expense.cost || 0).toFixed(2)}</Text>
                    </Text>
                  </View>
                );
              })}{/* */}
              <View
                style={[styles.expensesTableRow, styles.expensesTableTotal]}
              >
                <Text style={styles.expensesTableName}>
                  {t("durable.subtotal")}
                </Text><Text style={styles.expensesTableCost}>
                  {getCurrency().icon}{Number(detail.otherExpensesTotal || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {detail.otherIncomes && detail.otherIncomes.length > 0 ? (
          <View style={styles.detailCard}>
            <View style={styles.expensesTable}>
              <Text style={styles.expensesSectionTitle}>
                {t("durable.otherIncomes")}
              </Text>
              {detail.otherIncomes.map((income, idx) => {
                const IncCatIcon = CATEGORY_ICON[income.category];
                return (
                  <View key={idx} style={styles.expenseItemBlock}>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.index")}: </Text>
                      <Text style={styles.expenseFieldValue}>{idx + 1}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.itemName")}: </Text>
                      <Text style={styles.expenseFieldValue}>{income.name}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.category")}: </Text>
                      {IncCatIcon ? <IncCatIcon size={11} color={colors.accent.green} /> : null}
                      <Text style={styles.expenseFieldValue}> {income.category ? t("categories." + income.category) : t("categories.other")}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.date")}: </Text>
                      <Text style={styles.expenseFieldValue}>{income.date || t("common.notSet")}</Text>
                    </Text>
                    <Text style={styles.expenseField}>
                      <Text style={styles.expenseFieldLabel}>{t("durable.amount")}: </Text>
                      <Text style={styles.expenseFieldValue}>{getCurrency().icon}{Number(income.cost || 0).toFixed(2)}</Text>
                    </Text>
                  </View>
                );
              })}{/* */}
              <View
                style={[styles.expensesTableRow, styles.expensesTableTotal]}
              >
                <Text style={styles.expensesTableName}>
                  {t("durable.subtotal")}
                </Text><Text style={styles.expensesTableCost}>
                  {getCurrency().icon}{Number(detail.otherIncomesTotal || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleDelete}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Trash2 size={14} color={colors.accent.red} /><Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
            </View>
          </Pressable><Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
            ]}
            onPress={() =>
              router.push(`/durable/add?id=${encodeURIComponent(itemId)}`)
            }
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
        description={t("durable.deleteConfirm")}
      />
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    stateWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    stateTitle: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 22,
      textAlign: "center",
    },
    stateButton: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
    },
    stateButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 20,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.huge,
      gap: spacing.xl,
    },
    heroWrap: {
      aspectRatio: 1,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      overflow: "hidden",
      backgroundColor: colors.border,
      ...shadows.card,
    },
    heroWrapEmpty: {
      backgroundColor: hexToRgba(colors.primary, 0.06),
      alignItems: "center",
      justifyContent: "center",
    },
    heroIconWrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    heroImage: { width: "100%", height: "100%" },
    categoryBadge: {
      position: "absolute",
      bottom: spacing.lg,
      left: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
    },
    categoryBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
    },
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
    expiredBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.accent.red,
    },
    expiredBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 16,
    },
    statValueExpired: {
      color: colors.accent.red,
    },
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
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
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
    statValuePrimary: { color: colors.primary },
    notesSection: {
      width: "100%",
      gap: spacing.sm,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notesLabel: {
      color: colors.input.text,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
    },
    notesText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "400",
      lineHeight: 22,
    },
    expensesSectionTitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
    },
    expensesTable: {
      gap: spacing.xs,
    },
    expenseItemBlock: {
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 3,
    },
    expenseField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    expenseFieldLabel: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 18,
    },
    expenseFieldValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 18,
    },
    expensesTableRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    expensesTableTotal: {
      borderBottomWidth: 0,
    },
    expensesTableName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 20,
    },
    expensesTableCost: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    wisdomCard: {
      backgroundColor: colors.primaryBg,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: spacing.xl,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: colors.primaryBgMedium,
      ...shadows.md,
    },
    wisdomHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    wisdomTitle: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "700",
      lineHeight: 24,
    },
    wisdomBody: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
    wisdomValueWrap: { flex: 1, gap: 4 },
    wisdomValueLabel: {
      color: colors.input.text,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    wisdomValue: {
      color: colors.primary,
      fontSize: 36,
      fontWeight: "700",
      lineHeight: 44,
    },
    wisdomBadgeWrap: { alignItems: "center", gap: 4 },
    wisdomBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    wisdomBadgeText: { fontSize: 13, fontWeight: "700" },
    wisdomBadgeSub: { color: colors.input.text, fontSize: 10, lineHeight: 14 },
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
    deleteBtnText: {
      color: colors.accent.red,
      fontSize: 13,
      fontWeight: "700",
    },
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
