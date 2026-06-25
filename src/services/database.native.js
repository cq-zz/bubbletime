import * as SQLite from "expo-sqlite";
import { DB_CONFIG } from "../utils/constant";

function dbName() {
  return `${DB_CONFIG.baseDbName}.db`;
}

let db = null;
let schemaReady = false;
let dbReady = false;
let initPromise = null;

export async function getDb() {
  if (initPromise) return initPromise;

  if (db && dbReady) {
    try {
      await db.getFirstAsync("SELECT 1");
      return db;
    } catch (e) {
      db = null;
      schemaReady = false;
      dbReady = false;
      initPromise = null;
    }
  }

  initPromise = openAndInit();
  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

async function openAndInit() {
  const name = dbName();
  db = null;
  schemaReady = false;
  dbReady = false;
  try {
    db = await SQLite.openDatabaseAsync(name, { useNewConnection: true });
  } catch (e) {
    try {
      await SQLite.deleteDatabaseAsync(name);
    } catch {}
    db = await SQLite.openDatabaseAsync(name, { useNewConnection: true });
  }
  if (!db) {
    throw new Error("无法打开数据库");
  }
  if (!schemaReady) {
    try {
      await initSchema(db);
      schemaReady = true;
    } catch (e) {
      try {
        await SQLite.deleteDatabaseAsync(name);
      } catch {}
      db = null;
      schemaReady = false;
      dbReady = false;
      const msg = e && e.message ? e.message : String(e);
      throw new Error(`数据库初始化失败，请清除应用数据后重试: ${msg}`);
    }
  }
  dbReady = true;
  return db;
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS durables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT,
    category TEXT DEFAULT '',
    status TEXT DEFAULT 'in_use',
    purchase_date TEXT DEFAULT '',
    purchase_price REAL DEFAULT 0,
    expected_lifespan TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    repair_record TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    currency TEXT DEFAULT 'CNY',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    category TEXT DEFAULT '',
    consumption_date TEXT DEFAULT '',
    receipt_image TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    source TEXT DEFAULT '',
    source_id TEXT DEFAULT '',
    bill_type TEXT DEFAULT 'expense',
    currency TEXT DEFAULT 'CNY',
    auto_schedule INTEGER DEFAULT 0,
    schedule_type TEXT DEFAULT '',
    schedule_interval INTEGER DEFAULT 0,
    schedule_day INTEGER DEFAULT 0,
    schedule_start TEXT DEFAULT '',
    schedule_end TEXT DEFAULT '',
    schedule_last_generated TEXT DEFAULT '',
    schedule_source_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    image TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'todo',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    checklist TEXT DEFAULT '[]',
    reminder_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    module_type TEXT NOT NULL,
    module_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    remind_time TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium',
    is_active INTEGER DEFAULT 1,
    dismissed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS check_ins (
    id TEXT PRIMARY KEY,
    check_date TEXT NOT NULL,
    mood TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS important_dates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT DEFAULT '',
    type TEXT DEFAULT 'annual',
    category TEXT DEFAULT 'other',
    reminder_enabled INTEGER DEFAULT 1,
    reminder_days_before INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  )`,
];

async function initSchema(database) {
  for (const sql of SCHEMA_STATEMENTS) {
    await database.execAsync(sql);
  }
  try {
    await migrateSchema(database);
  } catch (e) {
    console.warn("Schema migration failed (non-fatal):", e);
  }
}

async function ensureColumns(database, table, columns) {
  let existingColumns;
  try {
    existingColumns = await database.getAllAsync(`PRAGMA table_info(${table})`);
  } catch {
    existingColumns = [];
  }
  const existingNames = new Set(
    (existingColumns || []).map((column) => column && column.name).filter(Boolean),
  );

  for (const column of columns) {
    if (!existingNames.has(column.name)) {
      await database.execAsync(
        `ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`,
      );
    }
  }
}

async function migrateSchema(database) {
  await ensureColumns(database, "durables", [
    { name: "image", definition: "TEXT DEFAULT ''" },
    { name: "category", definition: "TEXT DEFAULT ''" },
    { name: "status", definition: "TEXT DEFAULT 'in_use'" },
    { name: "purchase_date", definition: "TEXT DEFAULT ''" },
    { name: "purchase_price", definition: "REAL DEFAULT 0" },
    { name: "expected_lifespan", definition: "TEXT DEFAULT ''" },
    { name: "expiry_date", definition: "TEXT DEFAULT ''" },
    { name: "repair_record", definition: "TEXT DEFAULT ''" },
    { name: "notes", definition: "TEXT DEFAULT ''" },
    { name: "currency", definition: "TEXT DEFAULT 'CNY'" },
    { name: "created_at", definition: "TEXT DEFAULT ''" },
    { name: "updated_at", definition: "TEXT DEFAULT ''" },
  ]);

  await ensureColumns(database, "bills", [
    { name: "amount", definition: "REAL DEFAULT 0" },
    { name: "category", definition: "TEXT DEFAULT ''" },
    { name: "consumption_date", definition: "TEXT DEFAULT ''" },
    { name: "receipt_image", definition: "TEXT DEFAULT ''" },
    { name: "notes", definition: "TEXT DEFAULT ''" },
    { name: "source", definition: "TEXT DEFAULT ''" },
    { name: "source_id", definition: "TEXT DEFAULT ''" },
    { name: "bill_type", definition: "TEXT DEFAULT 'expense'" },
    { name: "currency", definition: "TEXT DEFAULT 'CNY'" },
    { name: "auto_schedule", definition: "INTEGER DEFAULT 0" },
    { name: "schedule_type", definition: "TEXT DEFAULT ''" },
    { name: "schedule_interval", definition: "INTEGER DEFAULT 0" },
    { name: "schedule_day", definition: "INTEGER DEFAULT 0" },
    { name: "schedule_start", definition: "TEXT DEFAULT ''" },
    { name: "schedule_end", definition: "TEXT DEFAULT ''" },
    { name: "schedule_last_generated", definition: "TEXT DEFAULT ''" },
    { name: "schedule_source_id", definition: "TEXT DEFAULT ''" },
    { name: "created_at", definition: "TEXT DEFAULT ''" },
    { name: "updated_at", definition: "TEXT DEFAULT ''" },
  ]);

  await ensureColumns(database, "schedules", [
    { name: "image", definition: "TEXT DEFAULT ''" },
    { name: "priority", definition: "TEXT DEFAULT 'medium'" },
    { name: "status", definition: "TEXT DEFAULT 'todo'" },
    { name: "start_date", definition: "TEXT DEFAULT ''" },
    { name: "end_date", definition: "TEXT DEFAULT ''" },
    { name: "notes", definition: "TEXT DEFAULT ''" },
    { name: "checklist", definition: "TEXT DEFAULT '[]'" },
    { name: "reminder_enabled", definition: "INTEGER DEFAULT 1" },
    { name: "created_at", definition: "TEXT DEFAULT ''" },
    { name: "updated_at", definition: "TEXT DEFAULT ''" },
  ]);

  await ensureColumns(database, "reminders", [
    { name: "module_type", definition: "TEXT DEFAULT ''" },
    { name: "module_id", definition: "TEXT DEFAULT ''" },
    { name: "title", definition: "TEXT DEFAULT ''" },
    { name: "description", definition: "TEXT DEFAULT ''" },
    { name: "remind_time", definition: "TEXT DEFAULT ''" },
    { name: "priority", definition: "TEXT DEFAULT 'medium'" },
    { name: "is_active", definition: "INTEGER DEFAULT 1" },
    { name: "dismissed", definition: "INTEGER DEFAULT 0" },
    { name: "created_at", definition: "TEXT DEFAULT ''" },
    { name: "updated_at", definition: "TEXT DEFAULT ''" },
  ]);

  await ensureColumns(database, "settings", [
    { name: "updated_at", definition: "TEXT DEFAULT ''" },
  ]);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeSqlValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function normalizeSqlParams(params = []) {
  if (Array.isArray(params)) {
    return params.map(normalizeSqlValue);
  }
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      normalizeSqlValue(value),
    ]),
  );
}

function inlineParams(sql, params) {
  const vals = [...params];
  return sql.replace(/\?/g, () => {
    const v = vals.shift();
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return String(v);
    const s = String(v).replace(/'/g, "''");
    return `'${s}'`;
  });
}

async function runSql(database, sql, params = []) {
  try {
    const normalized = normalizeSqlParams(params);
    const inlined = inlineParams(sql, normalized);
    await database.execAsync(inlined);
    return { changes: 1 };
  } catch (e) {
    throw new Error(`${e.message} SQL: ${sql} PARAMS: ${JSON.stringify(params)}`);
  }
}

async function getAllSql(database, sql, params = []) {
  try {
    const normalized = normalizeSqlParams(params);
    const inlined = inlineParams(sql, normalized);
    return await database.getAllAsync(inlined);
  } catch (e) {
    throw new Error(`${e.message} SQL: ${sql}`);
  }
}

async function getFirstSql(database, sql, params = []) {
  try {
    const normalized = normalizeSqlParams(params);
    const inlined = inlineParams(sql, normalized);
    return await database.getFirstAsync(inlined);
  } catch (e) {
    throw new Error(`${e.message} SQL: ${sql}`);
  }
}

function wrapSuccess(data, message = "success") {
  return { code: 200, message, data };
}

function wrapFail(message = "操作失败", code = 400) {
  return { code, message, data: null };
}

export async function getAll(table, orderBy = "created_at DESC") {
  const database = await getDb();
  const rows = await getAllSql(
    database,
    `SELECT * FROM ${table} ORDER BY ${orderBy}`,
  );
  return rows;
}

export async function getById(table, id) {
  const database = await getDb();
  return await getFirstSql(database, `SELECT * FROM ${table} WHERE id = ?`, [id]);
}

export async function insert(table, data) {
  const database = await getDb();
  const id = data.id || generateId();
  const timestamp = now();
  const fields = { id, ...data, created_at: timestamp, updated_at: timestamp };
  const keys = Object.keys(fields);
  const placeholders = keys.map(() => "?").join(", ");
  const values = keys.map((k) => fields[k]);
  await runSql(
    database,
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    values,
  );
  return { id };
}

export async function insertBatch(table, records) {
  const database = await getDb();
  const timestamp = now();
  let sql = "BEGIN TRANSACTION;\n";
  for (const data of records) {
    const id = data.id || generateId();
    const fields = { id, ...data, created_at: timestamp, updated_at: timestamp };
    const keys = Object.keys(fields);
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((k) => fields[k]);
    const inlined = inlineParams(
      `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
      normalizeSqlParams(values),
    );
    sql += inlined + ";\n";
  }
  sql += "COMMIT;";
  await database.execAsync(sql);
  return { count: records.length };
}

export async function update(table, id, data) {
  const database = await getDb();
  const timestamp = now();
  const fields = { ...data, updated_at: timestamp };
  const keys = Object.keys(fields);
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => fields[k]);
  values.push(id);
  await runSql(database, `UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
  return { id };
}

export async function remove(table, id) {
  const database = await getDb();
  await runSql(database, `DELETE FROM ${table} WHERE id = ?`, [id]);
  return { id };
}

export async function query(sql, params = []) {
  const database = await getDb();
  return await getAllSql(database, sql, params);
}

export async function queryFirst(sql, params = []) {
  const database = await getDb();
  return await getFirstSql(database, sql, params);
}

export async function execute(sql, params = []) {
  const database = await getDb();
  return await runSql(database, sql, params);
}

export async function getSetting(key) {
  const database = await getDb();
  const row = await getFirstSql(database, "SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const database = await getDb();
  await runSql(database, "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)", [key, value, now()]);
}

export async function clearAllData() {
  const database = await getDb();
  const tables = ["durables", "bills", "schedules", "reminders", "important_dates", "check_ins", "settings"];
  for (const table of tables) {
    await runSql(database, `DELETE FROM ${table}`);
  }
}

export { generateId, now, wrapFail, wrapSuccess };
