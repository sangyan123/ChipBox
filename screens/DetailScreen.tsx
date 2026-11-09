import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Star } from 'lucide-react';
import * as Storage from '../services/storageService';
import { copyWithAutoClear } from '../utils/clipboard';
import { Account } from '../types';

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

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    try {
      await copyWithAutoClear(text, 30);
      setToast('已复制，30秒后自动清除');
    } catch {
      setToast('复制失败');
    }
    setTimeout(() => setToast(''), 2000);
  };

  const toggleFavorite = async () => {
    if (!account) return;
    const updated = { ...account, favorite: !account.favorite };
    setAccount(updated);
    await Storage.saveAccount(updated);
    setToast(updated.favorite ? '已收藏置顶' : '已取消收藏');
    setTimeout(() => setToast(''), 2000);
  };

  if (!account) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-800 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-20"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={() => navigate('/home')} className="flex items-center text-slate-600 dark:text-slate-300 text-sm">
          <ChevronLeft className="w-5 h-5 mr-1" /> 返回
        </button>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">账号详情</h2>
        <div className="flex items-center gap-3">
          <button onClick={toggleFavorite} title={account.favorite ? '取消收藏' : '收藏置顶'}>
            <Star className={`w-5 h-5 ${account.favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-500'}`} />
          </button>
          <button onClick={() => navigate(`/edit/${account.id}`)} className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            编辑
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-3">
            <span className="text-2xl font-bold text-slate-300 dark:text-slate-500">{account.title.charAt(0)}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{account.title}</h1>
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded mt-2">{account.category}</span>
        </div>

        <div className="space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">账号</label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-md text-slate-800 dark:text-slate-100 font-medium select-all">{account.username || '--'}</span>
              <button onClick={() => copyToClipboard(account.username)} className="text-xs text-blue-600 dark:text-blue-400 font-medium">复制</button>
            </div>
          </div>

          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">密码</label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-md text-slate-800 dark:text-slate-100 font-mono tracking-wider">
                {showPassword ? (account.password || '--') : '••••••••'}
              </span>
              <div className="flex items-center space-x-3">
                <button onClick={() => setShowPassword(!showPassword)} className="text-xs text-slate-400">
                  {showPassword ? '隐藏' : '显示'}
                </button>
                <button onClick={() => copyToClipboard(account.password)} className="text-xs text-blue-600 dark:text-blue-400 font-medium">复制</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">备注</label>
            <div className="mt-2 text-slate-600 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
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

export default DetailScreen;
