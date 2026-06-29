import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Plus, X } from "lucide-react-native";
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
import CategoryPickerField from "../../components/CategoryPickerField";
import ImageUploadField from "../../components/ImageUploadField";
import WheelPicker from "../../components/WheelPicker";
import { fetchDurableDetail, fetchSubmitDurable } from "../../services/durable";
import { getCustomCategories, getEnabledCategoryKeys, resolveCategoryIcon } from "../../services/category";
import {
    CATEGORY_ICON,
    DURABLE_STATUS_OPTIONS,
    ITEM_CATEGORIES,
} from "../../utils/constant";
import { getCurrency, useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import useAlert from "../../hooks/useAlert";

function normalizeParam(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

function sanitizeDecimal(text) {
  if (text === "" || text === undefined || text === null) return "";
  const str = String(text).replace(/[^0-9.]/g, "");
  const parts = str.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  if (parts.length === 2 && parts[1].length > 2)
    return parts[0] + "." + parts[1].slice(0, 2);
  return str;
}

export default function AddEditScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { alert } = useAlert();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const itemId = normalizeParam(id);
  const isEditing = Boolean(itemId);
  const title = isEditing ? t('nav.editDurable') : t('nav.addDurable');

  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [expectedLifespan, setExpectedLifespan] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [itemType, setItemType] = useState("other");
  const [status, setStatus] = useState("in_use");
  const [notes, setNotes] = useState("");
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]);
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [dateError, setDateError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [enabledCats, setEnabledCats] = useState(ITEM_CATEGORIES);
  const [customCats, setCustomCats] = useState([]);

  useEffect(() => {
    getEnabledCategoryKeys().then(setEnabledCats);
    getCustomCategories().then(setCustomCats);
  }, []);

  const { width: screenWidth } = useWindowDimensions();
  const gridPadding = spacing.xl * 2 + spacing.xl * 2 + 2; // scroll padding + card padding + borders
  const gridWidth = screenWidth - gridPadding;
  const numCols = Math.max(4, Math.floor(gridWidth / 76));
  const categoryItemWidth = (gridWidth - (numCols - 1) * spacing.sm) / numCols;

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  useEffect(() => {
    if (!isEditing) return;
    fetchDurableDetail(itemId).then((res) => {
      if (res?.code !== 200 || !res.data) return;
      const d = res.data;
      setName(d.name || "");
      setItemType(d.itemType || "other");
      setPurchaseDate(d.purchaseDate || "");
      setPurchasePrice(
        d.purchasePrice !== undefined ? String(d.purchasePrice) : "",
      );
      setExpectedLifespan(d.expectedLifespan || "");
      setExpiryDate(d.expiryDate || "");
      setStatus(d.status || "in_use");
      setNotes(d.notes || "");
      setOtherExpenses(
        d.otherExpenses && d.otherExpenses.length > 0
          ? d.otherExpenses.map((e) => ({
              name: e.name || "",
              cost: e.cost !== undefined ? String(e.cost) : "",
              category: e.category || "",
              date: e.date || "",
            }))
          : [],
      );
      setOtherIncomes(
        d.otherIncomes && d.otherIncomes.length > 0
          ? d.otherIncomes.map((i) => ({
              name: i.name || "",
              cost: i.cost !== undefined ? String(i.cost) : "",
              category: i.category || "",
              date: i.date || "",
            }))
          : [],
      );
      setImage(d.image || "");
    });
  }, [itemId, isEditing, t]);

  const handleSave = async () => {
    const nameEmpty = !name.trim();
    const dateEmpty = !purchaseDate.trim();
    const priceEmpty = !purchasePrice.trim() || parseFloat(purchasePrice) <= 0;
    setNameError(nameEmpty);
    setDateError(dateEmpty);
    setPriceError(priceEmpty);
    if (nameEmpty || dateEmpty || priceEmpty) {
      if (nameEmpty) setTimeout(() => setNameError(false), 2000);
      if (dateEmpty) setTimeout(() => setDateError(false), 2000);
      if (priceEmpty) setTimeout(() => setPriceError(false), 2000);
      return;
    }
    const invalidExpense = otherExpenses.find((e) => e.name && (!e.category || !e.cost || parseFloat(e.cost) <= 0));
    const invalidIncome = otherIncomes.find((i) => i.name && (!i.category || !i.cost || parseFloat(i.cost) <= 0));
    if (invalidExpense) {
      alert(t("common.tip"), t("durable.expenseRequired"));
      return;
    }
    if (invalidIncome) {
      alert(t("common.tip"), t("durable.incomeRequired"));
      return;
    }
    setSaving(true);
    setSaveError("");
    const res = await fetchSubmitDurable({
      id: itemId,
      name,
      image,
      category: itemType,
      purchaseDate,
      purchasePrice,
      expectedLifespan,
      expiryDate,
      status,
      notes,
      otherExpenses,
      otherIncomes,
    });
    setSaving(false);
    if (res?.code !== 200) {
      setSaveError(res?.message || t('common.saveFailed'));
      return;
    }
    setSaved(true);
    setTimeout(() => {
      if (isEditing) {
        router.back();
        return;
      }

      router.replace(`/durable?refresh=${Date.now()}`);
    }, 800);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title, headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Upload */}
        <ImageUploadField
          value={image}
          onChange={setImage}
          placeholder={t('durable.uploadImage')}
          aspectRatio={4 / 3}
        />

        {/* Basic Information */}
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('durable.itemName')} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, nameError && styles.textInputError]}
              placeholder={t('durable.itemNamePlaceholder')}
              placeholderTextColor={colors.input.placeholder}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameError(false);
              }}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('durable.category')} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <View style={styles.categoryGrid}>
              {enabledCats.map((cat) => {
                const isBuiltinCat = ITEM_CATEGORIES.includes(cat);
                const cc = customCats.find((c) => c.key === cat);
                const IconComponent = isBuiltinCat ? CATEGORY_ICON[cat] : resolveCategoryIcon(cat, cc?.icon);
                if (!IconComponent) return null;
                const active = itemType === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryItem,
                      { width: categoryItemWidth },
                      active && styles.categoryItemActive,
                    ]}
                    onPress={() => setItemType(cat)}
                  >
                    <View
                      style={[
                        styles.categoryIconWrap,
                        active && styles.categoryIconWrapActive,
                      ]}
                    >
                      <IconComponent
                        size={22}
                        color={active ? "#FFFFFF" : colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        active && styles.categoryLabelActive,
                      ]}
                    >
                      {isBuiltinCat ? t("categories." + cat) : cc?.name || cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('durable.purchaseDate')} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <WheelPicker
              value={purchaseDate}
              onChange={(v) => {
                setPurchaseDate(v);
                setDateError(false);
              }}
              level="date"
            />
            {dateError ? (
              <Text style={styles.fieldError}>{t('durable.purchaseDateRequired')}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('durable.purchasePriceLabel')} ({getCurrency().icon}) <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, priceError && styles.textInputError]}
              placeholder="0.00"
              placeholderTextColor={colors.input.placeholder}
              value={purchasePrice}
              onChangeText={(t) => {
                setPurchasePrice(sanitizeDecimal(t));
                setPriceError(false);
              }}
              keyboardType="decimal-pad"
            />
            {priceError ? (
              <Text style={styles.fieldError}>{t('durable.purchasePriceRequired')}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <WheelPicker
              label={t('durable.expectedEndDate')}
              value={expectedLifespan}
              onChange={setExpectedLifespan}
              level="date"
            />
          </View>

          <View style={styles.fieldGroup}>
            <WheelPicker
              label={t('durable.expiryDate')}
              value={expiryDate}
              onChange={setExpiryDate}
              level="date"
            />
          </View>
        </View>

        {/* Other Expenses */}
        <View style={styles.formCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>{t('durable.otherExpenses')}</Text>
            <Pressable
              style={styles.addExpenseBtn}
              onPress={() =>
                setOtherExpenses((prev) => [...prev, { name: "", cost: "", category: "", date: "" }])
              }
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addExpenseBtnText}>{t('durable.addExpense')}</Text>
            </Pressable>
          </View>
          {otherExpenses.length === 0 ? (
            <Text style={styles.emptyHint}>{t('durable.noOtherExpense')}</Text>
          ) : (
            otherExpenses.map((expense, idx) => (
              <View key={idx} style={styles.expenseRow}>
                <TextInput
                  style={styles.expenseNameInput}
                  placeholder={t('durable.expenseNamePlaceholder')}
                  placeholderTextColor={colors.input.placeholder}
                  value={expense.name}
                  onChangeText={(t) => {
                    const next = [...otherExpenses];
                    next[idx] = { ...next[idx], name: t };
                    setOtherExpenses(next);
                  }}
                />
                <CategoryPickerField
                  value={expense.category}
                  onChange={(cat) => {
                    const next = [...otherExpenses];
                    next[idx] = { ...next[idx], category: cat };
                    setOtherExpenses(next);
                  }}
                  label={t('durable.selectCategory')}
                />
                <WheelPicker
                  value={expense.date}
                  onChange={(v) => {
                    const next = [...otherExpenses];
                    next[idx] = { ...next[idx], date: v };
                    setOtherExpenses(next);
                  }}
                  level="date"
                />
                <View style={styles.expenseCostRow}>
                  <TextInput
                    style={styles.expenseCostInput}
                    placeholder={t('durable.amountPlaceholder')}
                    placeholderTextColor={colors.input.placeholder}
                    value={expense.cost}
                    onChangeText={(t) => {
                      const next = [...otherExpenses];
                      next[idx] = { ...next[idx], cost: sanitizeDecimal(t) };
                      setOtherExpenses(next);
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Pressable
                    style={styles.expenseRemoveBtn}
                    onPress={() =>
                      setOtherExpenses((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <X size={16} color={colors.accent.red} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Other Incomes */}
        <View style={styles.formCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderLabel}>{t('durable.otherIncomes')}</Text>
            <Pressable
              style={styles.addExpenseBtn}
              onPress={() =>
                setOtherIncomes((prev) => [...prev, { name: "", cost: "", category: "", date: "" }])
              }
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addExpenseBtnText}>{t('durable.addIncome')}</Text>
            </Pressable>
          </View>
          {otherIncomes.length === 0 ? (
            <Text style={styles.emptyHint}>{t('durable.noOtherIncome')}</Text>
          ) : (
            otherIncomes.map((income, idx) => (
              <View key={idx} style={styles.expenseRow}>
                <TextInput
                  style={styles.expenseNameInput}
                  placeholder={t('durable.incomeNamePlaceholder')}
                  placeholderTextColor={colors.input.placeholder}
                  value={income.name}
                  onChangeText={(t) => {
                    const next = [...otherIncomes];
                    next[idx] = { ...next[idx], name: t };
                    setOtherIncomes(next);
                  }}
                />
                <CategoryPickerField
                  value={income.category}
                  onChange={(cat) => {
                    const next = [...otherIncomes];
                    next[idx] = { ...next[idx], category: cat };
                    setOtherIncomes(next);
                  }}
                  label={t('durable.selectCategory')}
                />
                <WheelPicker
                  value={income.date}
                  onChange={(v) => {
                    const next = [...otherIncomes];
                    next[idx] = { ...next[idx], date: v };
                    setOtherIncomes(next);
                  }}
                  level="date"
                />
                <View style={styles.expenseCostRow}>
                  <TextInput
                    style={styles.expenseCostInput}
                    placeholder={t('durable.amountPlaceholder')}
                    placeholderTextColor={colors.input.placeholder}
                    value={income.cost}
                    onChangeText={(t) => {
                      const next = [...otherIncomes];
                      next[idx] = { ...next[idx], cost: sanitizeDecimal(t) };
                      setOtherIncomes(next);
                    }}
                    keyboardType="decimal-pad"
                  />
                  <Pressable
                    style={styles.expenseRemoveBtn}
                    onPress={() =>
                      setOtherIncomes((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <X size={16} color={colors.accent.red} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Status & Notes */}
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t('durable.status')} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <View style={styles.statusRow}>
              {DURABLE_STATUS_OPTIONS.map((opt) => (
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t('bills.notes')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={t('durable.notesPlaceholder')}
              placeholderTextColor={colors.input.placeholder}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Error message */}
      {saveError ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}
      {/* Bottom Save Button */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Check size={18} color={colors.textSecondary} />
            <Text style={styles.saveButtonText}>
              {saved ? ` ${t('common.saved')}` : saving ? `⏳ ${t('common.saving')}...` : t('durable.confirmSave')}
            </Text>
          </View>
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
    gap: spacing.xxl,
  },
  formCard: {
    backgroundColor: colors.surfaceFrost,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    padding: spacing.xl,
    gap: spacing.xl,
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
    backgroundColor: colors.input.bg,
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
    borderWidth: 2,
    borderColor: colors.accent.red,
  },
  textArea: {
    minHeight: 80,
  },
  twoCol: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: {
    backgroundColor: colors.primary,
  },
  statusChipText: {
    color: colors.input.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
  },
  statusChipTextActive: {
    color: colors.textInverse,
    fontWeight: "600",
  },
  errorBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: hexToRgba(colors.accent.red, 0.1),
  },
  errorText: {
    color: colors.accent.red,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceFrost,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  addExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  addExpenseBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  emptyHint: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  expenseRow: {
    flexDirection: "column",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expenseNameInput: {
    width: "100%",
    backgroundColor: colors.input.bg,
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
  expenseCostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  expenseCostInput: {
    flex: 1,
    backgroundColor: colors.input.bg,
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    textAlign: "right",
  },
  expenseRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryBgMedium,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryItem: {
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.sm,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.input.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconWrapActive: {
    backgroundColor: colors.primary,
  },
  categoryLabel: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 13,
  },
  categoryLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  });
}