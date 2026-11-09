export interface Account {
  id: string;
  title: string;
  username?: string;
  password?: string;
  category: string;
  note?: string;
  updatedAt: number;
  favorite?: boolean;   // 收藏置顶
  deletedAt?: number;   // 软删除时间（存在即表示在回收站中）
}

export const DEFAULT_CATEGORIES = ['全部', '社交', '银行', '购物', '办公', '游戏', '邮箱', '其他'];

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
  pinCheck: EncryptedBlob;
  biometricEnabled: boolean;
  autoLockTime: number; // 分钟，0 表示不自动锁定
}

export interface VaultEnvelope {
  v: number;
  iv: string;
  data: string;
}
