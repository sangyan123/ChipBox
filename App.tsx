import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shield, Search, Plus, Copy, ChevronRight, ChevronLeft, RefreshCw, Download, Upload, Trash2, Check } from 'lucide-react';
import * as Storage from './services/storageService';
import { Account, CATEGORIES } from './types';
import BottomNav from './components/BottomNav';

// 1. Login Screen
const LoginScreen: React.FC = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const settings = Storage.getSettings();
    if (!settings.masterPasswordHash) {
      setIsSetup(true);
    }
  }, []);

  const handleUnlock = () => {
    const settings = Storage.getSettings();
    if (isSetup) {
      if (pin.length < 4) {
        setError('密码至少需要4位');
        return;
      }
      Storage.saveSettings({ ...settings, masterPasswordHash: Storage.simpleHash(pin) });
      sessionStorage.setItem('isUnlocked', 'true');
      navigate('/home');
    } else {
      if (Storage.simpleHash(pin) === settings.masterPasswordHash) {
        sessionStorage.setItem('isUnlocked', 'true');
        navigate('/home');
      } else {
        setError('密码错误');
        setPin('');
      }
    }
  };

  const handleNumClick = (num: string) => {
    if (pin.length < 8) setPin((prev) => prev + num);
    setError('');
  };

  const handleDelete = () => setPin((prev) => prev.slice(0, -1));

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
        <h2 className="text-center mb-4 text-sm font-medium text-slate-600">
          {isSetup ? '请设置访问密码' : '请输入访问密码'}
        </h2>
        <div className="flex justify-center space-x-3 mb-2 h-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
                i < pin.length ? 'bg-slate-800 border-slate-800' : 'bg-transparent border-slate-300'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-[10px] text-center h-4">{error}</p>}
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
        <button className="w-14 h-14 flex items-center justify-center text-slate-400 text-sm" onClick={() => setPin('')}>
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
        onClick={handleUnlock}
        className="w-full max-w-[240px] bg-slate-800 text-white py-3 rounded-xl font-medium shadow-lg active:scale-95 transition-transform text-sm"
      >
        {isSetup ? '完成设置' : '进入应用'}
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
    setAccounts(Storage.getAccounts());
  }, []);

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = acc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === '全部' || acc.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      {/* Search Bar with Safe Area */}
      <div className="sticky top-0 bg-slate-50 z-20 px-4 pt-2 shadow-sm" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索账号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
          />
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
    const accounts = Storage.getAccounts();
    const found = accounts.find((a) => a.id === id);
    if (found) setAccount(found);
    else navigate('/home');
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
      {/* Header with Safe Area */}
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
        id: Date.now().toString(),
        title: '',
        username: '',
        password: '',
        category: '其他',
        note: '',
        updatedAt: Date.now()
    });

    useEffect(() => {
        if (!isNew && id) {
            const accounts = Storage.getAccounts();
            const found = accounts.find(a => a.id === id);
            if(found) setForm(found);
        }
    }, [id, isNew]);

    const handleSave = () => {
        if(!form.title) return alert('请输入名称');
        Storage.saveAccount({...form, updatedAt: Date.now()});
        navigate(-1);
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
                            value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">分类</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {CATEGORIES.map(cat => (
                                <button key={cat} onClick={() => setForm({...form, category: cat})}
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
                            value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">密码</label>
                        <div className="flex items-center border-b border-transparent focus-within:border-blue-500">
                            <input className="flex-1 text-sm outline-none py-1 font-mono" 
                                placeholder="输入密码"
                                value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                            <button onClick={() => {
                                 const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                                 let pass = "";
                                 for(let i=0; i<12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                                 setForm({...form, password: pass});
                            }} className="text-[10px] text-blue-600 ml-2">自动生成</button>
                        </div>
                    </div>
                 </div>

                 <div className="bg-white p-4 rounded-xl shadow-sm">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">备注</label>
                    <textarea className="w-full h-20 outline-none resize-none text-sm pt-1" 
                        placeholder="添加额外信息..."
                        value={form.note} onChange={e => setForm({...form, note: e.target.value})} />
                 </div>

                 {!isNew && (
                     <button onClick={() => {
                         if(confirm('确定删除？')){ Storage.deleteAccount(form.id); navigate('/home'); }
                     }} className="w-full py-3 text-red-500 bg-white rounded-xl shadow-sm font-medium text-sm">
                         删除此账号
                     </button>
                 )}
            </div>
        </div>
    )
}

// 5. Generator Screen
const GeneratorScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [options, setOptions] = useState({ upper: true, lower: true, number: true, symbol: false });

  const generate = React.useCallback(() => {
    let chars = '';
    if (options.upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (options.lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (options.number) chars += '0123456789';
    if (options.symbol) chars += '!@#$%^&*()_+=-';
    if (!chars) return setPassword('');
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(result);
  }, [length, options]);

  useEffect(() => generate(), [generate]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-slate-800 my-4 px-2">密码生成器</h1>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
         <div className="text-xl font-mono text-slate-800 break-all min-h-[40px] flex items-center justify-center">
             {password}
         </div>
         <div className="flex justify-center space-x-3 mt-4">
             <button onClick={generate} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-medium"><RefreshCw className="w-3 h-3 inline mr-1" /> 换一个</button>
             <button onClick={() => { navigator.clipboard.writeText(password); alert('已复制'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"><Copy className="w-3 h-3 inline mr-1" /> 复制</button>
         </div>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <div>
              <div className="flex justify-between text-[11px] mb-2 font-bold text-slate-400"><span>长度</span><span className="text-blue-600">{length}</span></div>
              <input type="range" min="6" max="32" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
              {Object.entries({upper:'大写', lower:'小写', number:'数字', symbol:'符号'}).map(([key, label]) => (
                  <label key={key} className="flex items-center p-2 border border-slate-100 rounded-lg">
                      <input type="checkbox" checked={options[key as keyof typeof options]} onChange={() => setOptions({...options, [key]: !options[key as keyof typeof options]})} className="mr-2" />
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
    const handleExport = () => {
        const data = Storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().getTime()}.json`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <h1 className="text-lg font-bold text-slate-800 my-4 px-2">备份与设置</h1>
            <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50 overflow-hidden">
                    <button onClick={handleExport} className="w-full p-4 flex justify-between items-center text-sm">
                        <span className="text-slate-700">导出备份文件</span>
                        <Download className="w-4 h-4 text-blue-500" />
                    </button>
                    <button onClick={() => { Storage.clearAllData(); window.location.reload(); }} className="w-full p-4 flex justify-between items-center text-sm text-red-500">
                        <span>重置并清空应用</span>
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 text-center">
                    <p className="text-[10px] text-slate-400">芯匣 ChipBox - 仅本地存储</p>
                </div>
            </div>
        </div>
    );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isUnlocked = sessionStorage.getItem('isUnlocked') === 'true';
  if (!isUnlocked) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
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
    </HashRouter>
  );
};

export default App;