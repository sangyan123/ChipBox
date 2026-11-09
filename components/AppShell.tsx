import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import * as Storage from '../services/storageService';
import BottomNav from './BottomNav';
import ProtectedRoute from './ProtectedRoute';
import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/Dashboard';
import DetailScreen from '../screens/DetailScreen';
import EditAccountScreen from '../screens/EditAccountScreen';
import GeneratorScreen from '../screens/GeneratorScreen';
import SettingsScreen from '../screens/SettingsScreen';

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
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden relative font-sans flex flex-col">
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

export default AppShell;
