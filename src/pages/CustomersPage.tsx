import React, { useState } from 'react';
import { Customer, SalesInvoice, FinancialTransaction } from '../types';
import { Search, Plus, Phone, MapPin, FileText, DollarSign, X, CheckCircle2, User } from 'lucide-react';

interface CustomersPageProps {
  customers: Customer[];
  salesInvoices: SalesInvoice[];
  transactions: FinancialTransaction[];
  language: 'ar' | 'en';
  onAddCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'balance'>) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  customers,
  salesInvoices,
  transactions,
  language,
  onAddCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    mobile: '',
    address: '',
    notes: '',
  });

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;
    const nextCode = formData.code || `CUST-${String(customers.length + 1).padStart(3, '0')}`;
    onAddCustomer({
      code: nextCode,
      name: formData.name,
      mobile: formData.mobile,
      address: formData.address,
      notes: formData.notes,
    });
    setFormData({ code: '', name: '', mobile: '', address: '', notes: '' });
    setIsAddModalOpen(false);
  };

  // Build Account Statement (كشف حساب) for selected customer
  const getCustomerLedger = (cust: Customer) => {
    const custInvoices = salesInvoices.filter((i) => i.customer_id === cust.id);
    const custPayments = transactions.filter(
      (t) => t.party_type === 'customer' && t.party_id === cust.id
    );

    const totalSalesSum = custInvoices.reduce((acc, i) => acc + i.total, 0);
    const totalPaidSum = custInvoices.reduce((acc, i) => acc + i.paid_amount, 0) +
      custPayments.reduce((acc, p) => acc + p.amount, 0);

    const netDebtBalance = Math.max(0, totalSalesSum - totalPaidSum);

    // Merge history into single chronological array
    const ledgerItems: { date: string; type: string; ref: string; debit: number; credit: number; notes: string }[] = [];

    custInvoices.forEach((inv) => {
      ledgerItems.push({
        date: inv.invoice_date,
        type: 'فاتورة بيع ألواح',
        ref: inv.invoice_number,
        debit: inv.total,
        credit: inv.paid_amount,
        notes: `إجمالي: ${inv.total} | مدفوع: ${inv.paid_amount}`,
      });
    });

    custPayments.forEach((p) => {
      ledgerItems.push({
        date: p.transaction_date,
        type: 'سداد تحصيل نقدًا',
        ref: 'إيصال سداد',
        debit: 0,
        credit: p.amount,
        notes: p.notes || 'سداد حساب',
      });
    });

    ledgerItems.sort((a, b) => b.date.localeCompare(a.date));

    return { totalSalesSum, totalPaidSum, netDebtBalance, ledgerItems };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-amber-600" />
            <span>{language === 'ar' ? 'سجل العملاء وكشوف الحسابات' : 'Customers Ledger'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إدارة بيانات النجارين والتجار، متابعة الرصيد المستحق، وطباعة كشف حساب عميل مفصل'
              : 'Search customers, track outstanding balances, and print detailed account statements.'}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إضافة عميل جديد' : 'Add Customer'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث باسم العميل، الكود، أو رقم التلفون...' : 'Search customer name, code, or mobile...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">كود العميل</th>
                  <th className="px-6 py-3.5">اسم العميل</th>
                  <th className="px-6 py-3.5">رقم التلفون</th>
                  <th className="px-6 py-3.5">العنوان</th>
                  <th className="px-6 py-3.5">الرصيد المستحق (دين)</th>
                  <th className="px-6 py-3.5 text-center">كشف الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredCustomers.map((cust) => {
                  const ledger = getCustomerLedger(cust);
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{cust.code}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">{cust.name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300 dir-ltr">{cust.mobile}</td>
                      <td className="px-6 py-4 text-slate-500">{cust.address || '-'}</td>
                      <td className="px-6 py-4 font-black">
                        <span className={ledger.netDebtBalance > 0 ? 'text-red-600 font-black' : 'text-emerald-600'}>
                          {ledger.netDebtBalance.toLocaleString()} EGP
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedCustomerForLedger(cust)}
                          className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 mx-auto"
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
              {language === 'ar' ? 'لم يتم العثور على عملاء' : 'No customers found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Add Customer */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">إضافة عميل جديد - شركة الدالي</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حسام الجيار"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  رقم التلفون / الموبايل *
                </label>
                <input
                  type="text"
                  required
                  placeholder="01119970044"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  العنوان / المنطقة
                </label>
                <input
                  type="text"
                  placeholder="البدرشين"
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
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  حفظ العميل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Account Statement Modal Drawer (كشف حساب عميل) */}
      {selectedCustomerForLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  كشف حساب عميل: {selectedCustomerForLedger.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                  <span>كود: {selectedCustomerForLedger.code}</span> • <span>تلفون: {selectedCustomerForLedger.mobile}</span> • <span>العنوان: {selectedCustomerForLedger.address || '-'}</span>
                </p>
              </div>
              <button onClick={() => setSelectedCustomerForLedger(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {(() => {
              const ledger = getCustomerLedger(selectedCustomerForLedger);
              return (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-bold uppercase">إجمالي المبيعات</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {ledger.totalSalesSum.toLocaleString()} EGP
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 font-bold uppercase">إجمالي المسدد</div>
                      <div className="text-lg font-black text-emerald-600 mt-1">
                        {ledger.totalPaidSum.toLocaleString()} EGP
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-xl border border-amber-200 dark:border-amber-900">
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 font-bold uppercase">الرصيد المتبقي (دين)</div>
                      <div className="text-lg font-black text-red-600 mt-1">
                        {ledger.netDebtBalance.toLocaleString()} EGP
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      الحركات المالية السابقة (الفواتير والتحصيلات)
                    </h4>
                    {ledger.ledgerItems.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-100 dark:bg-slate-900 font-bold">
                            <tr>
                              <th className="p-2.5 border-b">التاريخ</th>
                              <th className="p-2.5 border-b">نوع الحركة</th>
                              <th className="p-2.5 border-b">المرجع</th>
                              <th className="p-2.5 border-b">مدين (عنا)</th>
                              <th className="p-2.5 border-b">دائن (مدفوع)</th>
                              <th className="p-2.5 border-b">ملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {ledger.ledgerItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-2.5 font-mono">{item.date}</td>
                                <td className="p-2.5 font-bold">{item.type}</td>
                                <td className="p-2.5 font-mono font-bold text-amber-700">{item.ref}</td>
                                <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{item.debit > 0 ? `${item.debit} EGP` : '-'}</td>
                                <td className="p-2.5 font-mono font-bold text-emerald-600">{item.credit > 0 ? `${item.credit} EGP` : '-'}</td>
                                <td className="p-2.5 text-slate-500">{item.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 p-4 text-center">لا يوجد حركات مسجلة بهذا الحساب حتى الآن.</p>
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
