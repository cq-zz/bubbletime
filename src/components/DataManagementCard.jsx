import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Download,
    RotateCcw,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as XLSX from "xlsx";

import { useTheme, hexToRgba, radius } from "../utils/theme";
import useAlert from "../hooks/useAlert";
import { clearAllData, getAll } from "../services/database";
import { getCustomCategories } from "../services/category";
import { emit } from "../utils/events";
import {
    CURRENCY_LIST,
    MAX_YEAR_DEFAULT,
    MIN_YEAR_DEFAULT,
    MOODS,
    STORAGE_KEYS,
    SCHEDULE_STATUS_OPTIONS,
} from "../utils/constant";

const DURABLE_STATUS_LABELS_KEYS = {
  in_use: "durable.inUse",
  scrapped: "durable.scrapped",
  transferred: "durable.transferred",
  idle: "durable.idle",
  repairing: "durable.repairing",
};
const SCHEDULE_STATUS_LABELS_KEYS = Object.fromEntries(
  SCHEDULE_STATUS_OPTIONS.map((o) => [o.value, o.i18nKey]),
);
const EXPORT_MODULE_OPTIONS = [
  { id: "durable", i18nKey: "home.durable" },
  { id: "bills", i18nKey: "home.bills" },
  { id: "schedule", i18nKey: "home.schedule" },
  { id: "important-date", i18nKey: "home.importantDate" },
  { id: "mood-trend", i18nKey: "moodTrend.title" },
];

const CURRENCY_SYMBOL_MAP = {};
CURRENCY_LIST.forEach((c) => { CURRENCY_SYMBOL_MAP[c.code] = c.icon; });

export default function DataManagementCard({ style }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { alert } = useAlert();
  const styles = useMemo(() => buildStyles(colors), [colors]);

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModule, setExportModule] = useState("");
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportMode, setExportMode] = useState("month");
  const [minYear, setMinYear] = useState(MIN_YEAR_DEFAULT);
  const [maxYear, setMaxYear] = useState(MAX_YEAR_DEFAULT);
  const [customCatMap, setCustomCatMap] = useState({});

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.minYear),
      AsyncStorage.getItem(STORAGE_KEYS.maxYear),
    ]).then(([minVal, maxVal]) => {
      if (minVal !== null) setMinYear(Number(minVal));
      if (maxVal !== null) setMaxYear(Number(maxVal));
    });
    getCustomCategories().then((cats) => {
      setCustomCatMap(Object.fromEntries(cats.map((c) => [c.key, c.name])));
    }).catch(() => {});
  }, []);

  const handleClearData = useCallback(async () => {
    setClearing(true);
    try {
      await clearAllData();
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      setShowClearModal(false);
      alert(t("common.cleared"), t("settings.resetSuccess"));
      emit("dataReset");
      if (Platform.OS === "web") {
        window.location.reload();
      }
    } catch (e) {
      console.error("重置数据失败:", e);
    } finally {
      setClearing(false);
    }
  }, [alert, t]);

  const handleExportData = useCallback(async () => {
    if (!exportModule) return;
    setExporting(true);
    try {
      const DURABLE_STATUS_LABELS = {};
      for (const [key, tKey] of Object.entries(DURABLE_STATUS_LABELS_KEYS)) {
        DURABLE_STATUS_LABELS[key] = t(tKey);
      }
      const SCHEDULE_STATUS_LABELS = {};
      for (const [key, tKey] of Object.entries(SCHEDULE_STATUS_LABELS_KEYS)) {
        SCHEDULE_STATUS_LABELS[key] = t(tKey);
      }
      const PRIORITY_LABELS = {
        high: t("schedule.highPriority"),
        medium: t("schedule.mediumPriority"),
        low: t("schedule.lowPriority"),
      };
      const BILL_TYPE_LABELS = {
        expense: t("bills.expense"),
        income: t("bills.income"),
        transfer: t("bills.transfer"),
      };

      const tableMap = { durable: "durables", bills: "bills", schedule: "schedules", "important-date": "important_dates", "mood-trend": "check_ins" };
      const allItems = await getAll(tableMap[exportModule]);

      const filterByDate = (items, dateField) => {
        if (exportMode === "year") {
          return items.filter((item) => {
            const d = item[dateField] || "";
            return d.startsWith(`${exportYear}`);
          });
        }
        const monthStr = `${exportYear}-${String(exportMonth).padStart(2, "0")}`;
        return items.filter((item) => {
          const d = item[dateField] || "";
          return d.startsWith(monthStr);
        });
      };

      const dateFields = { durable: "purchase_date", bills: "consumption_date", schedule: "end_date", "important-date": "date", "mood-trend": "check_date" };
      const filteredItems = filterByDate(allItems, dateFields[exportModule]);

      if (filteredItems.length === 0) {
        const dateStr = exportMode === "year"
          ? t("settings.yearSuffix", { year: exportYear })
          : t("settings.yearMonthSuffix", { year: exportYear, month: exportMonth });
        const msg = t("settings.noExportData", { date: dateStr });
        if (Platform.OS === "web") { window.alert(`${t("settings.noDataTitle")}\n${msg}`); }
        else { alert(t("settings.noDataTitle"), msg); }
        return;
      }

      setProcessing(true);
      let ExcelJS;
      try { ExcelJS = require("exceljs/dist/exceljs.min.js"); } catch {}
      const wb = ExcelJS ? new ExcelJS.Workbook() : null;

      const safeVal = (v) => v == null ? "" : (typeof v === "object" || Array.isArray(v) ? JSON.stringify(v) : v);

      const resolveCat = (key, catName) => {
        if (!key) return "";
        if (["food","clothing","transport","medical","home","appliance","digital","entertainment","daily","education","other"].includes(key)) {
          return t("categories." + key);
        }
        return catName || customCatMap[key] || key;
      };

      const buildSheet = async (sheetName, headers, items, rowValuesFn, imageCol) => {
        const ws = wb.addWorksheet(sheetName);
        headers.forEach((h, i) => { ws.getColumn(i + 1).width = 16; });
        const hr = ws.getRow(1);
        headers.forEach((h, i) => { hr.getCell(i + 1).value = h; });
        hr.font = { bold: true };
        items.forEach((item, idx) => {
          const rn = idx + 2;
          const vals = rowValuesFn(item);
          vals.forEach((v, i) => { ws.getRow(rn).getCell(i + 1).value = v; });
        });
      };

      let headers, IMG_COL, prepData, sheetKey;
      if (exportModule === "durable") {
        headers = [t("settings.excelDurableName"), t("settings.excelDurableCategory"), t("settings.excelDurableStatus"), t("settings.excelDurablePurchaseDate"), t("settings.excelDurablePurchasePrice"), t("settings.excelDurableExpectedLifespan"), t("settings.excelDurableExpiryDate"), t("settings.excelDurableCurrency"), t("settings.excelDurableExpenses"), t("settings.excelDurableIncomes"), t("settings.excelDurableNotes"), t("settings.excelDurableCreatedAt"), t("settings.excelDurableUpdatedAt")];
        IMG_COL = -1;
        prepData = filteredItems.map((item) => {
          let otherExpenses = [], otherIncomes = [];
          try { const rr = JSON.parse(item.repair_record || "{}"); if (Array.isArray(rr)) { otherExpenses = rr; } else { otherExpenses = rr.expenses || []; otherIncomes = rr.incomes || []; } } catch {}
          const currCode = item.currency || "CNY";
          return { vals: [safeVal(item.name), safeVal(resolveCat(item.category)), safeVal(DURABLE_STATUS_LABELS[item.status] || item.status || ""), safeVal(item.purchase_date ?? ""), safeVal(item.purchase_price ?? 0), safeVal(item.expected_lifespan ?? ""), safeVal(item.expiry_date ?? ""), safeVal(CURRENCY_SYMBOL_MAP[currCode] || currCode), otherExpenses.map((e, i) => `${i+1}. ${safeVal(e.name ?? "")}: ${safeVal(e.cost ?? "")}${e.category ? ` (${resolveCat(e.category)})` : ""}${e.date ? ` [${e.date}]` : ""}`).join("\n"), otherIncomes.map((e, i) => `${i+1}. ${safeVal(e.name ?? "")}: ${safeVal(e.cost ?? "")}${e.category ? ` (${resolveCat(e.category)})` : ""}${e.date ? ` [${e.date}]` : ""}`).join("\n"), safeVal(item.notes ?? ""), safeVal(item.created_at ?? ""), safeVal(item.updated_at ?? "")] };
        });
        sheetKey = "settings.excelSheetDurable";
      } else if (exportModule === "bills") {
        headers = [t("settings.excelBillName"), t("settings.excelBillType"), t("settings.excelBillAmount"), t("settings.excelBillCategory"), t("settings.excelBillDate"), t("settings.excelBillSource"), t("settings.excelBillSourceId"), t("settings.excelBillNotes"), t("settings.excelBillCreatedAt")];
        IMG_COL = -1;
        prepData = filteredItems.map((item) => ({ vals: [safeVal(item.name ?? ""), safeVal(BILL_TYPE_LABELS[item.bill_type] || item.bill_type || ""), safeVal(item.amount ?? 0), safeVal(resolveCat(item.category)), safeVal(item.consumption_date ?? ""), safeVal(item.source ?? ""), safeVal(item.source_id ?? ""), safeVal(item.notes ?? ""), safeVal(item.created_at ?? "")] }));
        sheetKey = "settings.excelSheetBills";
      } else if (exportModule === "schedule") {
        headers = [t("settings.excelScheduleTitle"), t("settings.excelSchedulePriority"), t("settings.excelScheduleStatus"), t("settings.excelScheduleStartDate"), t("settings.excelScheduleEndDate"), t("settings.excelScheduleReminder"), t("settings.excelScheduleChecklist"), t("settings.excelScheduleNotes"), t("settings.excelScheduleCreatedAt")];
        IMG_COL = -1;
        prepData = filteredItems.map((item) => {
          let checklistItems = [];
          try { checklistItems = JSON.parse(item.checklist || "[]"); } catch {}
          return { vals: [safeVal(item.title ?? ""), safeVal(PRIORITY_LABELS[item.priority] || item.priority || ""), safeVal(SCHEDULE_STATUS_LABELS[item.status] || item.status || ""), safeVal(item.start_date ?? ""), safeVal(item.end_date ?? ""), item.reminder_enabled ? t("common.yes") : t("common.no"), checklistItems.map((c, i) => `${i+1}. [${c.done ? "✓" : "☐"}] ${safeVal(c.text ?? "")}`).join("\n"), safeVal(item.notes ?? ""), safeVal(item.created_at ?? "")] };
        });
        sheetKey = "settings.excelSheetSchedule";
      } else if (exportModule === "important-date") {
        headers = [t("settings.excelImportantDateName"), t("settings.excelImportantDateDate"), t("settings.excelImportantDateType"), t("settings.excelImportantDateCategory"), t("settings.excelImportantDateReminder"), t("settings.excelImportantDateNotes"), t("settings.excelImportantDateCreatedAt")];
        IMG_COL = -1;
        prepData = filteredItems.map((item) => ({ vals: [safeVal(item.name ?? ""), safeVal(item.date ?? ""), item.type === "annual" ? t("importantDate.typeAnnual") : t("importantDate.typeOnce"), t(`importantDate.category${item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "Other"}`), item.reminder_enabled ? t("common.yes") : t("common.no"), safeVal(item.notes ?? ""), safeVal(item.created_at ?? "")] }));
        sheetKey = "settings.excelSheetImportantDate";
      } else if (exportModule === "mood-trend") {
        headers = [t("settings.excelMoodDate"), t("settings.excelMoodMood"), t("settings.excelMoodCreatedAt")];
        IMG_COL = -1;
        prepData = filteredItems.map((item) => {
          const mood = item.mood ? MOODS.find((m) => m.key === item.mood) : null;
          return { vals: [safeVal(item.check_date ?? ""), mood ? t("checkIn.mood." + mood.key) + " (" + mood.emoji + " " + mood.score + "/5)" : safeVal(item.mood ?? ""), safeVal(item.created_at ?? "")] };
        });
        sheetKey = "settings.excelSheetMood";
      }

      if (Platform.OS === "web") {
        const wbX = XLSX.utils.book_new();
        const toAoa = (h, rows) => rows.length === 0 ? [[t("settings.excelNoDataHint")]] : [h, ...rows.map((r) => r.vals)];
        XLSX.utils.book_append_sheet(wbX, XLSX.utils.aoa_to_sheet(toAoa(headers, prepData)), t(sheetKey));
        const wbout = XLSX.write(wbX, { type: "array", bookType: "xlsx" });
        const dateStr = exportMode === "year"
          ? t("settings.yearSuffix", { year: exportYear })
          : t("settings.yearMonthSuffix", { year: exportYear, month: exportMonth });
        const moduleName = t(sheetKey);
        const safeFileName = t("settings.exportFileName", { date: dateStr, module: moduleName }).replace(/[/\\]/g, "-").replace(/(\.\w+)$/, `_${new Date().toISOString().replace(/[:T.]/g, "").slice(0, 15)}$1`);
        const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = safeFileName;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setProcessing(true);
        setExporting(false);
        const dateStr = exportMode === "year"
          ? t("settings.yearSuffix", { year: exportYear })
          : t("settings.yearMonthSuffix", { year: exportYear, month: exportMonth });
        const moduleName = t(sheetKey);
        const safeFileName = t("settings.exportFileName", { date: dateStr, module: moduleName }).replace(/[/\\]/g, "-").replace(/(\.\w+)$/, `_${new Date().toISOString().replace(/[:T.]/g, "").slice(0, 15)}$1`);

        let buf;
        if (ExcelJS) {
          await buildSheet(t(sheetKey), headers, prepData, (r) => r.vals, IMG_COL);
          buf = await wb.xlsx.writeBuffer();
        } else {
          const wbX = XLSX.utils.book_new();
          const toAoa = (h, rows) => rows.length === 0 ? [[t("settings.excelNoDataHint")]] : [h, ...rows.map((r) => r.vals)];
          XLSX.utils.book_append_sheet(wbX, XLSX.utils.aoa_to_sheet(toAoa(headers, prepData)), t(sheetKey));
          buf = XLSX.write(wbX, { type: "array", bookType: "xlsx" });
        }
        setProcessing(false);
        setExporting(true);
        const bytes = new Uint8Array(buf);
        const file = new File(Paths.cache, safeFileName);
        if (file.exists) file.delete();
        file.create();
        file.write(bytes);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", dialogTitle: t("settings.exportTitle") });
        } else { alert(t("common.error"), t("common.error")); }
      }
      setShowExportModal(false);
    } catch (e) {
      alert(t("common.error"), e?.message || t("common.error"));
    } finally {
      setProcessing(false);
      setExporting(false);
    }
  }, [exportModule, exportMode, exportYear, exportMonth, customCatMap, alert, t]);

  return (
    <View style={style}>
      <Pressable
        style={({ pressed }) => [styles.dataActionItem, pressed && styles.dataActionItemPressed]}
        onPress={() => { setShowExportModal(true); }}
      >
        <View style={styles.dataActionLeft}>
          <View style={[styles.dataActionIcon, { backgroundColor: hexToRgba("#7B9FD4", 0.12) }]}>
            <Download size={18} color="#7B9FD4" />
          </View>
          <View style={styles.dataActionText}>
            <Text style={styles.dataActionLabel}>{t("settings.exportData")}</Text>
            <Text style={styles.dataActionDesc}>{t("settings.exportDataDesc")}</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.dataActionItem, styles.dataActionItemLast, pressed && styles.dataActionItemPressed]}
        onPress={() => setShowClearModal(true)}
      >
        <View style={styles.dataActionLeft}>
          <View style={[styles.dataActionIcon, { backgroundColor: colors.dangerBg }]}>
            <RotateCcw size={18} color={colors.accent.red} />
          </View>
          <View style={styles.dataActionText}>
            <Text style={[styles.dataActionLabel, { color: colors.accent.red }]}>{t("settings.resetData")}</Text>
            <Text style={styles.dataActionDesc}>{t("settings.resetDataDesc")}</Text>
          </View>
        </View>
      </Pressable>

      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={28} color={colors.accent.red} />
            </View>
            <Text style={styles.modalTitle}>{t("settings.confirmReset")}</Text>
            <Text style={styles.modalDesc}>{t("settings.resetWarning")}</Text>
            <View style={styles.modalActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, { flex: 1 }, pressed && { opacity: 0.7 }]}
                onPress={() => setShowClearModal(false)}
                disabled={clearing}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalConfirmBtn, { flex: 1 }, pressed && { opacity: 0.85 }]}
                onPress={handleClearData}
                disabled={clearing}
              >
                <Text style={styles.modalConfirmText}>
                  {clearing ? t("settings.resetting") : t("settings.confirmReset")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => !processing && !exporting && setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalCard}>
            <Text style={styles.exportModalTitle}>{t("settings.exportTitle")}</Text>

            <View style={styles.exportModeRow}>
              <Pressable
                style={[styles.exportModeBtn, exportMode === "month" && styles.exportModeBtnActive]}
                onPress={() => !exporting && setExportMode("month")}
              >
                <Text style={[styles.exportModeText, exportMode === "month" && styles.exportModeTextActive]}>
                  {t("settings.byMonth")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.exportModeBtn, exportMode === "year" && styles.exportModeBtnActive]}
                onPress={() => !exporting && setExportMode("year")}
              >
                <Text style={[styles.exportModeText, exportMode === "year" && styles.exportModeTextActive]}>
                  {t("settings.byYear")}
                </Text>
              </Pressable>
            </View>

            <View style={styles.exportPickerRow}>
              <Text style={styles.exportPickerLabel}>{t("settings.year")}</Text>
              <View style={styles.exportPickerControls}>
                <Pressable style={styles.exportArrowBtn} disabled={exporting || exportYear <= minYear} onPress={() => { if (!exporting && exportYear > minYear) setExportYear((y) => y - 1); }}>
                  <ChevronDown size={18} color={colors.textSecondary} />
                </Pressable>
                <Text style={styles.exportPickerValue}>{exportYear}</Text>
                <Pressable style={styles.exportArrowBtn} disabled={exporting || exportYear >= maxYear} onPress={() => { if (!exporting && exportYear < maxYear) setExportYear((y) => y + 1); }}>
                  <ChevronUp size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {exportMode === "month" && (
              <View style={styles.exportPickerRow}>
                <Text style={styles.exportPickerLabel}>{t("settings.month")}</Text>
                <View style={styles.exportPickerControls}>
                  <Pressable style={styles.exportArrowBtn} onPress={() => !exporting && setExportMonth((m) => (m > 1 ? m - 1 : 12))}>
                    <ChevronDown size={18} color={colors.textSecondary} />
                  </Pressable>
                  <Text style={styles.exportPickerValue}>{exportMonth} {t("settings.month")}</Text>
                  <Pressable style={styles.exportArrowBtn} onPress={() => !exporting && setExportMonth((m) => (m < 12 ? m + 1 : 1))}>
                    <ChevronUp size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.exportHint}>
              {t("settings.exportHint", {
                date: exportMode === "year"
                  ? t("settings.yearSuffix", { year: exportYear })
                  : t("settings.yearMonthSuffix", { year: exportYear, month: exportMonth }),
              })}
            </Text>

            <View style={styles.exportModuleSection}>
              <Text style={styles.exportModuleTitle}>{t("settings.selectExportModule")}</Text>
              <View style={styles.exportModuleRow}>
                {EXPORT_MODULE_OPTIONS.map((mod) => (
                  <Pressable
                    key={mod.id}
                    style={[styles.exportModuleChip, exportModule === mod.id && styles.exportModuleChipActive]}
                    onPress={() => { if (!exporting) setExportModule(mod.id); }}
                  >
                    <View style={[styles.exportModuleRadio, exportModule === mod.id && styles.exportModuleRadioActive]}>
                      {exportModule === mod.id && <View style={styles.exportModuleRadioDot} />}
                    </View>
                    <Text style={[styles.exportModuleChipText, exportModule === mod.id && styles.exportModuleChipTextActive]}>
                      {t(mod.i18nKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!exportModule && <Text style={styles.exportModuleHint}>{t("settings.exportModuleHint")}</Text>}
            </View>

            <View style={styles.exportModalActions}>
              <Pressable
                style={({ pressed }) => [styles.exportModalHalfBtn, styles.exportModalHalfCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setShowExportModal(false)}
                disabled={processing || exporting}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.exportModalHalfBtn, styles.exportConfirmBtn, pressed && { opacity: 0.85 }]}
                onPress={handleExportData}
                disabled={processing || exporting || !exportModule}
              >
                <Text style={styles.modalConfirmText}>
                  {processing ? t("settings.processing") : exporting ? t("settings.exporting") : t("settings.confirmExport")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildStyles(colors) {
  return StyleSheet.create({
    dataActionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    dataActionItemPressed: { backgroundColor: colors.surface },
    dataActionItemLast: { borderBottomWidth: 0 },
    dataActionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    dataActionIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    dataActionText: { flex: 1 },
    dataActionLabel: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    dataActionDesc: {
      color: colors.textTertiary,
      fontSize: 12,
      fontWeight: "400",
      marginTop: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.modalOverlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
    },
    modalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.modalBg,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 24,
      gap: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.dangerBg,
      alignItems: "center",
      justifyContent: "center",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    modalDesc: {
      fontSize: 14,
      fontWeight: "400",
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    modalActions: { flexDirection: "column", gap: 12, width: "100%" },
    modalActionsRow: { flexDirection: "row", gap: 12, width: "100%" },
    modalCancelBtn: {
      height: 46,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.input.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
    modalConfirmBtn: {
      height: 46,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent.red,
    },
    modalConfirmText: { fontSize: 15, fontWeight: "700", color: "#fff" },

    exportModalCard: {
      width: "100%",
      maxWidth: 380,
      backgroundColor: colors.modalBg,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exportModalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
    },
    exportModeRow: {
      flexDirection: "row",
      backgroundColor: colors.input.bg,
      borderRadius: radius.md,
      padding: 3,
    },
    exportModeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    exportModeBtnActive: { backgroundColor: colors.primary },
    exportModeText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    exportModeTextActive: { color: "#fff" },
    exportPickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    exportPickerLabel: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    exportPickerControls: { flexDirection: "row", alignItems: "center", gap: 12 },
    exportArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceFrost,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    exportPickerValue: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, minWidth: 50, textAlign: "center" },
    exportHint: { fontSize: 13, fontWeight: "400", color: colors.textTertiary, textAlign: "center", lineHeight: 18 },
    exportModuleSection: { gap: 10 },
    exportModuleTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
    exportModuleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    exportModuleChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceFrost,
      borderWidth: 1,
      borderColor: colors.border,
    },
    exportModuleChipActive: { borderColor: colors.primary, backgroundColor: hexToRgba(colors.primary, 0.08) },
    exportModuleRadio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.textTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    exportModuleRadioActive: { borderColor: colors.primary },
    exportModuleRadioDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    exportModuleChipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    exportModuleChipTextActive: { color: colors.primary },
    exportModuleHint: {
      color: colors.accent.red,
      fontSize: 11,
      fontWeight: "500",
    },
    exportConfirmBtn: {
      flex: 1,
      height: 46,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
    },
    exportModalActions: {
      flexDirection: "row",
      gap: 12,
    },
    exportModalHalfBtn: {
      flex: 1,
      height: 46,
      borderRadius: radius.md,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },
    exportModalHalfCancel: {
      backgroundColor: colors.input.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}