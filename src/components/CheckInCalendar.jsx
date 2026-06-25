import { Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchCheckInList, fetchSubmitCheckIn } from "../services/checkIn";
import { MOODS } from "../utils/constant";
import { emit } from "../utils/events";
import { radius, useTheme } from "../utils/theme";

export default function CheckInCalendar({ visible, onClose }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [checkRecords, setCheckRecords] = useState([]);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [pickingDate, setPickingDate] = useState(null);
  const [editingDate, setEditingDate] = useState(false);

  const loadMonth = useCallback(async (y, m) => {
    const res = await fetchCheckInList(y, m);
    if (res.code === 0) setCheckRecords(res.data || []);
  }, []);

  useEffect(() => { loadMonth(viewYear, viewMonth); }, [viewYear, viewMonth, loadMonth]);

  const recordMap = useMemo(() => {
    const map = {};
    checkRecords.forEach((r) => { map[r.check_date] = r.mood; });
    return map;
  }, [checkRecords]);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1).getDay();
    const total = new Date(viewYear, viewMonth, 0).getDate();
    const pad = [];
    for (let i = 0; i < first; i++) pad.push(null);
    const d = [];
    for (let i = 1; i <= total; i++) {
      const dateStr = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const moodKey = recordMap[dateStr];
      const mood = moodKey ? MOODS.find((m) => m.key === moodKey) : null;
      d.push({ day: i, dateStr, checked: !!moodKey, moodKey, emoji: mood ? mood.emoji : null });
    }
    return { pad, days: d };
  }, [viewYear, viewMonth, recordMap]);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayPress = useCallback((dayData) => {
    if (dayData.dateStr > todayStr) return;
    setPickingDate(dayData.dateStr);
    setEditingDate(dayData.checked);
    setShowMoodPicker(true);
  }, [todayStr]);

  const handleMoodSelect = useCallback(async (moodKey) => {
    const date = pickingDate;
    setShowMoodPicker(false);
    setPickingDate(null);
    setEditingDate(false);
    if (!date) return;
    await fetchSubmitCheckIn(moodKey, date);
    loadMonth(viewYear, viewMonth);
    emit("checkin");
  }, [pickingDate, loadMonth, viewYear, viewMonth]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t("checkIn.records")}</Text>
          <View style={styles.navRow}>
            <Pressable onPress={prevMonth} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>{"<"}</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{t("common.yearMonth", { year: viewYear, month: viewMonth })}</Text>
            <Pressable onPress={nextMonth} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>{">"}</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
              <Text key={w} style={styles.weekLabel}>{w}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {days.pad.map((_, i) => <View key={`pad-${i}`} style={styles.dayCell} />)}
              {days.days.map((d) => (
              <Pressable
                key={d.dateStr}
                style={({ pressed }) => [
                  styles.dayCell,
                  d.dateStr <= todayStr && styles.dayCellTappable,
                  pressed && d.dateStr <= todayStr && styles.dayCellPressed,
                ]}
                onPress={() => handleDayPress(d)}
                disabled={d.dateStr > todayStr}
              >
                <Text style={[styles.dayText, d.checked && styles.dayTextChecked]}>
                  {d.day}
                </Text>
                {d.emoji ? (
                  <>
                    <Text style={styles.dayEmoji}>{d.emoji}</Text>
                    <Text style={styles.dayMoodLabel} numberOfLines={1}>{t("checkIn.mood." + d.moodKey)}</Text>
                  </>
                ) : d.dateStr <= todayStr ? (
                  <View style={styles.dayAddBadge}>
                    <Plus size={8} color={colors.textTertiary} />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t("common.close")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <Modal visible={showMoodPicker} transparent animationType="fade" onRequestClose={() => { setShowMoodPicker(false); setPickingDate(null); }}>
        <Pressable style={styles.moodOverlay} onPress={() => setShowMoodPicker(false)}>
          <Pressable style={styles.moodCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.moodTitle}>{editingDate ? t("checkIn.editTitle", { date: pickingDate || "" }) : t("checkIn.backfillTitle", { date: pickingDate || "" })}</Text>
            <Text style={styles.moodScoreHint}>{t("checkIn.moodScoreHint")}</Text>
            <View style={styles.moodGrid}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.key}
                  onPress={() => handleMoodSelect(m.key)}
                  style={({ pressed }) => [
                    styles.moodItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.moodItemEmoji}>{m.emoji}</Text>
                  <Text style={styles.moodItemLabel} numberOfLines={1}>{t("checkIn.mood." + m.key)}</Text>
                  <Text style={styles.moodItemScore}>{m.score}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function buildStyles(colors) {
  const daySize = 36;
  return StyleSheet.create({
    overlay: {
      flex: 1, backgroundColor: colors.modalOverlay, justifyContent: "center", alignItems: "center", paddingHorizontal: 32,
    },
    card: {
      width: "100%", maxWidth: 340, backgroundColor: colors.modalBg, borderRadius: radius.xl, borderCurve: "continuous",
      padding: 24, gap: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center",
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    navRow: { flexDirection: "row", alignItems: "center", gap: 20 },
    arrowBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceFrost },
    arrowText: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    monthLabel: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, minWidth: 100, textAlign: "center" },
    weekRow: { flexDirection: "row", width: "100%", justifyContent: "space-around" },
    weekLabel: { fontSize: 12, fontWeight: "600", color: colors.textTertiary, width: daySize, textAlign: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap", width: "100%" },
    dayCell: { width: `${100 / 7}%`, height: daySize + 18, alignItems: "center", justifyContent: "center", position: "relative" },
    dayCellTappable: {},
    dayCellPressed: { backgroundColor: colors.surfaceFrost, borderRadius: 8 },
    dayText: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
    dayTextChecked: { color: colors.primary, fontWeight: "700" },
    dayEmoji: { fontSize: 14, marginTop: 1 },
    dayMoodLabel: { fontSize: 8, color: colors.textSecondary, lineHeight: 10, marginTop: 1 },
    dayAddBadge: {
      width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center",
      backgroundColor: colors.border, marginTop: 1,
    },
    closeBtn: { width: "100%", height: 44, borderRadius: radius.md, backgroundColor: colors.input.bg, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
    closeText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
    moodOverlay: {
      flex: 1, backgroundColor: colors.modalOverlay, justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
    },
    moodCard: {
      width: "100%", maxWidth: 340, backgroundColor: colors.modalBg, borderRadius: radius.xl, borderCurve: "continuous",
      padding: 20, gap: 14, borderWidth: 1, borderColor: colors.border, maxHeight: "80%",
    },
    moodTitle: {
      fontSize: 15, fontWeight: "700", color: colors.textPrimary, textAlign: "center",
    },
    moodScoreHint: {
      fontSize: 10, color: colors.textTertiary, textAlign: "center", marginBottom: -6,
    },
    moodGrid: {
      flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center",
    },
    moodItem: {
      alignItems: "center", gap: 2, paddingHorizontal: 8, paddingVertical: 6,
      borderRadius: 12, backgroundColor: colors.primaryBg, minWidth: 52,
    },
    moodItemEmoji: { fontSize: 20 },
    moodItemLabel: { fontSize: 10, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
    moodItemScore: { fontSize: 9, fontWeight: "700", color: colors.textTertiary },
  });
}
