import {
    DURABLE_STATUS_STYLE_MAP,
} from "../utils/constant";
import {
    calcDailyAverage,
    calcExpectedDailyAverage,
    calcTotalPrice,
} from "../utils/durable";
import { getCurrencyIcon, getCurrency } from "../utils/theme";
import {
    getAll,
    getById,
    insert,
    remove,
    update,
    query,
    wrapFail,
    wrapSuccess,
} from "./database";

const TABLE = "durables";
const durableChangeListeners = new Set();

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

function normalizeDate(value) {
  const text = normalizeText(value).trim();
  if (!text) return "";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return text.slice(0, 10);
}

function formatCurrency(value) {
  return `${getCurrencyIcon()}${normalizeNumber(value).toFixed(2)}`;
}

function formatDailyCost(value) {
  return formatCurrency(value);
}

function emitDurableChange() {
  durableChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error("物品数据变更通知失败:", e);
    }
  });
}

export function subscribeDurableChanges(listener) {
  durableChangeListeners.add(listener);
  return () => durableChangeListeners.delete(listener);
}

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return Math.max(
    0,
    Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function daysUntilDate(targetDate) {
  if (!targetDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDays(days) {
  if (!days || days <= 0) return "0 天";
  return `${days.toLocaleString()} 天`;
}

function parseRepairRecord(raw) {
  const fallback = { expenses: [], incomes: [], transferAmount: 0 };
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    // new format: { expenses: [...], incomes: [...], transferAmount: 500 }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        expenses: Array.isArray(parsed.expenses)
          ? parsed.expenses.filter((e) => e && e.name)
          : [],
        incomes: Array.isArray(parsed.incomes)
          ? parsed.incomes.filter((i) => i && i.name)
          : [],
        transferAmount: normalizeNumber(parsed.transferAmount),
      };
    }
    // legacy format: [{ name, cost }, ...]
    if (Array.isArray(parsed)) {
      return {
        expenses: parsed.filter((e) => e && e.name),
        incomes: [],
        transferAmount: 0,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export const fetchDurableList = async (params = {}) => {
  try {
    const rows = await getAll(TABLE);

    // 按当前币种过滤（兼容旧数据：currency 为空视为 CNY）
    const currentCurrency = getCurrency().code;
    const filteredRows = rows.filter((item) => {
      const c = normalizeText(item.currency).trim();
      return !c || c === currentCurrency;
    });

    const data = filteredRows.map((item) => {
      const purchaseDate =
        normalizeDate(item.purchase_date) ||
        new Date().toISOString().slice(0, 10);
      const daysOwned = daysBetween(
        purchaseDate,
        new Date().toISOString().slice(0, 10),
      );
      const price = normalizeNumber(item.purchase_price);
      const rr = parseRepairRecord(item.repair_record);
      const otherExpenses = rr.expenses;
      const otherIncomes = rr.incomes;
      const totalPrice = calcTotalPrice(price, otherExpenses, otherIncomes);
      const dailyCost = calcDailyAverage(totalPrice, daysOwned || 1);
      const expectedEnd = normalizeDate(item.expected_lifespan);
      const expiryDateField = normalizeDate(item.expiry_date);
      const expectedAvg = expectedEnd
        ? calcExpectedDailyAverage(totalPrice, purchaseDate, expectedEnd)
        : 0;
      const statusStyle = DURABLE_STATUS_STYLE_MAP[item.status] || "active";

      const icon = item.purchase_date ? "calendar_today" : "check_circle";

      const daysUntilExpiry = expiryDateField ? daysUntilDate(expiryDateField) : null;

      return {
        id: normalizeId(item.id),
        name: normalizeText(item.name, "未命名物品"),
        category: normalizeText(item.category, "其他"),
        image: normalizeText(item.image) || null,
        purchasePrice: formatCurrency(price),
        purchasePriceValue: price,
        dailyAvg: formatDailyCost(dailyCost),
        dailyAvgValue: dailyCost,
        status: normalizeText(item.status, "in_use"),
        statusType: statusStyle,
        icon,
        purchaseDate,
        companionDuration: formatDays(daysOwned),
        expectedLifespan: expectedEnd || "",
        expiryDate: expiryDateField || "",
        daysUntilExpiry,
        expectedDailyAvg: expectedEnd ? formatDailyCost(expectedAvg) : "",
        otherExpenses,
        otherExpensesTotal: otherExpenses.reduce((s, e) => s + normalizeNumber(e.cost), 0),
        otherIncomes,
        otherIncomesTotal: otherIncomes.reduce((s, i) => s + normalizeNumber(i.cost), 0),
      };
    });
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDurableDetail = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("物品 ID 无效", 400);

    const item = await getById(TABLE, id);
    if (!item) return wrapFail("物品不存在", 404);
    const purchaseDate =
      normalizeDate(item.purchase_date) ||
      new Date().toISOString().slice(0, 10);
    const daysOwned = daysBetween(
      purchaseDate,
      new Date().toISOString().slice(0, 10),
    );
    const purchasePrice = normalizeNumber(item.purchase_price);
    const rr = parseRepairRecord(item.repair_record);
    const otherExpenses = rr.expenses;
    const otherIncomes = rr.incomes;
    const totalPrice = calcTotalPrice(purchasePrice, otherExpenses, otherIncomes);
    const dailyAvg = calcDailyAverage(totalPrice, daysOwned || 1);
    const expectedEnd = normalizeDate(item.expected_lifespan) || purchaseDate;
    const expiryDateField = normalizeDate(item.expiry_date);
    const expectedAvg = calcExpectedDailyAverage(
      totalPrice,
      purchaseDate,
      expectedEnd,
    );
    const daysUntilExpiry = expiryDateField ? daysUntilDate(expiryDateField) : null;

    const data = {
      id: normalizeId(item.id),
      name: normalizeText(item.name, "未命名物品"),
      itemType: normalizeText(item.category, "其他"),
      category: normalizeText(item.category, "其他"),
      image: normalizeText(item.image) || null,
      totalCost: formatCurrency(totalPrice),
      purchaseDate,
      initialPrice: formatCurrency(purchasePrice),
      usedDuration: formatDays(daysOwned),
      notes: normalizeText(item.notes),
      dailyAvg: formatDailyCost(dailyAvg),
      expectedDailyAvg: formatDailyCost(expectedAvg),
      status: normalizeText(item.status, "in_use"),
      purchasePrice,
      expectedLifespan: expectedEnd === purchaseDate ? "" : expectedEnd,
      expiryDate: expiryDateField || "",
      daysUntilExpiry,
      otherExpenses,
      otherExpensesTotal: otherExpenses.reduce((s, e) => s + normalizeNumber(e.cost), 0),
      otherIncomes,
      otherIncomesTotal: otherIncomes.reduce((s, i) => s + normalizeNumber(i.cost), 0),
    };
    return wrapSuccess(data);
  } catch (e) {
    return wrapFail(e.message);
  }
};

async function syncDurableBills(itemId, fields, otherExpenses, otherIncomes) {
  const id = normalizeId(itemId);
  if (!id) return;
  const currencyCode = fields.currency || getCurrency().code;
  // Remove existing sourced bills
  const existing = await query("SELECT * FROM bills WHERE source = ? AND source_id = ?", ["durable", id]);
  for (const bill of existing) {
    await remove("bills", bill.id);
  }
  // Insert purchase bill
  if (fields.purchase_price > 0) {
    await insert("bills", {
      name: fields.name,
      amount: fields.purchase_price,
      category: fields.category,
      consumption_date: fields.purchase_date || new Date().toISOString(),
      notes: fields.notes,
      source: "durable",
      source_id: id,
      currency: currencyCode,
    });
  }
  // Insert expense bills
  for (const expense of otherExpenses) {
    const cost = normalizeNumber(expense.cost);
    if (cost > 0) {
      await insert("bills", {
        name: normalizeText(expense.name).trim(),
        amount: cost,
        category: expense.category || fields.category,
        consumption_date: expense.date || fields.purchase_date || new Date().toISOString(),
        notes: fields.notes || "",
        source: "durable",
        source_id: id,
        currency: currencyCode,
      });
    }
  }
  // Insert income bills
  for (const income of otherIncomes) {
    const amount = normalizeNumber(income.cost);
    if (amount > 0) {
      await insert("bills", {
        name: normalizeText(income.name).trim(),
        amount,
        category: income.category || fields.category,
        consumption_date: income.date || fields.purchase_date || new Date().toISOString(),
        notes: fields.notes || "",
        source: "durable",
        source_id: id,
        bill_type: "income",
        currency: currencyCode,
      });
    }
  }
}

export const fetchSubmitDurable = async (data) => {
  try {
    const id = normalizeId(data.id);
    const otherExpenses = (data.otherExpenses || []).filter(
      (e) => e && e.name && normalizeText(e.name).trim() && e.category && e.cost && normalizeNumber(e.cost) > 0,
    );
    const otherIncomes = (data.otherIncomes || []).filter(
      (i) => i && i.name && normalizeText(i.name).trim() && i.category && i.cost && normalizeNumber(i.cost) > 0,
    );
    const fields = {
      name: normalizeText(data.name).trim(),
      image: normalizeText(data.image),
      category: normalizeText(data.category),
      status: normalizeText(data.status, "in_use"),
      purchase_date: normalizeDate(data.purchaseDate),
      purchase_price: normalizeNumber(data.purchasePrice),
      expected_lifespan: normalizeDate(data.expectedLifespan),
      expiry_date: normalizeDate(data.expiryDate),
      notes: normalizeText(data.notes),
      currency: getCurrency().code,
      repair_record: JSON.stringify({
        expenses: otherExpenses.map((e) => ({
          name: normalizeText(e.name).trim(),
          cost: normalizeNumber(e.cost),
          category: normalizeText(e.category).trim(),
          date: normalizeText(e.date).trim(),
        })),
        incomes: otherIncomes.map((i) => ({
          name: normalizeText(i.name).trim(),
          cost: normalizeNumber(i.cost),
          category: normalizeText(i.category).trim(),
          date: normalizeText(i.date).trim(),
        })),
      }),
    };
    if (!fields.name) return wrapFail("物品名称不能为空");

    let itemId;
    if (id) {
      await update(TABLE, id, fields);
      itemId = id;
    } else {
      const result = await insert(TABLE, fields);
      itemId = result.id;
    }
    await syncDurableBills(itemId, fields, otherExpenses, otherIncomes);
    emitDurableChange();
    return wrapSuccess({ id: itemId }, id ? "更新成功" : "保存成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDeleteDurable = async (itemId) => {
  try {
    const id = normalizeId(itemId);
    if (!id) return wrapFail("物品 ID 无效", 400);
    // Remove associated bills
    const bills = await query("SELECT * FROM bills WHERE source = ? AND source_id = ?", ["durable", id]);
    for (const bill of bills) {
      await remove("bills", bill.id);
    }
    await remove(TABLE, id);
    emitDurableChange();
    return wrapSuccess({ id }, "删除成功");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDurableCategories = async () => {
  return wrapSuccess(["数码", "家电", "家具", "母婴", "服饰", "其他"]);
};

export const syncAllDurableBills = async () => {
  try {
    const rows = await getAll(TABLE);
    let syncedCount = 0;
    for (const item of rows) {
      const id = normalizeId(item.id);
      if (!id) continue;
      const purchasePrice = normalizeNumber(item.purchase_price);
      const rr = parseRepairRecord(item.repair_record);
      const fields = {
        name: normalizeText(item.name, "未命名物品"),
        category: normalizeText(item.category, "其他"),
        purchase_date: normalizeDate(item.purchase_date),
        purchase_price: purchasePrice,
        notes: normalizeText(item.notes),
        currency: normalizeText(item.currency).trim() || "CNY",
      };
      await syncDurableBills(id, fields, rr.expenses, rr.incomes);
      syncedCount++;
    }
    emitDurableChange();
    return wrapSuccess({ count: syncedCount }, `已同步 ${syncedCount} 件物品数据`);
  } catch (e) {
    return wrapFail(e.message);
  }
};
