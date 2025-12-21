import React from 'react';
import { List, ShieldCheck, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/home', label: '列表', icon: List },
    { path: '/generator', label: '生成器', icon: ShieldCheck },
    { path: '/settings', label: '备份', icon: Settings },
  ];

  // 登录页、详情页、编辑页隐藏底部导航
  if (location.pathname === '/' || location.pathname.includes('/detail') || location.pathname.includes('/edit')) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
         style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))', height: 'calc(60px + env(safe-area-inset-bottom))' }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center w-full h-full pt-2 ${
              isActive ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;