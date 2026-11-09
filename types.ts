export interface Account {
  id: string;
  title: string;
  username?: string;
  password?: string;
  category: string;
  note?: string;
  updatedAt: number;
}

export const CATEGORIES = ['全部', '社交', '银行', '购物', '办公', '游戏', '邮箱', '其他'];

// KDF 参数与 PIN 校验块（不含敏感数据，可明文存放于 LocalStorage）
export interface KdfParams {
  iterations: number;
  salt: string; // base64
}

export interface EncryptedBlob {
  iv: string;   // base64
  data: string; // base64
}

export interface AppSettings {
  kdf: KdfParams;
  pinCheck: EncryptedBlob; // 用 PIN 派生密钥加密的校验串，用于验证 PIN 正确性
  biometricEnabled: boolean;
  autoLockTime: number; // 分钟，0 表示不自动锁定
}

// 加密保险箱信封（LocalStorage 中只存这个密文）
export interface VaultEnvelope {
  v: number;
  iv: string;
  data: string;
}
