import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronRight, Lock, ArrowUpDown, Star } from 'lucide-react';
import * as Storage from '../services/storageService';
import { getAllCategories } from '../services/categoryService';
import { Account } from '../types';

type SortMode = 'new' | 'old' | 'name';
const NEXT_SORT: Record<SortMode, SortMode> = { new: 'old', old: 'name', name: 'new' };
const SORT_LABEL: Record<SortMode, string> = { new: '时间 新→旧', old: '时间 旧→新', name: '名称 A→Z' };

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const navigate = useNavigate();

  useEffect(() => {
    Storage.getAccounts().then(setAccounts);
  }, []);

  const categories = useMemo(() => getAllCategories(), []);

  const filteredAccounts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return accounts
      .filter((acc) => {
        const matchesSearch =
          acc.title.toLowerCase().includes(q) ||
          (acc.username || '').toLowerCase().includes(q) ||
          (acc.note || '').toLowerCase().includes(q);
        const matchesCategory = activeCategory === '全部' || acc.category === activeCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
        if (sortMode === 'name') return a.title.localeCompare(b.title, 'zh');
        return sortMode === 'new' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt;
      });
  }, [accounts, searchTerm, activeCategory, sortMode]);

  const handleLock = () => {
    Storage.lock();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
      <div className="sticky top-0 bg-slate-50 dark:bg-slate-900 z-20 px-4 shadow-sm" style={{ paddingTop: 'calc(8px + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索标题 / 账号 / 备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setSortMode(NEXT_SORT[sortMode])}
            title={`排序方式：${SORT_LABEL[sortMode]}`}
            className="h-10 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-700 text-[10px] gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{SORT_LABEL[sortMode]}</span>
          </button>
          <button
            onClick={handleLock}
            title="立即锁定"
            className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-700"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-3 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-slate-800 dark:bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
              className="group bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                  {acc.title.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{acc.title}</h3>
                    {acc.favorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400">{acc.username || '***'}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 w-4 h-4" />
            </div>
          ))
        )}
      </div>

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

export default Dashboard;
