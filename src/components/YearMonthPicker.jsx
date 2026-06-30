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
const YEARS_PER_ROW = 4;

export default function YearMonthPicker({
  year,
  month, // null = 全年
  onChange, // ({ year, month }) => {}
  style,
  yearOnly, // true => only year selector, no month grid
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const displayText = useMemo(() => {
    if (yearOnly) return `${year}`;
    if (month) return t("common.yearMonth", { year, month });
    return t("common.yearFull", { year });
  }, [year, month, t, yearOnly]);

  const handleSelect = useCallback(
    (y, m) => {
      onChange({ year: y, month: m });
      setOpen(false);
    },
    [onChange],
  );

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
        ]}
        onPress={() => setOpen(true)}
      >
        <CalendarDays size={16} color={colors.primary} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {displayText}
        </Text>
      </Pressable>

      {open && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <PickerPanel
            currentYear={year}
            currentMonth={month}
            onSelect={handleSelect}
            onClose={() => setOpen(false)}
            yearOnly={yearOnly}
          />
        </Modal>
      )}
    </View>
  );
}

function PickerPanel({ currentYear, currentMonth, onSelect, onClose, yearOnly }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [viewYear, setViewYear] = useState(currentYear);
  const [localMonth, setLocalMonth] = useState(currentMonth);
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

  const handleYearChange = (y) => {
    setViewYear(y);
    setLocalMonth(null); // reset month selection when year changes
  };

  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [minYear, maxYear]);

  return (
    <View style={styles.modalRoot}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.panelHeader}>
          <Pressable onPress={onClose}>
            <Text style={styles.headerBtnCancel}>{t("common.cancel")}</Text>
          </Pressable>
          <Text style={styles.panelTitle}>{t("common.selectTime")}</Text>
          {yearOnly ? (
            <Pressable onPress={() => onSelect(viewYear, null)}>
              <Text style={styles.headerBtnConfirm}>{t("common.confirm")}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => onSelect(viewYear, localMonth)}>
              <Text style={styles.headerBtnConfirm}>{t("common.confirm")}</Text>
            </Pressable>
          )}
        </View>

        {!yearOnly && (
          <>
            {/* Month grid */}
            <View style={styles.monthGrid}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.monthRow}>
                  {MONTHS.slice(
                    row * YEARS_PER_ROW,
                    row * YEARS_PER_ROW + YEARS_PER_ROW,
                  ).map((m) => {
                    const isActive = localMonth === m;
                    return (
                      <Pressable
                        key={m}
                        style={[
                          styles.monthCell,
                          isActive && styles.monthCellActive,
                        ]}
                        onPress={() => setLocalMonth(localMonth === m ? null : m)}
                      >
                        <Text
                          style={[
                            styles.monthCellText,
                            isActive && styles.monthCellTextActive,
                          ]}
                        >
                          {t("common.monthOnly", { month: m })}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Year selector */}
        <View style={styles.yearHeader}>
          <Pressable
            onPress={() => handleYearChange(Math.max(viewYear - 1, minYear))}
            style={styles.yearNavBtn}
          >
            <ChevronLeft size={16} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.yearHeaderTitle}>{t("common.yearLabel", { year: viewYear })}</Text>
          <Pressable
            onPress={() => handleYearChange(Math.min(viewYear + 1, maxYear))}
            style={styles.yearNavBtn}
          >
            <ChevronRight size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Year grid (scrollable) */}
        <View style={styles.yearSection}>
          <Text style={styles.yearSectionLabel}>{t("common.quickJumpYear")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.yearGridRow}
          >
            {years.map((y) => {
              const isActive = currentYear === y;
              return (
                <Pressable
                  key={y}
                  style={[styles.yearChip, isActive && styles.yearChipActive]}
                  onPress={() => handleYearChange(y)}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      isActive && styles.yearChipTextActive,
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function buildStyles(colors) {
  const shadows = { glow: Platform.select({ ios: { shadowColor: "#A677B6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20 }, default: { boxShadow: "0 0 20px rgba(166,119,182,0.3)" } }) };
  return StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
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
  triggerPressed: {
    opacity: 0.8,
  },
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    zIndex: 100000,
    ...Platform.select({
      ios: {
        shadowColor: "#A677B6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
    }),
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerBtnCancel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  headerBtnConfirm: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  yearHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  yearHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  yearNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceFrost,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthGrid: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  monthRow: {
    flexDirection: "row",
    gap: 8,
  },
  monthCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
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
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  monthCellTextActive: {
    color: "#fff",
  },
  yearSection: {
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  yearSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  yearGridRow: {
    flexDirection: "row",
    gap: 6,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceFrost,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearChipActive: {
    backgroundColor: colors.primaryBgStrong,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textTertiary,
  },
  yearChipTextActive: {
    color: colors.textInverse,
  },
  });
}
