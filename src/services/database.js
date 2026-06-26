import AsyncStorage from "@react-native-async-storage/async-storage";
import { DB_CONFIG } from "../utils/constant";

function storeKey() {
  return DB_CONFIG.storagePrefix + "app_store";
}

let memoryStore = null;
let initPromise = null;

async function ensureStore() {
  if (memoryStore) return memoryStore;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const raw = await AsyncStorage.getItem(storeKey());
    memoryStore = raw
      ? JSON.parse(raw)
      : { durables: [], bills: [], schedules: [], reminders: [], check_ins: [], settings: [] };
    return memoryStore;
  })();
  return initPromise;
}

async function persist() {
  if (memoryStore) {
    await AsyncStorage.setItem(storeKey(), JSON.stringify(memoryStore));
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDbValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && !Number.isFinite(value)) return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function normalizeDbRecord(record = {}) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      normalizeDbValue(value),
    ]),
  );
}

function normalizeDbParams(params = []) {
  if (Array.isArray(params)) {
    return params.map(normalizeDbValue);
  }
  return normalizeDbRecord(params);
}

function wrapSuccess(data, message = "success") {
  return { code: 200, message, data };
}

function wrapFail(message = "操作失败", code = 400) {
  return { code, message, data: null };
}

function getTable(table) {
  const map = {
    durables: "durables",
    bills: "bills",
    schedules: "schedules",
  reminders: "reminders",
  check_ins: "check_ins",
  settings: "settings",
};
  return map[table] || table;
}

export async function getAll(table, orderBy = "created_at DESC") {
  const store = await ensureStore();
  const t = getTable(table);
  const rows = store[t] || [];
  const desc = orderBy.includes("DESC");
  return [...rows].sort((a, b) => {
    const fieldA = a[orderBy.split(" ")[0]] || a.created_at || "";
    const fieldB = b[orderBy.split(" ")[0]] || b.created_at || "";
    return desc
      ? String(fieldB).localeCompare(String(fieldA))
      : String(fieldA).localeCompare(String(fieldB));
  });
}

export async function getById(table, id) {
  const store = await ensureStore();
  const t = getTable(table);
  const normalizedId = normalizeDbValue(id);
  return (store[t] || []).find((r) => r.id === normalizedId) || null;
}

export async function insert(table, data) {
  const store = await ensureStore();
  const t = getTable(table);
  const id = data.id || generateId();
  const timestamp = now();
  const record = normalizeDbRecord({
    id,
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
  });
  if (!store[t]) store[t] = [];
  store[t].push(record);
  await persist();
  return { id };
}

export async function insertBatch(table, records) {
  const store = await ensureStore();
  const t = getTable(table);
  const timestamp = now();
  const inserted = records.map((data) => {
    const id = data.id || generateId();
    return normalizeDbRecord({ id, ...data, created_at: timestamp, updated_at: timestamp });
  });
  if (!store[t]) store[t] = [];
  store[t].push(...inserted);
  await persist();
  return { count: inserted.length };
}

export async function update(table, id, data) {
  const store = await ensureStore();
  const t = getTable(table);
  const normalizedId = normalizeDbValue(id);
  const idx = (store[t] || []).findIndex((r) => r.id === normalizedId);
  if (idx !== -1) {
    store[t][idx] = normalizeDbRecord({
      ...store[t][idx],
      ...data,
      updated_at: now(),
    });
    await persist();
  }
  return { id: normalizedId };
}

export async function remove(table, id) {
  const store = await ensureStore();
  const t = getTable(table);
  const normalizedId = normalizeDbValue(id);
  if (store[t]) {
    store[t] = store[t].filter((r) => r.id !== normalizedId);
    await persist();
  }
  return { id: normalizedId };
}

export async function query(sql, params = []) {
  const normalizedParams = normalizeDbParams(params);
  const store = await ensureStore();
  const match = sql.match(/FROM\s+(\w+)/i);
  if (!match) return [];
  const t = getTable(match[1]);
  let rows = store[t] || [];
  if (sql.includes("WHERE")) {
    const conditions = sql.split("WHERE")[1].split("ORDER BY")[0].trim();
    const parts = conditions.split("AND").map((c) => c.trim());
    let paramIdx = 0;
    for (const part of parts) {
      const likeParam = part.match(/(\w+)\s+LIKE\s+\?/);
      if (likeParam) {
        const field = likeParam[1];
        const pattern = normalizedParams[paramIdx++] || "";
        rows = rows.filter((r) =>
          String(r[field] || "").includes(pattern.replace(/%/g, "")),
        );
        continue;
      }
      const likeLit = part.match(/(\w+)\s+LIKE\s+'([^']*)'/);
      if (likeLit) {
        const field = likeLit[1];
        const pattern = likeLit[2];
        rows = rows.filter((r) =>
          String(r[field] || "").includes(pattern.replace(/%/g, "")),
        );
        continue;
      }
      const compParam = part.match(/(\w+)\s*(>=|<=|!=|=|<|>)\s+\?/);
      if (compParam) {
        const [, field, op] = compParam;
        const val = normalizedParams[paramIdx++];
        rows = filterByOp(rows, field, op, val);
        continue;
      }
      const compLit = part.match(
        /(\w+)\s*(>=|<=|!=|=|<|>)\s+(?:(\d+(?:\.\d+)?)|'([^']*)')/,
      );
      if (compLit) {
        const [, field, op, numStr, strVal] = compLit;
        const val = numStr !== undefined ? Number(numStr) : strVal;
        rows = filterByOp(rows, field, op, val);
        continue;
      }
    }
  }
  return rows;
}

function filterByOp(rows, field, op, val) {
  return rows.filter((r) => {
    const fv = r[field];
    switch (op) {
      case ">=": return fv >= val;
      case "<=": return fv <= val;
      case "!=": return fv !== val;
      case "=": return fv === val;
      case ">": return fv > val;
      case "<": return fv < val;
      default: return true;
    }
  });
}

export async function queryFirst(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function execute(sql, params = []) {
  return { changes: 0 };
}

export async function getSetting(key) {
  const store = await ensureStore();
  const normalizedKey = normalizeDbValue(key);
  const entry = (store.settings || []).find((s) => s.key === normalizedKey);
  return entry ? entry.value : null;
}

export async function setSetting(key, value) {
  const store = await ensureStore();
  if (!store.settings) store.settings = [];
  const normalizedKey = normalizeDbValue(key);
  const normalizedValue = normalizeDbValue(value);
  const idx = store.settings.findIndex((s) => s.key === normalizedKey);
  if (idx !== -1) {
    store.settings[idx].value = normalizedValue;
    store.settings[idx].updated_at = now();
  } else {
    store.settings.push({
      key: normalizedKey,
      value: normalizedValue,
      created_at: now(),
      updated_at: now(),
    });
  }
  await persist();
}

export async function clearAllData() {
  memoryStore = {
    durables: [],
    bills: [],
    schedules: [],
    reminders: [],
    check_ins: [],
    important_dates: [],
    settings: [],
  };
  await persist();
}

export { generateId, now, wrapFail, wrapSuccess };
