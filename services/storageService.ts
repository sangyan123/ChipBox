import { Account, AppSettings } from '../types';

const KEYS = {
  ACCOUNTS: 'chipbox_accounts',
  SETTINGS: 'chipbox_settings',
};

// Helper to simulate a hash (In a real app, use WebCrypto API)
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem(KEYS.SETTINGS);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    masterPasswordHash: null,
    biometricEnabled: false,
    autoLockTime: 5,
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

export const getAccounts = (): Account[] => {
  const saved = localStorage.getItem(KEYS.ACCOUNTS);
  return saved ? JSON.parse(saved) : [];
};

export const saveAccount = (account: Account) => {
  const accounts = getAccounts();
  const index = accounts.findIndex((a) => a.id === account.id);
  if (index >= 0) {
    accounts[index] = account;
  } else {
    accounts.unshift(account); // Add to top
  }
  localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
};

export const deleteAccount = (id: string) => {
  const accounts = getAccounts().filter((a) => a.id !== id);
  localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
};

export const exportData = () => {
  const data = {
    accounts: getAccounts(),
    exportedAt: new Date().toISOString(),
    app: 'ChipBox',
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.app === 'ChipBox' && Array.isArray(data.accounts)) {
      localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(data.accounts));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.ACCOUNTS);
};
