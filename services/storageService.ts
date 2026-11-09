import { Account, AppSettings, VaultEnvelope } from '../types';

const KEYS = {
  LEGACY_ACCOUNTS: 'chipbox_accounts', // 旧版明文数据（仅用于一次性迁移）
  VAULT: 'chipbox_vault',              // 加密后的账号保险箱
  SETTINGS: 'chipbox_settings',
};

const KDF_ITERATIONS = 310000; // OWASP 推荐的 PBKDF2-SHA256 迭代次数
const PIN_CHECK_MESSAGE = 'chipbox-vault-ok';
const VAULT_VERSION = 1;
const DEFAULT_AUTO_LOCK_MINUTES = 5;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ---------- base64 工具 ----------
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
// PBKDF2-SHA256 从 PIN 派生 AES-256-GCM 密钥（不可导出，仅存在内存中）
const deriveKey = async (pin: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // extractable: false，密钥无法被导出
    ['encrypt', 'decrypt']
  );
};

const aesEncrypt = async (key: CryptoKey, plaintext: string): Promise<{ iv: string; data: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    textEncoder.encode(plaintext)
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

// ---------- 会话状态（内存密钥，刷新页面即失效） ----------
let masterKey: CryptoKey | null = null;

export const isUnlocked = (): boolean => masterKey !== null;

export const lock = (): void => { masterKey = null; };

// ---------- 设置 ----------
const readSettings = (): AppSettings | null => {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // 校验新格式；旧版 simpleHash 设置会被视为不存在，走重新设置流程
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

// 是否需要初始化（全新安装，或检测到旧版明文数据需要迁移）
export const isSetupNeeded = (): boolean => readSettings() === null;

export const hasLegacyData = (): boolean => !!localStorage.getItem(KEYS.LEGACY_ACCOUNTS);

// ---------- 首次设置 PIN（自动迁移旧明文数据） ----------
export const setupPin = async (pin: string): Promise<void> => {
  assertCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt, KDF_ITERATIONS);
  const pinCheck = await aesEncrypt(key, PIN_CHECK_MESSAGE);
  saveSettings({
    kdf: { iterations: KDF_ITERATIONS, salt: toBase64(salt) },
    pinCheck,
    biometricEnabled: false,
    autoLockTime: DEFAULT_AUTO_LOCK_MINUTES,
  });

  // 一次性迁移旧版明文账号到加密保险箱
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
};

// ---------- 解锁 / 验证 ----------
export const unlock = async (pin: string): Promise<boolean> => {
  const settings = readSettings();
  if (!settings) return false;
  try {
    const key = await deriveKey(pin, fromBase64(settings.kdf.salt), settings.kdf.iterations);
    const msg = await aesDecrypt(key, settings.pinCheck.iv, settings.pinCheck.data);
    if (msg !== PIN_CHECK_MESSAGE) return false;
    masterKey = key;
    return true;
  } catch {
    return false; // GCM 校验失败 = PIN 错误
  }
};

export const verifyPin = async (pin: string): Promise<boolean> => {
  const settings = readSettings();
  if (!settings) return false;
  try {
    const key = await deriveKey(pin, fromBase64(settings.kdf.salt), settings.kdf.iterations);
    const msg = await aesDecrypt(key, settings.pinCheck.iv, settings.pinCheck.data);
    return msg === PIN_CHECK_MESSAGE;
  } catch {
    return false;
  }
};

// 修改 PIN：用新派生密钥重加密全部数据
export const changePin = async (currentPin: string, newPin: string): Promise<boolean> => {
  if (!masterKey) return false;
  const ok = await verifyPin(currentPin);
  if (!ok) return false;
  const accounts = await getAccounts();
  const prev = readSettings();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveKey(newPin, salt, KDF_ITERATIONS);
  const pinCheck = await aesEncrypt(newKey, PIN_CHECK_MESSAGE);
  saveSettings({
    kdf: { iterations: KDF_ITERATIONS, salt: toBase64(salt) },
    pinCheck,
    biometricEnabled: prev?.biometricEnabled ?? false,
    autoLockTime: prev?.autoLockTime ?? DEFAULT_AUTO_LOCK_MINUTES,
  });
  await writeVault(newKey, accounts);
  masterKey = newKey;
  return true;
};

// ---------- 账号增删改查（密文存取） ----------
const writeVault = async (key: CryptoKey, accounts: Account[]) => {
  const env = await aesEncrypt(key, JSON.stringify(accounts));
  const envelope: VaultEnvelope = { v: VAULT_VERSION, iv: env.iv, data: env.data };
  localStorage.setItem(KEYS.VAULT, JSON.stringify(envelope));
};

export const getAccounts = async (): Promise<Account[]> => {
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

export const saveAccount = async (account: Account) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = await getAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.unshift(account); // 新账号置顶
  }
  await writeVault(masterKey, accounts);
};

export const deleteAccount = async (id: string) => {
  if (!masterKey) throw new Error('应用未解锁');
  const accounts = (await getAccounts()).filter((a) => a.id !== id);
  await writeVault(masterKey, accounts);
};

// ---------- 备份导入导出（备份文件保持明文 JSON 格式，用户可读） ----------
export const exportData = async (): Promise<string> => {
  const data = {
    accounts: await getAccounts(),
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
