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

export interface AppSettings {
  masterPasswordHash: string | null; // Simple hash for verification (not robust crypto for this demo)
  biometricEnabled: boolean;
  autoLockTime: number; // minutes
}

export type ViewState = 'LOGIN' | 'HOME' | 'GENERATOR' | 'SETTINGS' | 'DETAIL' | 'EDIT';
