import { getAll, getById, insert, update, remove, wrapSuccess, wrapFail } from "./database";

const TABLE = "important_dates";

function normalizeId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function normalizeDate(value) {
  const text = normalizeText(value).trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return text.slice(0, 10);
}

function computeNextOccurrence(dateStr, type) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);

  if (type === "once") {
    return { date: target, daysUntil: Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) };
  }

  let next = new Date(today.getFullYear(), m - 1, d);
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, m - 1, d);
  }
  const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { date: next, daysUntil: diff };
}

function computeYearsPassed(dateStr) {
  if (!dateStr) return null;
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const mDiff = now.getMonth() - start.getMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getDate() < start.getDate())) years--;
  return years;
}

export const fetchImportantDateList = async () => {
  try {
    const rows = await getAll(TABLE, "created_at DESC");
    const data = rows.map((item) => {
      const next = computeNextOccurrence(item.date, item.type);
      const yearsPassed = computeYearsPassed(item.date);
      const isAnnual = item.type === "annual";
      const rawDate = normalizeDate(item.date);
      return {
        id: normalizeId(item.id),
        name: normalizeText(item.name),
        date: rawDate,
        type: normalizeText(item.type, "annual"),
        category: normalizeText(item.category, "other"),
        reminderEnabled: Number(item.reminder_enabled) === 1,
        reminderDaysBefore: normalizeNumber(item.reminder_days_before, 1),
        notes: normalizeText(item.notes),
        image: normalizeText(item.image) || null,
        nextDate: next ? `${next.date.getFullYear()}-${String(next.date.getMonth() + 1).padStart(2, "0")}-${String(next.date.getDate()).padStart(2, "0")}` : null,
        daysUntil: next ? next.daysUntil : null,
        yearsPassed,
        isAnnual,
        isUpcoming: next && next.daysUntil >= 0,
      };
    });
    data.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export const fetchImportantDateDetail = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("重要日子 ID 无效", 400);
    const item = await getById(TABLE, id);
    if (!item) return wrapFail("重要日子不存在", 404);
    const next = computeNextOccurrence(item.date, item.type);
    const yearsPassed = computeYearsPassed(item.date);
    const data = {
      id: normalizeId(item.id),
      name: normalizeText(item.name),
      date: normalizeDate(item.date),
      type: normalizeText(item.type, "annual"),
      category: normalizeText(item.category, "other"),
      reminderEnabled: Number(item.reminder_enabled) === 1,
      reminderDaysBefore: normalizeNumber(item.reminder_days_before, 1),
      notes: normalizeText(item.notes),
      image: normalizeText(item.image) || null,
      nextDate: next ? `${next.date.getFullYear()}-${String(next.date.getMonth() + 1).padStart(2, "0")}-${String(next.date.getDate()).padStart(2, "0")}` : null,
      daysUntil: next ? next.daysUntil : null,
      yearsPassed,
    };
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchSubmitImportantDate = async (data) => {
  try {
    const id = normalizeId(data.id);
    const fields = {
      name: normalizeText(data.name).trim(),
      date: normalizeDate(data.date),
      type: normalizeText(data.type, "annual"),
      category: normalizeText(data.category, "other"),
      reminder_enabled: data.reminderEnabled !== undefined ? (data.reminderEnabled ? 1 : 0) : 0,
      reminder_days_before: normalizeNumber(data.reminderDaysBefore, 1),
      notes: normalizeText(data.notes),
      image: normalizeText(data.image),
    };
    if (!fields.name) return wrapFail("名称不能为空");
    if (!fields.date) return wrapFail("日期不能为空");
    if (id) {
      await update(TABLE, id, fields);
      return wrapSuccess({ id }, "更新成功");
    }
    const result = await insert(TABLE, fields);
    return wrapSuccess(result, "保存成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDeleteImportantDate = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("重要日子 ID 无效", 400);
    await remove(TABLE, id);
    return wrapSuccess({ id }, "删除成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};
