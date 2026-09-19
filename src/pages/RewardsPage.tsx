import React, { useState } from 'react';
import { Customer, Product, CustomerReward } from '../types';
import { Gift, Plus, Calendar, Tag, CheckCircle2, Clock, X, User } from 'lucide-react';

interface RewardsPageProps {
  rewards: CustomerReward[];
  customers: Customer[];
  products: Product[];
  language: 'ar' | 'en';
  preSelectedCustomerId?: string;
  preSelectedMonth?: string;
  onAddReward: (reward: Omit<CustomerReward, 'id' | 'created_at'>) => void;
  onUpdateRewardStatus: (id: string, status: 'pending' | 'awarded' | 'claimed') => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({
  rewards,
  customers,
  products,
  language,
  preSelectedCustomerId = '',
  preSelectedMonth = new Date().toISOString().slice(0, 7),
  onAddReward,
  onUpdateRewardStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preSelectedCustomerId));

  // Form states
  const [targetCustomerId, setTargetCustomerId] = useState(preSelectedCustomerId);
  const [targetMonth, setTargetMonth] = useState(preSelectedMonth);
  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [giftProductId, setGiftProductId] = useState('');
  const [giftQuantity, setGiftQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCustomerId) {
      alert(language === 'ar' ? 'برجاء اختيار العميل المستحق' : 'Please select customer');
      return;
    }

    onAddReward({
      customer_id: targetCustomerId,
      target_month: targetMonth,
      discount_percentage: parseFloat(discountPercentage) || 0,
      gift_product_id: giftProductId || undefined,
      gift_quantity: parseFloat(giftQuantity) || 0,
      reward_status: 'awarded',
      notes,
    });

    setIsModalOpen(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'سجل المكافآت والخصومات اليدوية' : 'Manual Rewards & Offers'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'تحديد المكافآت، الخصومات النسبية، وهدايا ثنر/نفض يدويّاً للعملاء المتميزين'
              : 'Manually assign custom discounts, gifts, and rewards to top customers.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'تسجيل مكافأة جديدة' : 'Add New Reward'}</span>
        </button>
      </div>

      {/* Rewards Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {rewards.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">اسم العميل</th>
                  <th className="px-6 py-3.5">الشهر المستهدف</th>
                  <th className="px-6 py-3.5">الخصم (%)</th>
                  <th className="px-6 py-3.5">الهدية عيناً</th>
                  <th className="px-6 py-3.5">الحالة</th>
                  <th className="px-6 py-3.5">ملاحظات</th>
                  <th className="px-6 py-3.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {rewards.map((r) => {
                  const cust = customers.find((c) => c.id === r.customer_id);
                  const giftProd = products.find((p) => p.id === r.gift_product_id);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {cust?.name || 'عميل'}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">{r.target_month}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {r.discount_percentage > 0 ? `${r.discount_percentage}%` : '-'}
                      </td>
                      <td className="px-6 py-4 text-indigo-600 font-semibold">
                        {giftProd ? `${r.gift_quantity} ${giftProd.unit} (${giftProd.name})` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {r.reward_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{r.notes || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            onUpdateRewardStatus(
                              r.id,
                              r.reward_status === 'awarded' ? 'claimed' : 'awarded'
                            )
                          }
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-semibold rounded hover:bg-slate-200"
                        >
                          تغيير الحالة
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
            <Gift className="w-12 h-12 mx-auto text-amber-400 mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لم يتم تسليم مكافآت يدوية بعد' : 'No custom rewards recorded yet'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'تسجيل مكافأة / عرض يدوي' : 'Record Manual Reward'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  العميل المستحق *
                </label>
                <select
                  required
                  value={targetCustomerId}
                  onChange={(e) => setTargetCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="">-- اختر العميل --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الشهر المستهدف
                  </label>
                  <input
                    type="month"
                    required
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نسبة الخصم (%)
                  </label>
                  <input
                    type="number"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  هدية منتج عيني (اختياري)
                </label>
                <select
                  value={giftProductId}
                  onChange={(e) => setGiftProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="">-- بدون هدية عينية --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {giftProductId && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كمية الهدية العينية
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={giftQuantity}
                    onChange={(e) => setGiftQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="مثال: مكافأة العميل الأكثر شراءً لشهر سبتمبر"
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
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  حفظ المكافأة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
