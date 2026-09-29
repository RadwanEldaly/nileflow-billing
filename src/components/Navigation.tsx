import React from 'react';
import {
  LayoutDashboard,
  Trees,
  Warehouse,
  Receipt,
  ShoppingBag,
  Users,
  Truck,
  CreditCard,
  FileSpreadsheet,
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'warehouses'
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'payments'
  | 'import'
  | 'reports';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  language: 'ar' | 'en';
  isOpen?: boolean;
  onClose?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  language,
  isOpen = false,
  onClose,
}) => {
  const navSections = [
    {
      groupAr: 'نظرة عامة',
      groupEn: 'Overview',
      items: [
        {
          id: 'dashboard' as NavTab,
          labelAr: 'الرئيسية والمؤشرات',
          labelEn: 'Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupAr: 'المخزون والأصناف',
      groupEn: 'Inventory Management',
      items: [
        {
          id: 'products' as NavTab,
          labelAr: 'كتالوج الألواح الخشبية',
          labelEn: 'Wood Sheets Catalog',
          icon: Trees,
        },
        {
          id: 'warehouses' as NavTab,
          labelAr: 'المخازن وحركة الألواح',
          labelEn: 'Warehouses & Stock',
          icon: Warehouse,
        },
      ],
    },
    {
      groupAr: 'الفواتير والمبيعات',
      groupEn: 'Sales & Purchases',
      items: [
        {
          id: 'sales' as NavTab,
          labelAr: 'فواتير المبيعات',
          labelEn: 'Sales Invoices',
          icon: Receipt,
        },
        {
          id: 'purchases' as NavTab,
          labelAr: 'فواتير المشتريات والتوريد',
          labelEn: 'Purchase Invoices',
          icon: ShoppingBag,
        },
        {
          id: 'payments' as NavTab,
          labelAr: 'المدفوعات والتحصيلات',
          labelEn: 'Payments & Collections',
          icon: CreditCard,
        },
      ],
    },
    {
      groupAr: 'الأطراف والحسابات',
      groupEn: 'Parties & Ledgers',
      items: [
        {
          id: 'customers' as NavTab,
          labelAr: 'العملاء وكشوف الحساب',
          labelEn: 'Customers Ledger',
          icon: Users,
        },
        {
          id: 'suppliers' as NavTab,
          labelAr: 'الموردون والمصانع',
          labelEn: 'Suppliers Ledger',
          icon: Truck,
        },
      ],
    },
    {
      groupAr: 'البيانات والتقارير',
      groupEn: 'Data & Reports',
      items: [
        {
          id: 'import' as NavTab,
          labelAr: 'استيراد إكسيل',
          labelEn: 'Excel Batch Import',
          icon: FileSpreadsheet,
        },
        {
          id: 'reports' as NavTab,
          labelAr: 'التقارير التحليلية والمالية',
          labelEn: 'Executive Reports',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 z-50 lg:sticky lg:top-0 lg:h-screen lg:z-30 bg-[#0a0f1c]/95 lg:bg-[#0a0f1c]/90 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none shrink-0 overflow-hidden ${
          language === 'ar' ? 'right-0' : 'left-0'
        } ${
          isOpen
            ? `w-72 lg:w-64 opacity-100 ${language === 'ar' ? 'border-l border-slate-800' : 'border-r border-slate-800'} translate-x-0`
            : `w-0 opacity-0 pointer-events-none border-none ${
                language === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
              }`
        }`}
      >
        <div className="w-72 lg:w-64 h-full flex flex-col shrink-0">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="شركة الدالي"
                className="w-11 h-11 object-contain shrink-0 drop-shadow-md rounded-full bg-black/40 p-0.5 border border-amber-500/30"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-white">
                    {language === 'ar' ? 'شركة الدالي' : 'El-Daly Wood'}
                  </h1>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    ERP
                  </span>
                </div>
                <p className="text-[10px] text-amber-400/90 font-medium -mt-0.5">
                  {language === 'ar' ? 'لتجارة الأخشاب والقشرة' : 'Wood & Veneer Trading'}
                </p>
              </div>
            </div>

            {/* Close button on both desktop & mobile */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition cursor-pointer"
                title={language === 'ar' ? 'إغلاق القائمة لتوسيع مساحة الشاشة' : 'Close Sidebar'}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {language === 'ar' ? section.groupAr : section.groupEn}
                </div>

                <div className="space-y-0.5">
                  {section.items.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 shadow-xs'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-amber-400'
                                : 'text-slate-400 group-hover:text-amber-400/80'
                            }`}
                          />
                          <span className="truncate">
                            {language === 'ar' ? tab.labelAr : tab.labelEn}
                          </span>
                        </div>

                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800/90 bg-[#080d18] text-xs">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-300">
                  {language === 'ar' ? 'الخادم متصل' : 'Connected'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">v2.4 Pro</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
