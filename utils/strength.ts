export interface StrengthResult {
  score: 0 | 1 | 2; // 0 弱 1 中 2 强
  label: string;
  percent: number;
  colorClass: string;
}

// 基于字符池熵的密码强度估算：bits = length * log2(charsetPool)
export const passwordStrength = (pw?: string): StrengthResult => {
  if (!pw) return { score: 0, label: '无', percent: 0, colorClass: 'bg-slate-300 dark:bg-slate-600' };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  const symbols = '!@#$%^&*()_+=-';
  const chars = [...pw];
  if (chars.some((c) => symbols.includes(c))) pool += symbols.length;
  const bits = pw.length * Math.log2(Math.max(pool, 2));
  if (bits < 40) return { score: 0, label: '弱', percent: 25, colorClass: 'bg-red-500' };
  if (bits < 60) return { score: 1, label: '中', percent: 60, colorClass: 'bg-amber-500' };
  return { score: 2, label: '强', percent: 100, colorClass: 'bg-emerald-500' };
};

