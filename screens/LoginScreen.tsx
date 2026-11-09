import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, Fingerprint } from 'lucide-react';
import * as Storage from '../services/storageService';
import * as biometricService from '../services/biometricService';

type LoginMode = 'setup' | 'confirm' | 'unlock';

const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<LoginMode>('unlock');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bioReady, setBioReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (Storage.isSetupNeeded()) setMode('setup');
  }, []);

  // 已启用生物识别且设备支持时，显示指纹快捷解锁按钮
  useEffect(() => {
    void (async () => {
      const supported = await biometricService.isSupported();
      setBioReady(supported && Storage.getBiometricEnabled());
    })();
  }, []);

  const handleBiometric = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const bits = await biometricService.retrieveKeyBits();
      if (!bits) {
        setError('生物识别未完成或已失效，请使用密码进入后在设置中重新启用');
        await biometricService.disable();
        setBioReady(false);
        return;
      }
      const ok = await Storage.unlockWithKeyBits(bits);
      if (ok) {
        navigate('/home');
      } else {
        setError('生物识别凭证失效，请使用密码进入后在设置中重新启用');
        await biometricService.disable();
        setBioReady(false);
      }
    } finally {
      setBusy(false);
    }
  };
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 p-6"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <Shield className="text-white w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-slate-800 dark:text-slate-100">芯匣</h1>
      </div>

      <div className="mb-8 w-full max-w-[240px]">
        <h2 className="text-center mb-4 text-sm font-medium text-slate-600 dark:text-slate-400">{title}</h2>
        <div className="flex justify-center space-x-3 mb-2 h-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full border transition-all duration-200 ${
                i < pin.length
                  ? 'bg-slate-800 border-slate-800 dark:bg-slate-200 dark:border-slate-200'
                  : 'bg-transparent border-slate-300 dark:border-slate-600'
              }`}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-[10px] text-center h-4">{error}</p>}
        {mode === 'setup' && !error && (
          <p className="text-amber-600 dark:text-amber-400 text-[10px] text-center h-4">密码遗忘后数据将无法恢复，请牢记</p>
        )}
        {mode !== 'setup' && !error && <p className="h-4" />}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumClick(num.toString())}
            className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-medium text-slate-700 dark:text-slate-200 shadow-sm active:bg-slate-100 dark:active:bg-slate-700 flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <button className="w-14 h-14 flex items-center justify-center text-slate-400 text-sm" onClick={handleCancel}>
          取消
        </button>
        <button
          onClick={() => handleNumClick('0')}
          className="w-14 h-14 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-medium text-slate-700 dark:text-slate-200 shadow-sm active:bg-slate-100 dark:active:bg-slate-700 flex items-center justify-center"
        >
          0
        </button>
        <button onClick={handleDelete} className="w-14 h-14 flex items-center justify-center text-slate-700 dark:text-slate-300">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="w-full max-w-[240px] bg-slate-800 dark:bg-blue-600 text-white py-3 rounded-xl font-medium shadow-lg active:scale-95 transition-transform text-sm disabled:opacity-60"
      >
        {busy ? '处理中...' : mode === 'setup' ? '下一步' : mode === 'confirm' ? '确认并创建' : '进入应用'}
      </button>

      {bioReady && (
        <button
          onClick={handleBiometric}
          disabled={busy}
          title="生物识别快捷解锁"
          className="mt-4 w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center active:bg-slate-100 dark:active:bg-slate-700 mx-auto"
        >
          <Fingerprint className="w-6 h-6" />
        </button>
      )}    </div>
  );
};

export default LoginScreen;

