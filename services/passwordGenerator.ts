export interface GenOptions {
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

const CHAR_SETS: Record<keyof GenOptions, string> = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  number: '0123456789',
  symbol: '!@#$%^&*()_+=-',
};

// 使用 crypto.getRandomValues（CSPRNG）生成密码，替代 Math.random
export const generatePassword = (length: number, options: GenOptions): string => {
  let chars = '';
  (Object.keys(CHAR_SETS) as (keyof GenOptions)[]).forEach((k) => {
    if (options[k]) chars += CHAR_SETS[k];
  });
  if (!chars) return '';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
};
