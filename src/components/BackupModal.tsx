import React, { useState } from 'react';
import {
  X,
  Database,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Receipt,
  ShoppingBag,
  Users,
  Truck,
  Boxes,
} from 'lucide-react';
import {
  Product,
  Customer,
  Supplier,
  Warehouse,
  SalesInvoice,
  PurchaseInvoice,
  StockMovement,
  FinancialTransaction,
} from '../types';
import {
  downloadFullJSONBackup,
  exportProductsCSV,
  exportCustomersCSV,
  exportSuppliersCSV,
  exportSalesInvoicesCSV,
} from '../services/backupService';

interface BackupModalProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  stockMovements: StockMovement[];
  financialTransactions: FinancialTransaction[];
  language: 'ar' | 'en';
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  products,
  customers,
  suppliers,
  warehouses,
  salesInvoices,
  purchaseInvoices,
  stockMovements,
  financialTransactions,
  language,
  onClose,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const notifySuccess = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleFullJSON = () => {
    downloadFullJSONBackup({
      products,
      customers,
      suppliers,
      warehouses,
      salesInvoices,
      purchaseInvoices,
      stockMovements,
      financialTransactions,
    });
    notifySuccess(language === 'ar' ? 'تم تنزيل النسخة الاحتياطية الشاملة بنجاح!' : 'Full backup downloaded successfully!');
  };

  const handleExportProducts = () => {
    exportProductsCSV(products);
    notifySuccess(language === 'ar' ? 'تم تصدير كتالوج الأصناف بصيغة إكسيل بنجاح!' : 'Products exported successfully!');
  };

  const handleExportCustomers = () => {
    exportCustomersCSV(customers);
    notifySuccess(language === 'ar' ? 'تم تصدير سجل العملاء بصيغة إكسيل بنجاح!' : 'Customers exported successfully!');
  };

  const handleExportSuppliers = () => {
    exportSuppliersCSV(suppliers);
    notifySuccess(language === 'ar' ? 'تم تصدير سجل الموردين بصيغة إكسيل بنجاح!' : 'Suppliers exported successfully!');
  };

  const handleExportSales = () => {
    exportSalesInvoicesCSV(salesInvoices, customers);
    notifySuccess(language === 'ar' ? 'تم تصدير فواتير المبيعات بصيغة إكسيل بنجاح!' : 'Sales invoices exported successfully!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0f172a] rounded-xl max-w-xl w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#0a0f1d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{language === 'ar' ? 'النسخ الاحتياطي وتصدير البيانات' : 'Data Backup & Export'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-medium">
                  {language === 'ar' ? 'آمن وسحابي' : 'Cloud Synced'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'حفظ وتنزيل نسخة كاملة من بيانات النظام محلياً على جهازك في أي وقت'
                  : 'Download a full local copy of your database anytime.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Notification banner */}
          {downloadSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center gap-2.5 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Database stats summary cards */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ar' ? 'إجمالي السجلات الجاهزة للنسخ:' : 'Records Ready for Backup:'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Boxes className="w-3 h-3 text-amber-400" />
                  <span>الأصناف</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {products.length.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Receipt className="w-3 h-3 text-blue-400" />
                  <span>فواتير البيع</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {salesInvoices.length.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-purple-400" />
                  <span>فواتير الشراء</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {purchaseInvoices.length.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>العملاء</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {customers.length.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  <span>الموردين</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {suppliers.length.toLocaleString()}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>حركات المخزن</span>
                </div>
                <div className="text-base font-black font-mono text-slate-100 mt-0.5">
                  {stockMovements.length.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action: Full JSON Archive */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ar' ? 'نسخة احتياطية شاملة (Full Archive)' : 'Full System Archive'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                  {language === 'ar'
                    ? 'تحميل ملف JSON كامل يحتوي على كافة جداول السيستم والعمليات والحركات لضمان عدم ضياع أي بيانات.'
                    : 'Download a complete JSON database snapshot containing all tables and transactions.'}
                </p>
              </div>
              <button
                onClick={handleFullJSON}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'ar' ? 'تنزيل النسخة الكاملة' : 'Download JSON'}</span>
              </button>
            </div>
          </div>

          {/* Secondary Actions: Individual Excel Exports */}
          <div>
            <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'ar' ? 'تصدير كملفات إكسيل منفصلة (CSV / Excel):' : 'Export Excel Spreadsheets:'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportProducts}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-amber-400" />
                  <span>كتالوج الأصناف والمخزون</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleExportSales}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-400" />
                  <span>فواتير المبيعات</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleExportCustomers}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>سجل العملاء والأرصدة</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={handleExportSuppliers}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>سجل الموردين والمصانع</span>
                </span>
                <Download className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3 bg-[#0a0f1d] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            {language === 'ar' ? 'البيانات مشفرة بصيغة UTF-8 داعمة للعربية' : 'UTF-8 with Arabic Excel BOM support'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
