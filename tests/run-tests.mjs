// 芯匣存储服务测试（Node 运行，localStorage 用内存 Map 模拟）
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const S = await import('./storage.test.mjs');
let passed = 0, failed = 0;
const ok = (cond, name) => {
  if (cond) { passed++; console.log('PASS', name); }
  else { failed++; console.log('FAIL', name); }
};

// 1. 全新状态
ok(S.isSetupNeeded() === true, 'fresh-install needs setup');
ok(S.isUnlocked() === false, 'locked initially');

// 2. 旧版明文数据迁移
store.set('chipbox_accounts', JSON.stringify([
  { id: '1', title: '微信', username: 'test@qq.com', password: 'plain123', category: '社交', updatedAt: 1 },
]));

// 3. 设置 PIN（自动迁移）
await S.setupPin('1234');
ok(S.isUnlocked() === true, 'unlocked after setup');
ok(S.hasLegacyData() === false, 'legacy plaintext removed');
let accounts = await S.getAccounts();
ok(accounts.length === 1 && accounts[0].password === 'plain123', 'legacy data migrated');

// 4. 密文校验
const rawVault = store.get('chipbox_vault');
ok(rawVault && !rawVault.includes('plain123') && !rawVault.includes('微信'), 'vault is ciphertext');
const rawSettings = store.get('chipbox_settings');
ok(rawSettings && !rawSettings.includes('1234'), 'settings do not leak PIN');
ok(rawSettings.includes('310000'), 'PBKDF2 310000 iterations stored');

// 5. 锁定
S.lock();
ok((await S.getAccounts()).length === 0, 'no data access while locked');

// 6. 解锁
ok(await S.unlock('9999') === false, 'wrong PIN rejected');
ok(await S.unlock('1234') === true, 'correct PIN unlocks');

// 7. 收藏 + 新增
const favAcc = { id: '2', title: '银行', username: 'a', password: 'b', category: '银行', updatedAt: 2, favorite: true };
await S.saveAccount(favAcc);
accounts = await S.getAccounts();
ok(accounts.length === 2, 'account added');
const stored = accounts.find((a) => a.id === '2');
ok(stored && stored.favorite === true, 'favorite flag persisted encrypted');

// 8. 导出导入
const backup = await S.exportData();
ok(JSON.parse(backup).accounts.length === 2, 'export contains active accounts');
ok(await S.importData('{ broken') === false, 'corrupt import rejected');
await S.saveAccount({ id: '3', title: '临时', category: '其他', updatedAt: 3 });
ok(await S.importData(backup) === true, 'valid import accepted');
ok((await S.getAccounts()).length === 2, 'import replaced data');

// 9. 软删除 / 回收站
await S.deleteAccount('2');
ok((await S.getAccounts()).length === 1, 'deleted hidden from active list');
let deleted = await S.getDeletedAccounts();
ok(deleted.length === 1 && deleted[0].id === '2', 'deleted visible in trash');
await S.restoreAccount('2');
ok((await S.getAccounts()).length === 2 && (await S.getDeletedAccounts()).length === 0, 'restore works');

// 10. 彻底删除 / 清空回收站
await S.deleteAccount('1');
await S.deleteAccount('2');
await S.purgeAccount('1');
deleted = await S.getDeletedAccounts();
ok(deleted.length === 1 && deleted[0].id === '2', 'purge removes permanently');
await S.clearTrash();
ok((await S.getDeletedAccounts()).length === 0, 'clear trash works');
ok((await S.getAccounts()).length === 0, 'active list empty after trash cleared');

// 10.5 密钥材料解锁（生物识别底层机制）
const bioBits = await S.deriveKeyBits('1234');
ok(bioBits !== null && bioBits.length === 32, 'deriveKeyBits returns 32 bytes');
S.lock();
ok(await S.unlockWithKeyBits(bioBits) === true, 'unlock with stored key bits works');
S.lock();
const wrongBits = new Uint8Array(32);
ok(await S.unlockWithKeyBits(wrongBits) === false, 'wrong key bits rejected');
ok(await S.unlock('1234') === true, 'PIN still works');

// 11. 修改 PIN（无数据状态也安全）
await S.saveAccount({ id: '9', title: 'X', category: '其他', updatedAt: 9 });
ok((await S.changePin('0000', '5678')) === null, 'changePin rejects wrong current PIN');
const cpBits = await S.changePin('1234', '5678');
ok(cpBits !== null && cpBits.length === 32, 'changePin succeeds and returns new bits');
S.lock();
ok(await S.unlock('1234') === false, 'old PIN rejected');
ok(await S.unlock('5678') === true, 'new PIN works');
ok((await S.getAccounts()).length === 1, 'data intact after PIN change');

// 12. 清空
S.clearAllData();
ok(S.isSetupNeeded() === true, 'setup needed after clearAll');
ok(await S.unlock('5678') === false, 'unlock fails after clearAll');

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);


