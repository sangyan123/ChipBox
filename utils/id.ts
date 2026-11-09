// 生成唯一 ID：优先 crypto.randomUUID（Web 版 / 现代 WebView），否则退化到时间戳+随机串
export const newAccountId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
};
