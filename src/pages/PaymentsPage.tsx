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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-600" />
            <span>{language === 'ar' ? 'إدارة التحصيلات والمدفوعات المالية' : 'Payments & Collections'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'تسجيل تحصيلات المبالغ من العملاء وسداد الدفعات للموردين لتحديث الحسابات آلياً'
              : 'Record customer collections and supplier payments.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'تسجيل إيصال تحصيل / دفع' : 'Record Payment'}</span>
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">التاريخ</th>
                  <th className="px-6 py-3.5">نوع العملية</th>
                  <th className="px-6 py-3.5">الطرف (العميل / المورد)</th>
                  <th className="px-6 py-3.5">المبلغ</th>
                  <th className="px-6 py-3.5">طريقة الدفع</th>
                  <th className="px-6 py-3.5">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {transactions.map((t) => {
                  const isCustomer = t.party_type === 'customer';
                  const partyName = isCustomer
                    ? customers.find((c) => c.id === t.party_id)?.name
                    : suppliers.find((s) => s.id === t.party_id)?.name;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono text-slate-500 text-xs">{t.transaction_date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCustomer ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isCustomer ? 'تحصيل من عميل (+)' : 'سداد لمورد (-)'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">{partyName || 'طرف مجهول'}</td>
                      <td className="px-6 py-4 font-black font-mono">
                        <span className={isCustomer ? 'text-emerald-600' : 'text-blue-600'}>
                          {t.amount.toLocaleString()} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{t.payment_method === 'cash' ? 'نقداً (كاش)' : t.payment_method}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{t.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد عمليات تحصيل أو سداد مسجلة' : 'No payments recorded yet'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تسجيل إيصال سداد / تحصيل مالية</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الحركة المالية *
                </label>
                <select
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value as any);
                    setPartyId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                >
                  <option value="customer_payment">تحصيل نقدية من عميل (+)</option>
                  <option value="supplier_payment">سداد دفعة لمورد (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {txType === 'customer_payment' ? 'اختر العميل *' : 'اختر المورد *'}
                </label>
                <select
                  required
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
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
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المبلغ بالجنيه (EGP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-black text-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ العملية
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات الإيصال
                </label>
                <input
                  type="text"
                  placeholder="مثال: سداد دفعة تحت الحساب كاش"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
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
