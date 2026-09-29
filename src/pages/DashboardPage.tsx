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
    <div className="space-y-5">
      {/* Executive Overview Header */}
      <div className="bg-[#0e1424] rounded-lg p-5 border border-slate-800 text-slate-100 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="شركة الدالي لتجارة الأخشاب والقشرة"
              className="w-16 h-16 object-contain shrink-0 drop-shadow-xl hidden sm:block rounded-full bg-black/40 p-1 border border-amber-500/30"
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Sparkles className="w-3 h-3" />
                <span>{language === 'ar' ? 'شركة الدالي لتجارة الأخشاب والقشرة - البدرشين' : 'El-Daly Wood & Veneer Trading HQ'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {language === 'ar' ? 'لوحة المتابعة الإدارية للمخزون والماليات' : 'Executive Wood Trading Control Panel'}
              </h2>
              <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed font-medium">
                {language === 'ar'
                  ? 'مراقبة حركة الألواح الخشبية (MDF، كونتر، أبلكاش، قشرة)، الفواتير، ومدفوعات العملاء والموردين بدقة تجارية.'
                  : 'Monitor sheet inventory movements, invoices, customer and supplier ledgers with financial precision.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewSale}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'فاتورة بيع ألواح' : 'New Sales Invoice'}</span>
            </button>
            <button
              onClick={onOpenNewPurchase}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-xs px-3.5 py-2 rounded-md border border-slate-700/80 transition"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'ar' ? 'فاتورة شراء أخشاب' : 'New Purchase'}</span>
            </button>
            <button
              onClick={() => onNavigate('import')}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs px-3.5 py-2 rounded-md border border-slate-700/80 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'ar' ? 'استيراد إكسيل' : 'Import Excel'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Financial & Inventory Metrics Strip */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 rtl:sm:divide-x-reverse overflow-hidden shadow-xs">
        {/* Total Sheet Stock Count */}
        <div className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'إجمالي الألواح بالمخازن' : 'Total Sheets in Stock'}
            </span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
              <Trees className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              {totalSheetsInStock.toLocaleString()} <span className="text-xs font-normal text-slate-400">لوح خشب</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {language === 'ar' ? `قيمة التكلفة: ${totalStockValuation.toLocaleString()} ج.م` : `Valuation: ${totalStockValuation.toLocaleString()} EGP`}
            </p>
          </div>
        </div>

        {/* Current Month Sales */}
        <div className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'مبيعات الشهر الحالي' : 'Monthly Sales'}
            </span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
              {monthlySales.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {language === 'ar' ? `إجمالي المبيعات: ${totalAllSales.toLocaleString()} ج.م` : `All-time Sales: ${totalAllSales.toLocaleString()} EGP`}
            </p>
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'ديون مستحقة على العملاء' : 'Customer Receivables'}
            </span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">
              {totalCustomerReceivables.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {language === 'ar' ? `عدد العملاء المسجلين: ${customers.length}` : `Customers count: ${customers.length}`}
            </p>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'مستحقات واجبة للموردين' : 'Supplier Payables'}
            </span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold font-mono tracking-tight text-slate-200 tabular-nums">
              {totalSupplierPayables.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              {language === 'ar' ? `إجمالي المشتريات: ${totalAllPurchases.toLocaleString()} ج.م` : `All-time Purchases: ${totalAllPurchases.toLocaleString()} EGP`}
            </p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-200">
                {language === 'ar' ? `تنبيه: يوجد (${lowStockProducts.length}) أصناف ألواح خشبية قرب النفاد!` : `Warning: (${lowStockProducts.length}) items are near minimum stock!`}
              </div>
              <div className="text-[11px] text-amber-300/80 mt-0.5">
                {lowStockProducts.slice(0, 3).map((p) => `${p.name} (${p.stock_quantity} لوح)`).join(' • ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold px-3 py-1.5 rounded-md border border-amber-500/30 transition"
          >
            {language === 'ar' ? 'عرض الأصناف المنخفضة' : 'View Low Stock'}
          </button>
        </div>
      )}

      {/* Recent Sales Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
              {language === 'ar' ? 'أحدث فواتير مبيعات الأخشاب' : 'Recent Wood Sales Invoices'}
            </h3>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
          >
            <span>{language === 'ar' ? 'عرض الفواتير كاملة' : 'View All Invoices'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-[#090d16] text-slate-400 uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'المدفوع' : 'Paid'}</th>
                  <th className="px-4 py-2.5 font-semibold">{language === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentSales.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-3 font-mono font-semibold text-amber-400/90">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {cust?.name || 'عميل'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">{inv.invoice_date}</td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-100 tabular-nums">
                        {inv.total.toLocaleString()} EGP
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono text-emerald-400 tabular-nums">
                        {inv.paid_amount.toLocaleString()} EGP
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono text-rose-400 tabular-nums">
                        {inv.remaining_balance.toLocaleString()} EGP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            <Trees className="w-10 h-10 mx-auto text-amber-500/40 mb-2.5" />
            <p className="font-semibold text-xs text-slate-300">
              {language === 'ar' ? 'مرحباً بك في نظام شركة الدالي لتجارة الأخشاب' : 'Welcome to El-Daly Wood System'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
              {language === 'ar'
                ? 'ابدأ باستيراد منتجات الأخشاب من ملف Excel أو قم بإصدار أول فاتورة مبيعات لألواح الأخشاب.'
                : 'Start by importing wood products from Excel or issuing your first sales invoice.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => onNavigate('import')}
                className="bg-slate-900 border border-slate-700 hover:bg-slate-850 text-slate-200 text-xs font-medium px-3.5 py-2 rounded-md transition"
              >
                {language === 'ar' ? 'استيراد منتجات الأخشاب' : 'Import Excel'}
              </button>
              <button
                onClick={onOpenNewSale}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-3.5 py-2 rounded-md transition"
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
