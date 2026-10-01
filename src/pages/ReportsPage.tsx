import React, { useState, useMemo } from 'react';
import { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, Category, WoodType } from '../types';
import {
  BarChart3,
  Calendar,
  Printer,
  TrendingUp,
  TrendingDown,
  Package,
  Coins,
  FolderTree,
  Layers,
  Filter,
} from 'lucide-react';

interface ReportsPageProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  categories?: Category[];
  woodTypes?: WoodType[];
  language: 'ar' | 'en';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  products,
  customers,
  suppliers,
  salesInvoices,
  purchaseInvoices,
  categories = [],
  woodTypes = [],
  language,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

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

  // Fast map from wood_type to category name
  const woodTypeToCategoryName = useMemo(() => {
    const map = new Map<string, string>();
    const catIdToName = new Map<string, string>();
    for (const c of categories) {
      catIdToName.set(c.id, c.name);
    }
    for (const wt of woodTypes) {
      if (wt.category_id && catIdToName.has(wt.category_id)) {
        map.set(wt.name.trim().toLowerCase(), catIdToName.get(wt.category_id)!);
      }
    }
    return map;
  }, [categories, woodTypes]);

  // Group inventory stock and valuation by Category
  const categoryValuations = useMemo(() => {
    const group: Record<
      string,
      {
        categoryName: string;
        productCount: number;
        totalStock: number;
        totalCostValuation: number;
        totalSalesValuation: number;
      }
    > = {};

    // Initialize all existing categories
    for (const cat of categories) {
      group[cat.name] = {
        categoryName: cat.name,
        productCount: 0,
        totalStock: 0,
        totalCostValuation: 0,
        totalSalesValuation: 0,
      };
    }

    // Include "أخرى / غير مصنف" bucket if needed
    const unclassifiedKey = language === 'ar' ? 'أخرى / غير مصنف' : 'Other / Unassigned';
    group[unclassifiedKey] = {
      categoryName: unclassifiedKey,
      productCount: 0,
      totalStock: 0,
      totalCostValuation: 0,
      totalSalesValuation: 0,
    };

    for (const p of products) {
      const wtName = (p.wood_type || '').trim().toLowerCase();
      let matchedCat = woodTypeToCategoryName.get(wtName);

      if (!matchedCat && p.category) {
        const found = categories.find((c) => c.name.trim().toLowerCase() === p.category!.trim().toLowerCase());
        if (found) matchedCat = found.name;
      }

      const catKey = matchedCat || unclassifiedKey;
      if (!group[catKey]) {
        group[catKey] = {
          categoryName: catKey,
          productCount: 0,
          totalStock: 0,
          totalCostValuation: 0,
          totalSalesValuation: 0,
        };
      }

      const qty = p.stock_quantity || 0;
      const cost = qty * (p.purchase_price || 0);
      const sales = qty * (p.selling_price || 0);

      group[catKey].productCount += 1;
      group[catKey].totalStock += qty;
      group[catKey].totalCostValuation += cost;
      group[catKey].totalSalesValuation += sales;
    }

    return Object.values(group).filter((g) => g.productCount > 0 || categories.some((c) => c.name === g.categoryName));
  }, [products, categories, woodTypeToCategoryName, language]);

  // Filter products by selected category for the detailed breakdown table
  const filteredProducts = useMemo(() => {
    if (selectedCategoryFilter === 'all') return products;

    return products.filter((p) => {
      const pCat = p.category ? p.category.trim().toLowerCase() : '';
      const derivedCat = woodTypeToCategoryName.get((p.wood_type || '').trim().toLowerCase())?.toLowerCase() || '';
      const targetCat = selectedCategoryFilter.trim().toLowerCase();
      return pCat === targetCat || derivedCat === targetCat;
    });
  }, [products, selectedCategoryFilter, woodTypeToCategoryName]);

  const filteredTotalCost = useMemo(() => {
    return filteredProducts.reduce((acc, p) => acc + (p.stock_quantity || 0) * (p.purchase_price || 0), 0);
  }, [filteredProducts]);

  const filteredTotalSheets = useMemo(() => {
    return filteredProducts.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
  }, [filteredProducts]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'التقارير التحليلية والمالية الشاملة' : 'Executive Reports'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تحليل المبيعات، المشتريات، تقييم مخزون الألواح بالتصنيف الرئيسي (MDF، كونتر...)، والسيولة'
              : 'Sales, purchases, categorized sheet stock valuation, and receivables/payables analytics.'}
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
            <span>{language === 'ar' ? 'طباعة التقرير' : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {language === 'ar' ? 'مبيعات الشهر المحدد' : 'Monthly Sales'}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-slate-100 mt-1">
            {totalSalesVal.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {language === 'ar' ? 'عدد الفواتير المصدرة:' : 'Invoices count:'}{' '}
            <strong className="font-mono text-slate-300">{monthSales.length}</strong>
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {language === 'ar' ? 'مشتريات الشهر المحدد' : 'Monthly Purchases'}
            </span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-400 mt-1">
            {totalPurchasesVal.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {language === 'ar' ? 'عدد فواتير التوريد:' : 'Bills count:'}{' '}
            <strong className="font-mono text-slate-300">{monthPurchases.length}</strong>
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {language === 'ar' ? 'تقييم مخزون الألواح الحالي' : 'Total Stock Valuation'}
            </span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-slate-100 mt-1">
            {totalStockValuation.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {language === 'ar' ? 'إجمالي الألواح:' : 'Total sheets:'}{' '}
            <strong className="font-mono text-slate-300">{totalSheetsStock.toLocaleString()}</strong>{' '}
            {language === 'ar' ? 'لوح' : 'sheets'}
          </div>
        </div>

        <div className="bg-[#0e1424] p-3.5 rounded-lg border border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {language === 'ar' ? 'مستحقات العملاء (ديون لنا)' : 'Customer Receivables'}
            </span>
            <Coins className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-black font-mono tabular-nums text-rose-400 mt-1">
            {totalCustomerReceivables.toLocaleString()}{' '}
            <span className="text-xs font-normal text-rose-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            {language === 'ar' ? 'مستحقات الموردين (علينا):' : 'Supplier payables:'}{' '}
            <strong className="font-mono text-amber-400">
              {totalSupplierPayables.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
            </strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Category Inventory Breakdown Table (تقييم ورصيد المخزون حسب التصنيف) */}
      {/* ========================================================================= */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-slate-200">
              {language === 'ar'
                ? 'تحليل وتقييم المخزون المالي بحسب التصنيف (Category Valuation)'
                : 'Inventory Valuation by Category'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {categoryValuations.length} {language === 'ar' ? 'تصنيفات' : 'categories'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'التصنيف الرئيسي' : 'Category'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'عدد الأصناف' : 'Products'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'إجمالي رصيد الألواح' : 'Total Sheets'}</th>
                <th className="px-4 py-3 text-left">{language === 'ar' ? 'إجمالي التكلفة (القيمة الدفترية)' : 'Total Cost Value'}</th>
                <th className="px-4 py-3 text-left">{language === 'ar' ? 'القيمة البيعية التقديرية' : 'Sales Value'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'نسبة المخزون' : '% Share'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {categoryValuations.map((cv) => {
                const stockShare = totalSheetsStock > 0 ? ((cv.totalStock / totalSheetsStock) * 100).toFixed(1) : '0';
                return (
                  <tr key={cv.categoryName} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                      <span>{cv.categoryName}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-slate-300">
                      {cv.productCount}{' '}
                      <span className="text-[10px] text-slate-500">{language === 'ar' ? 'صنف' : 'items'}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-slate-200">
                      {cv.totalStock.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'لوح' : 'sheets'}</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-amber-400">
                      {cv.totalCostValuation.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums text-emerald-400 font-medium">
                      {cv.totalSalesValuation.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                        {stockShare}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Detailed Stock Items Table with Category Filter */}
      {/* ========================================================================= */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        <div className="p-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-xs text-slate-200">
              {language === 'ar'
                ? 'تفاصيل جرد وتقييم مخزون الألواح الخشبية'
                : 'Detailed Wood Sheet Inventory Items'}
            </h3>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>{language === 'ar' ? 'تصفية بالتصنيف:' : 'Filter Category:'}</span>
            </span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 px-2.5 py-1 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <span className="text-[11px] text-slate-400 font-mono mr-2">
              {filteredProducts.length} {language === 'ar' ? 'صنف' : 'items'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'ar' ? 'كود الصنف' : 'Code'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'اسم اللوح الخشبي' : 'Product Name'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'التصنيف' : 'Category'}</th>
                <th className="px-4 py-3">{language === 'ar' ? 'نوع الخشب' : 'Wood Type'}</th>
                <th className="px-4 py-3 text-center">{language === 'ar' ? 'رصيد الألواح' : 'Stock'}</th>
                <th className="px-4 py-3 text-left">{language === 'ar' ? 'سعر التكلفة' : 'Cost Price'}</th>
                <th className="px-4 py-3 text-left">{language === 'ar' ? 'إجمالي القيمة الدفترية' : 'Book Value'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const itemTotalCost = (p.stock_quantity || 0) * (p.purchase_price || 0);
                const derivedCat =
                  p.category ||
                  woodTypeToCategoryName.get((p.wood_type || '').trim().toLowerCase()) ||
                  '—';

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-[11px]">
                      {p.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100 text-xs">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold text-amber-400">
                        {derivedCat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80">
                        {p.wood_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums font-bold text-slate-200">
                      {p.stock_quantity}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'لوح' : 'sheets'}</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums text-slate-300">
                      {p.purchase_price.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </td>
                    <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-amber-400">
                      {itemTotalCost.toLocaleString()}{' '}
                      <span className="text-[10px] font-normal text-amber-600">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot className="bg-slate-900/90 font-bold border-t border-slate-800 text-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right">
                    {language === 'ar' ? 'المجموع الإجمالي للقائمة المعروضة:' : 'Total displayed:'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-amber-400">
                    {filteredTotalSheets.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-400">{language === 'ar' ? 'لوح' : 'sheets'}</span>
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-left font-mono text-amber-400">
                    {filteredTotalCost.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
