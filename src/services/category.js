import { CATEGORY_ICON_NAME_MAP } from "../utils/constant";
import { getSetting, setSetting } from "./database";

const STORAGE_KEY = "bubbletime_custom_categories";
const STORAGE_KEY_DISABLED_BUILTINS = "bubbletime_disabled_builtin_categories";

function generateId() {
  return "custom_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getCustomCategories() {
  try {
    const raw = await getSetting(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomCategories(categories) {
  await setSetting(STORAGE_KEY, JSON.stringify(categories));
}

export async function addCustomCategory(data) {
  const list = await getCustomCategories();
  const key = generateId();
  const maxOrder = list.reduce((m, c) => Math.max(m, c.order || 0), 0);
  list.push({ key, name: data.name, icon: data.icon || "Tag", enabled: true, order: maxOrder + 1 });
  await saveCustomCategories(list);
  return key;
}

export async function updateCustomCategory(key, data) {
  const list = await getCustomCategories();
  const idx = list.findIndex((c) => c.key === key);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], ...data };
  await saveCustomCategories(list);
  return true;
}

export async function deleteCustomCategory(key) {
  const list = await getCustomCategories();
  const filtered = list.filter((c) => c.key !== key);
  if (filtered.length === list.length) return false;
  await saveCustomCategories(filtered);
  return true;
}

/** 获取已禁用的内置类别 key 列表 */
export async function getDisabledBuiltinKeys() {
  try {
    const raw = await getSetting(STORAGE_KEY_DISABLED_BUILTINS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 保存禁用的内置类别 key 列表 */
export async function setDisabledBuiltinKeys(keys) {
  await setSetting(STORAGE_KEY_DISABLED_BUILTINS, JSON.stringify(keys));
}

/** 切换内置类别的启用/禁用状态 */
export async function toggleBuiltinCategory(key) {
  const disabled = await getDisabledBuiltinKeys();
  const idx = disabled.indexOf(key);
  if (idx !== -1) {
    disabled.splice(idx, 1);
  } else {
    disabled.push(key);
  }
  await setDisabledBuiltinKeys(disabled);
  return idx === -1 ? "disabled" : "enabled";
}

/** 获取所有预设类别 key 列表 */
export function getBuiltinCategoryKeys() {
  return ["food", "clothing", "transport", "medical", "home", "appliance", "digital", "entertainment", "daily", "education", "other"];
}

/** 合并预设 + 自定义类别 */
export async function getAllMergedCategories() {
  const builtinKeys = getBuiltinCategoryKeys();
  const custom = await getCustomCategories();
  const disabledBuiltins = await getDisabledBuiltinKeys();
  const builtins = builtinKeys.map((key, i) => ({
    key,
    isBuiltin: true,
    enabled: !disabledBuiltins.includes(key),
    order: i,
    iconName: null,
  }));
  return [...builtins, ...custom.sort((a, b) => (a.order || 0) - (b.order || 0))];
}

/** 只返回启用的类别 key */
export async function getEnabledCategoryKeys() {
  const merged = await getAllMergedCategories();
  return merged.filter((c) => c.enabled).map((c) => c.key);
}

/** 解析图标组件（预设用 CATEGORY_ICON，自定义用 CATEGORY_ICON_NAME_MAP） */
export function resolveCategoryIcon(categoryKey, iconName) {
  if (!categoryKey) return null;
  if (CATEGORY_ICON_NAME_MAP[categoryKey]) return CATEGORY_ICON_NAME_MAP[categoryKey];
  if (iconName && CATEGORY_ICON_NAME_MAP[iconName]) return CATEGORY_ICON_NAME_MAP[iconName];
  return null;
}

/** 获取类别显示名称（预设走 i18n，自定义走 name 字段） */
export function getCategoryLabel(t, categoryKey, customName) {
  const builtinKeys = getBuiltinCategoryKeys();
  if (builtinKeys.includes(categoryKey)) {
    return t("categories." + categoryKey);
  }
  return customName || categoryKey;
}

/** 检查某个类别是否被数据使用 */
export async function checkCategoryInUse(categoryKey) {
  const { getAll } = await import("./database");
  const all = await getAll("bills");
  const durableAll = await getAll("durables");
  let inBills = all.some((b) => b.category === categoryKey);
  let inDurables = durableAll.some((d) => d.category === categoryKey);
  let inDurableExpenses = durableAll.some((d) => {
    if (!d.repair_record) return false;
    try {
      const rr = typeof d.repair_record === "string" ? JSON.parse(d.repair_record) : d.repair_record;
      const exps = Array.isArray(rr) ? rr : (rr.expenses || []);
      return exps.some((e) => e.category === categoryKey);
    } catch { return false; }
  });
  let inDurableIncomes = durableAll.some((d) => {
    if (!d.repair_record) return false;
    try {
      const rr = typeof d.repair_record === "string" ? JSON.parse(d.repair_record) : d.repair_record;
      const incs = Array.isArray(rr) ? [] : (rr.incomes || []);
      return incs.some((e) => e.category === categoryKey);
    } catch { return false; }
  });
  return inBills || inDurables || inDurableExpenses || inDurableIncomes;
}
