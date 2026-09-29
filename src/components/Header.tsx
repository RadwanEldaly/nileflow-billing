import React from 'react';
import { Menu, Globe, RefreshCw, LogOut, ShieldCheck, ChevronRight, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  language: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
  currentUser: { name: string; role: 'admin' | 'sales' | 'warehouse' };
  onUserChange: (user: { name: string; role: 'admin' | 'sales' | 'warehouse' }) => void;
  onLogout: () => void;
  activeTabTitle?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  currentUser,
  onUserChange,
  onLogout,
  activeTabTitle,
  isSidebarOpen = true,
  onToggleSidebar,
  onToggleMobileSidebar,
}) => {
  const handleToggle = onToggleSidebar || onToggleMobileSidebar;

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
    <header className="bg-[#0a0f1c]/80 backdrop-blur-md border-b border-slate-800 text-slate-100 sticky top-0 z-30">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left / Start: Sidebar Toggle & Breadcrumb Title */}
        <div className="flex items-center gap-3">
          {handleToggle && (
            <button
              onClick={handleToggle}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer shadow-xs group ${
                isSidebarOpen
                  ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-amber-400'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
              }`}
              title={
                isSidebarOpen
                  ? (language === 'ar' ? 'إغلاق القائمة لتوسيع مساحة الشاشة' : 'Collapse Sidebar')
                  : (language === 'ar' ? 'فتح القائمة الجانبية' : 'Expand Sidebar')
              }
            >
              <Menu className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold hidden sm:inline">
                {language === 'ar'
                  ? (isSidebarOpen ? 'طي القائمة' : 'القائمة الرئيسية')
                  : (isSidebarOpen ? 'Collapse' : 'Menu')}
              </span>
            </button>
          )}

          {activeTabTitle && (
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="شركة الدالي"
                className="w-7 h-7 object-contain shrink-0 drop-shadow rounded-full bg-black/40 border border-amber-500/30"
              />
              <span className="hidden sm:inline text-xs font-semibold text-slate-300">
                {language === 'ar' ? 'منظومة الدالي' : 'El-Daly ERP'}
              </span>
              <span className="hidden sm:inline text-slate-600">
                {language === 'ar' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {activeTabTitle}
              </h2>
            </div>
          )}
        </div>

        {/* Right Tools & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold">{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {/* User Profile Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="جلسة نشطة" />
            <div className="text-right text-xs">
              <div className="font-bold text-slate-100 text-xs leading-none">{currentUser.name}</div>
              <div className="text-[9px] text-amber-400 uppercase font-mono tracking-wider mt-0.5">
                {currentUser.role}
              </div>
            </div>
            <button
              onClick={toggleRole}
              title={language === 'ar' ? 'تبديل الصلاحية' : 'Switch Role'}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title={language === 'ar' ? 'تسجيل خروج' : 'Logout'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-xs font-semibold text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900/60 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">{language === 'ar' ? 'خروج' : 'Logout'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
