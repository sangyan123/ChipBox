import { Account, AppSettings, VaultEnvelope } from '../types';

const KEYS = {
  LEGACY_ACCOUNTS: 'chipbox_accounts',
  VAULT: 'chipbox_vault',
  SETTINGS: 'chipbox_settings',
};

const KDF_ITERATIONS = 310000;
const PIN_CHECK_MESSAGE = 'chipbox-vault-ok';
const VAULT_VERSION = 1;
const DEFAULT_AUTO_LOCK_MINUTES = 5;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------- base64 ----------
const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const assertCrypto = () => {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('当前环境不支持 WebCrypto（需要 HTTPS 或 localhost）');
  }
};

// ---------- 核心加密 ----------
const deriveBits = async (pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
};

const importAesKey = async (bits: Uint8Array): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    'raw',
    bits as unknown as BufferSource,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

const aesEncrypt = async (key: CryptoKey, plaintext: string): Promise<{ iv: string; data: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    textEncoder.encode(plaintext) as unknown as BufferSource
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) };
};

const aesDecrypt = async (key: CryptoKey, ivB64: string, dataB64: string): Promise<string> => {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivB64) as unknown as BufferSource },
    key,
    fromBase64(dataB64) as unknown as BufferSource
  );
  return textDecoder.decode(plain);
};

// ---------- 会话状态 ----------
let masterKey: CryptoKey | null = null;

export const isUnlocked = (): boolean => masterKey !== null;
export const lock = (): void => { masterKey = null; };

// ---------- 设置 ----------
const readSettings = (): AppSettings | null => {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.kdf && s.pinCheck && typeof s.kdf.iterations === 'number') return s as AppSettings;
    return null;
  } catch {
    return null;
  }
};

const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getAutoLockTime = (): number => readSettings()?.autoLockTime ?? DEFAULT_AUTO_LOCK_MINUTES;

export const saveAutoLockTime = (minutes: number) => {
  const s = readSettings();
  if (s) saveSettings({ ...s, autoLockTime: minutes });
};

export const isSetupNeeded = (): boolean => readSettings() === null;
export const hasLegacyData = (): boolean => !!localStorage.getItem(KEYS.LEGACY_ACCOUNTS);

// ---------- 首次设置 PIN ----------
export const setupPin = async (pin: string): Promise<Uint8Array> => {
  assertCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(pin, salt, KDF_ITERATIONS);
  const key = await importAesKey(bits);
  const pinCheck = await aesEncrypt(key, PIN_CHECK_MESSAGE);
  saveSettings({
    kdf: { iterations: KDF_ITERATIONS, salt: toBase64(salt) },
    pinCheck,
    biometricEnabled: false,
    autoLockTime: DEFAULT_AUTO_LOCK_MINUTES,
  });

  const legacy = localStorage.getItem(KEYS.LEGACY_ACCOUNTS);
  if (legacy) {
    try {
      const accounts = JSON.parse(legacy);
      if (Array.isArray(accounts)) await writeVault(key, accounts as Account[]);
    } catch {
      // 旧数据损坏则丢弃
    }
    localStorage.removeItem(KEYS.LEGACY_ACCOUNTS);
  }

  masterKey = key;
  return bits;
};

// ---------- 解锁 / 验证 ----------
const tryUnlock = async (pin: string, setKey: boolean): Promise<boolean> => {
  const settings = readSettings();
  if (!settings) return false;
  try {
    const bits = await deriveBits(pin, fromBase64(settings.kdf.salt), settings.kdf.iterations);
    const key = await importAesKey(bits);
    const msg = await aesDecrypt(key, settings.pinCheck.iv, settings.pinCheck.data);
    if (msg !== PIN_CHECK_MESSAGE) return false;
    if (setKey) masterKey = key;
    return true;
  } catch {
    return false;
  }
};

export const unlock = async (pin: string): Promise<boolean> => tryUnlock(pin, true);
export const verifyPin = async (pin: string): Promise<boolean> => tryUnlock(pin, false);

export const changePin = async (currentPin: string, newPin: string): Promise<Uint8Array | null> => {
  if (!masterKey) return null;
  const ok = await verifyPin(currentPin);
  if (!ok) return null;
  const accounts = await readVault();
  const prev = readSettings();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newBits = await deriveBits(newPin, salt, KDF_ITERATIONS);
  const newKey = await importAesKey(newBits);
  const pinCheck = await aesEncrypt(newKey, PIN_CHECK_MESSAGE);
  saveSettings({
    kdf: { iterations: KDF_ITERATIONS, salt: toBase64(salt) },
    pinCheck,
    biometricEnabled: prev?.biometricEnabled ?? false,
    autoLockTime: prev?.autoLockTime ?? DEFAULT_AUTO_LOCK_MINUTES,
  });
  await writeVault(newKey, accounts);
  masterKey = newKey;
  return newBits;
};

// ---------- 账号增删改查 ----------
const writeVault = async (key: CryptoKey, accounts: Account[]) => {
  const env = await aesEncrypt(key, JSON.stringify(accounts));
  const envelope: VaultEnvelope = { v: VAULT_VERSION, iv: env.iv, data: env.data };
  localStorage.setItem(KEYS.VAULT, JSON.stringify(envelope));
};

const readVault = async (): Promise<Account[]> => {
  if (!masterKey) return [];
  const raw = localStorage.getItem(KEYS.VAULT);
  if (!raw) return [];
  try {
    const env: VaultEnvelope = JSON.parse(raw);
    const json = await aesDecrypt(masterKey, env.iv, env.data);
    const accounts = JSON.parse(json);
    return Array.isArray(accounts) ? (accounts as Account[]) : [];
  } catch (e) {
    console.warn('保险箱解密失败', e);
    return [];
  }
};

// 有效账号（不含回收站中的）
export const getAccounts = async (): Promise<Account[]> =>
  (await readVault()).filter((a) => !a.deletedAt);

// 回收站中的账号
export const getDeletedAccounts = async (): Promise<Account[]> =>
  (await readVault()).filter((a) => !!a.deletedAt);

export const saveAccount = async (account: Account) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = await readVault();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.unshift(account);
  }
  await writeVault(masterKey, accounts);
};

// 软删除：移入回收站
export const deleteAccount = async (id: string) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = await readVault();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], deletedAt: Date.now() };
  }
  await writeVault(masterKey, accounts);
};

export const restoreAccount = async (id: string) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = await readVault();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx >= 0) {
    const { deletedAt: _removed, ...rest } = accounts[idx];
    accounts[idx] = rest as Account;
  }
  await writeVault(masterKey, accounts);
};

// 彻底删除
export const purgeAccount = async (id: string) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = (await readVault()).filter((a) => a.id !== id);
  await writeVault(masterKey, accounts);
};

export const clearTrash = async () => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = (await readVault()).filter((a) => !a.deletedAt);
  await writeVault(masterKey, accounts);
};

// ---------- 生物识别支持 ----------
// 用 PIN 派生原始密钥材料（用于寄存到系统安全硬件，如 Android Keystore）
export const deriveKeyBits = async (pin: string): Promise<Uint8Array | null> => {
  const settings = readSettings();
  if (!settings) return null;
  try {
    return await deriveBits(pin, fromBase64(settings.kdf.salt), settings.kdf.iterations);
  } catch {
    return null;
  }
};

// 用寄存的密钥材料解锁（生物识别取回后调用）
export const unlockWithKeyBits = async (bits: Uint8Array): Promise<boolean> => {
  const settings = readSettings();
  if (!settings) return false;
  try {
    const key = await importAesKey(bits);
    const msg = await aesDecrypt(key, settings.pinCheck.iv, settings.pinCheck.data);
    if (msg !== PIN_CHECK_MESSAGE) return false;
    masterKey = key;
    return true;
  } catch {
    return false;
  }
};

export const getBiometricEnabled = (): boolean => readSettings()?.biometricEnabled ?? false;

export const saveBiometricEnabled = (v: boolean) => {
  const s = readSettings();
  if (s) saveSettings({ ...s, biometricEnabled: v });
};

// ---------- 备份 ----------
export const exportData = async (): Promise<string> => {
  const data = {
    accounts: await getAccounts(), // 仅导出有效账号
    exportedAt: new Date().toISOString(),
    app: 'ChipBox',
  };
  return JSON.stringify(data, null, 2);
};

export const importData = async (jsonString: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonString);
    if (data.app === 'ChipBox' && Array.isArray(data.accounts)) {
      if (!masterKey) return false;
      await writeVault(masterKey, data.accounts as Account[]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.VAULT);
  localStorage.removeItem(KEYS.SETTINGS);
  localStorage.removeItem(KEYS.LEGACY_ACCOUNTS);
  masterKey = null;
};

