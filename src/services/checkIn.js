import { Platform } from "react-native";

const useNative = Platform.OS !== "web";

let db = null;
async function getDb() {
  if (db) return db;
  if (useNative) {
    const mod = await import("./database.native");
    db = mod;
  } else {
    const mod = await import("./database");
    db = mod;
  }
  return db;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const fetchTodayCheckIn = async () => {
  const database = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = useNative
    ? await database.query("SELECT * FROM check_ins WHERE check_date = ?", [today])
    : (await database.getAll("check_ins")).filter((r) => r.check_date === today);
  return { code: 0, message: "ok", data: rows[0] || null };
};

export const fetchCheckInList = async (year, month) => {
  const database = await getDb();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const all = await database.getAll("check_ins");
  const filtered = all.filter((r) => r.check_date.startsWith(prefix));
  return { code: 0, message: "ok", data: filtered };
};

export const fetchCheckInRange = async (startDate, endDate) => {
  const database = await getDb();
  const all = await database.getAll("check_ins");
  const filtered = all.filter((r) => r.check_date >= startDate && r.check_date <= endDate);
  return { code: 0, message: "ok", data: filtered };
};

export const fetchSubmitCheckIn = async (mood, date) => {
  const database = await getDb();
  const checkDate = date || new Date().toISOString().slice(0, 10);
  const rows = useNative
    ? await database.query("SELECT * FROM check_ins WHERE check_date = ?", [checkDate])
    : (await database.getAll("check_ins")).filter((r) => r.check_date === checkDate);
  const existing = rows[0];
  if (existing) {
    await database.update("check_ins", existing.id, { mood });
    return { code: 0, message: "ok", data: { ...existing, mood } };
  }
  const id = generateId();
  const record = { id, check_date: checkDate, mood };
  await database.insert("check_ins", record);
  return { code: 0, message: "ok", data: record };
};
