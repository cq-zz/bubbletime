import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Image } from "expo-image";
import { BookOpen, Loader2, Pencil, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme, hexToRgba, radius, spacing } from "../../utils/theme";
import ConfirmModal from "../../components/ConfirmModal";
import ImagePreviewModal from "../../components/ImagePreviewModal";
import { fetchDiaryDetail, fetchDeleteDiary } from "../../services/diary";
import { WEATHER_OPTIONS } from "../../utils/constant";

const WEATHER_EMOJI = {};
WEATHER_OPTIONS.forEach((w) => { WEATHER_EMOJI[w.value] = w.emoji; });

export default function DetailScreen() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [imageError, setImageError] = useState(false);
  const deleteActionRef = useRef(null);

  const styles = useMemo(() => buildStyles(colors, shadows), [colors, shadows]);

  const loadDetail = useCallback(() => {
    setLoading(true);
    fetchDiaryDetail(id).then((res) => {
      if (res?.code === 200 && res.data) setItem(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useFocusEffect(loadDetail);

  const handleDelete = () => {
    deleteActionRef.current = async () => {
      const res = await fetchDeleteDiary(id);
      if (res?.code !== 200) return;
      router.back();
    };
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("nav.diaryDetail"), headerShown: true }} />
        <View style={styles.loadingWrap}>
          <Loader2 size={24} color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: t("nav.diaryDetail"), headerShown: true }} />
        <View style={styles.loadingWrap}>
          <Text style={{ color: colors.textSecondary }}>{t("common.error")}</Text>
        </View>
      </View>
    );
  }

  const weatherEmoji = WEATHER_EMOJI[item.weather] || "";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("nav.diaryDetail"), headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 图片区块 */}
        {item.image ? (
          <Pressable onPress={() => setPreviewImage(item.image)}>
            {!imageError ? (
              <Image source={{ uri: item.image }} style={styles.detailImage} contentFit="cover" onError={() => setImageError(true)} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <BookOpen size={40} color={colors.primaryBgMedium} />
                <Text style={styles.imageBrokenText}>{t("diary.imageBroken")}</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <View style={styles.imagePlaceholder}>
            <BookOpen size={40} color={colors.primaryBgMedium} />
          </View>
        )}

        {/* 标题/日期/天气区块 */}
        <View style={styles.infoCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("diary.title")}</Text>
              <Text style={styles.statValue}>{item.title}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{t("diary.date")}</Text>
              <Text style={styles.statValue}>{item.date}</Text>
            </View>
            {weatherEmoji ? (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t("diary.weather")}</Text>
                <Text style={styles.statValue}>{weatherEmoji} {(() => { const w = item.weather; return w ? t(`diary.weather${w.charAt(0).toUpperCase() + w.slice(1)}`) : ''; })()}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 正文区块 */}
        {item.content ? (
          <View style={styles.contentCard}>
            <Text style={styles.statLabel}>{t("diary.content")}</Text>
            <Text style={styles.contentText}>{item.content}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomRow}>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.8 }]}
            onPress={handleDelete}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Trash2 size={14} color={colors.accent.red} />
              <Text style={styles.deleteBtnText}>{t("common.delete")}</Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => router.push(`/diary/add?id=${id}`)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Pencil size={14} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{t("common.edit")}</Text>
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
        description={t("diary.deleteConfirm")}
      />
      <ImagePreviewModal
        imageUri={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </View>
  );
}

function buildStyles(colors, shadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
    scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.huge, gap: spacing.lg },
    detailImage: { width: "100%", height: 220, borderRadius: radius.xl, borderCurve: "continuous", backgroundColor: colors.primaryBg },
    imagePlaceholder: { width: "100%", height: 220, borderRadius: radius.xl, borderCurve: "continuous", backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center" },
    imageBrokenText: { color: colors.textTertiary, fontSize: 12, marginTop: 6, fontWeight: "500" },
    infoCard: {
      backgroundColor: colors.surfaceFrost, borderRadius: radius.xl, borderCurve: "continuous",
      padding: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.card,
    },
    statsGrid: { gap: spacing.lg },
    statItem: { gap: spacing.xs },
    statLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: "500", lineHeight: 16 },
    statValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "600", lineHeight: 20 },
    contentCard: {
      backgroundColor: colors.surfaceFrost, borderRadius: radius.xl, borderCurve: "continuous",
      padding: spacing.xl, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadows.card,
    },
    contentText: { color: colors.textPrimary, fontSize: 15, fontWeight: "400", lineHeight: 26 },
    bottomBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceFrost },
    bottomRow: { flexDirection: "row", gap: spacing.md },
    deleteBtn: {
      flex: 1, paddingVertical: 10, borderRadius: radius.lg, borderCurve: "continuous",
      borderWidth: 1, borderColor: hexToRgba(colors.accent.red, 0.3), alignItems: "center",
    },
    deleteBtnText: { color: colors.accent.red, fontSize: 13, fontWeight: "700" },
    saveBtn: { flex: 2, paddingVertical: 10, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", ...shadows.lg },
    saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  });
}
