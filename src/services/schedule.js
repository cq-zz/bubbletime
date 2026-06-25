import {
  getAll,
  getById,
  insert,
  update,
  remove,
  wrapSuccess,
  wrapFail,
} from "./database";

const TABLE = "schedules";

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


function formatDateRange(startDate, endDate) {
  const fmt = (d) => {
    const dt = new Date(d);
    if (!d || Number.isNaN(dt.getTime())) return "";
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
  };
  const s = fmt(startDate);
  const e = fmt(endDate);
  if (!s && !e) return "";
  if (!e || s === e) return s;
  return `${s} - ${e}`;
}

function computeProgress(checklist) {
  try {
    const items = typeof checklist === "string" ? JSON.parse(checklist) : checklist || [];
    const done = items.filter((i) => i.done).length;
    return { done, total: items.length };
  } catch {
    return { done: 0, total: 0 };
  }
}

export const fetchScheduleList = async (params = {}) => {
  try {
    const rows = await getAll(TABLE, "created_at DESC");
    const today = new Date().toISOString().slice(0, 10);
    const data = rows.map((item) => {
      // 自动状态：超过结束日期且未完成则标记为"未完成"
      let rawStatus = normalizeText(item.status, "not_started");
      if (rawStatus === "todo") rawStatus = "not_started";
      if (rawStatus !== "done" && rawStatus !== "incomplete" && item.end_date) {
        const endDate = normalizeDate(item.end_date);
        if (endDate && endDate < today) {
          rawStatus = "incomplete";
        }
      }
      return {
        id: normalizeId(item.id),
        title: normalizeText(item.title),
        priority: normalizeText(item.priority, "medium"),
        status: rawStatus,
        dateRange: formatDateRange(item.start_date, item.end_date),
        endDate: normalizeDate(item.end_date),
        reminderEnabled: Number(item.reminder_enabled) === 1,
        progress: computeProgress(item.checklist),
      };
    });
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchScheduleDetail = async (taskId) => {
  try {
    const id = normalizeId(taskId);
    if (!id) return wrapFail("计划 ID 无效", 400);
    const item = await getById(TABLE, id);
    if (!item) return wrapFail("计划不存在", 404);
    const progress = computeProgress(item.checklist);
    const checklist = typeof item.checklist === "string"
      ? JSON.parse(item.checklist)
      : item.checklist || [];
    const data = {
      id: normalizeId(item.id),
      title: normalizeText(item.title),
      priority: normalizeText(item.priority, "medium"),
      status: normalizeText(item.status, "not_started") === "todo" ? "not_started" : normalizeText(item.status, "not_started"),
      startDate: normalizeDate(item.start_date),
      endDate: normalizeDate(item.end_date),
      notes: normalizeText(item.notes),
      image: normalizeText(item.image) || null,
      reminderEnabled: Number(item.reminder_enabled) !== 0,
      checklist: checklist.map((c) => ({
        id: c.id,
        text: c.text,
        done: c.done,
      })),
      progress,
    };
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchSubmitSchedule = async (data) => {
  try {
    const id = normalizeId(data.id);
    const isPartial = id && !data.planName && !data.title;
    if (isPartial) {
      // 局部更新（如快捷状态切换）
      const partialFields = {};
      if (data.status !== undefined) partialFields.status = normalizeText(data.status, "not_started");
      if (data.reminderEnabled !== undefined) partialFields.reminder_enabled = data.reminderEnabled ? 1 : 0;
      if (data.checklist !== undefined) partialFields.checklist = JSON.stringify(data.checklist);
      if (Object.keys(partialFields).length === 0) return wrapFail("没有需要更新的字段");
      await update(TABLE, id, partialFields);
      return wrapSuccess({ id }, "更新成功");
    }
    const fields = {
      title: normalizeText(data.planName || data.title).trim(),
      image: normalizeText(data.image),
      priority: normalizeText(data.priority, "medium"),
      status: normalizeText(data.status, "not_started"),
      start_date: normalizeDate(data.startDate),
      end_date: normalizeDate(data.endDate),
      notes: normalizeText(data.notes),
      checklist: data.checklist ? JSON.stringify(data.checklist) : "[]",
      reminder_enabled: data.reminderEnabled !== undefined ? (data.reminderEnabled ? 1 : 0) : 1,
    };
    if (!fields.title) return wrapFail("计划名称不能为空");
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

export const fetchDeleteSchedule = async (taskId) => {
  try {
    const id = normalizeId(taskId);
    if (!id) return wrapFail("计划 ID 无效", 400);
    await remove(TABLE, id);
    return wrapSuccess({ id }, "删除成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};
