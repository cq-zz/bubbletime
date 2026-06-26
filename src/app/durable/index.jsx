import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Package, Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    fetchDurableList,
    subscribeDurableChanges,
} from "../../services/durable";
import { CATEGORY_ICON,
    DURABLE_FILTER_KEYS,
    DURABLE_STATUS_OPTIONS,
    DURABLE_STATUS_STYLES
} from "../../utils/constant";

import { getCurrency, hexToRgba, radius, spacing, useTheme } from "../../utils/theme";

function getStatusStyle(type) {
  return DURABLE_STATUS_STYLES[type] || DURABLE_STATUS_STYLES.active;
}

export default function DurableListScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const [activeKey, setActiveKey] = useState(DURABLE_FILTER_KEYS.all);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const refreshKey = Array.isArray(refresh) ? refresh[0] : refresh;
  const loadItems = useCallback(() => {
    fetchDurableList()
      .then((res) => {
        if (res?.code === 200) setItems(res.data || []);
      })
      .catch((e) => {
        console.error(t("durable.loadListFailed"), e);
      });
  }, [t]);

  useEffect(() => {
    return subscribeDurableChanges(loadItems);
  }, [loadItems]);

  useEffect(() => {
    const timer = setTimeout(loadItems, 0);
    return () => clearTimeout(timer);
  }, [loadItems, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  const activeItems = items.filter(
    (item) => item.status === DURABLE_FILTER_KEYS.inUse,
  );
  const totalAssetValue = activeItems.reduce(
    (sum, item) => sum + (item.purchasePriceValue || 0),
    0,
  );
  const totalAssetValueFormatted = `${getCurrency().icon}${totalAssetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalAssetValueShort = (() => {
    const n = totalAssetValue;
    if (n >= 100000000)
      return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}${t("durable.unitBillion")}`;
    if (n >= 10000)
      return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 2)}${t("durable.unitTenThousand")}`;
    return null;
  })();
  const filteredItems = items.filter((item) => {
    if (activeKey !== DURABLE_FILTER_KEYS.all && item.status !== activeKey)
      return false;
    if (search && !item.name.includes(search)) return false;
    return true;
  });

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const renderCategory = (cat) => {
    const isActive = activeKey === cat.key;
    return (
      <Pressable
        key={cat.key}
        style={[styles.filterPill, isActive && styles.filterPillActive]}
        onPress={() => setActiveKey(cat.key)}
      >
        <Text
          style={[
            styles.filterPillText,
            isActive && styles.filterPillTextActive,
          ]}
        >
          {cat.label}
        </Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.statusType);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => {
          if (item.id) router.push(`/durable/${encodeURIComponent(item.id)}`);
        }}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.cardTypeLabel}>
              {t("categories." + item.category, item.category)}
            </Text>
            <Text style={styles.cardName}>{item.name}</Text>
          </View>
          <View style={styles.cardBadges}>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <Text
                style={[styles.statusBadgeText, { color: statusStyle.text }]}
              >
                {(() => {
                  const opt = DURABLE_STATUS_OPTIONS.find(
                    (o) => o.value === item.status,
                  );
                  return opt ? t(opt.i18nKey) : item.status;
                })()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBodyRow}>
          <View style={styles.cardDetails}>
            <Text style={styles.cardDetailLabel}>
              {t("durable.purchasePrice")}：{item.purchasePrice}
            </Text>
            <Text style={styles.cardDetailLabel}>
              {t("durable.companionDuration")}：{item.companionDuration}
            </Text>
            <Text style={styles.cardDetailLabel}>
              {t("durable.dailyAvgValue")}：{" "}
              <Text style={styles.cardDetailValue}>{item.dailyAvg}</Text>
            </Text>
            {item.expectedDailyAvg ? (
              <Text style={styles.cardDetailLabel}>
                {t("durable.expectedDailyAvg")}：{" "}
                <Text style={styles.cardDetailValue}>
                  {item.expectedDailyAvg}
                </Text>
              </Text>
            ) : null}
          </View>
          <View style={styles.cardImageWrap}>
            {item.image ? (
              <Image source={item.image} style={styles.cardImage} contentFit="contain" transition={200} />
            ) : (
              <View style={[styles.cardIconFallback, { backgroundColor: hexToRgba(item.accent || colors.primary, 0.1) }]}>
                {(() => { const CatIcon = CATEGORY_ICON[item.category] || Package; return <CatIcon size={22} color={item.accent || colors.primary} />; })()}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <View style={styles.statsBody}>
              <Text style={styles.statsLabel}>{t("durable.totalAssets")}</Text>{/* */}
              <Text
                style={styles.statsValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {totalAssetValueFormatted}
              </Text>{/* */}
              {totalAssetValueShort && (
                <Text style={styles.statsShortLabel}>
                  ≈ {totalAssetValueShort}
                </Text>
              )}{/* */}
              <View style={styles.statsBadge}>
                <Text style={styles.statsBadgeText}>
                  {t("durable.itemCount", { count: activeItems.length })}
                </Text>
              </View>{/* */}
              <Text style={styles.statsHint}>{t("durable.statsHint")}</Text>
            </View><View style={styles.statsIconWrap}>
              <Package size={24} color={colors.primary} />
            </View>
          </View>
        </View>

        <View style={styles.stickyHeader}>
          <View style={styles.searchWrap}>
            <Search
              size={18}
              color={colors.textTertiary}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t("durable.searchPlaceholder")}
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View><ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {Object.values(DURABLE_FILTER_KEYS).map((key) => {
              const filterLabels = { in_use: "inUse" };
              const i18nKey = filterLabels[key] || key;
              return renderCategory({
                key,
                label:
                  key === "all" ? t("common.all") : t(`durable.${i18nKey}`),
              });
            })}
          </ScrollView>
        </View>

        <View style={styles.listContent}>
          {filteredItems.map((item) => (
            <View key={item.id}>{renderItem({ item })}</View>
          ))}
        </View>
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/durable/add")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.huge,
    },
    statsSection: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    stickyHeader: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    statsCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: hexToRgba(colors.accent.purple, 0.1),
      borderRadius: radius.xxl,
      borderCurve: "continuous",
      padding: spacing.xl,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: hexToRgba(colors.accent.purple, 0.15),
    },
    statsBody: {
      flex: 1,
      gap: 4,
      zIndex: 1,
    },
    statsLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
    },
    statsValue: {
      color: colors.textPrimary,
      fontSize: 32,
      fontWeight: "700",
      letterSpacing: -0.5,
      lineHeight: 40,
    },
    statsBadge: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: hexToRgba(colors.accent.purple, 0.15),
    },
    statsBadgeText: {
      color: colors.accent.purple,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 16,
    },
    statsHint: {
      color: colors.textTertiary,
      fontSize: 10,
      fontWeight: "500",
      lineHeight: 14,
      marginTop: 4,
    },
    statsShortLabel: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 16,
      marginTop: 2,
    },
    statsIconWrap: {
      width: 80,
      height: 80,
      opacity: 0.18,
      alignItems: "center",
      justifyContent: "center",
    },
    statsIcon: {
      fontSize: 80,
    },

    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.input.bg,
      borderRadius: radius.xxl,
      borderCurve: "continuous",
      paddingHorizontal: spacing.lg,
      height: 48,
      marginBottom: spacing.md,
    },
    searchIcon: {
      fontSize: 18,
      color: colors.textTertiary,
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    filterRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingBottom: 4,
    },
    filterPill: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.border,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
    },
    filterPillText: {
      color: colors.input.text,
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.5,
      lineHeight: 16,
    },
    filterPillTextActive: {
      color: colors.textInverse,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: 0,
    },
    card: {
      flexDirection: "column",
      backgroundColor: colors.surfaceFrost,
      borderRadius: radius.xxl,
      borderCurve: "continuous",
      padding: spacing.lg,
      gap: spacing.md,
      marginBottom: spacing.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardPressed: {
      transform: [{ scale: 0.97 }],
    },
    cardBodyRow: {
      flexDirection: "row",
      gap: spacing.md,
      alignItems: "center",
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    cardTopLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    cardBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cardTypeLabel: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "700",
      lineHeight: 14,
      backgroundColor: colors.primaryBgMedium,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      lineHeight: 14,
    },
    cardName: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 22,
    },
    cardDetails: {
      flex: 1,
      gap: 4,
    },
    cardDetailLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "500",
      lineHeight: 20,
    },
    cardDetailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    cardDetailIcon: {
      fontSize: 14,
      opacity: 0.6,
    },
    cardDetailDivider: {
      color: colors.border,
      fontSize: 13,
      fontWeight: "300",
      lineHeight: 20,
    },
    cardDetailValue: {
      color: colors.primary,
      fontWeight: "700",
    },
    cardImageWrap: {
      width: 80,
      height: 80,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      overflow: "hidden",
      backgroundColor: colors.divider,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    cardImage: {
      width: "100%",
      height: "100%",
    },
    moreIcon: {
      color: colors.input.text,
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: 2,
    },
    fab: {
      position: "absolute",
      right: spacing.xxl,
      bottom: spacing.xxxl,
      width: 60,
      height: 60,
      borderRadius: radius.xxl,
      borderCurve: "continuous",
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.glow,
    },
    fabPressed: {
      transform: [{ scale: 0.92 }],
    },
    fabIcon: {
      fontSize: 32,
      color: "#FFFFFF",
      fontWeight: "400",
      lineHeight: 34,
      marginTop: -2,
    },
  });
}
