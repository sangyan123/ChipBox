import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Trash2, Lock, KeyRound, RotateCcw, ChevronDown, Palette, FolderPlus } from 'lucide-react';
import * as Storage from '../services/storageService';
import { addCustomCategory, getCustomCategories, removeCustomCategory } from '../services/categoryService';
import { getThemeChoice, setThemeChoice, ThemeChoice } from '../utils/theme';
import * as biometricService from '../services/biometricService';
import { Account } from '../types';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autoLock, setAutoLock] = useState(() => Storage.getAutoLockTime());
  const [theme, setTheme] = useState<ThemeChoice>(() => getThemeChoice());
  const [cpOpen, setCpOpen] = useState(false);
  const [cpCur, setCpCur] = useState('');
  const [cpNew1, setCpNew1] = useState('');
  const [cpNew2, setCpNew2] = useState('');
  const [cpMsg, setCpMsg] = useState('');
  const [trashOpen, setTrashOpen] = useState(false);
  const [trash, setTrash] = useState<Account[]>([]);
  const [catsOpen, setCatsOpen] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [bioOn, setBioOn] = useState(() => Storage.getBiometricEnabled());
  const [bioSupported, setBioSupported] = useState(false);

  const loadTrash = () => Storage.getDeletedAccounts().then(setTrash);
  useEffect(() => { loadTrash(); }, []);
  useEffect(() => { void (async () => setBioSupported(await biometricService.isSupported()))(); }, []);

  const handleExport = async () => {
    const data = await Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chipbox_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const ok = await Storage.importData(text);
      window.alert(ok ? '导入成功，已覆盖当前数据' : '导入失败：文件格式不正确');
    } catch {
      window.alert('导入失败：无法读取文件');
    }
    e.target.value = '';
  };

  const submitChangePin = async () => {
    setCpMsg('');
    if (cpNew1.length < 4) return setCpMsg('新密码至少4位');
    if (cpNew1 !== cpNew2) return setCpMsg('两次输入的新密码不一致');
    const newBits = await Storage.changePin(cpCur, cpNew1);
    if (newBits) {
      if (Storage.getBiometricEnabled()) {
        try {
          await biometricService.enable(newBits);
        } catch {
          await biometricService.disable();
          setBioOn(false);
          window.alert('访问密码已修改，但生物识别凭证同步失败，已自动关闭生物识别');
        }
      }
      setCpMsg('');
      setCpOpen(false);
      setCpCur('');
      setCpNew1('');
      setCpNew2('');
      window.alert('访问密码修改成功');
    } else {
      setCpMsg('当前密码错误');
    }
  };

  const handleToggleBiometric = async () => {
    try {
      if (bioOn) {
        await biometricService.disable();
        setBioOn(false);
        window.alert('生物识别解锁已关闭');
        return;
      }
      const pin = window.prompt('输入当前访问密码以启用生物识别');
      if (!pin) return;
      const ok = await Storage.verifyPin(pin);
      if (!ok) { window.alert('密码错误'); return; }
      const bits = await Storage.deriveKeyBits(pin);
      if (!bits) { window.alert('启用失败'); return; }
      await biometricService.enable(bits);
      setBioOn(true);
      window.alert('生物识别解锁已开启，锁定后可用指纹/面容快速解锁');
    } catch {
      window.alert('操作未完成（可能取消了生物识别验证）');
    }
  };

  const handleLock = () => {
    Storage.lock();
    navigate('/', { replace: true });
  };

  const handleReset = async () => {
    if (!window.confirm('确定清空全部数据？\n所有账号和访问密码将被永久删除，无法恢复！')) return;
    Storage.clearAllData();
    await biometricService.disable();
    window.location.reload();
  };

  const handleRestore = async (id: string) => {
    await Storage.restoreAccount(id);
    loadTrash();
  };

  const handlePurge = async (id: string) => {
    if (!window.confirm('彻底删除后无法恢复，确定？')) return;
    await Storage.purgeAccount(id);
    loadTrash();
  };

  const handleClearTrash = async () => {
    if (!window.confirm('清空回收站中全部账号？此操作不可恢复。')) return;
    await Storage.clearTrash();
    loadTrash();
  };

  const handleAddCategory = () => {
    const name = window.prompt('输入自定义分类名称（10字以内）');
    if (!name) return;
    if (addCustomCategory(name)) setCustomCategories(getCustomCategories());
    else window.alert('分类已存在或名称无效');
  };

  const handleRemoveCategory = (name: string) => {
    removeCustomCategory(name);
    setCustomCategories(getCustomCategories());
  };

  const formattedDate = (ts?: number) =>
    ts ? new Date(ts).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 my-4 px-2">备份与设置</h1>
      <div className="space-y-4 pb-8" style={{ marginBottom: 'calc(70px + env(safe-area-inset-bottom))' }}>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-slate-50 dark:divide-slate-700 overflow-hidden">
          <button onClick={handleExport} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">导出备份文件（JSON 明文）</span>
            <Download className="w-4 h-4 text-blue-500" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">从备份文件导入</span>
            <Upload className="w-4 h-4 text-blue-500" />
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-slate-50 dark:divide-slate-700 overflow-hidden">
          <button onClick={() => { setCpOpen(!cpOpen); setCpMsg(''); }} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">修改访问密码</span>
            <KeyRound className="w-4 h-4 text-blue-500" />
          </button>
          {cpOpen && (
            <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-900">
              <input type="password" inputMode="numeric" placeholder="当前密码" value={cpCur}
                onChange={(e) => setCpCur(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-100" />
              <input type="password" inputMode="numeric" placeholder="新密码（4-8位）" value={cpNew1}
                onChange={(e) => setCpNew1(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-100" />
              <input type="password" inputMode="numeric" placeholder="再次输入新密码" value={cpNew2}
                onChange={(e) => setCpNew2(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-100" />
              {cpMsg && <p className="text-red-500 text-xs">{cpMsg}</p>}
              <button onClick={submitChangePin} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium active:opacity-80">
                确认修改
              </button>
            </div>
          )}
          <div className="p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">自动锁定</span>
            <select
              value={autoLock}
              onChange={(e) => { const m = Number(e.target.value); setAutoLock(m); Storage.saveAutoLockTime(m); }}
              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none"
            >
              <option value={1}>1 分钟</option>
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={0}>不自动锁定</option>
            </select>
          </div>
          <div className="p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">生物识别解锁（指纹/面容）</span>
            <button
              onClick={handleToggleBiometric}
              disabled={!bioSupported}
              className={bioOn ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${bioOn ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {!bioSupported && (
            <p className="px-4 pb-3 text-[10px] text-slate-400 dark:text-slate-500">当前设备不支持或未录入生物识别</p>
          )}
          <button onClick={handleLock} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">立即锁定</span>
            <Lock className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-slate-50 dark:divide-slate-700 overflow-hidden">
          <button onClick={() => setTrashOpen(!trashOpen)} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">
              回收站{trash.length > 0 ? `（${trash.length} 个账号）` : ''}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${trashOpen ? 'rotate-180' : ''}`} />
          </button>
          {trashOpen && (
            <div className="p-4 space-y-2 bg-slate-50 dark:bg-slate-900">
              {trash.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">回收站为空</p>
              ) : (
                <>
                  {trash.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{acc.title}</p>
                        <p className="text-[10px] text-slate-400">删除于 {formattedDate(acc.deletedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRestore(acc.id)} title="恢复"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 active:opacity-70">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handlePurge(acc.id)} title="彻底删除"
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 active:opacity-70">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleClearTrash} className="w-full py-2 text-xs text-red-500 font-medium">清空回收站</button>
                </>
              )}
            </div>
          )}
          <button onClick={() => setCatsOpen(!catsOpen)} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200">自定义分类管理</span>
            <FolderPlus className="w-4 h-4 text-blue-500" />
          </button>
          {catsOpen && (
            <div className="p-4 space-y-2 bg-slate-50 dark:bg-slate-900">
              {customCategories.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-1">暂无自定义分类（可在编辑账号页添加）</p>
              ) : (
                customCategories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200">{cat}</span>
                    <button onClick={() => handleRemoveCategory(cat)} className="text-xs text-red-500">删除</button>
                  </div>
                ))
              )}
              <button onClick={handleAddCategory} className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 font-medium">＋ 添加分类</button>
            </div>
          )}
          <div className="p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-2"><Palette className="w-4 h-4 text-slate-400" /> 外观</span>
            <select
              value={theme}
              onChange={(e) => { const v = e.target.value as ThemeChoice; setTheme(v); setThemeChoice(v); }}
              className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm divide-y divide-slate-50 dark:divide-slate-700 overflow-hidden">
          <button onClick={handleReset} className="w-full p-4 flex justify-between items-center text-sm text-red-500">
            <span>重置并清空应用</span>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 text-center">
          <p className="text-[10px] text-slate-400">芯匣 ChipBox - AES-256-GCM 加密存储</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;




