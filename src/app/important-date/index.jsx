import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { CalendarDays, Search, Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import { fetchImportantDateList } from "../../services/importantDate";
import { IMPORTANT_DATE_CATEGORIES } from "../../utils/constant";

export default function ImportantDateListScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(IMPORTANT_DATE_CATEGORIES.all);

  const CATEGORY_OPTIONS = useMemo(() =>
    Object.values(IMPORTANT_DATE_CATEGORIES).map((key) => ({
      key,
      label: key === "all" ? t("common.all") : t(`importantDate.category${key.charAt(0).toUpperCase() + key.slice(1)}`),
    })), [t]);

  const enrichItem = (item) => {
    const categoryColors = {
      birthday: { bg: hexToRgba(colors.accent.red, 0.12), color: colors.accent.red },
      wedding: { bg: hexToRgba(colors.accent.pink || "#E93D82", 0.12), color: colors.accent.pink || "#E93D82" },
      holiday: { bg: hexToRgba(colors.accent.orange || "#FF8A4C", 0.12), color: colors.accent.orange || "#FF8A4C" },
      work: { bg: hexToRgba(colors.primary, 0.12), color: colors.primary },
      other: { bg: hexToRgba(colors.textTertiary, 0.12), color: colors.textTertiary },
    };
    const cc = categoryColors[item.category] || categoryColors.other;
    let daysText = "";
    let daysColor = colors.textSecondary;
    if (item.daysUntil != null) {
      if (item.daysUntil < 0) { daysText = t("importantDate.passed", { count: Math.abs(item.daysUntil) }); daysColor = colors.accent.red; }
      else if (item.daysUntil === 0) { daysText = t("importantDate.today"); daysColor = colors.accent.orange || "#FF8A4C"; }
      else { daysText = t("importantDate.daysLeft", { count: item.daysUntil }); daysColor = colors.primary; }
    }
    let yearsText = "";
    if (item.yearsPassed != null && item.type === "annual") {
      yearsText = t("importantDate.yearCount", { count: item.yearsPassed + 1 });
    }
    return { ...item, cc, daysText, daysColor, yearsText };
  };

  const loadData = useCallback(() => {
    setLoading(true);
    fetchImportantDateList().then((res) => {
      if (res?.code === 200) setItems((res.data || []).map(enrichItem));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredItems = items.filter((item) => {
    if (activeCategory !== IMPORTANT_DATE_CATEGORIES.all && item.category !== activeCategory) return false;
    if (search && !item.name.includes(search) && !item.notes?.includes(search)) return false;
    return true;
  });

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const renderCategory = (cat) => (
    <Pressable
      key={cat.key}
      style={[styles.filterPill, activeCategory === cat.key && styles.filterPillActive]}
      onPress={() => setActiveCategory(cat.key)}
    >
      <Text style={[styles.filterPillText, activeCategory === cat.key && styles.filterPillTextActive]}>
        {cat.label}
      </Text>
    </Pressable>
  );

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/important-date/${item.id}`)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.categoryBadge, { backgroundColor: item.cc.bg }]}>
          <Text style={[styles.categoryBadgeText, { color: item.cc.color }]}>
            {t(`importantDate.category${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`)}
          </Text>
        </View>{item.reminderEnabled && <Bell size={14} color={colors.primary} />}
      </View><Text style={styles.cardTitle}>{item.name}</Text>{/* */}
      {item.yearsText ? <Text style={styles.yearsText}>{item.yearsText}</Text> : null}{/* */}
      <View style={styles.dateRow}>
        <CalendarDays size={14} color={colors.textSecondary} /><Text style={[styles.dateText, { color: item.daysColor }]}>{item.daysText}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textTertiary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("importantDate.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORY_OPTIONS.map(renderCategory)}
        </ScrollView>
      </View>
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/important-date/add")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
    searchWrap: {
      flexDirection: "row", alignItems: "center", backgroundColor: colors.input.bg,
      borderRadius: radius.xxl, borderCurve: "continuous", paddingHorizontal: spacing.lg, height: 48,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: "500", color: colors.textPrimary, paddingVertical: 0 },
    filterRow: { flexDirection: "row", gap: spacing.sm, paddingBottom: 4 },
    filterPill: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border },
    filterPillActive: { backgroundColor: colors.primary },
    filterPillText: { color: colors.input.text, fontSize: 12, fontWeight: "600", letterSpacing: 0.5, lineHeight: 16 },
    filterPillTextActive: { color: colors.textInverse },
    listContent: { paddingHorizontal: spacing.xl, paddingTop: 0, paddingBottom: spacing.huge },
    card: {
      backgroundColor: colors.surfaceFrost, borderRadius: radius.xxl, borderCurve: "continuous",
      padding: spacing.lg, gap: 8, marginBottom: spacing.md,
      borderWidth: 1, borderColor: colors.border, ...shadows.card,
    },
    cardPressed: { transform: [{ scale: 0.97 }] },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg },
    categoryBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 16 },
    cardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "600", lineHeight: 24 },
    yearsText: { color: colors.textTertiary, fontSize: 12, fontWeight: "500", lineHeight: 16 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    dateText: { fontSize: 13, fontWeight: "600", lineHeight: 20 },
    fab: {
      position: "absolute", right: spacing.xxl, bottom: spacing.xxxl,
      width: 60, height: 60, borderRadius: radius.xxl, borderCurve: "continuous",
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadows.glow,
    },
    fabPressed: { transform: [{ scale: 0.92 }] },
    fabIcon: { fontSize: 32, color: "#FFFFFF", fontWeight: "400", lineHeight: 34, marginTop: -2 },
    loadingWrap: { paddingVertical: spacing.xxl, alignItems: "center" },
  });
}
