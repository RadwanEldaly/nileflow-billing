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
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, language }) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      labelAr: 'الرئيسية',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'products' as NavTab,
      labelAr: 'الألواح الخشبية',
      labelEn: 'Wood Sheets',
      icon: Trees,
    },
    {
      id: 'warehouses' as NavTab,
      labelAr: 'المخازن وحركة الألواح',
      labelEn: 'Warehouses & Stock',
      icon: Warehouse,
    },
    {
      id: 'sales' as NavTab,
      labelAr: 'فواتير المبيعات',
      labelEn: 'Sales Invoices',
      icon: Receipt,
    },
    {
      id: 'purchases' as NavTab,
      labelAr: 'فواتير المشتريات',
      labelEn: 'Purchase Invoices',
      icon: ShoppingBag,
    },
    {
      id: 'customers' as NavTab,
      labelAr: 'العملاء وكشف الحساب',
      labelEn: 'Customers & Ledger',
      icon: Users,
    },
    {
      id: 'suppliers' as NavTab,
      labelAr: 'الموردون وكشف الحساب',
      labelEn: 'Suppliers & Ledger',
      icon: Truck,
    },
    {
      id: 'payments' as NavTab,
      labelAr: 'المدفوعات والتحصيلات',
      labelEn: 'Payments & Receipts',
      icon: CreditCard,
    },
    {
      id: 'import' as NavTab,
      labelAr: 'استيراد إكسيل',
      labelEn: 'XLSX Import',
      icon: FileSpreadsheet,
    },
    {
      id: 'reports' as NavTab,
      labelAr: 'التقارير الشاملة',
      labelEn: 'Executive Reports',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="bg-slate-800 text-slate-300 border-b border-slate-700 shadow-sm sticky top-16 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2 rtl:space-x-reverse no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'hover:bg-slate-700 hover:text-white text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{language === 'ar' ? t.labelAr : t.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
