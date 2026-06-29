import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import ConfirmModal from "../../../components/ConfirmModal";
import {
  checkCategoryInUse,
  deleteCustomCategory,
  getCustomCategories,
  saveCustomCategories,
} from "../../../services/category";
import {
  CATEGORY_ICON_NAME_MAP,
  ICON_SELECTOR_OPTIONS,
} from "../../../utils/constant";
import {
  hexToRgba,
  radius,
  spacing,
  useTheme,
} from "../../../utils/theme";

export default function CategoryFormPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { key } = useLocalSearchParams();

  const isEdit = !!key;

  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("Tag");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [needReassign, setNeedReassign] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [itemEnabled, setItemEnabled] = useState(true);
  const [nameError, setNameError] = useState(false);
  const [nameErrorMsg, setNameErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (key && ["food","clothing","transport","medical","home","appliance","digital","entertainment","daily","education","other"].includes(key)) {
      router.back();
    }
  }, [key, router]);

  useEffect(() => {
    if (key) {
      getCustomCategories().then((list) => {
        const item = list.find((c) => c.key === key);
        if (item) {
          setEditName(item.name || "");
          setEditIcon(item.icon || "Tag");
          setItemEnabled(item.enabled !== false);
        }
      });
    }
  }, [key]);

  const handleSave = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed.length > 20) {
      setNameError(true);
      setNameErrorMsg(t("settings.categoryNameHint"));
      return;
    }
    const list = await getCustomCategories();
    const duplicate = list.find((c) => c.name === trimmed && c.key !== key);
    if (duplicate) {
      setNameError(true);
      setNameErrorMsg(t("settings.categoryNameDuplicate"));
      return;
    }
    setNameError(false);
    setSaving(true);
    if (isEdit) {
      const idx = list.findIndex((c) => c.key === key);
      if (idx !== -1) {
        list[idx].name = trimmed;
        list[idx].icon = editIcon;
        list[idx].enabled = itemEnabled;
      }
    } else {
      const newKey = "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
      list.push({ key: newKey, name: trimmed, icon: editIcon, enabled: true, order: maxOrder + 1 });
    }
    await saveCustomCategories(list);
    setSaving(false);
    router.back();
  }, [editName, editIcon, isEdit, key, itemEnabled, router, t]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    if (needReassign) {
      const { getAll, update } = await import("../../../services/database");
      const allBills = await getAll("bills");
      for (const b of allBills) {
        if (b.category === deleteTarget.key) {
          await update("bills", b.id, { category: "other" });
        }
      }
      const allDurables = await getAll("durables");
      for (const d of allDurables) {
        if (d.category === deleteTarget.key) {
          await update("durables", d.id, { category: "other" });
        }
        if (d.repair_record) {
          try {
            const rr = typeof d.repair_record === "string" ? JSON.parse(d.repair_record) : d.repair_record;
            const isArrayFormat = Array.isArray(rr);
            const exps = isArrayFormat ? rr : (rr.expenses || []);
            const incs = isArrayFormat ? [] : (rr.incomes || []);
            let changed = false;
            for (const e of exps) {
              if (e.category === deleteTarget.key) { e.category = "other"; changed = true; }
            }
            for (const e of incs) {
              if (e.category === deleteTarget.key) { e.category = "other"; changed = true; }
            }
            if (changed) {
              const updated = isArrayFormat ? exps : { ...rr, expenses: exps, incomes: incs };
              await update("durables", d.id, { repair_record: JSON.stringify(updated) });
            }
          } catch {}
        }
      }
    }
    await deleteCustomCategory(deleteTarget.key);
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setSaving(false);
    router.back();
  };

  const styles = useMemo(() => buildStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isEdit ? t("common.edit") : t("common.add"),
          headerShown: true,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {t("settings.categoryNamePlaceholder")} <Text style={styles.fieldRequired}>*</Text>
            </Text>
            <TextInput
              style={[styles.textInput, nameError && styles.textInputError]}
              value={editName}
              onChangeText={(t) => { setEditName(t); setNameError(false); }}
              placeholder={t("settings.categoryNamePlaceholder")}
              placeholderTextColor={colors.input?.placeholder || colors.textTertiary}
            />
            {nameError && (
              <Text style={styles.fieldError}>{nameErrorMsg}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t("settings.selectIcon")}</Text>
            <View style={styles.iconGrid}>
              {ICON_SELECTOR_OPTIONS.map((name) => {
                const IconComp = CATEGORY_ICON_NAME_MAP[name];
                const active = editIcon === name;
                return (
                  <Pressable
                    key={name}
                    style={[styles.iconItem, active && styles.iconItemActive]}
                    onPress={() => setEditIcon(name)}
                  >
                    {IconComp ? <IconComp size={20} color={active ? "#FFFFFF" : colors.textSecondary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isEdit && (
            <View style={styles.fieldGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t("common.enable")}</Text>
                <Switch
                  value={itemEnabled}
                  onValueChange={setItemEnabled}
                  trackColor={{ false: colors.input?.bg || colors.border, true: hexToRgba(colors.primary, 0.3) }}
                  thumbColor={itemEnabled ? colors.primary : colors.textTertiary}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {isEdit && (
          <Pressable
            style={styles.deleteBtn}
            onPress={async () => {
              setDeleteTarget({ key });
              const inUse = await checkCategoryInUse(key);
              setNeedReassign(inUse);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 size={16} color={colors.accent.red} />
            <Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.saveBtn, isEdit && styles.saveBtnWide]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{t("common.confirm")}</Text>
        </Pressable>
      </View>

      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title={t("settings.deleteCategoryTitle")}
        description={needReassign ? t("settings.deleteCategoryInUse") : t("settings.deleteCategoryConfirm")}
        confirmText={t("common.confirm")}
      />
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.xl, paddingBottom: 120 },
    formCard: {
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldGroup: { marginBottom: spacing.lg },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    fieldRequired: {
      color: colors.accent.red,
      fontSize: 14,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderCurve: "continuous",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
      backgroundColor: colors.input?.bg || colors.primaryBgMedium,
    },
    textInputError: {
      borderColor: colors.accent.red,
    },
    fieldError: {
      color: colors.accent.red,
      fontSize: 12,
      marginTop: spacing.xs,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    iconItem: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.input?.bg || colors.primaryBgMedium,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconItemActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    switchLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: spacing.md,
      padding: spacing.xl,
      paddingBottom: 32,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    deleteBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      height: 48,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: colors.input?.bg || colors.primaryBgMedium,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deleteBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.accent.red,
    },
    saveBtn: {
      flex: 1,
      height: 48,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    saveBtnWide: { flex: 2 },
    saveBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  });
}
