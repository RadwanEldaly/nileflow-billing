import React, { useState } from 'react';
import { Supplier, PurchaseInvoice, FinancialTransaction } from '../types';
import { Search, Plus, Truck, FileText, X } from 'lucide-react';

interface SuppliersPageProps {
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  transactions: FinancialTransaction[];
  language: 'ar' | 'en';
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'balance'>) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({
  suppliers,
  purchaseInvoices,
  transactions,
  language,
  onAddSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    mobile: '',
    address: '',
    notes: '',
  });

  const filteredSuppliers = suppliers.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.mobile && s.mobile.includes(searchTerm)) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const nextCode = formData.code || `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
    onAddSupplier({
      code: nextCode,
      name: formData.name,
      mobile: formData.mobile,
      address: formData.address,
      notes: formData.notes,
    });
    setFormData({ code: '', name: '', mobile: '', address: '', notes: '' });
    setIsAddModalOpen(false);
  };

  const getSupplierLedger = (sup: Supplier) => {
    const supInvoices = purchaseInvoices.filter((i) => i.supplier_id === sup.id);
    const supPayments = transactions.filter(
      (t) => t.party_type === 'supplier' && t.party_id === sup.id
    );

    const totalPurchasesSum = supInvoices.reduce((acc, i) => acc + i.total, 0);
    const totalPaidSum = supInvoices.reduce((acc, i) => acc + i.paid_amount, 0) +
      supPayments.reduce((acc, p) => acc + p.amount, 0);

    const netPayableBalance = Math.max(0, totalPurchasesSum - totalPaidSum);

    const ledgerItems: { date: string; type: string; ref: string; debit: number; credit: number; notes: string }[] = [];

    supInvoices.forEach((inv) => {
      ledgerItems.push({
        date: inv.invoice_date,
        type: 'فاتورة توريد شراء',
        ref: inv.invoice_number,
        debit: inv.paid_amount,
        credit: inv.total,
        notes: `إجمالي الفاتورة: ${inv.total} | مدفوع: ${inv.paid_amount}`,
      });
    });

    supPayments.forEach((p) => {
      ledgerItems.push({
        date: p.transaction_date,
        type: 'سداد دفعة للمورد',
        ref: 'إيصال دفع',
        debit: p.amount,
        credit: 0,
        notes: p.notes || 'سداد دفعة حساب',
      });
    });

    ledgerItems.sort((a, b) => b.date.localeCompare(a.date));

    return { totalPurchasesSum, totalPaidSum, netPayableBalance, ledgerItems };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" />
            <span>{language === 'ar' ? 'سجل الموردين وكشوف الحسابات' : 'Suppliers Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'متابعة مصانع وشركات توريد الأخشاب، الفواتير، المستحقات الواجبة، وكشوف الحساب'
              : 'Track wood suppliers, purchase invoices, and payables.'}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة مورد جديد' : 'Add Supplier'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث باسم المورد، الكود، أو رقم التلفون...' : 'Search supplier name, code, or phone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredSuppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">كود المورد</th>
                  <th className="px-6 py-3.5">اسم المورد</th>
                  <th className="px-6 py-3.5">رقم التلفون</th>
                  <th className="px-6 py-3.5">العنوان</th>
                  <th className="px-6 py-3.5">المستحق للمورد (دائن)</th>
                  <th className="px-6 py-3.5 text-center">كشف الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredSuppliers.map((sup) => {
                  const ledger = getSupplierLedger(sup);
                  return (
                    <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{sup.code}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">{sup.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr">{sup.mobile || '-'}</td>
                      <td className="px-6 py-4 text-slate-500">{sup.address || '-'}</td>
                      <td className="px-6 py-4 font-black">
                        <span className={ledger.netPayableBalance > 0 ? 'text-indigo-600 font-black' : 'text-slate-600'}>
                          {ledger.netPayableBalance.toLocaleString()} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedSupplierForLedger(sup)}
                          className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mx-auto"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>عرض كشف الحساب</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لم يتم العثور على موردين' : 'No suppliers found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Supplier */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">إضافة مورد جديد - شركة الدالي</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم شركة المورد *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصر للكونتر والأخشاب"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم التلفون / التواصل
                </label>
                <input
                  type="text"
                  placeholder="01001234567"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  العنوان / المحافظة
                </label>
                <input
                  type="text"
                  placeholder="السادات - المنطقة الصناعية"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  حفظ المورد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Drawer */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  كشف حساب مورد: {selectedSupplierForLedger.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <span>كود: {selectedSupplierForLedger.code}</span> • <span>تلفون: {selectedSupplierForLedger.mobile || '-'}</span>
                </p>
              </div>
              <button onClick={() => setSelectedSupplierForLedger(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {(() => {
              const ledger = getSupplierLedger(selectedSupplierForLedger);
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-bold uppercase">إجمالي المشتريات</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {ledger.totalPurchasesSum.toLocaleString()} EGP
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-bold uppercase">إجمالي المسدد للمورد</div>
                      <div className="text-lg font-black text-emerald-600 mt-1">
                        {ledger.totalPaidSum.toLocaleString()} EGP
                      </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-xl border border-indigo-200 dark:border-indigo-900">
                      <div className="text-[11px] text-indigo-800 dark:text-indigo-300 font-bold uppercase">المستحق للمورد</div>
                      <div className="text-lg font-black text-indigo-600 mt-1">
                        {ledger.netPayableBalance.toLocaleString()} EGP
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      سجل فواتير التوريد والمدفوعات
                    </h4>
                    {ledger.ledgerItems.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-100 dark:bg-slate-900 font-bold">
                            <tr>
                              <th className="p-2.5 border-b">التاريخ</th>
                              <th className="p-2.5 border-b">نوع الحركة</th>
                              <th className="p-2.5 border-b">المرجع</th>
                              <th className="p-2.5 border-b">مدين (سدادنا)</th>
                              <th className="p-2.5 border-b">دائن (مشتريات)</th>
                              <th className="p-2.5 border-b">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {ledger.ledgerItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-2.5 font-mono">{item.date}</td>
                                <td className="p-2.5 font-bold">{item.type}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-700">{item.ref}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-600">{item.debit > 0 ? `${item.debit} EGP` : '-'}</td>
                                <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{item.credit > 0 ? `${item.credit} EGP` : '-'}</td>
                                <td className="p-2.5 text-slate-500">{item.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-4 text-center">لا يوجد حركات مسجلة لهذا المورد.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
