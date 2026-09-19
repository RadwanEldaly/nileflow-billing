import React from 'react';
import { Trees, Shield, Globe, RefreshCw } from 'lucide-react';

interface HeaderProps {
  language: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
  currentUser: { name: string; role: 'admin' | 'sales' | 'warehouse' };
  onUserChange: (user: { name: string; role: 'admin' | 'sales' | 'warehouse' }) => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onUserChange,
}) => {
  const toggleRole = () => {
    let nextRole: 'admin' | 'sales' | 'warehouse' = 'admin';
    let nextName = 'إدارة شركة الدالي (Admin)';
    if (currentUser.role === 'admin') {
      nextRole = 'sales';
      nextName = 'مسؤول المبيعات (Sales)';
    } else if (currentUser.role === 'sales') {
      nextRole = 'warehouse';
      nextName = 'أمين المخزن (Warehouse)';
    }

    const updated = { name: nextName, role: nextRole };
    onUserChange(updated);
  };

  return (
    <header className="bg-slate-900 border-b border-amber-900/40 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-600/90 p-2 rounded-xl text-white shadow-md flex items-center justify-center border border-amber-500/40">
            <Trees className="h-6 w-6 text-amber-100" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-amber-100 flex items-center gap-2">
              <span>{language === 'ar' ? 'شركة الدالي لتجارة الأخشاب' : 'El-Daly Wood Trading Co.'}</span>
            </h1>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'نظام إدارة الألواح الخشبية والمخازن والمبيعات' : 'Wooden Sheet Inventory & Billing System'}
            </p>
          </div>
        </div>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ar' ? 'English' : 'عربي (RTL)'}</span>
          </button>

          {/* User Profile Switcher */}
          <div className="flex items-center gap-2.5 bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700">
            <Shield className="w-4 h-4 text-emerald-400" />
            <div className="text-right text-xs">
              <div className="font-bold text-slate-100">{currentUser.name}</div>
              <div className="text-[10px] text-amber-400 uppercase font-mono tracking-wider">
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={toggleRole}
              title={language === 'ar' ? 'تبديل الصلاحية' : 'Switch Role'}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
