import {
    getAll,
    getById,
    insert,
    insertBatch,
    update,
    remove,
    query,
    wrapSuccess,
    wrapFail,
} from "./database";
import { getCurrencyIcon, getCurrency } from "../utils/theme";

const TABLE = "bills";

function normalizeId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return "";
  return String(raw);
}

function normalizeText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function mapCategory(catId) {
  if (!catId) return "other";
  return catId;
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 16).replace("T", " ");
  return dateStr.replace("T", " ").slice(0, 16);
}

function getDateLabel(dateStr) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getSourceTime(dateStr) {
  if (!dateStr) return { hours: 12, minutes: 0, seconds: 0 };
  let timePart = "";
  if (dateStr.includes("T")) {
    timePart = dateStr.split("T")[1].split(".")[0].split("Z")[0];
  } else if (dateStr.includes(" ")) {
    timePart = dateStr.split(" ")[1];
  }
  const parts = (timePart || "").split(":");
  return {
    hours: parseInt(parts[0], 10) || 12,
    minutes: parseInt(parts[1], 10) || 0,
    seconds: parseInt(parts[2], 10) || 0,
  };
}

export const fetchBillList = async (params = {}) => {
  try {
    const allRows = await getAll(TABLE, "consumption_date DESC, created_at DESC");

    // 按年月/范围过滤
    let rows = allRows;
    if (params.year || params.month || params.startYear || params.endYear) {
      rows = allRows.filter((row) => {
        if (!row.consumption_date) return false;
        const d = new Date(row.consumption_date);
        const y = d.getFullYear(), m = d.getMonth() + 1;
        if (params.year && y !== params.year) return false;
        if (params.month && m !== params.month) return false;
        if (params.startYear) {
          if (params.startMonth && y === params.startYear && m < params.startMonth) return false;
          if (y < params.startYear) return false;
        }
        if (params.endYear) {
          if (params.endMonth && y === params.endYear && m > params.endMonth) return false;
          if (y > params.endYear) return false;
        }
        return true;
      });
    }

    // 按当前币种过滤（兼容旧数据：currency 为空视为 CNY）
    const currentCurrency = getCurrency().code;
    rows = rows.filter((row) => {
      const c = normalizeText(row.currency).trim();
      return !c || c === currentCurrency;
    });

    // 批量获取物品图片（source === "durable" 的账单）
    const durableIds = [
      ...new Set(
        rows
          .filter((r) => r.source === "durable" && r.source_id)
          .map((r) => String(r.source_id))
      ),
    ];
    const durableImageMap = {};
    if (durableIds.length > 0) {
      try {
        const placeholders = durableIds.map(() => "?").join(",");
        const durableRows = await query(
          `SELECT id, image FROM durables WHERE id IN (${placeholders})`,
          durableIds
        );
        for (const d of durableRows) {
          const img = normalizeText(d.image);
          if (img) durableImageMap[String(d.id)] = img;
        }
      } catch {
        // 获取图片失败不影响列表展示
      }
    }

    const grouped = {};
    for (const row of rows) {
      const dateKey = row.consumption_date ? row.consumption_date.slice(0, 10) : "unknown";
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(row);
    }
    const data = [];
    for (const [dateKey, items] of Object.entries(grouped)) {
      const total = items.reduce((sum, item) => {
        const amt = normalizeNumber(item.amount);
        // 转出数据从支出中扣减
        if (item.source === "durable" && normalizeText(item.notes).trim() === "转出") {
          return sum - amt;
        }
        return sum + amt;
      }, 0);
      data.push({
        type: "header",
        date: getDateLabel(dateKey),
        total: `${getCurrencyIcon()}${total.toFixed(2)}`,
      });
      for (const item of items) {
        const srcId = normalizeText(item.source_id);
        const source = normalizeText(item.source);
        const billType = normalizeText(item.bill_type, "expense");
        const isTransfer =
          source === "durable" && normalizeText(item.notes).trim() === "转出";
        // 收入类或转出显示 +，支出类显示 -
        const isIncome = billType === "income" || isTransfer;
        const amtValue = normalizeNumber(item.amount);
        data.push({
          type: "record",
          id: normalizeId(item.id),
          name: normalizeText(item.name),
          category: mapCategory(item.category),
          time: item.consumption_date ? formatDate(item.consumption_date) : "",
          amount: isIncome
            ? `+${amtValue.toFixed(2)}`
            : `-${amtValue.toFixed(2)}`,
          billType,
          source,
          sourceId: srcId,
          durableImage:
            source === "durable" && srcId
              ? durableImageMap[srcId] || null
              : null,
          receiptImage: normalizeText(item.receipt_image) || null,
        });
      }
    }
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchBillDetail = async (billId) => {
  try {
    const id = normalizeId(billId);
    if (!id) return wrapFail("Invalid bill ID", 400);
    const item = await getById(TABLE, id);
    if (!item) return wrapFail("Bill not found", 404);
    let durableImage = null;
    const src = normalizeText(item.source);
    const srcId = normalizeText(item.source_id);
    if (src === "durable" && srcId) {
      try {
        const durableRows = await query("SELECT image FROM durables WHERE id = ?", [srcId]);
        if (durableRows.length > 0) durableImage = normalizeText(durableRows[0].image) || null;
      } catch {}
    }
    const data = {
      id: normalizeId(item.id),
      name: normalizeText(item.name),
      category: mapCategory(item.category),
      amount: normalizeNumber(item.amount),
      consumptionDate: formatDate(item.consumption_date),
      paymentMethod: "",
      notes: normalizeText(item.notes),
      notesTag: item.category ? mapCategory(item.category) : "",
      receiptImage: normalizeText(item.receipt_image) || null,
      durableImage,
      source: src,
      sourceId: srcId,
      billType: normalizeText(item.bill_type, "expense"),
      autoSchedule: item.auto_schedule === 1 || item.auto_schedule === true,
      scheduleType: normalizeText(item.schedule_type),
      scheduleInterval: normalizeNumber(item.schedule_interval, 0).toString(),
      scheduleDay: normalizeNumber(item.schedule_day, 0).toString(),
      scheduleStartDate: normalizeText(item.schedule_start),
      scheduleEndDate: normalizeText(item.schedule_end),
      scheduleSourceId: normalizeText(item.schedule_source_id),
    };
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchSubmitBill = async (data) => {
  try {
    const id = normalizeId(data.id);
    const fields = {
      name: normalizeText(data.name).trim(),
      amount: normalizeNumber(data.amount),
      category: normalizeText(data.category, "other"),
      consumption_date: data.consumptionDate || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(),
      receipt_image: normalizeText(data.receiptImage),
      notes: normalizeText(data.notes),
      bill_type: normalizeText(data.billType, "expense"),
      currency: getCurrency().code,
      auto_schedule: data.autoSchedule ? 1 : 0,
      schedule_type: data.autoSchedule ? normalizeText(data.scheduleType) : "",
      schedule_interval: data.autoSchedule && data.scheduleType === "interval" ? normalizeNumber(data.scheduleInterval, 1) : 0,
      schedule_day: data.autoSchedule && data.scheduleType === "monthly" ? normalizeNumber(data.scheduleDay, 1) : 0,
      schedule_start: data.autoSchedule ? normalizeText(data.scheduleStartDate) : "",
      schedule_end: data.autoSchedule ? normalizeText(data.scheduleEndDate) : "",
      schedule_last_generated: "",
      schedule_source_id: "",
    };
    if (!fields.name) return wrapFail("Bill name is required");

    let templateId = id;
    let lastGenToSet = "";

    if (id) {
      // 编辑：保留 schedule_source_id；首次开启自动记账时 schedule_last_generated 保持空以触发补发
      try {
        const existing = await getById(TABLE, id);
        if (existing?.schedule_source_id) {
          fields.schedule_source_id = existing.schedule_source_id;
        }
        if (existing?.schedule_last_generated && data.autoSchedule) {
          // 已有记录说明之前已开启过，保留不重置
          fields.schedule_last_generated = existing.schedule_last_generated;
          lastGenToSet = existing.schedule_last_generated; // 跳过补发
        }
      } catch { /* ignore */ }

      // 如果循环周期或时间段有变更，删除已生成的记录并重置
      if (data.autoSchedule && data.scheduleChanged) {
        // 用 WHERE 条件直接查询子记录，无需加载全部账单
        const childBills = await query(
          "SELECT id FROM bills WHERE schedule_source_id = ? AND auto_schedule != 1",
          [normalizeText(id)]
        );
        for (const child of childBills) {
          await remove(TABLE, child.id);
        }
        // 重置 last_generated，触发重新生成
        fields.schedule_last_generated = "";
        lastGenToSet = "";
      }

      await update(TABLE, id, fields);
    } else {
      const result = await insert(TABLE, fields);
      templateId = result.id;
    }

    // ── 同步补发过期时间内的条目 ─────────────────────────────────────────────
    // 仅当自动记账开启且 schedule_last_generated 为空时执行
    if (data.autoSchedule && !lastGenToSet && fields.schedule_start && fields.schedule_end) {
      const startStr = fields.schedule_start.slice(0, 10);
      const endStr = fields.schedule_end.slice(0, 10);
      const startDate = new Date(startStr + "T00:00:00");
      const endDate = new Date(endStr + "T23:59:59");
      const now = new Date();
      const templateDateKey = fields.consumption_date ? fields.consumption_date.slice(0, 10) : "";
      const billName = fields.name;

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && now >= startDate) {
        // 补发上限：今天和 endDate 取较小者
        const backfillEnd = now < endDate ? now : endDate;
        const backfillDates = [];
        let iterations = 0;
        const MAX_BACKFILL = 200;
        const MAX_ITER = 2000;

        if (fields.schedule_type === "monthly") {
          const targetDay = Math.max(1, Math.min(normalizeNumber(fields.schedule_day, 1), 28));
          let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), targetDay);
          if (cursor < startDate) {
            cursor = new Date(startDate.getFullYear(), startDate.getMonth() + 1, targetDay);
          }
          while (cursor <= backfillEnd && backfillDates.length < MAX_BACKFILL && iterations < MAX_ITER) {
            iterations++;
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
            if (key !== templateDateKey) {
              backfillDates.push(new Date(cursor));
            }
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, targetDay);
          }
        } else {
          const interval = Math.max(1, normalizeNumber(fields.schedule_interval, 1));
          let cursor = new Date(startDate);
          while (cursor <= backfillEnd && backfillDates.length < MAX_BACKFILL && iterations < MAX_ITER) {
            iterations++;
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
            if (key !== templateDateKey) {
              backfillDates.push(new Date(cursor));
            }
            cursor = new Date(cursor);
            cursor.setDate(cursor.getDate() + interval);
          }
        }

        // 与模板账单同步写入所有过期条目
        const sourceTime = getSourceTime(fields.consumption_date);
        let lastBackfillDate = null;
        if (backfillDates.length > 0) {
          const records = backfillDates.map((genDate) => ({
            name: billName,
            amount: normalizeNumber(fields.amount),
            category: normalizeText(fields.category, "other"),
            consumption_date: `${genDate.getFullYear()}-${String(genDate.getMonth() + 1).padStart(2, "0")}-${String(genDate.getDate()).padStart(2, "0")} ${String(sourceTime.hours).padStart(2, "0")}:${String(sourceTime.minutes).padStart(2, "0")}:${String(sourceTime.seconds || 0).padStart(2, "0")}`,
            receipt_image: normalizeText(fields.receipt_image),
            notes: normalizeText(fields.notes),
            bill_type: normalizeText(fields.bill_type, "expense"),
            currency: fields.currency,
            source: "schedule",
            source_id: normalizeText(templateId),
            auto_schedule: 0,
            schedule_type: "",
            schedule_interval: 0,
            schedule_day: 0,
            schedule_start: "",
            schedule_end: "",
            schedule_last_generated: "",
            schedule_source_id: normalizeText(templateId),
          }));
          await insertBatch(TABLE, records);
          lastBackfillDate = backfillDates[backfillDates.length - 1];
        }

        // 更新 schedule_last_generated：已补发到最后日期，checkAutoSchedules 只处理之后的数据
        let finalLastGen = lastBackfillDate;
        if (!finalLastGen && fields.consumption_date) {
          const datePart = fields.consumption_date.slice(0, 10);
          if (datePart) finalLastGen = new Date(datePart + "T00:00:00");
        }
        if (finalLastGen) {
          lastGenToSet = `${finalLastGen.getFullYear()}-${String(finalLastGen.getMonth() + 1).padStart(2, "0")}-${String(finalLastGen.getDate()).padStart(2, "0")}`;
          await update(TABLE, templateId, { schedule_last_generated: lastGenToSet });
        }
      }
    }

    return wrapSuccess({ id: templateId }, id ? "Update successful" : "Save successful");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDeleteBill = async (billId) => {
  try {
    const id = normalizeId(billId);
    if (!id) return wrapFail("Invalid bill ID", 400);

    // 如果是源数据（模板），清除所有子级记录的源数据字段
    const bill = await getById(TABLE, id);
    if (bill && (bill.auto_schedule === 1 || bill.auto_schedule === true)) {
      const allBills = await getAll(TABLE);
      const childBills = allBills.filter(
        (b) =>
          b.schedule_source_id === id &&
          b.auto_schedule !== 1
      );
      const clearFields = {
        source: "",
        source_id: "",
        schedule_source_id: "",
      };
      for (const child of childBills) {
        await update(TABLE, child.id, clearFields);
      }
    }

    await remove(TABLE, id);
    return wrapSuccess({ id }, "Delete successful");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchGeneratedBillList = async (templateId) => {
  try {
    const id = normalizeText(templateId);
    if (!id) return wrapSuccess([]);
    const all = await getAll(TABLE, "consumption_date ASC");
    const children = all.filter(
      (b) =>
        b.schedule_source_id === id &&
        b.auto_schedule !== 1
    );
    const data = children.map((item) => ({
      id: normalizeId(item.id),
      name: normalizeText(item.name),
      amount: normalizeNumber(item.amount),
      category: mapCategory(item.category),
      consumptionDate: formatDate(item.consumption_date),
      billType: normalizeText(item.bill_type, "expense"),
    }));
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchBillSummary = async (params = {}) => {
  try {
    const allRows = await getAll(TABLE, "consumption_date DESC");

    // 按年月过滤
    let rows = allRows;
    if (params.year || params.month) {
      rows = allRows.filter((row) => {
        if (!row.consumption_date) return false;
        const d = new Date(row.consumption_date);
        if (params.year && d.getFullYear() !== params.year) return false;
        if (params.month && d.getMonth() + 1 !== params.month) return false;
        return true;
      });
    }

    // 按当前币种过滤
    const currentCurrency = getCurrency().code;
    rows = rows.filter((row) => {
      const c = normalizeText(row.currency).trim();
      return !c || c === currentCurrency;
    });

    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;

    for (const row of rows) {
      const amt = normalizeNumber(row.amount);
      const billType = normalizeText(row.bill_type, "expense");
      const source = normalizeText(row.source);
      const notes = normalizeText(row.notes).trim();
      const isTransfer = source === "durable" && notes === "转出";
      if (billType === "income" || isTransfer) {
        totalIncome += amt;
        incomeCount++;
      } else {
        totalExpense += amt;
        expenseCount++;
      }
    }

    return wrapSuccess({
      totalExpense,
      totalIncome,
      count: rows.length,
      expenseCount,
      incomeCount,
      totalExpenseFormatted: `${getCurrencyIcon()}${totalExpense.toFixed(2)}`,
      totalIncomeFormatted: `${getCurrencyIcon()}${totalIncome.toFixed(2)}`,
    });
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchBillCategoryBreakdown = async (params = {}) => {
  try {
    const allRows = await getAll(TABLE, "consumption_date DESC");
    let rows = allRows;
    if (params.year || params.month || params.startYear || params.endYear) {
      rows = allRows.filter((row) => {
        if (!row.consumption_date) return false;
        const d = new Date(row.consumption_date);
        const y = d.getFullYear(), m = d.getMonth() + 1;
        if (params.year && y !== params.year) return false;
        if (params.month && m !== params.month) return false;
        if (params.startYear) {
          if (params.startMonth && y === params.startYear && m < params.startMonth) return false;
          if (y < params.startYear) return false;
        }
        if (params.endYear) {
          if (params.endMonth && y === params.endYear && m > params.endMonth) return false;
          if (y > params.endYear) return false;
        }
        return true;
      });
    }
    const currentCurrency = getCurrency().code;
    rows = rows.filter((row) => {
      const c = normalizeText(row.currency).trim();
      return !c || c === currentCurrency;
    });
    const breakdown = {};
    for (const row of rows) {
      const amt = normalizeNumber(row.amount);
      const billType = normalizeText(row.bill_type, "expense");
      const source = normalizeText(row.source);
      const notes = normalizeText(row.notes).trim();
      const isTransfer = source === "durable" && notes === "转出";
      const type = isTransfer ? "income" : billType;
      const cat = mapCategory(row.category);
      if (!breakdown[cat]) breakdown[cat] = { expense: 0, income: 0 };
      if (type === "income") breakdown[cat].income += amt;
      else breakdown[cat].expense += amt;
    }
    return wrapSuccess(breakdown);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchBillMonthlyTrend = async (params = {}) => {
  try {
    const { year, month, months = 6, startYear, startMonth, endYear, endMonth } = params;
    const allRows = await getAll(TABLE, "consumption_date ASC");
    const currentCurrency = getCurrency().code;
    const now = new Date();
    const groups = {};

    if (startYear || endYear) {
      const sy = startYear || 2000;
      const sm = startMonth || 1;
      const ey = endYear || now.getFullYear();
      const em = endMonth || 12;
      let d = new Date(sy, sm - 1, 1);
      const endD = new Date(ey, em - 1, 1);
      while (d <= endD) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        groups[key] = { expense: 0, income: 0 };
        d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
    } else if (year && !month) {
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, "0")}`;
        groups[key] = { expense: 0, income: 0 };
      }
    } else if (year && month) {
      const refDate = new Date(year, month - 1, 1);
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        groups[key] = { expense: 0, income: 0 };
      }
    } else {
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        groups[key] = { expense: 0, income: 0 };
      }
    }

    for (const row of allRows) {
      if (!row.consumption_date) continue;
      const c = normalizeText(row.currency).trim();
      if (c && c !== currentCurrency) continue;
      const d = new Date(row.consumption_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) continue;
      const amt = normalizeNumber(row.amount);
      const billType = normalizeText(row.bill_type, "expense");
      const source = normalizeText(row.source);
      const notes = normalizeText(row.notes).trim();
      const isTransfer = source === "durable" && notes === "转出";
      const type = isTransfer ? "income" : billType;
      if (type === "income") groups[key].income += amt;
      else groups[key].expense += amt;
    }
    const data = Object.entries(groups).map(([key, val]) => ({
      month: key,
      expense: val.expense,
      income: val.income,
    }));
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

// ── 自动定时记账 ───────────────────────────────────────────────────────────
// 并发锁，防止多次触发同时执行导致重复生成
let _autoCheckRunning = false;
// 单次执行最大生成条数
const MAX_GENERATE_PER_RUN = 100;
// 单条账单最大迭代次数，防止极端配置导致无限循环
const MAX_ITER_PER_BILL = 500;
// 全局执行超时（ms）
const CHECK_TIMEOUT = 15000;

export const checkAutoSchedules = async () => {
  // 并发保护
  if (_autoCheckRunning) return wrapSuccess({ checked: false, reason: "already_running" });
  _autoCheckRunning = true;
  const startTime = Date.now();

  try {
    const now = new Date();
    // 只查询开启了自动记账的记录，不加载全部账单
    const scheduled = await query(
      "SELECT * FROM bills WHERE auto_schedule = 1 AND schedule_start != '' AND schedule_end != ''"
    );
    let totalGenerated = 0;

    // 构建同名账单日期映射，用于去重：{ billName: Set<"YYYY-MM-DD"> }
    // 只查询需要的字段，减少内存占用
    const allNames = await query("SELECT name, consumption_date FROM bills");
    const existingMap = new Map();
    for (const row of allNames) {
      const name = normalizeText(row.name).trim();
      if (!name || !row.consumption_date) continue;
      const dateKey = normalizeText(row.consumption_date).slice(0, 10);
      if (!existingMap.has(name)) existingMap.set(name, new Set());
      existingMap.get(name).add(dateKey);
    }

    for (const bill of scheduled) {
      // 全局超时保护
      if (Date.now() - startTime > CHECK_TIMEOUT) break;
      if (totalGenerated >= MAX_GENERATE_PER_RUN) break;

      try {
        const startStr = normalizeText(bill.schedule_start).slice(0, 10);
        const endStr = normalizeText(bill.schedule_end).slice(0, 10);
        const startDate = new Date(startStr + "T00:00:00");
        const endDate = new Date(endStr + "T23:59:59");

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
        if (now < startDate) continue;

        const lastGenStr = normalizeText(bill.schedule_last_generated).slice(0, 10);
        const lastGenDate = lastGenStr ? new Date(lastGenStr + "T00:00:00") : null;
        if (lastGenDate && lastGenDate >= endDate) continue;

        const billName = normalizeText(bill.name).trim();
        const existingDates = existingMap.get(billName);

        const genDates = [];
        const remaining = MAX_GENERATE_PER_RUN - totalGenerated;
        let nextCursor = null;
        let iterations = 0;

        if (bill.schedule_type === "monthly") {
          const targetDay = Math.max(1, Math.min(normalizeNumber(bill.schedule_day, 1), 28));
          let cursor;
          // 优化：如果有 lastGenDate，直接从下个月开始，不从头扫描
          if (lastGenDate) {
            cursor = new Date(lastGenDate.getFullYear(), lastGenDate.getMonth() + 1, targetDay);
          } else {
            // 跳过已过期时间，从当前日期开始
            cursor = new Date(now.getFullYear(), now.getMonth(), targetDay);
            if (cursor < now) {
              cursor = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
            }
          }
          while (cursor <= now && cursor <= endDate && genDates.length < remaining && iterations < MAX_ITER_PER_BILL) {
            iterations++;
            const cursorKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
            if (!existingDates?.has(cursorKey)) {
              genDates.push(new Date(cursor));
            }
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, targetDay);
          }
          nextCursor = cursor;
        } else {
          // 按间隔天数
          const interval = Math.max(1, normalizeNumber(bill.schedule_interval, 1));
          let cursor;
          if (lastGenDate) {
            cursor = new Date(lastGenDate);
            cursor.setDate(cursor.getDate() + interval);
          } else {
            // 跳过已过期时间，从当前日期开始
            cursor = new Date(now);
          }
          while (cursor <= now && cursor <= endDate && genDates.length < remaining && iterations < MAX_ITER_PER_BILL) {
            iterations++;
            const cursorKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
            if (!existingDates?.has(cursorKey)) {
              genDates.push(new Date(cursor));
            }
            cursor = new Date(cursor);
            cursor.setDate(cursor.getDate() + interval);
          }
          nextCursor = cursor;
        }

        const planComplete = nextCursor && nextCursor > endDate;
        const sourceTime = getSourceTime(bill.consumption_date);

        // 批量写入（单次事务，减少 IO 次数）
        let lastSuccessDate = null;
        if (genDates.length > 0) {
          if (Date.now() - startTime <= CHECK_TIMEOUT) {
            const records = genDates.map((genDate) => ({
              name: normalizeText(bill.name),
              amount: normalizeNumber(bill.amount),
              category: normalizeText(bill.category, "other"),
              consumption_date: `${genDate.getFullYear()}-${String(genDate.getMonth() + 1).padStart(2, "0")}-${String(genDate.getDate()).padStart(2, "0")} ${String(sourceTime.hours).padStart(2, "0")}:${String(sourceTime.minutes).padStart(2, "0")}:${String(sourceTime.seconds || 0).padStart(2, "0")}`,
              receipt_image: normalizeText(bill.receipt_image),
              notes: normalizeText(bill.notes),
              bill_type: normalizeText(bill.bill_type, "expense"),
              currency: normalizeText(bill.currency, getCurrency().code),
              source: "schedule",
              source_id: normalizeText(bill.id),
              auto_schedule: 0,
              schedule_type: "",
              schedule_interval: 0,
              schedule_day: 0,
              schedule_start: "",
              schedule_end: "",
              schedule_last_generated: "",
              schedule_source_id: normalizeText(bill.id),
            }));
            await insertBatch(TABLE, records);
            lastSuccessDate = genDates[genDates.length - 1];
            totalGenerated += genDates.length;
          }
        }

        if (lastSuccessDate || planComplete) {
          const updateFields = {};
          if (lastSuccessDate) {
            updateFields.schedule_last_generated = `${lastSuccessDate.getFullYear()}-${String(lastSuccessDate.getMonth() + 1).padStart(2, "0")}-${String(lastSuccessDate.getDate()).padStart(2, "0")}`;
          }
          if (planComplete) {
            updateFields.auto_schedule = 0;
          }
          await update(TABLE, bill.id, updateFields);
        }
      } catch (e) {
        console.warn(`[AutoSchedule] Failed processing bill id=${bill.id}:`, e?.message);
      }
    }

    return wrapSuccess({ checked: true, generated: totalGenerated });
  } catch (e) {
    return wrapFail(e.message);
  } finally {
    _autoCheckRunning = false;
  }
};
