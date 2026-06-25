import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { CalendarDays, Clock, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme, radius } from "../utils/theme";
import { MAX_YEAR_DEFAULT, MIN_YEAR_DEFAULT, STORAGE_KEYS } from "../utils/constant";

const FORMAT_MAP = {
  date: "YYYY-MM-DD",
  time: "HH:mm",
  datetime: "YYYY-MM-DD HH:mm",
};

const TITLE_MAP = {
  date: "common.selectDate",
  time: "common.selectTime",
  datetime: "common.selectDateTime",
};

let NativeDateTimePicker = null;
if (Platform.OS === "ios" || Platform.OS === "android") {
  try {
    NativeDateTimePicker =
      require("@react-native-community/datetimepicker").default;
  } catch {}
}

const normalizeMode = (mode) =>
  Object.prototype.hasOwnProperty.call(FORMAT_MAP, mode) ? mode : "date";

const parseDateValue = (value, mode) => {
  if (!value) return null;

  const parsed =
    mode === "time"
      ? dayjs(`${dayjs().format("YYYY-MM-DD")} ${value}`)
      : dayjs(value);

  return parsed.isValid() ? parsed : null;
};

const formatDateValue = (date, mode) => dayjs(date).format(FORMAT_MAP[mode]);

const mergeDateAndTime = (datePart, timePart) =>
  dayjs(datePart)
    .hour(dayjs(timePart).hour())
    .minute(dayjs(timePart).minute())
    .second(0)
    .millisecond(0)
    .toDate();

const toWebInputValue = (date, mode) => {
  if (mode === "datetime") return dayjs(date).format("YYYY-MM-DDTHH:mm");
  if (mode === "time") return dayjs(date).format("HH:mm");
  return dayjs(date).format("YYYY-MM-DD");
};

const parseWebInputValue = (raw, mode) => {
  if (!raw) return null;

  const parsed =
    mode === "time"
      ? dayjs(`${dayjs().format("YYYY-MM-DD")} ${raw}`)
      : dayjs(raw);

  return parsed.isValid() ? parsed.toDate() : null;
};

export default function DatePickerField({
  value,
  onChange,
  placeholder,
  mode = "date",
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
  const pickerMode = normalizeMode(mode);
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

  const parsedValue = parseDateValue(value, pickerMode);
  const hasValue = Boolean(parsedValue);
  const dateValue = parsedValue ? parsedValue.toDate() : new Date();
  const displayValue = parsedValue
    ? parsedValue.format(FORMAT_MAP[pickerMode])
    : "";
  const minDate = dayjs(`${minYear}-01-01`).toDate();
  const maxDate = dayjs(`${maxYear}-12-31`).toDate();

  const handleConfirm = useCallback(
    (d) => {
      setOpen(false);
      onChange(formatDateValue(d, pickerMode));
    },
    [onChange, pickerMode],
  );

  const isNative = Platform.OS === "ios" || Platform.OS === "android";

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          pressed && styles.triggerPressed,
          hasValue ? styles.triggerActive : null,
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.triggerLeft}>
          {pickerMode === "time" ? (
            <Clock
              size={16}
              color={hasValue ? colors.primary : colors.input.icon}
            />
          ) : (
            <CalendarDays
              size={16}
              color={hasValue ? colors.primary : colors.input.icon}
            />
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

      {isNative ? (
        open ? (
          <NativePicker
            dateValue={dateValue}
            mode={pickerMode}
            minDate={minDate}
            maxDate={maxDate}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        ) : null
      ) : open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <WebPicker
            dateValue={dateValue}
            mode={pickerMode}
            minDate={minDate}
            maxDate={maxDate}
            onConfirm={handleConfirm}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      ) : null}
    </View>
  );
}

// ── iOS / Android: Expo-supported community date time picker ──
function NativePicker({ dateValue, mode, minDate, maxDate, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => buildStyles(colors), [colors]);
  const [date, setDate] = useState(dateValue);
  const [androidMode, setAndroidMode] = useState(
    mode === "datetime" ? "date" : mode,
  );

  if (!NativeDateTimePicker) return null;

  if (Platform.OS === "android") {
    return (
        <NativeDateTimePicker
          value={date}
          mode={androidMode}
          display="default"
          minuteInterval={1}
          minimumDate={minDate}
          maximumDate={maxDate}
          onDismiss={onCancel}
        onValueChange={(_, selectedDate) => {
          if (!selectedDate) return;

          if (mode === "datetime" && androidMode === "date") {
            setDate(mergeDateAndTime(selectedDate, date));
            setAndroidMode("time");
            return;
          }

          onConfirm(androidMode === "time" ? mergeDateAndTime(date, selectedDate) : selectedDate);
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.overlay} onPress={onCancel} />
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={onCancel} style={styles.pickerBtn}>
              <Text style={styles.pickerBtnCancel}>{t("common.cancel")}</Text>
            </Pressable>
            <Text style={styles.pickerTitle}>{t(TITLE_MAP[mode])}</Text>
            <Pressable onPress={() => onConfirm(date)} style={styles.pickerBtn}>
              <Text style={styles.pickerBtnConfirm}>{t("common.confirm")}</Text>
            </Pressable>
          </View>
          <View style={styles.pickerBody}>
            <NativeDateTimePicker
              value={date}
              mode={mode}
              display="spinner"
              minuteInterval={1}
              minimumDate={minDate}
              maximumDate={maxDate}
              onValueChange={(_, selectedDate) => {
                if (selectedDate) setDate(selectedDate);
              }}
              style={styles.inlinePicker}
              textColor={colors.textPrimary}
              themeVariant="light"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Web: native HTML input triggered by click ──
function WebPicker({ dateValue, mode, minDate, maxDate, onConfirm, onCancel }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const [draftValue, setDraftValue] = useState(() =>
    toWebInputValue(dateValue, mode),
  );

  const inputType =
    mode === "time" ? "time" : mode === "date" ? "date" : "datetime-local";

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleConfirm = () => {
    const nextDate = parseWebInputValue(draftValue, mode);
    if (nextDate) onConfirm(nextDate);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        width: "100vw",
        height: "100vh",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: colors.modalBg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: "0 -4px 24px rgba(166,119,182,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid #E8E8ED",
          }}
        >
          <button
            onClick={onCancel}
            type="button"
            style={{
              border: "none",
              background: "none",
              fontSize: 16,
              color: "#7A7299",
              cursor: "pointer",
              padding: 4,
            }}
          >
            {t("common.cancel")}
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#F0EDF5", flex: 1, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t(TITLE_MAP[mode])}
          </span>
          <button
            onClick={handleConfirm}
            type="button"
            style={{
              border: "none",
              background: "none",
              fontSize: 16,
              fontWeight: 600,
              color: "#A677B6",
              cursor: "pointer",
              padding: 4,
            }}
          >
            {t("common.confirm")}
          </button>
        </div>
        <div style={{ padding: "24px 20px", textAlign: "center" }}>
          <input
            ref={inputRef}
            type={inputType}
            value={draftValue}
            min={toWebInputValue(minDate, mode)}
            max={toWebInputValue(maxDate, mode)}
            onChange={(e) => setDraftValue(e.target.value)}
            style={{
              width: "100%",
              height: 48,
              fontSize: 18,
              padding: "0 16px",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              outline: "none",
              color: "#F0EDF5",
              fontFamily: "system-ui, -apple-system, sans-serif",
              textAlign: "center",
              boxSizing: "border-box",
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
  wrap: {
    gap: 8,
    width: "100%",
  },
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
  pickerContainer: {
    backgroundColor: colors.modalBg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingBottom: Platform.OS === "ios" ? 34 : 12,
    zIndex: 100000,
    ...Platform.select({
      ios: {
        shadowColor: "#A677B6",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerBtn: {
    minWidth: 52,
    alignItems: "center",
  },
  pickerBtnCancel: {
    color: colors.textTertiary,
    fontSize: 16,
    fontWeight: "500",
  },
  pickerBtnConfirm: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  pickerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  pickerBody: {
    alignItems: "center",
    paddingVertical: 12,
  },
  inlinePicker: {
    height: 216,
  },
  });
}
