import { Stack, useFocusEffect, useRouter } from "expo-router";
import { Pencil, Plus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import {
  getAllMergedCategories,
  getBuiltinCategoryKeys,
  toggleBuiltinCategory,
  updateCustomCategory,
} from "../../../services/category";
import { CATEGORY_ICON, CATEGORY_ICON_NAME_MAP } from "../../../utils/constant";
import { hexToRgba, radius, spacing, useTheme } from "../../../utils/theme";

export default function CategoriesScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      getAllMergedCategories()
        .then((merged) => {
          if (active) setCategories(merged);
        })
        .catch((e) => {
          console.error("Failed to load categories:", e);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const builtinKeys = useMemo(() => getBuiltinCategoryKeys(), []);

  const handleToggle = useCallback(
    async (item) => {
      const newEnabled = !item.enabled;
      const prev = categories;
      setCategories((prev) =>
        prev.map((c) => (c.key === item.key ? { ...c, enabled: newEnabled } : c)),
      );
      try {
        if (builtinKeys.includes(item.key)) {
          await toggleBuiltinCategory(item.key);
        } else {
          await updateCustomCategory(item.key, { enabled: newEnabled });
        }
      } catch {
        setCategories(prev);
      }
    },
    [builtinKeys, categories],
  );

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const renderItem = useCallback(
    ({ item }) => {
      const isBuiltin = builtinKeys.includes(item.key);
      const IconComp = isBuiltin
        ? CATEGORY_ICON[item.key]
        : CATEGORY_ICON_NAME_MAP[item.icon];
      return (
        <View style={styles.itemRow}>
          <View style={styles.itemIconWrap}>
            {IconComp ? (
              <IconComp size={20} color={colors.textSecondary} />
            ) : null}
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {isBuiltin ? t("categories." + item.key) : item.name}
            </Text>
          </View>
          {isBuiltin && (
            <View style={styles.builtinBadge}>
              <Text style={styles.builtinBadgeText}>
                {t("common.default")}
              </Text>
            </View>
          )}
          <Switch
            value={item.enabled}
            onValueChange={() => handleToggle(item)}
            trackColor={{
              false: colors.input?.bg || colors.border,
              true: hexToRgba(colors.primary, 0.3),
            }}
            thumbColor={item.enabled ? colors.primary : colors.textTertiary}
          />
          {!isBuiltin && (
            <Pressable
              style={styles.itemAction}
              onPress={() =>
                router.push("/settings/categories/add?key=" + item.key)
              }
            >
              <Pencil size={14} color={colors.primary} />
            </Pressable>
          )}
        </View>
      );
    },
    [colors, builtinKeys, t, router, handleToggle],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: t("settings.customCategories"),
            headerShown: true,
          }}
        />
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t("settings.customCategories"),
          headerShown: true,
        }}
      />
      <FlatList
        data={categories}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/settings/categories/add")}
      >
        <Plus size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { color: colors.textSecondary, fontSize: 14 },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.input.bg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemInfo: { flex: 1 },
    itemName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    builtinBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryBgMedium,
    },
    builtinBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "600",
    },
    itemAction: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
    fab: {
      position: "absolute",
      right: spacing.xl,
      bottom: spacing.xl,
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.lg,
    },
  });
}
