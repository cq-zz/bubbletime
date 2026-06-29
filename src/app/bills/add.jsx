import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    Check,
    Loader2,
    Save,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";

import { useTranslation } from "react-i18next";
import ImageUploadField from "../../components/ImageUploadField";
import WheelPicker from "../../components/WheelPicker";
import { fetchBillDetail, fetchSubmitBill } from "../../services/bills";
import { getCustomCategories, getEnabledCategoryKeys, resolveCategoryIcon } from "../../services/category";
import { CATEGORY_ICON, ITEM_CATEGORIES } from "../../utils/constant";
import {
    getCurrency,
    hexToRgba,
    radius,
    spacing,
    useTheme,
} from "../../utils/theme";

export default function AddEditScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isEditing = Boolean(id);
  const title = isEditing ? t("nav.editBill") : t("nav.addBill");

  const [amount, setAmount] = useState("");

  const handleAmountChange = (text) => {
    // 只允许数字和一个小数点
    let cleaned = text.replace(/[^\d.]/g, "");
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex !== -1) {
      // 只保留第一个小数点，限制小数位数为 2
      cleaned =
        cleaned.slice(0, dotIndex + 1) +
        cleaned
          .slice(dotIndex + 1)
          .replace(/\./g, "")
          .slice(0, 2);
    }
    setAmount(cleaned);
  };
  const [name, setName] = useState("");
  const [consumptionDate, setConsumptionDate] = useState("");
  const [category, setCategory] = useState("food");
  const [receiptImage, setReceiptImage] = useState("");
  const [notes, setNotes] = useState("");
  const [nameError, setNameError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [source, setSource] = useState("");
  const [billType, setBillType] = useState("expense");

  const [enabledCats, setEnabledCats] = useState(ITEM_CATEGORIES);
  const [customCats, setCustomCats] = useState([]);

  useEffect(() => {
    getEnabledCategoryKeys().then(setEnabledCats);
    getCustomCategories().then(setCustomCats);
  }, []);

  const isSourced = source === "durable";
  const isScheduleSourced = source === "schedule";

  const { width: screenWidth } = useWindowDimensions();
  const gridPadding = spacing.xl * 2 + spacing.xl * 2 + 2;
  const gridWidth = screenWidth - gridPadding;
  const numCols = Math.max(4, Math.floor(gridWidth / 76));
  const categoryItemWidth = (gridWidth - (numCols - 1) * spacing.sm) / numCols;

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    if (!id) return;
    fetchBillDetail(id)
      .then((res) => {
        if (res?.code !== 200 || !res.data) return;
        const d = res.data;
        setAmount(d.amount ? String(d.amount) : "");
        setName(d.name || "");
        setConsumptionDate(d.consumptionDate || "");
        setCategory(d.category || "food");
        setNotes(d.notes || "");
        setSource(d.source || "");
        setBillType(d.billType || "expense");
        setReceiptImage(d.receiptImage || "");
      })
      .catch((e) => console.error(t("bills.loadFailed"), e));
  }, [id, t]);

  const handleSave = async () => {
    const nameEmpty = !name.trim();
    const amountEmpty = !amount.trim() || parseFloat(amount) <= 0;
    setNameError(nameEmpty);
    setAmountError(amountEmpty);
    if (nameEmpty || amountEmpty) {
      if (nameEmpty) setTimeout(() => setNameError(false), 2000);
      if (amountEmpty) setTimeout(() => setAmountError(false), 2000);
      return;
    }

    setSaving(true);
    setSaveError("");
    const res = await fetchSubmitBill({
      id,
      amount,
      name,
      consumptionDate,
      category,
      notes,
      billType,
      receiptImage,
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
        {isSourced ? (
          <View style={styles.sourcedBanner}>
            <Text style={styles.sourcedBannerText}>
              {t("common.fromDurable")}
            </Text>
          </View>
        ) : isScheduleSourced ? (
          <View style={styles.sourcedBanner}>
            <Text style={styles.sourcedBannerText}>
              {t("common.fromSchedule")}
            </Text>
          </View>
        ) : null}
        {/* Bill Type Selector */}
        <View style={styles.typeSection}>
          <Text style={styles.typeLabel}>{t("bills.billType")}</Text>
          <View style={styles.typeRow}>
            <Pressable
              style={[
                styles.typeBtn,
                billType === "expense" && styles.typeBtnExpenseActive,
              ]}
              onPress={() => !isSourced && setBillType("expense")}
            >
              <ArrowDownCircle
                size={18}
                color={
                  billType === "expense"
                    ? colors.accent.red
                    : colors.textTertiary
                }
              />
              <Text
                style={[
                  styles.typeBtnText,
                  billType === "expense" && styles.typeBtnTextExpenseActive,
                ]}
              >
                {t("bills.expense")}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeBtn,
                billType === "income" && styles.typeBtnIncomeActive,
              ]}
              onPress={() => !isSourced && setBillType("income")}
            >
              <ArrowUpCircle
                size={18}
                color={
                  billType === "income"
                    ? colors.accent.green
                    : colors.textTertiary
                }
              />
              <Text
                style={[
                  styles.typeBtnText,
                  billType === "income" && styles.typeBtnTextIncomeActive,
                ]}
              >
                {t("bills.income")}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>
            {t("bills.amountLabel", {
              type:
                billType === "income" ? t("bills.income") : t("bills.expense"),
            })}{" "}
            <Text style={styles.fieldRequired}>*</Text>
          </Text>
          <View style={styles.amountRow}>
            <Text
              style={[
                styles.amountCurrency,
                billType === "income" && styles.amountCurrencyIncome,
              ]}
            >
              {getCurrency().icon}
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                billType === "income" && styles.amountInputIncome,
                isSourced && styles.inputDisabled,
                amountError && styles.textInputError,
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.input.placeholder}
              value={amount}
              onChangeText={(t) => {
                handleAmountChange(t);
                setAmountError(false);
              }}
              keyboardType="decimal-pad"
              editable={!isSourced}
            />
          </View>
        </View>

        {/* Name + Date */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t("bills.name")} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                isSourced && styles.inputDisabled,
                nameError && styles.textInputError,
              ]}
              placeholder={t("bills.namePlaceholder")}
              placeholderTextColor={colors.input.placeholder}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError(false);
              }}
              editable={!isSourced}
            />
          </View>
          <View style={styles.fieldGroup}>
            <WheelPicker
              label={t("bills.time") + " *"}
              value={consumptionDate}
              onChange={isSourced ? undefined : setConsumptionDate}
              level="minute"
            />
          </View>
        </View>

        {/* Category Grid */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>
              {t("bills.selectCategory")} *
            </Text>
          </View>
          <View style={styles.categoryGrid}>
            {enabledCats.map((cat) => {
              const isBuiltinCat = ITEM_CATEGORIES.includes(cat);
              const cc = customCats.find((c) => c.key === cat);
              const IconComponent = isBuiltinCat ? CATEGORY_ICON[cat] : resolveCategoryIcon(cat, cc?.icon);
              if (!IconComponent) return null;
              return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryItem,
                  { width: categoryItemWidth },
                  category === cat && styles.categoryItemActive,
                ]}
                onPress={() => !isSourced && setCategory(cat)}
              >
                <View
                  style={[
                    styles.categoryIconWrap,
                    category === cat && styles.categoryIconWrapActive,
                  ]}
                >
                  {(() => {
                    return (
                      <IconComponent
                        size={16}
                        color={
                          category === cat
                            ? colors.textInverse
                            : colors.textSecondary
                        }
                      />
                    );
                  })()}
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat && styles.categoryLabelActive,
                  ]}
                >
                  {isBuiltinCat ? t(`categories.${cat}`) : cc?.name || cat}
                </Text>
              </Pressable>
            )})}
          </View>
        </View>

        {/* Receipt Image Upload */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("bills.attachment")}</Text>
          <ImageUploadField
            value={receiptImage}
            onChange={setReceiptImage}
            placeholder={t("bills.attachmentPlaceholder")}
            hint={t("bills.attachmentHint")}
            disabled={isSourced}
          />
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t("bills.notes")}</Text>
          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
              { backgroundColor: colors.input.bg },
              isSourced && styles.inputDisabled,
            ]}
            placeholder={t("bills.notesPlaceholder")}
            placeholderTextColor={colors.input.placeholder}
            value={notes}
            onChangeText={setNotes}
            editable={!isSourced}
            multiline
            numberOfLines={3}
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
          disabled={saving || saved || isSourced}
        >
          {isSourced ? (
            <Text style={styles.saveButtonText}>{t("common.fromDurable")}</Text>
          ) : saved ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saved")}</Text>
            </View>
          ) : saving ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Loader2 size={14} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t("common.saving")}</Text>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Save size={14} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {t("common.saveRecord")}
              </Text>
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
    sourcedBanner: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.primaryBgMedium,
      borderRadius: radius.md,
      alignItems: "center",
    },
    sourcedBannerText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 18,
    },
    inputDisabled: {
      opacity: 0.6,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.huge,
      gap: spacing.xxl,
    },
    amountSection: {
      alignItems: "center",
      paddingVertical: spacing.xxl,
      gap: spacing.sm,
    },
    typeSection: {
      gap: spacing.sm,
    },
    typeLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
      marginLeft: 4,
    },
    typeRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    typeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    typeBtnExpenseActive: {
      backgroundColor: hexToRgba(colors.accent.red, 0.08),
      borderColor: hexToRgba(colors.accent.red, 0.3),
    },
    typeBtnIncomeActive: {
      backgroundColor: hexToRgba(colors.accent.green, 0.08),
      borderColor: hexToRgba(colors.accent.green, 0.3),
    },
    typeBtnText: {
      color: colors.textTertiary,
      fontSize: 15,
      fontWeight: "600",
    },
    typeBtnTextExpenseActive: {
      color: colors.accent.red,
    },
    typeBtnTextIncomeActive: {
      color: colors.accent.green,
    },
    amountLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 2,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    amountCurrency: {
      color: colors.accent.red,
      fontSize: 32,
      fontWeight: "700",
    },
    amountCurrencyIncome: {
      color: colors.accent.green,
    },
    amountInput: {
      fontSize: 48,
      fontWeight: "700",
      color: colors.accent.red,
      minWidth: 120,
      textAlign: "center",
      paddingVertical: 4,
      borderWidth: 0,
    },
    amountInputIncome: {
      color: colors.accent.green,
    },
    card: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      padding: spacing.xl,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    fieldGroup: {
      gap: spacing.sm,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
      marginLeft: 4,
    },
    fieldRequired: {
      color: colors.accent.red,
    },
    fieldError: {
      color: colors.accent.red,
      fontSize: 11,
      fontWeight: "500",
      lineHeight: 16,
    },
    textInput: {
      borderRadius: radius.md,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    textInputError: {
      borderColor: colors.accent.red,
      borderWidth: 1,
    },
    textArea: {
      minHeight: 80,
    },
    categorySection: {
      gap: spacing.md,
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    categoryTitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    categoryItem: {
      alignItems: "center",
      gap: 3,
      paddingVertical: 6,
      paddingHorizontal: 2,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryItemActive: {
      borderColor: colors.primary,
      borderWidth: 1,
      backgroundColor: colors.surface,
    },
    categoryIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.input.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryIconWrapActive: {
      backgroundColor: colors.primary,
    },
    categoryLabel: {
      color: colors.textPrimary,
      fontSize: 9,
      fontWeight: "600",
      letterSpacing: 0.2,
      textAlign: "center",
      lineHeight: 11,
    },
    categoryLabelActive: {
      color: colors.primary,
      fontWeight: "700",
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
