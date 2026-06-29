import {
    getAll,
    getById,
    insert,
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
    };
    if (!fields.name) return wrapFail("Bill name is required");

    if (id) {
      await update(TABLE, id, fields);
    } else {
      await insert(TABLE, fields);
    }

    return wrapSuccess({ id: id || fields.id }, id ? "Update successful" : "Save successful");
  } catch (e) {
    return wrapFail(e.message);
  }
};

export const fetchDeleteBill = async (billId) => {
  try {
    const id = normalizeId(billId);
    if (!id) return wrapFail("Invalid bill ID", 400);

    await remove(TABLE, id);
    return wrapSuccess({ id }, "Delete successful");
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


