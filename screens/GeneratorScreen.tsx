import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Copy, PlusCircle } from 'lucide-react';
import { generatePassword } from '../services/passwordGenerator';
import { passwordStrength } from '../utils/strength';
import { copyWithAutoClear } from '../utils/clipboard';

const GeneratorScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(12);
  const [options, setOptions] = useState({ upper: true, lower: true, number: true, symbol: false });
  const navigate = useNavigate();

  const generate = useCallback(() => {
    setPassword(generatePassword(length, options));
  }, [length, options]);

  useEffect(() => {
    generate();
  }, [generate]);

  const strength = passwordStrength(password);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await copyWithAutoClear(password, 30);
      window.alert('已复制，30秒后自动清除');
    } catch {
      window.alert('复制失败');
    }
  };

  const handleUseInNewAccount = () => {
    if (!password) return;
    navigate(`/edit/new?pw=${encodeURIComponent(password)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 my-4 px-2">密码生成器</h1>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-4 text-center">
        <div className="text-xl font-mono text-slate-800 dark:text-slate-100 break-all min-h-[40px] flex items-center justify-center">
          {password}
        </div>
        {password && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${strength.colorClass}`} style={{ width: `${strength.percent}%` }} />
            </div>
            <span className={`text-[10px] font-bold ${
              strength.score === 0 ? 'text-red-500' : strength.score === 1 ? 'text-amber-500' : 'text-emerald-500'
            }`}>{strength.label}</span>
          </div>
        )}
        <div className="flex justify-center space-x-3 mt-4">
          <button onClick={generate} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium"><RefreshCw className="w-3 h-3 inline mr-1" /> 换一个</button>
          <button onClick={handleCopy} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium"><Copy className="w-3 h-3 inline mr-1" /> 复制</button>
        </div>
        {password && (
          <button onClick={handleUseInNewAccount} className="mt-3 text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-1 mx-auto">
            <PlusCircle className="w-3.5 h-3.5" /> 用此密码新建账号
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <div className="flex justify-between text-[11px] mb-2 font-bold text-slate-400"><span>长度</span><span className="text-blue-600 dark:text-blue-400">{length}</span></div>
          <input type="range" min="6" max="32" value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries({ upper: '大写', lower: '小写', number: '数字', symbol: '符号' }).map(([key, label]) => (
            <label key={key} className="flex items-center p-2 border border-slate-100 dark:border-slate-700 rounded-lg">
              <input type="checkbox" checked={options[key as keyof typeof options]} onChange={() => setOptions({ ...options, [key]: !options[key as keyof typeof options] })} className="mr-2" />
              <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GeneratorScreen;
