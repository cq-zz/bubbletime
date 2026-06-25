import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useTheme, radius } from "../utils/theme";
import { MAX_YEAR_DEFAULT, MIN_YEAR_DEFAULT, STORAGE_KEYS } from "../utils/constant";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const fmtYm = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

export default function ChartRangePicker({
  startYear,
  startMonth,
  endYear,
  endMonth,
  yearOnly,
  onConfirm,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const [locStartYear, setLocStartYear] = useState(startYear);
  const [locStartMonth, setLocStartMonth] = useState(startMonth);
  const [locEndYear, setLocEndYear] = useState(endYear);
  const [locEndMonth, setLocEndMonth] = useState(endMonth);

  const displayText = useMemo(() => {
    if (yearOnly) return `${startYear}-${endYear}`;
    return `${fmtYm(startYear, startMonth)} ~ ${fmtYm(endYear, endMonth)}`;
  }, [startYear, startMonth, endYear, endMonth, yearOnly]);

  const handleOpen = useCallback(() => {
    setLocStartYear(startYear);
    setLocStartMonth(startMonth);
    setLocEndYear(endYear);
    setLocEndMonth(endMonth);
    setOpen(true);
  }, [startYear, startMonth, endYear, endMonth]);

  const handleConfirm = useCallback(() => {
    const sy = locStartYear, ey = locEndYear;
    const sm = yearOnly ? null : locStartMonth;
    const em = yearOnly ? null : locEndMonth;
    if (ey < sy || (!yearOnly && ey === sy && (em || 0) < (sm || 1))) {
      alert(t("common.tip"), t("common.dateRangeInvalid"));
      return;
    }
    onConfirm({ startYear: sy, startMonth: sm, endYear: ey, endMonth: em });
    setOpen(false);
  }, [locStartYear, locStartMonth, locEndYear, locEndMonth, yearOnly, onConfirm, t]);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        onPress={handleOpen}
      >
        <CalendarDays size={16} color={colors.primary} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {displayText}
        </Text>
      </Pressable>

      {open && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.headerBtnCancel}>{t("common.cancel")}</Text>
                </Pressable>
                <Text style={styles.panelTitle}>{t("common.selectTime")}</Text>
                <Pressable onPress={handleConfirm}>
                  <Text style={styles.headerBtnConfirm}>{t("common.confirm")}</Text>
                </Pressable>
              </View>

              {yearOnly ? (
                <YearRangePicker
                  startYear={locStartYear}
                  endYear={locEndYear}
                  onStartChange={setLocStartYear}
                  onEndChange={setLocEndYear}
                />
              ) : (
                <View style={styles.body}>
                  <View style={styles.dualCol}>
                    <View style={styles.colHalf}>
                      <MonthRangeColumn
                        label={t("schedule.startDate")}
                        year={locStartYear}
                        month={locStartMonth}
                        onYearChange={setLocStartYear}
                        onMonthChange={(m) => {
                          setLocStartMonth(m);
                          if (locStartYear === locEndYear && m > locEndMonth) setLocEndMonth(m);
                        }}
                        clampMaxYear={locEndYear}
                        clampMaxMonth={locEndMonth}
                      />
                    </View>
                    <View style={styles.colDivider} />
                    <View style={styles.colHalf}>
                      <MonthRangeColumn
                        label={t("schedule.endDate")}
                        year={locEndYear}
                        month={locEndMonth}
                        onYearChange={setLocEndYear}
                        onMonthChange={(m) => {
                          setLocEndMonth(m);
                          if (locStartYear === locEndYear && m < locStartMonth) setLocStartMonth(m);
                        }}
                        clampMinYear={locStartYear}
                        clampMinMonth={locStartMonth}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function YearRangePicker({ startYear, endYear, onStartChange, onEndChange }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [minYear, setMinYear] = useState(MIN_YEAR_DEFAULT);
  const [maxYear, setMaxYear] = useState(MAX_YEAR_DEFAULT);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.minYear),
      AsyncStorage.getItem(STORAGE_KEYS.maxYear),
    ]).then(([minVal, maxVal]) => {
      if (minVal !== null) setMinYear(Number(minVal));
      if (maxVal !== null) setMaxYear(Number(maxVal));
    });
  }, []);

  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);

  const handleStartTap = (y) => {
    onStartChange(y);
    if (endYear < y) onEndChange(y);
  };

  const handleEndTap = (y) => {
    onEndChange(y);
    if (startYear > y) onStartChange(y);
  };

  const startYears = years.filter((y) => endYear === null || y <= endYear);
  const endYears = years.filter((y) => startYear === null || y >= startYear);

  return (
    <View style={styles.body}>
      <View style={styles.dualCol}>
        <View style={styles.colHalf}>
          <Text style={styles.colHalfLabel}>{t("common.startYear")}</Text>
          <ScrollView
            style={styles.yearColScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {startYears.map((y) => (
              <Pressable
                key={y}
                style={[
                  styles.yearColChip,
                  startYear === y && styles.yearColChipActive,
                ]}
                onPress={() => handleStartTap(y)}
              >
                <Text
                  style={[
                    styles.yearColChipText,
                    startYear === y && styles.yearColChipTextActive,
                  ]}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.colDivider} />

        <View style={styles.colHalf}>
          <Text style={styles.colHalfLabel}>{t("common.endYear")}</Text>
          <ScrollView
            style={styles.yearColScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {endYears.map((y) => (
              <Pressable
                key={y}
                style={[
                  styles.yearColChip,
                  endYear === y && styles.yearColChipActive,
                ]}
                onPress={() => handleEndTap(y)}
              >
                <Text
                  style={[
                    styles.yearColChipText,
                    endYear === y && styles.yearColChipTextActive,
                  ]}
                >
                  {y}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function MonthRangeColumn({ label, year, month, onYearChange, onMonthChange, clampMinYear, clampMaxYear, clampMinMonth, clampMaxMonth }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [viewYear, setViewYear] = useState(year);
  const [minYear, setMinYear] = useState(MIN_YEAR_DEFAULT);
  const [maxYear, setMaxYear] = useState(MAX_YEAR_DEFAULT);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.minYear),
      AsyncStorage.getItem(STORAGE_KEYS.maxYear),
    ]).then(([minVal, maxVal]) => {
      if (minVal !== null) setMinYear(Number(minVal));
      if (maxVal !== null) setMaxYear(Number(maxVal));
    });
  }, []);

  useEffect(() => {
    if (clampMaxYear !== undefined && viewYear > clampMaxYear) setViewYear(clampMaxYear);
    if (clampMinYear !== undefined && viewYear < clampMinYear) setViewYear(clampMinYear);
  }, [clampMinYear, clampMaxYear]);

  const effMin = clampMinYear !== undefined ? Math.max(clampMinYear, minYear) : minYear;
  const effMax = clampMaxYear !== undefined ? Math.min(clampMaxYear, maxYear) : maxYear;

  const months = MONTHS.filter((m) => {
    if (clampMaxYear !== undefined && viewYear === clampMaxYear && clampMaxMonth !== undefined && m > clampMaxMonth) return false;
    if (clampMinYear !== undefined && viewYear === clampMinYear && clampMinMonth !== undefined && m < clampMinMonth) return false;
    return true;
  });

  const rows = [];
  for (let i = 0; i < months.length; i += 4) rows.push(months.slice(i, i + 4));

  return (
    <View style={styles.colHalfInner}>
      <Text style={styles.colHalfLabel}>{label}</Text>
      <View style={styles.yearNav}>
        <Pressable onPress={() => setViewYear((y) => Math.max(y - 1, effMin))} style={styles.yearNavBtn}>
          <ChevronLeft size={14} color={colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => onYearChange(viewYear)}>
          <Text style={[styles.yearNavTitle, year === viewYear && styles.yearActive]}>
            {t("common.yearLabel", { year: viewYear })}
          </Text>
        </Pressable>
        <Pressable onPress={() => setViewYear((y) => Math.min(y + 1, effMax))} style={styles.yearNavBtn}>
          <ChevronRight size={14} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.monthGrid}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.monthRow}>
            {row.map((m) => {
              const isActive = year === viewYear && month === m;
              return (
                <Pressable
                  key={m}
                  style={[styles.monthCell, isActive && styles.monthCellActive]}
                  onPress={() => { onYearChange(viewYear); onMonthChange(m); }}
                >
                  <Text style={[styles.monthCellText, isActive && styles.monthCellTextActive]}>
                    {t("common.monthOnly", { month: m })}
                  </Text>
                </Pressable>
              );
            })}
            {ri === rows.length - 1 && row.length < 4 && (
              Array.from({ length: 4 - row.length }).map((_, i) => (
                <View key={`e-${i}`} style={styles.monthCellEmpty} />
              ))
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function buildStyles(colors) {
  const shadows = { glow: Platform.select({ ios: { shadowColor: "#A677B6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20 }, default: { boxShadow: "0 0 20px rgba(166,119,182,0.3)" } }) };
  return StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderCurve: "continuous",
  },
  triggerPressed: { opacity: 0.8 },
  triggerText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 99999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
  },
  panel: {
    backgroundColor: colors.modalBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    zIndex: 100000,
    maxHeight: "80%",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    flexShrink: 1,
  },
  headerBtnCancel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  headerBtnConfirm: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  colHalfInner: {
    paddingTop: 8,
  },
  colHalfLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  yearNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  yearNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceFrost,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearNavTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  yearActive: {
    color: colors.primary,
  },
  monthGrid: { gap: 6, marginBottom: 8 },
  monthRow: { flexDirection: "row", gap: 6 },
  monthCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthCellActive: {
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  monthCellTextActive: {
    color: "#fff",
  },
  monthCellEmpty: {
    flex: 1,
  },
  dualCol: {
    flexDirection: "row",
    gap: 0,
    minHeight: 260,
    maxHeight: 420,
  },
  colHalf: {
    flex: 1,
  },
  colDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  yearColScroll: {
    flex: 1,
  },
  yearColChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginBottom: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearColChipActive: {
    backgroundColor: colors.primary,
  },
  yearColChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  yearColChipTextActive: {
    color: "#fff",
  },
  });
}
