import React from 'react';
import { Customer, Product, SalesInvoice, PurchaseInvoice, Supplier, StockMovement } from '../types';
import {
  Trees,
  DollarSign,
  Users,
  Truck,
  Receipt,
  ShoppingBag,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  Warehouse,
  Sparkles,
} from 'lucide-react';

interface DashboardPageProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  stockMovements: StockMovement[];
  language: 'ar' | 'en';
  onNavigate: (tab: any) => void;
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  products,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
  stockMovements,
  language,
  onNavigate,
  onOpenNewSale,
  onOpenNewPurchase,
}) => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Sales metrics
  const monthlySales = salesInvoices
    .filter((inv) => inv.invoice_date.startsWith(currentMonthStr))
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalAllSales = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalAllPurchases = purchaseInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Stock Sheet Count & Valuation
  const totalSheetsInStock = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const totalStockValuation = products.reduce(
    (acc, p) => acc + (p.stock_quantity || 0) * (p.purchase_price || p.selling_price || 0),
    0
  );

  // Customer & Supplier balances
  const totalCustomerReceivables = customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0);
  const totalSupplierPayables = suppliers.reduce((sum, s) => sum + Math.max(0, s.balance || 0), 0);

  // Low stock items (stock_quantity <= min_stock_level)
  const lowStockProducts = products.filter((p) => p.stock_quantity <= (p.min_stock_level || 10));

  const recentSales = [...salesInvoices]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-slate-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-amber-800/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-400/30 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'شركة الدالي لتجارة الأخشاب - البدرشين' : 'El-Daly Wood Trading HQ'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {language === 'ar' ? 'لوحة المراقبة الإدارية للمخزون والمبيعات' : 'Executive Wood Trading Control Panel'}
            </h2>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {language === 'ar'
                ? 'إدارة الألواح الخشبية بحساب عدد الألواح، متابعة المخازن، فواتير المبيعات والمشتريات، وكشوف حساب العملاء والموردين.'
                : 'Manage wooden sheet inventory, multi-warehouse stock movements, sales, purchasing, and ledgers.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onOpenNewSale}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'ar' ? 'فاتورة بيع ألواح' : 'New Sales Invoice'}</span>
            </button>
            <button
              onClick={onOpenNewPurchase}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700 transition"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ar' ? 'فاتورة شراء أخشاب' : 'New Purchase'}</span>
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{language === 'ar' ? 'استيراد إكسيل الأخشاب' : 'Import Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sheet Stock Count */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'إجمالي الألواح بالمخازن' : 'Total Sheets in Stock'}
            </span>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-xl">
              <Trees className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {totalSheetsInStock.toLocaleString()} <span className="text-xs font-normal text-slate-500">لوح خشب</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? `قيمة التكلفة: ${totalStockValuation.toLocaleString()} ج.م` : `Valuation: ${totalStockValuation.toLocaleString()} EGP`}
            </p>
          </div>
        </div>

        {/* Current Month Sales */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'مبيعات الشهر الحالي' : 'Monthly Sales'}
            </span>
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {monthlySales.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م (EGP)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? `إجمالي المبيعات التاريخية: ${totalAllSales.toLocaleString()} ج.م` : `All-time Sales: ${totalAllSales.toLocaleString()} EGP`}
            </p>
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'ديون مستحقة على العملاء' : 'Customer Receivables'}
            </span>
            <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
              {totalCustomerReceivables.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? `عدد العملاء المسجلين: ${customers.length}` : `Customers count: ${customers.length}`}
            </p>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'مستحقات واجبة للموردين' : 'Supplier Payables'}
            </span>
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {totalSupplierPayables.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? `إجمالي المشتريات: ${totalAllPurchases.toLocaleString()} ج.م` : `All-time Purchases: ${totalAllPurchases.toLocaleString()} EGP`}
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {language === 'ar' ? `تنبيه: يوجد (${lowStockProducts.length}) أصناف ألواح خشبية قرب النفاد!` : `Warning: (${lowStockProducts.length}) items are near minimum stock!`}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                {lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.stock_quantity} لوح)`).join(' • ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-2 rounded-xl transition"
          >
            {language === 'ar' ? 'عرض الأصناف المنخفضة' : 'View Low Stock'}
          </button>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'أحدث فواتير مبيعات الأخشاب' : 'Recent Wood Sales Invoices'}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
          >
            <span>{language === 'ar' ? 'عرض الفواتير كاملة' : 'View All Invoices'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'المدفوع' : 'Paid'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {recentSales.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-amber-700 dark:text-amber-400">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {cust?.name || 'عميل'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                        {inv.total.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {inv.paid_amount.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600">
                        {inv.remaining_balance.toLocaleString()} EGP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Trees className="w-12 h-12 mx-auto text-amber-300 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'مرحباً بك في نظام شركة الدالي لتجارة الأخشاب' : 'Welcome to El-Daly Wood System'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {language === 'ar'
                ? 'ابدأ باستيراد منتجات الأخشاب من ملف Excel أو قم بإصدار أول فاتورة مبيعات لألواح الأخشاب.'
                : 'Start by importing wood products from Excel or issuing your first sales invoice.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('import')}
                className="bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition"
              >
                {language === 'ar' ? 'استيراد منتجات الأخشاب من Excel' : 'Import Wood Products Excel'}
              </button>
              <button
                onClick={onOpenNewSale}
                className="bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-500 transition"
              >
                {language === 'ar' ? '+ فاتورة بيع جديدة' : '+ New Invoice'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
