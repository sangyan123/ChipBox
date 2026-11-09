import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import * as Storage from './storageService';

// 凭据条目标识（Android Keystore 加密存储 / iOS Keychain）
const SERVER = 'chipbox-keybits';

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

// 设备是否支持已录入的生物识别（指纹/面容）
export const isSupported = async (): Promise<boolean> => {
  try {
    const { isAvailable, biometryType } = await NativeBiometric.isAvailable();
    return !!isAvailable && biometryType !== BiometryType.NONE;
  } catch {
    return false;
  }
};

export const isEnabled = (): boolean => Storage.getBiometricEnabled();

// 开启：把当前 PIN 派生的密钥材料寄存到系统安全硬件（需要生物识别验证才能读回）
export const enable = async (bits: Uint8Array): Promise<void> => {
  await NativeBiometric.setCredentials({
    username: 'keybits',
    password: toBase64(bits),
    server: SERVER,
  });
  Storage.saveBiometricEnabled(true);
};

// 停用：删除寄存的密钥材料
export const disable = async (): Promise<void> => {
  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch {
    // 可能本来就不存在
  }
  Storage.saveBiometricEnabled(false);
};

// 取回密钥材料（系统会弹出指纹/面容验证）。用户取消或失效返回 null
export const retrieveKeyBits = async (): Promise<Uint8Array | null> => {
  if (!Storage.getBiometricEnabled()) return null;
  try {
    const { password } = await NativeBiometric.getCredentials({ server: SERVER });
    return fromBase64(password);
  } catch {
    return null;
  }
};
