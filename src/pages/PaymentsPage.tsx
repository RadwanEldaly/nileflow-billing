import React, { useState } from 'react';
import { Customer, Supplier, FinancialTransaction } from '../types';
import { CreditCard, Plus, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';

interface PaymentsPageProps {
  transactions: FinancialTransaction[];
  customers: Customer[];
  suppliers: Supplier[];
  language: 'ar' | 'en';
  onAddTransaction: (tx: Omit<FinancialTransaction, 'id' | 'created_at'>) => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({
  transactions,
  customers,
  suppliers,
  language,
  onAddTransaction,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txType, setTxType] = useState<'customer_payment' | 'supplier_payment'>('customer_payment');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    if (!partyId || isNaN(amtNum) || amtNum <= 0) return;

    onAddTransaction({
      transaction_type: txType,
      party_type: txType === 'customer_payment' ? 'customer' : 'supplier',
      party_id: partyId,
      amount: amtNum,
      payment_method: paymentMethod,
      transaction_date: txDate,
      notes: notes || (txType === 'customer_payment' ? 'تحصيل من عميل' : 'سداد دفعة للمورد'),
    });

    setIsModalOpen(false);
    setAmount('');
    setNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'إدارة التحصيلات والمدفوعات المالية' : 'Payments & Collections'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تسجيل تحصيلات النقدية من العملاء وسداد دفعات الموردين وتحديث الأرصدة تلقائياً'
              : 'Record customer collections and supplier payments.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'تسجيل إيصال تحصيل / دفع' : 'Record Payment'}</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3">نوع الحركة المالية</th>
                  <th className="px-4 py-3">الطرف المعني (العميل / المورد)</th>
                  <th className="px-4 py-3 text-left">المبلغ</th>
                  <th className="px-4 py-3">طريقة الدفع</th>
                  <th className="px-4 py-3">ملاحظات الإيصال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((t) => {
                  const isCustomer = t.party_type === 'customer';
                  const partyName = isCustomer
                    ? customers.find((c) => c.id === t.party_id)?.name
                    : suppliers.find((s) => s.id === t.party_id)?.name;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]">
                        {t.transaction_date}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            isCustomer
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {isCustomer ? (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                              <span>تحصيل من عميل (+)</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-amber-400" />
                              <span>سداد دفعة لمورد (-)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100 text-xs">
                        {partyName || 'طرف غير محدد'}
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-xs">
                        <span className={isCustomer ? 'text-emerald-400' : 'text-amber-400'}>
                          {t.amount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {t.payment_method === 'cash' ? 'نقداً (كاش خزانة)' : t.payment_method}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{t.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600 mb-2.5 stroke-[1.5]" />
            <p className="font-semibold text-slate-300 text-sm">
              {language === 'ar' ? 'لا توجد عمليات تحصيل أو سداد مسجلة' : 'No payments recorded yet'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'قم بتسجيل حركة تحصيل من عميل أو سداد لمورد لتسويتها في كشف الحساب'
                : 'Record customer collections or supplier payments to balance ledgers'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-700/80 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">تسجيل حركة مالية — خزانة الدالي</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  نوع الحركة المالية *
                </label>
                <select
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value as any);
                    setPartyId('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="customer_payment">تحصيل نقدية من عميل (+ إيداع)</option>
                  <option value="supplier_payment">سداد دفعة لمورد (- صرف)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {txType === 'customer_payment' ? 'اختر العميل *' : 'اختر المورد *'}
                </label>
                <select
                  required
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر الطرف --</option>
                  {txType === 'customer_payment'
                    ? customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (دين مستحق: {c.balance} ج.م)
                        </option>
                      ))
                    : suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (مستحق له: {s.balance} ج.م)
                        </option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    المبلغ بالجنيه (EGP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    تاريخ السند
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-mono font-medium text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  طريقة الدفع
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="cash">نقداً (كاش خزانة)</option>
                  <option value="bank_transfer">تحويل بنكي / إنستاباي</option>
                  <option value="check">شيك بنكي</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  ملاحظات الإيصال / رقم الشيك
                </label>
                <input
                  type="text"
                  placeholder="مثال: دفعة تحت الحساب كاش، أو رقم التحويل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-[0.99]"
                >
                  حفظ وتحديث الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
