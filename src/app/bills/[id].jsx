import { Image } from "expo-image";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { ArrowDownRight, ArrowUpRight, FileText, Pencil, Tag, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ConfirmModal from "../../components/ConfirmModal";
import { fetchBillDetail, fetchDeleteBill } from "../../services/bills";
import { getCustomCategories, resolveCategoryIcon } from "../../services/category";
import { CATEGORY_ICON } from "../../utils/constant";
import { getCurrency, hexToRgba, radius, spacing, useTheme } from "../../utils/theme";

function normalizeParam(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

export default function BillsDetailScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const billId = normalizeParam(id);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [customCats, setCustomCats] = useState([]);
  const deleteActionRef = useRef(null);
  
  useEffect(() => { getCustomCategories().then(setCustomCats); }, []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const loadBillDetail = useCallback(() => {
    if (!billId) {
      setDetail(null);
      setError(t("bills.billNotFound"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetchBillDetail(billId)
      .then((res) => {
        if (res?.code === 200 && res.data) {
          setDetail(res.data);
        } else {
          setDetail(null);
          setError(res?.message || t("bills.billNotFound"));
        }
      })
      .catch((e) => {
        setDetail(null);
        setError(e?.message || t("bills.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [billId, t]);

  useFocusEffect(loadBillDetail);

  const handleDelete = () => {
    deleteActionRef.current = async () => {
      const res = await fetchDeleteBill(billId);
      if (res?.code === 200) router.back();
    };
    setShowDeleteModal(true);
  };

  if (loading || !detail) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{ title: t("nav.billsDetail"), headerShown: true }}
        /><View style={styles.stateWrap}>
          <Text style={styles.stateTitle}>
            {loading ? t("common.loading") : error || t("bills.billNotFound")}
          </Text>{/* */}
          {!loading ? (
            <Pressable
              style={({ pressed }) => [
                styles.stateButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.back()}
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

  const billTypeLabel =
    detail.billType === "income" ? t("bills.income") : t("bills.expense");
  const billTypeColor =
    detail.billType === "income" ? colors.accent.green : colors.accent.red;
  const catFromBuiltin = CATEGORY_ICON[detail.category];
  const CatIcon = catFromBuiltin || (() => {
    const cc = customCats.find((c) => c.key === detail.category);
    return cc ? resolveCategoryIcon(detail.category, cc.icon) : Tag;
  })();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t("nav.billsDetail"), headerShown: true }}
      /><ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          {detail.receiptImage && !imageError ? (
            <Image
              source={{ uri: detail.receiptImage }}
              style={styles.heroImage}
              contentFit="contain"
              onError={() => setImageError(true)}
            />
          ) : detail.durableImage && !imageError ? (
            <Image
              source={{ uri: detail.durableImage }}
              style={styles.heroImage}
              contentFit="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={[styles.heroFallback, { backgroundColor: colors.primaryBg }]}>
              <CatIcon size={48} color={colors.textTertiary} />
              {imageError ? (
                <Text style={styles.heroBrokenText}>{t("common.imageBroken")}</Text>
              ) : null}
            </View>
          )}<View style={styles.categoryBadge}>
            <CatIcon size={14} color="#FFFFFF" /><Text style={styles.categoryBadgeText}>
              {t(`categories.${detail.category}`)}
            </Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderLeft}>
              <Text style={styles.detailName}>{detail.name}</Text>
            </View><View style={styles.amountWrap}>
              <Text style={[styles.amount, { color: billTypeColor }]}>
                {getCurrency().icon}{detail.amount?.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("bills.billType")}</Text>
              <View style={styles.statValueRow}>
                {detail.billType === "income" ? (
                  <ArrowUpRight size={13} color={colors.accent.green} />
                ) : (
                  <ArrowDownRight size={13} color={colors.accent.red} />
                )}
                <Text style={[styles.statValue, { color: billTypeColor }]}>
                  {billTypeLabel}
                </Text>
              </View>
            </View><View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("bills.time")}</Text>
              <Text style={styles.statValue}>
                {detail.consumptionDate || t("common.notSet")}
              </Text>
            </View><View style={styles.statRow}>
              <Text style={styles.statLabel}>{t("bills.category")}</Text>
              <View style={styles.statValueRow}>
                {CatIcon ? <CatIcon size={13} color={billTypeColor} /> : null}
                <Text style={[styles.statValue, { color: billTypeColor }]}>
                  {t(`categories.${detail.category}`)}
                </Text>
              </View>
            </View>
          </View>

          {detail.notes || detail.source === "durable" || detail.source === "schedule" || detail.scheduleSourceId ? (
            <View style={styles.notesSection}>
              {detail.notes ? (
                <>
                  <View style={styles.notesHeader}>
                    <FileText size={14} color={colors.textTertiary} /><Text style={styles.notesLabel}>{t("bills.notes")}</Text>
                  </View>
                  <Text style={styles.notesText}>
                    {detail.notes || t("bills.noNotes")}
                  </Text>
                </>
              ) : null}
              {(detail.source === "durable" || detail.source === "schedule" || detail.scheduleSourceId) ? (
                <View style={styles.sourceLinkRow}>
                  <Pressable
                    style={styles.sourceLink}
                    onPress={() => {
                      if (detail.source === "durable" && detail.sourceId) {
                        router.push(`/durable/${encodeURIComponent(detail.sourceId)}`);
                      } else if (detail.source === "schedule" && detail.sourceId) {
                        router.push(`/bills/${encodeURIComponent(detail.sourceId)}`);
                      } else if (detail.scheduleSourceId) {
                        router.push(`/bills/${encodeURIComponent(detail.scheduleSourceId)}`);
                      }
                    }}
                  >
                    <Text style={styles.sourceLinkText}>
                      「{t("common.viewSource")}」
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>


      </ScrollView>

      <View style={styles.bottomBar}>
        {detail.source === "durable" && (
          <Text style={styles.durableHint}>{t("common.fromDurableHint")}</Text>
        )}
        {(detail.source === "schedule" || detail.scheduleSourceId) && detail.source !== "durable" && (
          <Text style={styles.durableHint}>{t("common.fromScheduleHint")}</Text>
        )}
        <View style={styles.bottomRow}>
          {detail.source !== "durable" && (
            <>
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
                  router.push(`/bills/add?id=${encodeURIComponent(billId)}`)
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Pencil size={14} color="#FFFFFF" /><Text style={styles.saveBtnText}>{t("common.edit")}</Text>
                </View>
              </Pressable>
            </>
          )}
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
        description={t("bills.deleteConfirm")}
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
    heroImage: { width: "100%", height: "100%" },
    heroFallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    heroBrokenText: {
      color: colors.textTertiary,
      fontSize: 11,
      marginTop: 4,
    },
    categoryBadge: {
      position: "absolute",
      bottom: spacing.lg,
      left: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
    detailHeaderLeft: { flex: 1, minWidth: 0 },
    detailName: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 30,
    },
    amountWrap: { alignItems: "flex-end" },
    amount: {
      fontSize: 24,
      fontWeight: "700",
      lineHeight: 32,
    },
    statsSection: {
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    statLabel: {
      color: colors.textTertiary,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 20,
    },
    statValue: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    statValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    notesSection: {
      width: "100%",
      gap: spacing.sm,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
    },
    notesHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
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
    bottomBar: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surfaceFrost,
    },
    bottomRow: { flexDirection: "row", gap: spacing.md },
    sourceLinkRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: spacing.sm,
    },
    sourceLink: {
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: hexToRgba(colors.primary, 0.1),
    },
    sourceLinkText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    durableHint: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: spacing.sm,
    },
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
