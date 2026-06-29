import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getCustomCategories, getEnabledCategoryKeys, resolveCategoryIcon } from "../services/category";
import { CATEGORY_ICON, ITEM_CATEGORIES } from "../utils/constant";
import { hexToRgba, radius, spacing, useTheme } from "../utils/theme";

export default function CategoryPickerField({ value, onChange, label }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [enabledKeys, setEnabledKeys] = useState(ITEM_CATEGORIES);
  const [customCats, setCustomCats] = useState([]);

  const load = useCallback(async () => {
    const keys = await getEnabledCategoryKeys();
    setEnabledKeys(keys);
    setCustomCats(await getCustomCategories());
  }, []);

  useEffect(() => { load(); }, [load]);

  const builtinKeys = useMemo(() => ITEM_CATEGORIES, []);
  const isBuiltin = builtinKeys.includes(value);
  const customCat = customCats.find((c) => c.key === value);
  const CatIcon = isBuiltin ? CATEGORY_ICON[value] : resolveCategoryIcon(value, customCat?.icon);

  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        {CatIcon ? (
          <View style={styles.triggerIconWrap}>
            <CatIcon size={14} color={colors.primary} />
          </View>
        ) : null}
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value
            ? isBuiltin
              ? t("categories." + value)
              : customCat?.name || value
            : label}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.grid}>
              {enabledKeys.map((cat) => {
                const isB = builtinKeys.includes(cat);
                const cc = customCats.find((c) => c.key === cat);
                const IconComponent = isB ? CATEGORY_ICON[cat] : resolveCategoryIcon(cat, cc?.icon);
                const active = value === cat;
                if (!IconComponent) return null;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => { onChange(cat); setOpen(false); }}
                  >
                    <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                      <IconComponent size={22} color={active ? "#FFFFFF" : colors.textSecondary} />
                    </View>
                    <Text style={[styles.itemLabel, active && styles.itemLabelActive]} numberOfLines={2}>
                      {isB ? t("categories." + cat) : cc?.name || cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.input.bg,
      borderRadius: radius.md,
      borderCurve: "continuous",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    triggerIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: hexToRgba(colors.primary, 0.12),
      alignItems: "center",
      justifyContent: "center",
    },
    triggerText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: "500",
    },
    triggerPlaceholder: {
      color: colors.textTertiary,
      fontWeight: "400",
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderCurve: "continuous",
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: spacing.lg,
      textAlign: "center",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    item: {
      width: "30%",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    itemActive: {
      backgroundColor: hexToRgba(colors.primary, 0.08),
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.input.bg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrapActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    itemLabel: {
      color: colors.textPrimary,
      fontSize: 10,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 13,
    },
    itemLabelActive: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
}
