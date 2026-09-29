import React, { useState } from 'react';
import { Supplier, PurchaseInvoice, FinancialTransaction } from '../types';
import { Search, Plus, Truck, FileText, X, Edit3, Trash2 } from 'lucide-react';

interface SuppliersPageProps {
  suppliers: Supplier[];
  purchaseInvoices: PurchaseInvoice[];
  transactions: FinancialTransaction[];
  language: 'ar' | 'en';
  onAddSupplier: (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'balance'>) => void;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => void;
  onDeleteSupplier: (id: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({
  suppliers,
  purchaseInvoices,
  transactions,
  language,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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

    if (editingSupplier) {
      onUpdateSupplier(editingSupplier.id, {
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        notes: formData.notes,
      });
      setEditingSupplier(null);
    } else {
      const nextCode = formData.code || `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
      onAddSupplier({
        code: nextCode,
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
        notes: formData.notes,
      });
    }

    setFormData({ code: '', name: '', mobile: '', address: '', notes: '' });
    setIsAddModalOpen(false);
  };

  const handleEditClick = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      code: sup.code,
      name: sup.name,
      mobile: sup.mobile || '',
      address: sup.address || '',
      notes: sup.notes || '',
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (sup: Supplier) => {
    const confirmed = window.confirm(
      `متأكد إنك تريد حذف بيانات المورد "${sup.name}" نهائيًا؟ لن يمكن التراجع عن هذا الإجراء.`
    );
    if (confirmed) {
      onDeleteSupplier(sup.id);
    }
  };

  const getSupplierLedger = (sup: Supplier) => {
    const supInvoices = purchaseInvoices.filter((i) => i.supplier_id === sup.id);
    const supPayments = transactions.filter(
      (t) => t.party_type === 'supplier' && t.party_id === sup.id
    );

    const totalPurchasesSum = supInvoices.reduce((acc, i) => acc + i.total, 0);
    const totalPaidSum =
      supInvoices.reduce((acc, i) => acc + i.paid_amount, 0) +
      supPayments.reduce((acc, p) => acc + p.amount, 0);

    const netPayableBalance = Math.max(0, totalPurchasesSum - totalPaidSum);

    const ledgerItems: {
      date: string;
      type: string;
      ref: string;
      debit: number;
      credit: number;
      notes: string;
    }[] = [];

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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'سجل الموردين وكشوف الحسابات' : 'Suppliers Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'متابعة مصانع ومستوردي الألواح الخشبية، الفواتير الواردة، والمستحقات المالية المؤجلة'
              : 'Track wood suppliers, purchase invoices, and payables.'}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingSupplier(null);
            setFormData({ code: '', name: '', mobile: '', address: '', notes: '' });
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة مورد جديد' : 'Add Supplier'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={
              language === 'ar'
                ? 'ابحث باسم شركة المورد، الكود، أو رقم الهاتف...'
                : 'Search supplier name, code, or phone...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        {filteredSuppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">كود المورد</th>
                  <th className="px-4 py-3">اسم المورد / الشركة</th>
                  <th className="px-4 py-3">رقم الهاتف</th>
                  <th className="px-4 py-3">العنوان / المنطقة</th>
                  <th className="px-4 py-3">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-left">المستحق للمورد (دائن)</th>
                  <th className="px-4 py-3 text-center">كشف الحساب</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSuppliers.map((sup) => {
                  const ledger = getSupplierLedger(sup);
                  return (
                    <tr key={sup.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-[11px]">
                        {sup.code}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100 text-xs">
                        {sup.name}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-300 dir-ltr text-xs">
                        {sup.mobile || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{sup.address || '—'}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-slate-500">
                        {sup.created_at ? sup.created_at.slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-xs">
                        {ledger.netPayableBalance > 0 ? (
                          <span className="text-amber-400">
                            {ledger.netPayableBalance.toLocaleString()}{' '}
                            <span className="text-[10px] font-normal text-amber-500">ج.م</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">
                            0 <span className="text-[10px] font-normal text-slate-500">ج.م (مسدد بالكامل)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedSupplierForLedger(sup)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>عرض كشف الحساب</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(sup)}
                            title="تعديل بيانات المورد"
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sup)}
                            title="حذف المورد"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2.5 stroke-[1.5]" />
            <p className="font-semibold text-slate-300 text-sm">
              {language === 'ar' ? 'لم يتم العثور على موردين مسجلين' : 'No suppliers found'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar' ? 'قم بإضافة مورد جديد لتسجيل فواتير الشراء والتوريدات' : 'Add a new supplier to record wood purchases'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Supplier */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-700/80 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {editingSupplier
                    ? `تعديل بيانات المورد: ${editingSupplier.name}`
                    : 'إضافة مورد جديد — شركة الدالي'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  اسم المورد / الشركة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الشركة الدولية للأخشاب والكونتر"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  رقم الهاتف / مسؤول المبيعات
                </label>
                <input
                  type="text"
                  placeholder="01099887766"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  العنوان / المنطقة الصناعية
                </label>
                <input
                  type="text"
                  placeholder="مدينة السادات - المنطقة الصناعية الثالثة"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="فترة السداد المسموحة أو الأصناف الموردة..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-[0.99]"
                >
                  {editingSupplier ? 'حفظ التعديلات' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Ledger Drawer */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-3xl w-full p-5 shadow-2xl space-y-4 border border-slate-700/80 max-h-[90vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>كشف حساب مورد: {selectedSupplierForLedger.name}</span>
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>كود: <strong className="font-mono text-slate-300">{selectedSupplierForLedger.code}</strong></span>
                  <span>•</span>
                  <span>هاتف: <strong className="font-mono text-slate-300">{selectedSupplierForLedger.mobile || '—'}</strong></span>
                  <span>•</span>
                  <span>العنوان: {selectedSupplierForLedger.address || '—'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedSupplierForLedger(null)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const ledger = getSupplierLedger(selectedSupplierForLedger);
              return (
                <div className="space-y-4 overflow-y-auto flex-1 pr-0.5">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-3 bg-[#0b0f19] rounded-lg border border-slate-800 divide-x divide-x-reverse divide-slate-800/80">
                    <div className="p-3">
                      <div className="text-[10px] text-slate-400 font-medium">إجمالي المشتريات</div>
                      <div className="text-base font-black font-mono tabular-nums text-slate-100 mt-0.5">
                        {ledger.totalPurchasesSum.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-[10px] text-slate-400 font-medium">إجمالي المسدد للمورد</div>
                      <div className="text-base font-black font-mono tabular-nums text-emerald-400 mt-0.5">
                        {ledger.totalPaidSum.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-emerald-600">ج.م</span>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-[10px] text-slate-400 font-medium">المستحق للمورد (دائن)</div>
                      <div className="text-base font-black font-mono tabular-nums text-amber-400 mt-0.5">
                        {ledger.netPayableBalance.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-amber-500">ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Statement Table */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">
                      سجل فواتير التوريد والمدفوعات
                    </h4>
                    {ledger.ledgerItems.length > 0 ? (
                      <div className="border border-slate-800 rounded-lg overflow-x-auto">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">التاريخ</th>
                              <th className="p-2.5">نوع الحركة</th>
                              <th className="p-2.5">المرجع</th>
                              <th className="p-2.5 text-left">مدين (سدادنا)</th>
                              <th className="p-2.5 text-left">دائن (مشتريات)</th>
                              <th className="p-2.5">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {ledger.ledgerItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-2.5 font-mono tabular-nums text-slate-400 text-[11px]">{item.date}</td>
                                <td className="p-2.5 font-medium text-slate-200">{item.type}</td>
                                <td className="p-2.5 font-mono font-bold text-amber-400 text-[11px]">{item.ref}</td>
                                <td className="p-2.5 text-left font-mono tabular-nums font-semibold text-emerald-400">
                                  {item.debit > 0 ? `${item.debit.toLocaleString()} ج.م` : '—'}
                                </td>
                                <td className="p-2.5 text-left font-mono tabular-nums font-semibold text-slate-100">
                                  {item.credit > 0 ? `${item.credit.toLocaleString()} ج.م` : '—'}
                                </td>
                                <td className="p-2.5 text-slate-400 text-[11px]">{item.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 border border-slate-800 rounded-lg bg-[#0b0f19]">
                        لا توجد حركات مسجلة لهذا المورد حتى الآن.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
