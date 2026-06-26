import * as database from "./db";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const fetchTodayCheckIn = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await database.getAll("check_ins");
  const found = rows.find((r) => r.check_date === today);
  return { code: 0, message: "ok", data: found || null };
};

export const fetchCheckInList = async (year, month) => {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const all = await database.getAll("check_ins");
  const filtered = all.filter((r) => r.check_date.startsWith(prefix));
  return { code: 0, message: "ok", data: filtered };
};

export const fetchCheckInRange = async (startDate, endDate) => {
  const all = await database.getAll("check_ins");
  const filtered = all.filter((r) => r.check_date >= startDate && r.check_date <= endDate);
  return { code: 0, message: "ok", data: filtered };
};

export const fetchSubmitCheckIn = async (mood, date) => {
  const checkDate = date || new Date().toISOString().slice(0, 10);
  const all = await database.getAll("check_ins");
  const existing = all.find((r) => r.check_date === checkDate);
  if (existing) {
    await database.update("check_ins", existing.id, { mood });
    return { code: 0, message: "ok", data: { ...existing, mood } };
  }
  const id = generateId();
  const record = { id, check_date: checkDate, mood };
  await database.insert("check_ins", record);
  return { code: 0, message: "ok", data: record };
};
