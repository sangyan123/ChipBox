import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, Search, Plus, Copy, ChevronRight, ChevronLeft, RefreshCw, Download, Upload, Trash2, Lock, KeyRound } from 'lucide-react';
import * as Storage from './services/storageService';
import { generatePassword } from './services/passwordGenerator';
import { Account, CATEGORIES } from './types';
import BottomNav from './components/BottomNav';

const newAccountId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString() + Math.random().toString(36).slice(2);
};

// 1. Login Screen（首次设置 / 二次确认 / 解锁 三种模式）
const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<'setup' | 'confirm' | 'unlock'>('unlock');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (Storage.isSetupNeeded()) setMode('setup');
  }, []);

  const title = mode === 'setup'
    ? '请设置访问密码（4-8位）'
    : mode === 'confirm'
      ? '请再次输入以确认'
      : '请输入访问密码';

  const handleNumClick = (num: string) => {
    if (busy) return;
    if (pin.length < 8) setPin((prev) => prev + num);
    setError('');
  };

  const handleDelete = () => setPin((prev) => prev.slice(0, -1));

  const handleCancel = () => {
    setPin('');
    setError('');
    if (mode === 'confirm') setMode('setup');
  };

  const handleSubmit = async () => {
    if (busy) return;
    setError('');
    if (mode === 'setup') {
      if (pin.length < 4) return setError('密码至少需要4位');
      setFirstPin(pin);
      setPin('');
      setMode('confirm');
      return;
    }
    if (mode === 'confirm') {
      if (pin !== firstPin) {
        setError('两次输入不一致，请重新设置');
        setPin('');
        setFirstPin('');
        setMode('setup');
        return;
      }
      setBusy(true);
      try {
        await Storage.setupPin(pin);
        navigate('/home');
      } catch (e) {
        console.error(e);
        setError('初始化失败，请重试');
        setMode('setup');
        setPin('');
      } finally {
        setBusy(false);
      }
      return;
    }
    // unlock
    setBusy(true);
    try {
      const ok = await Storage.unlock(pin);
      if (ok) {
        navigate('/home');
      } else {
        setError('密码错误');
        setPin('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700 p-6"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <Shield className="text-white w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-slate-800">芯匣</h1>
      </div>

      <div className="mb-8 w-full max-w-[240px]">
        <h2 className="text-center mb-4 text-sm font-medium text-slate-600">{title}</h2>
        <div className="flex justify-center space-x-3 mb-2 h-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
                i < pin.length ? 'bg-slate-800 border-slate-800' : 'bg-transparent border-slate-300'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-[10px] text-center h-4">{error}</p>}
        {mode === 'setup' && !error && (
          <p className="text-amber-600 text-[10px] text-center h-4">密码遗忘后数据将无法恢复，请牢记</p>
        )}
        {mode !== 'setup' && !error && <p className="h-4" />}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumClick(num.toString())}
            className="w-14 h-14 rounded-full border border-slate-200 bg-white text-lg font-medium text-slate-700 shadow-sm active:bg-slate-100 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <button className="w-14 h-14 flex items-center justify-center text-slate-400 text-sm" onClick={handleCancel}>
          取消
        </button>
        <button
          onClick={() => handleNumClick('0')}
          className="w-14 h-14 rounded-full border border-slate-200 bg-white text-lg font-medium text-slate-700 shadow-sm active:bg-slate-100 flex items-center justify-center"
        >
          0
        </button>
        <button onClick={handleDelete} className="w-14 h-14 flex items-center justify-center text-slate-700">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="w-full max-w-[240px] bg-slate-800 text-white py-3 rounded-xl font-medium shadow-lg active:scale-95 transition-transform text-sm disabled:opacity-60"
      >
        {busy ? '处理中...' : mode === 'setup' ? '下一步' : mode === 'confirm' ? '确认并创建' : '进入应用'}
      </button>
    </div>
  );
};

// 2. Dashboard Screen
const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    Storage.getAccounts().then(setAccounts);
  }, []);

  const filteredAccounts = accounts.filter((acc) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      acc.title.toLowerCase().includes(q) ||
      (acc.username || '').toLowerCase().includes(q) ||
      (acc.note || '').toLowerCase().includes(q);
    const matchesCategory = activeCategory === '全部' || acc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleLock = () => {
    Storage.lock();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Search Bar with Safe Area */}
      <div className="sticky top-0 bg-slate-50 z-20 px-4 shadow-sm" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索标题 / 账号 / 备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            />
          </div>
          <button
            onClick={handleLock}
            title="立即锁定"
            className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 active:bg-slate-100"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-3 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2 space-y-2">
        {filteredAccounts.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            <p>暂无账号，点击右下角添加</p>
          </div>
        ) : (
          filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => navigate(`/detail/${acc.id}`)}
              className="group bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between active:bg-slate-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                  {acc.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{acc.title}</h3>
                  <p className="text-[11px] text-slate-400">{acc.username || '***'}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 w-4 h-4" />
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/edit/new')}
        className="fixed right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform z-30"
        style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
};

// 3. Detail Screen
const DetailScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Storage.getAccounts().then((accounts) => {
      const found = accounts.find((a) => a.id === id);
      if (found) setAccount(found);
      else navigate('/home');
    });
  }, [id, navigate]);

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToast('已复制');
    setTimeout(() => setToast(''), 2000);
  };

  if (!account) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 sticky top-0 bg-white z-20"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center text-slate-600 text-sm">
          <ChevronLeft className="w-5 h-5 mr-1" /> 返回
        </button>
        <h2 className="font-bold text-slate-800">账号详情</h2>
        <button onClick={() => navigate(`/edit/${account.id}`)} className="text-sm text-blue-600 font-medium">
          编辑
        </button>
      </div>

      <div className="flex-1 p-6">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-slate-300">{account.title.charAt(0)}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{account.title}</h1>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded mt-2">{account.category}</span>
        </div>

        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">账号</label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-md text-slate-800 font-medium select-all">{account.username || '--'}</span>
              <button onClick={() => copyToClipboard(account.username)} className="text-xs text-blue-600 font-medium">复制</button>
            </div>
          </div>

          <div className="border-b border-slate-100 pb-3">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">密码</label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-md text-slate-800 font-mono tracking-wider">
                {showPassword ? (account.password || '--') : '••••••••'}
              </span>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowPassword(!showPassword)} className="text-xs text-slate-400">
                  {showPassword ? '隐藏' : '显示'}
                </button>
                <button onClick={() => copyToClipboard(account.password)} className="text-xs text-blue-600 font-medium">复制</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">备注</label>
            <div className="mt-2 text-slate-600 text-sm bg-slate-50 p-4 rounded-xl">
              {account.note || '暂无备注'}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-5 py-2 rounded-full text-xs shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

// 4. Edit/Add Screen
const EditAccountScreen: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [form, setForm] = useState<Account>({
    id: newAccountId(),
    title: '',
    username: '',
    password: '',
    category: '其他',
    note: '',
    updatedAt: Date.now()
  });

  useEffect(() => {
    if (!isNew && id) {
      Storage.getAccounts().then((accounts) => {
        const found = accounts.find((a) => a.id === id);
        if (found) setForm(found);
      });
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!form.title) return window.alert('请输入名称');
    await Storage.saveAccount({ ...form, updatedAt: Date.now() });
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!window.confirm('确定删除？删除后无法恢复')) return;
    await Storage.deleteAccount(form.id);
    navigate('/home');
  };

  const handleQuickGenerate = () => {
    setForm({ ...form, password: generatePassword(12, { upper: true, lower: true, number: true, symbol: true }) });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-200 z-20"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={() => navigate(-1)} className="text-slate-600 text-sm">取消</button>
        <h2 className="font-bold text-slate-800">{isNew ? '新建账号' : '编辑账号'}</h2>
        <button onClick={handleSave} className="text-blue-600 font-bold text-sm">保存</button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl space-y-4 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">名称</label>
            <input className="w-full text-md outline-none border-b border-transparent focus:border-blue-500 py-1"
              placeholder="例如：微信"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">分类</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1 rounded-full text-[10px] border ${form.category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl space-y-4 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">账号</label>
            <input className="w-full text-sm outline-none border-b border-transparent focus:border-blue-500 py-1"
              placeholder="用户名/手机号"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">密码</label>
            <div className="flex items-center border-b border-transparent focus-within:border-blue-500">
              <input className="flex-1 text-sm outline-none py-1 font-mono"
                placeholder="输入密码"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button onClick={handleQuickGenerate} className="text-[10px] text-blue-600 ml-2">自动生成</button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 mb-1">备注</label>
          <textarea className="w-full h-20 outline-none resize-none text-sm pt-1"
            placeholder="添加额外信息..."
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        {!isNew && (
          <button onClick={handleDelete} className="w-full py-3 text-red-500 bg-white rounded-xl shadow-sm font-medium text-sm">
            删除此账号
          </button>
        )}
      </div>
    </div>
  );
};

// 5. Generator Screen
const GeneratorScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [options, setOptions] = useState({ upper: true, lower: true, number: true, symbol: false });

  const generate = React.useCallback(() => {
    setPassword(generatePassword(length, options));
  }, [length, options]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-slate-800 my-4 px-2">密码生成器</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
        <div className="text-xl font-mono text-slate-800 break-all min-h-[40px] flex items-center justify-center">
          {password}
        </div>
        <div className="flex justify-center space-x-3 mt-4">
          <button onClick={generate} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-medium"><RefreshCw className="w-3 h-3 inline mr-1" /> 换一个</button>
          <button onClick={() => { navigator.clipboard.writeText(password); window.alert('已复制'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"><Copy className="w-3 h-3 inline mr-1" /> 复制</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <div className="flex justify-between text-[11px] mb-2 font-bold text-slate-400"><span>长度</span><span className="text-blue-600">{length}</span></div>
          <input type="range" min="6" max="32" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries({ upper: '大写', lower: '小写', number: '数字', symbol: '符号' }).map(([key, label]) => (
            <label key={key} className="flex items-center p-2 border border-slate-100 rounded-lg">
              <input type="checkbox" checked={options[key as keyof typeof options]} onChange={() => setOptions({ ...options, [key]: !options[key as keyof typeof options] })} className="mr-2" />
              <span className="text-xs text-slate-600">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// 6. Settings Screen
const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [autoLock, setAutoLock] = useState(() => Storage.getAutoLockTime());
  const [cpOpen, setCpOpen] = useState(false);
  const [cpCur, setCpCur] = useState('');
  const [cpNew1, setCpNew1] = useState('');
  const [cpNew2, setCpNew2] = useState('');
  const [cpMsg, setCpMsg] = useState('');

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
    const ok = await Storage.changePin(cpCur, cpNew1);
    if (ok) {
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

  const handleLock = () => {
    Storage.lock();
    navigate('/', { replace: true });
  };

  const handleReset = () => {
    if (!window.confirm('确定清空全部数据？\n所有账号和访问密码将被永久删除，无法恢复！')) return;
    Storage.clearAllData();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-slate-800 my-4 px-2">备份与设置</h1>
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50 overflow-hidden">
          <button onClick={handleExport} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700">导出备份文件（JSON 明文）</span>
            <Download className="w-4 h-4 text-blue-500" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700">从备份文件导入</span>
            <Upload className="w-4 h-4 text-blue-500" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50 overflow-hidden">
          <button onClick={() => { setCpOpen(!cpOpen); setCpMsg(''); }} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700">修改访问密码</span>
            <KeyRound className="w-4 h-4 text-blue-500" />
          </button>
          {cpOpen && (
            <div className="p-4 space-y-3 bg-slate-50">
              <input type="password" inputMode="numeric" placeholder="当前密码" value={cpCur}
                onChange={(e) => setCpCur(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              <input type="password" inputMode="numeric" placeholder="新密码（4-8位）" value={cpNew1}
                onChange={(e) => setCpNew1(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              <input type="password" inputMode="numeric" placeholder="再次输入新密码" value={cpNew2}
                onChange={(e) => setCpNew2(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              {cpMsg && <p className="text-red-500 text-xs">{cpMsg}</p>}
              <button onClick={submitChangePin} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium active:opacity-80">
                确认修改
              </button>
            </div>
          )}
          <div className="p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700">自动锁定</span>
            <select
              value={autoLock}
              onChange={(e) => { const m = Number(e.target.value); setAutoLock(m); Storage.saveAutoLockTime(m); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 outline-none"
            >
              <option value={1}>1 分钟</option>
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={0}>不自动锁定</option>
            </select>
          </div>
          <button onClick={handleLock} className="w-full p-4 flex justify-between items-center text-sm">
            <span className="text-slate-700">立即锁定</span>
            <Lock className="w-4 h-4 text-slate-500" />
          </button>
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!Storage.isUnlocked()) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  // 自动锁定：无操作 N 分钟后丢弃内存密钥并回到锁屏
  useEffect(() => {
    let timer: number | undefined;
    const arm = () => {
      if (timer) window.clearTimeout(timer);
      if (!Storage.isUnlocked()) return;
      const mins = Storage.getAutoLockTime();
      if (mins <= 0) return;
      timer = window.setTimeout(() => {
        Storage.lock();
        setTick((t) => t + 1);
        navigate('/', { replace: true });
      }, mins * 60 * 1000);
    };
    const events: (keyof WindowEventMap)[] = ['click', 'touchstart', 'keydown'];
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    arm();
    return () => {
      events.forEach((e) => window.removeEventListener(e, arm));
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 shadow-2xl overflow-hidden relative font-sans flex flex-col">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/home" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/detail/:id" element={<ProtectedRoute><DetailScreen /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><EditAccountScreen /></ProtectedRoute>} />
          <Route path="/generator" element={<ProtectedRoute><GeneratorScreen /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
};

export default App;
