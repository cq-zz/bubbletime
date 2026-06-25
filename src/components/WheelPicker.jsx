import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { CalendarDays, Clock, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, radius } from "../utils/theme";
import { MAX_YEAR_DEFAULT, MIN_YEAR_DEFAULT, STORAGE_KEYS } from "../utils/constant";

const LEVEL_CONFIG = {
  year: { cols: ["year"], format: "YYYY", title: "common.selectYear" },
  month: { cols: ["year", "month"], format: "YYYY-MM", title: "common.selectYearMonth" },
  date: { cols: ["year", "month", "day"], format: "YYYY-MM-DD", title: "common.selectDate" },
  hour: { cols: ["year", "month", "day", "hour"], format: "YYYY-MM-DD HH", title: "common.selectDateHour" },
  minute: { cols: ["year", "month", "day", "hour", "minute"], format: "YYYY-MM-DD HH:mm", title: "common.selectDateTime" },
};

const COLUMN_WIDTH = 72;
const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const COL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function WheelColumn({ items, selected, colKey, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const ref = useRef(null);
  const timerRef = useRef(null);
  const idx = items.indexOf(selected);
  const initialY = idx >= 0 ? idx * ITEM_HEIGHT : 0;

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialY, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, []);

  const handleScroll = useCallback((e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const currentOffset = e.nativeEvent.contentOffset.y;
    const index = Math.round(currentOffset / ITEM_HEIGHT);
    timerRef.current = setTimeout(() => {
      const val = items[index];
      if (val !== undefined && val !== selected) {
        onChange(colKey, val);
      }
      const targetY = index * ITEM_HEIGHT;
      if (Math.abs(currentOffset - targetY) > 2) {
        ref.current?.scrollTo({ y: targetY, animated: true });
      }
    }, 120);
  }, [items, selected, colKey, onChange]);

  return (
    <View style={[styles.col, { height: COL_HEIGHT }]}>
      <View style={[styles.colHighlight, { pointerEvents: "none" }]} />
      <ScrollView
        ref={ref}
        contentContainerStyle={{ paddingVertical: (COL_HEIGHT - ITEM_HEIGHT) / 2 }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={80}
      >
        {items.map((item) => (
          <View key={item} style={styles.colItem}>
            <Text
              style={[
                styles.colItemText,
                item === selected && styles.colItemTextActive,
              ]}
            >
              {colKey === "year" ? item : pad(item)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function WheelPicker({
  value,
  onChange,
  placeholder,
  level = "date",
  label,
  clearable = true,
  style,
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [minYear, setMinYear] = useState(MIN_YEAR_DEFAULT);
  const [maxYear, setMaxYear] = useState(MAX_YEAR_DEFAULT);
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.date;
  const resolvedPlaceholder = placeholder ?? t("common.pleaseSelect");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.minYear),
      AsyncStorage.getItem(STORAGE_KEYS.maxYear),
    ]).then(([minVal, maxVal]) => {
      if (minVal !== null) setMinYear(Number(minVal));
      if (maxVal !== null) setMaxYear(Number(maxVal));
    });
  }, []);

  const parsed = value ? dayjs(value) : null;
  const hasValue = parsed && parsed.isValid();
  const displayValue = hasValue ? parsed.format(config.format) : "";

  const parts = useMemo(() => {
    const d = hasValue ? parsed : dayjs();
    return {
      year: d.year(),
      month: d.month() + 1,
      day: d.date(),
      hour: d.hour(),
      minute: d.minute(),
    };
  }, [hasValue, parsed]);

  const [draft, setDraft] = useState(parts);

  const draftDaysInMonth = useMemo(
    () => getDaysInMonth(draft.year, draft.month),
    [draft.year, draft.month],
  );

  useEffect(() => {
    if (open) setDraft(parts);
  }, [open, parts]);

  const ranges = useMemo(() => {
    const year = [];
    for (let y = minYear; y <= maxYear; y++) year.push(y);
    const month = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const day = [];
    for (let d = 1; d <= draftDaysInMonth; d++) day.push(d);
    const hour = [];
    for (let h = 0; h < 24; h++) hour.push(h);
    const minute = [];
    for (let m = 0; m < 60; m++) minute.push(m);
    return { year, month, day, hour, minute };
  }, [minYear, maxYear, draftDaysInMonth]);

  const handleColumnChange = useCallback((colKey, val) => {
    setDraft((prev) => {
      const next = { ...prev, [colKey]: val };
      if (colKey === "year" || colKey === "month") {
        const dim = getDaysInMonth(
          colKey === "year" ? val : next.year,
          colKey === "month" ? val : next.month,
        );
        if (next.day > dim) next.day = dim;
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const ds = dayjs(`${draft.year}-${pad(draft.month)}-${pad(draft.day)} ${pad(draft.hour)}:${pad(draft.minute)}`);
    onChange(ds.format(config.format));
    setOpen(false);
  }, [draft, onChange, config.format]);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
          hasValue && styles.triggerActive,
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.triggerLeft}>
          {level === "minute" || level === "hour" ? (
            <Clock size={16} color={hasValue ? colors.primary : colors.input.icon} />
          ) : (
            <CalendarDays size={16} color={hasValue ? colors.primary : colors.input.icon} />
          )}
          <Text
            style={[styles.triggerText, !hasValue && styles.triggerPlaceholder]}
          >
            {displayValue || resolvedPlaceholder}
          </Text>
        </View>
        {clearable && value ? (
          <Pressable
            onPress={(event) => {
              event?.stopPropagation?.();
              onChange("");
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <X size={14} color={colors.textTertiary} />
          </Pressable>
        ) : null}
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
                <Text style={styles.panelTitle}>{t(config.title)}</Text>
                <Pressable onPress={handleConfirm}>
                  <Text style={styles.headerBtnConfirm}>{t("common.confirm")}</Text>
                </Pressable>
              </View>
              <View style={styles.pickerBody}>
                <View style={styles.colsRow}>
                  {config.cols.map((colKey) => (
                    <WheelColumn
                      key={colKey}
                      items={ranges[colKey]}
                      selected={draft[colKey]}
                      colKey={colKey}
                      onChange={handleColumnChange}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
  wrap: { gap: 8, width: "100%" },
  label: {
    paddingLeft: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.input.bg,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    minHeight: 48,
  },
  triggerPressed: {
    backgroundColor: colors.input.bgFocus,
    borderColor: colors.input.borderFocus,
  },
  triggerActive: {
    borderColor: colors.primaryBgMedium,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  triggerText: {
    color: colors.input.text,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
    flexShrink: 1,
  },
  triggerPlaceholder: {
    color: colors.input.placeholder,
    fontWeight: "400",
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceFrost,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 8,
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
    borderBottomColor: colors.borderLight,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: "center",
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
  pickerBody: {
    paddingVertical: 16,
    alignItems: "center",
  },
  colsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 2,
  },
  col: {
    width: COLUMN_WIDTH,
    overflow: "hidden",
    position: "relative",
  },
  colHighlight: {
    position: "absolute",
    top: (VISIBLE_ITEMS * ITEM_HEIGHT - ITEM_HEIGHT) / 2,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBgMedium,
    zIndex: 0,
  },
  colItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  colItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textTertiary,
  },
  colItemTextActive: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  });
}
