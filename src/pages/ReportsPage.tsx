import React, { useState } from 'react';
import { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice } from '../types';
import { BarChart3, Calendar, Printer, TrendingUp, TrendingDown, Package, Coins } from 'lucide-react';

interface ReportsPageProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  language: 'ar' | 'en';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  products,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
  language,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const monthSales = salesInvoices.filter((inv) => inv.invoice_date.startsWith(selectedMonth));
  const monthPurchases = purchaseInvoices.filter((inv) => inv.invoice_date.startsWith(selectedMonth));

  const totalSalesVal = monthSales.reduce((acc, i) => acc + i.total, 0);
  const totalPurchasesVal = monthPurchases.reduce((acc, i) => acc + i.total, 0);

  const totalSheetsStock = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  const totalStockValuation = products.reduce(
    (acc, p) => acc + (p.stock_quantity || 0) * (p.purchase_price || 0),
    0
  );

  const totalCustomerReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.balance || 0), 0);
  const totalSupplierPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.balance || 0), 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'التقارير التحليلية والمالية الشاملة' : 'Executive Reports'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تحليل إيرادات المبيعات، مشتريات الأخشاب، تقييم المخزون الركدي، ومؤشرات السيولة والديون'
              : 'Sales, purchases, sheet stock valuation, and receivables/payables analytics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0e1424] px-3 py-1.5 rounded-md border border-slate-700/80 shadow-xs">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-slate-200 focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 font-semibold text-xs px-3 py-1.5 rounded-md shadow-xs transition active:scale-[0.99]"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">مبيعات الشهر المحدد</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-slate-100 mt-1">
            {totalSalesVal.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            عدد الفواتير المصدرة: <strong className="font-mono text-slate-300">{monthSales.length}</strong>
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">مشتريات الشهر المحدد</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-400 mt-1">
            {totalPurchasesVal.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            عدد فواتير التوريد: <strong className="font-mono text-slate-300">{monthPurchases.length}</strong>
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">تقييم مخزون الألواح الحالي</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-slate-100 mt-1">
            {totalStockValuation.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            إجمالي الألواح: <strong className="font-mono text-slate-300">{totalSheetsStock.toLocaleString()}</strong> لوح
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">مستحقات العملاء (ديون لنا)</span>
            <Coins className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-rose-400 mt-1">
            {totalCustomerReceivables.toLocaleString()}{' '}
            <span className="text-xs font-normal text-rose-500">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            مستحقات الموردين (علينا): <strong className="font-mono text-amber-400">{totalSupplierPayables.toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-xs text-slate-200">
            ملخص جرد وتقييم مخزون الألواح الخشبية بسعر التكلفة
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {products.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">كود الصنف</th>
                <th className="px-4 py-3">اسم اللوح الخشبي</th>
                <th className="px-4 py-3">نوع الخشب</th>
                <th className="px-4 py-3 text-center">رصيد الألواح</th>
                <th className="px-4 py-3 text-left">سعر التكلفة</th>
                <th className="px-4 py-3 text-left">إجمالي القيمة الدفترية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((p) => {
                const itemTotalCost = (p.stock_quantity || 0) * (p.purchase_price || 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-[11px]">
                      {p.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100 text-xs">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                        {p.wood_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-slate-200">
                      {p.stock_quantity}{' '}
                      <span className="text-[10px] font-normal text-slate-500">لوح</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums text-slate-300">
                      {p.purchase_price.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-500">ج.م</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-amber-400">
                      {itemTotalCost.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-amber-600">ج.م</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
