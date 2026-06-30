import { getAll, getById, insert, update, remove, wrapSuccess, wrapFail } from "./database";

const TABLE = "diaries";

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

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export const fetchDiaryList = async (params = {}) => {
  try {
    let rows = await getAll(TABLE, "date DESC, created_at DESC");
    const { year, month } = params;
    if (year) {
      const prefix = month
        ? `${year}-${String(month).padStart(2, "0")}`
        : `${year}`;
      rows = rows.filter((item) => {
        const d = normalizeDate(item.date);
        return d.startsWith(prefix);
      });
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    rows = rows.filter((item) => {
      const d = new Date(normalizeDate(item.date));
      return d <= today;
    });
    const data = rows.map((item) => ({
      id: normalizeId(item.id),
      title: normalizeText(item.title),
      content: normalizeText(item.content),
      date: normalizeDate(item.date),
      weather: normalizeText(item.weather, ""),
      image: normalizeText(item.image) || null,
    }));
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDiaryDetail = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("日记 ID 无效", 400);
    const item = await getById(TABLE, id);
    if (!item) return wrapFail("日记不存在", 404);
    const data = {
      id: normalizeId(item.id),
      title: normalizeText(item.title),
      content: normalizeText(item.content),
      date: normalizeDate(item.date),
      weather: normalizeText(item.weather, ""),
      image: normalizeText(item.image) || null,
    };
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchSubmitDiary = async (data) => {
  try {
    const id = normalizeId(data.id);
    const today = new Date().toISOString().slice(0, 10);
    const dateVal = normalizeDate(data.date) || today;
    if (dateVal > today) return wrapFail("日期不能晚于今天");
    const fields = {
      title: normalizeText(data.title).trim(),
      content: normalizeText(data.content),
      date: dateVal,
      weather: normalizeText(data.weather, ""),
      image: normalizeText(data.image),

    };
    if (!fields.title) return wrapFail("标题不能为空");
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

export const fetchDeleteDiary = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("日记 ID 无效", 400);
    await remove(TABLE, id);
    return wrapSuccess({ id }, "删除成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};
