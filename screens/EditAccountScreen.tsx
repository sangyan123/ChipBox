import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import * as Storage from '../services/storageService';
import { addCustomCategory, getAllCategories } from '../services/categoryService';
import { generatePassword } from '../services/passwordGenerator';
import { passwordStrength } from '../utils/strength';
import { newAccountId } from '../utils/id';
import { Account } from '../types';

const EditAccountScreen: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const prefillPassword = isNew ? new URLSearchParams(location.search).get('pw') || '' : '';

  const [form, setForm] = useState<Account>({
    id: newAccountId(),
    title: '',
    username: '',
    password: prefillPassword,
    category: '其他',
    note: '',
    updatedAt: Date.now()
  });
  const [categories, setCategories] = useState<string[]>(() => getAllCategories());

  useEffect(() => {
    if (!isNew && id) {
      Storage.getAccounts().then((accounts) => {
        const found = accounts.find((a) => a.id === id);
        if (found) setForm(found);
      });
    }
  }, [id, isNew]);

  const strength = passwordStrength(form.password);

  const handleSave = async () => {
    if (!form.title) return window.alert('请输入名称');
    await Storage.saveAccount({ ...form, updatedAt: Date.now() });
    navigate(-1);
  };

  const handleDelete = async () => {
    if (!window.confirm('确定删除？\n账号将移入回收站，可在设置中恢复。')) return;
    await Storage.deleteAccount(form.id);
    navigate('/home');
  };

  const handleQuickGenerate = () => {
    setForm({ ...form, password: generatePassword(12, { upper: true, lower: true, number: true, symbol: false }) });
  };

  const handleAddCategory = () => {
    const name = window.prompt('输入自定义分类名称（10字以内）');
    if (!name) return;
    if (addCustomCategory(name)) {
      setCategories(getAllCategories());
      setForm({ ...form, category: name.trim() });
    } else {
      window.alert('分类已存在或名称无效');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-20"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-300 text-sm">取消</button>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">{isNew ? '新建账号' : '编辑账号'}</h2>
        <button onClick={handleSave} className="text-blue-600 dark:text-blue-400 font-bold text-sm">保存</button>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl space-y-4 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">名称</label>
            <input className="w-full text-md outline-none border-b border-transparent focus:border-blue-500 dark:focus:border-blue-400 py-1 text-slate-800 dark:text-slate-100 bg-transparent"
              placeholder="例如：微信"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">分类</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                  className={`px-3 py-1 rounded-full text-[10px] border transition-colors ${
                    form.category === cat
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                  }`}>
                  {cat}
                </button>
              ))}
              <button onClick={handleAddCategory}
                className="px-3 py-1 rounded-full text-[10px] border border-dashed border-blue-400 text-blue-500 dark:text-blue-400">
                ＋ 自定义
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl space-y-4 shadow-sm">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">账号</label>
            <input className="w-full text-sm outline-none border-b border-transparent focus:border-blue-500 dark:focus:border-blue-400 py-1 text-slate-800 dark:text-slate-100 bg-transparent"
              placeholder="用户名/手机号"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">密码</label>
            <div className="flex items-center border-b border-transparent focus-within:border-blue-500 dark:focus-within:border-blue-400">
              <input className="flex-1 text-sm outline-none py-1 font-mono text-slate-800 dark:text-slate-100 bg-transparent"
                placeholder="输入密码"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button onClick={handleQuickGenerate} className="text-[10px] text-blue-600 dark:text-blue-400 ml-2">自动生成</button>
            </div>
            {form.password && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.colorClass}`} style={{ width: `${strength.percent}%` }} />
                </div>
                <span className={`text-[10px] font-bold ${
                  strength.score === 0 ? 'text-red-500' : strength.score === 1 ? 'text-amber-500' : 'text-emerald-500'
                }`}>强度：{strength.label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
          <label className="block text-[10px] font-bold text-slate-400 mb-1">备注</label>
          <textarea className="w-full h-20 outline-none resize-none text-sm pt-1 text-slate-800 dark:text-slate-100 bg-transparent"
            placeholder="添加额外信息..."
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        {!isNew && (
          <button onClick={handleDelete} className="w-full py-3 text-red-500 bg-white dark:bg-slate-800 rounded-xl shadow-sm font-medium text-sm">
            删除此账号（移入回收站）
          </button>
        )}
      </div>
    </div>
  );
};

export default EditAccountScreen;
