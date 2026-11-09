import { DEFAULT_CATEGORIES } from '../types';

const KEY = 'chipbox_custom_categories';

// 自定义分类（非敏感数据，明文存放）
export const getCustomCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((c) => typeof c === 'string' && c.trim()) : [];
  } catch {
    return [];
  }
};

export const getAllCategories = (): string[] => {
  const seen = new Set<string>([...DEFAULT_CATEGORIES, ...getCustomCategories()]);
  return [...seen];
};

export const addCustomCategory = (name: string): boolean => {
  const n = name.trim();
  if (!n || n.length > 10) return false;
  if (getAllCategories().includes(n)) return false;
  const cur = getCustomCategories();
  cur.push(n);
  localStorage.setItem(KEY, JSON.stringify(cur));
  return true;
};

export const removeCustomCategory = (name: string) => {
  localStorage.setItem(KEY, JSON.stringify(getCustomCategories().filter((c) => c !== name)));
};
