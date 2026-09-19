import React, { useState } from 'react';
import { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice } from '../types';
import { BarChart3, Calendar, Trees, Users, Truck, DollarSign, Printer } from 'lucide-react';

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
  const totalStockValuation = products.reduce((acc, p) => acc + (p.stock_quantity || 0) * (p.purchase_price || 0), 0);

  const totalCustomerReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.balance || 0), 0);
  const totalSupplierPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-600" />
            <span>{language === 'ar' ? 'التقارير المبيعية والمالية الشاملة' : 'Executive Reports'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'تقارير المبيعات، المشتريات، تقييم مخزون الألواح الخشبية، ومستحقات العملاء والموردين'
              : 'Sales, purchases, sheet stock valuation, and receivables/payables analytics.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-amber-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">مبيعات الشهر المحدد</div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {totalSalesVal.toLocaleString()} EGP
          </div>
          <div className="text-xs text-slate-400 mt-1">عدد الفواتير: {monthSales.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">مشتريات الشهر المحدد</div>
          <div className="text-2xl font-black text-indigo-600 mt-2">
            {totalPurchasesVal.toLocaleString()} EGP
          </div>
          <div className="text-xs text-slate-400 mt-1">عدد الفواتير: {monthPurchases.length}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">تقييم مخزون الألواح</div>
          <div className="text-2xl font-black text-amber-600 mt-2">
            {totalStockValuation.toLocaleString()} EGP
          </div>
          <div className="text-xs text-slate-400 mt-1">إجمالي الألواح: {totalSheetsStock} لوح</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">صافي الديون للعملاء</div>
          <div className="text-2xl font-black text-red-600 mt-2">
            {totalCustomerReceivables.toLocaleString()} EGP
          </div>
          <div className="text-xs text-slate-400 mt-1">مستحقات الموردين: {totalSupplierPayables.toLocaleString()} EGP</div>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">ملخص جرد مخزون الألواح الخشبية الحالي</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100 dark:bg-slate-900 font-bold">
              <tr>
                <th className="p-3 border-b">كود اللوح</th>
                <th className="p-3 border-b">اسم اللوح الخشبي</th>
                <th className="p-3 border-b">نوع الخشب</th>
                <th className="p-3 border-b">رصيد الألواح</th>
                <th className="p-3 border-b">سعر التكلفة</th>
                <th className="p-3 border-b">إجمالي قيمة التكلفة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-bold text-slate-500">{p.code}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                  <td className="p-3 font-bold text-amber-700">{p.wood_type}</td>
                  <td className="p-3 font-black text-slate-900 dark:text-white">{p.stock_quantity} لوح</td>
                  <td className="p-3 font-mono">{p.purchase_price} EGP</td>
                  <td className="p-3 font-mono font-bold text-emerald-600">{((p.stock_quantity || 0) * (p.purchase_price || 0)).toLocaleString()} EGP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
