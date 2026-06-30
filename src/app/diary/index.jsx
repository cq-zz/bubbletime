import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Image } from "expo-image";
import { BookOpen, ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import { fetchDiaryList } from "../../services/diary";
import YearMonthPicker from "../../components/YearMonthPicker";
import { WEATHER_OPTIONS } from "../../utils/constant";

const CURRENT_YEAR = new Date().getFullYear();
const ACCENT_CYCLE = ["#D4A574", "#7BA9A0", "#C47A8A", "#8B9DC4", "#C49B6A", "#A07A9C"];

const WEATHER_EMOJI = {};
WEATHER_OPTIONS.forEach((w) => { WEATHER_EMOJI[w.value] = w.emoji; });

export default function DiaryListScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [imageErrors, setImageErrors] = useState(new Set());

  const loadData = useCallback(() => {
    setLoading(true);
    const params = { year: selectedYear };
    if (selectedMonth) params.month = selectedMonth;
    fetchDiaryList(params).then((res) => {
      if (res?.code === 200) setItems(res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [selectedYear, selectedMonth]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleDateChange = useCallback(({ year, month }) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const renderItem = ({ item, index }) => {
    const weatherEmoji = WEATHER_EMOJI[item.weather] || "";
    const accent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
    const hasImage = item.image && !imageErrors.has(item.id);
    const isBroken = item.image && imageErrors.has(item.id);
    return (
      <Pressable
        style={({ pressed }) => [styles.reminderItem, pressed && styles.reminderItemPressed]}
        onPress={() => router.push(`/diary/${item.id}`)}
      >
        <View style={[styles.reminderBar, { backgroundColor: accent }]} />
        <View style={[styles.reminderIconChip, { backgroundColor: hexToRgba(accent, 0.12) }]}>
          {hasImage ? (
            <Image
              source={{ uri: item.image }}
              style={styles.thumbnailImage}
              contentFit="cover"
              onError={() => setImageErrors((prev) => new Set(prev).add(item.id))}
            />
          ) : isBroken ? (
            <Text style={styles.brokenHint}>{t("diary.imageBroken")}</Text>
          ) : (
            <BookOpen size={22} color={accent} />
          )}
        </View>
        <View style={styles.reminderBody}>
          <Text style={styles.reminderTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.reminderDescRow}>
            <Text style={styles.reminderDate}>{item.date}</Text>
            {weatherEmoji ? (
              <Text style={styles.reminderWeather}>{weatherEmoji} {(() => { const w = item.weather; return w ? t(`diary.weather${w.charAt(0).toUpperCase() + w.slice(1)}`) : ''; })()}</Text>
            ) : null}
          </View>
        </View>
        <ChevronRight size={16} color={hexToRgba(accent, 0.5)} />
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <BookOpen size={48} color={hexToRgba(ACCENT_CYCLE[0], 0.3)} />
      <Text style={styles.emptyText}>{t("diary.empty")}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <YearMonthPicker
          year={selectedYear}
          month={selectedMonth}
          onChange={handleDateChange}
        />
      </View>
      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmpty : null}
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push("/diary/add")}
      >
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
    loadingWrap: { paddingVertical: spacing.xxl, alignItems: "center" },
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: 10 },
    reminderItem: {
      flexDirection: "row", alignItems: "center",
      paddingVertical: 14, paddingLeft: 20, paddingRight: 12,
      borderRadius: radius.xl, borderCurve: "continuous",
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1, borderColor: colors.border,
      ...shadows.card, gap: 12,
    },
    reminderItemPressed: { opacity: 0.85 },
    reminderBar: { width: 3, height: 48, borderRadius: 2 },
    reminderIconChip: {
      width: 56, height: 56, borderRadius: radius.md, borderCurve: "continuous",
      alignItems: "center", justifyContent: "center", overflow: "hidden",
    },
    iconFallback: { alignItems: "center", justifyContent: "center", gap: 1 },
    brokenHint: { fontSize: 7, fontWeight: "500", color: colors.textTertiary, maxWidth: 48, textAlign: "center" },
    thumbnailImage: { width: 56, height: 56 },
    reminderBody: { flex: 1, minWidth: 0, gap: 5 },
    reminderTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    reminderTitle: {
      fontSize: 14, fontWeight: "600", lineHeight: 20,
      color: colors.textPrimary, flex: 1,
    },
    labelChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
    labelText: { fontSize: 10, fontWeight: "700" },
    reminderDescRow: {
      flexDirection: "row", alignItems: "center", gap: 6,
    },
    reminderDate: {
      fontSize: 12, fontWeight: "500", lineHeight: 17, color: colors.textTertiary,
    },
    reminderWeather: { fontSize: 12, fontWeight: "500", lineHeight: 17, color: colors.textTertiary },
    emptyWrap: {
      alignItems: "center", justifyContent: "center",
      paddingVertical: 60, gap: 12,
    },
    emptyText: {
      fontSize: 14, fontWeight: "600", color: colors.textTertiary, textAlign: "center",
    },
    fab: {
      position: "absolute", right: spacing.xxl, bottom: spacing.xxxl,
      width: 60, height: 60, borderRadius: radius.xxl, borderCurve: "continuous",
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", ...shadows.glow,
    },
    fabPressed: { transform: [{ scale: 0.92 }] },
    fabIcon: { fontSize: 32, color: "#FFFFFF", fontWeight: "400", lineHeight: 34, marginTop: -2 },
  });
}
