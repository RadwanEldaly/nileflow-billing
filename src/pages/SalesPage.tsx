import React, { useState } from 'react';
import { Customer, Product, Warehouse, SalesInvoice, SalesInvoiceItem } from '../types';
import { Search, Plus, Receipt, Printer, Trash2, X, FileText, CheckCircle2 } from 'lucide-react';

interface SalesPageProps {
  salesInvoices: SalesInvoice[];
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  language: 'ar' | 'en';
  onCreateInvoice: (invoice: Omit<SalesInvoice, 'id' | 'created_at'>) => void;
  isCreateOpenInitially?: boolean;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  salesInvoices,
  customers,
  products,
  warehouses,
  language,
  onCreateInvoice,
  isCreateOpenInitially = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<SalesInvoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(isCreateOpenInitially);

  // Invoice Form State
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [discountInput, setDiscountInput] = useState('0');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [notes, setNotes] = useState('');

  const [lineItems, setLineItems] = useState<
    { productId: string; quantity: number; unitPrice: number; lineTotal: number }[]
  >([]);

  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setLineItems([
      ...lineItems,
      {
        productId: firstProd.id,
        quantity: 1,
        unitPrice: firstProd.selling_price,
        lineTotal: firstProd.selling_price,
      },
    ]);
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const updated = [...lineItems];
    updated[index].productId = prodId;
    updated[index].unitPrice = prod.selling_price;
    updated[index].lineTotal = updated[index].quantity * prod.selling_price;
    setLineItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = qty > 0 ? qty : 1;
    const updated = [...lineItems];
    updated[index].quantity = validQty;
    updated[index].lineTotal = validQty * updated[index].unitPrice;
    setLineItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const validPrice = price >= 0 ? price : 0;
    const updated = [...lineItems];
    updated[index].unitPrice = validPrice;
    updated[index].lineTotal = updated[index].quantity * validPrice;
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const discountVal = parseFloat(discountInput) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);
  const paidVal = paidAmountInput !== '' ? parseFloat(paidAmountInput) : grandTotal;
  const remainingVal = Math.max(0, grandTotal - paidVal);

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert('برجاء اختيار العميل');
      return;
    }
    if (lineItems.length === 0) {
      alert('برجاء إضافة صنف لوح خشب واحد على الأقل');
      return;
    }

    // Check stock availability
    for (const item of lineItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && prod.stock_quantity < item.quantity) {
        const confirmOver = confirm(
          `تنبيه: الكمية المطلوبة لصنف (${prod.name}) وهي (${item.quantity} لوح) أكبر من المخزون المتاح (${prod.stock_quantity} لوح). هل تريد المتابعة وإتاحة الرصيد السالب؟`
        );
        if (!confirmOver) return;
      }
    }

    const nextSeq = salesInvoices.length + 1;
    const formattedNum = `INV-WOOD-${String(nextSeq).padStart(5, '0')}`;

    const itemsPrepared: SalesInvoiceItem[] = lineItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        id: crypto.randomUUID(),
        invoice_id: '',
        product_id: item.productId,
        product_name_snapshot: prod ? prod.name : 'لوح محذوف',
        wood_type_snapshot: prod ? prod.wood_type : 'ألواح',
        quantity_sheets: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      };
    });

    onCreateInvoice({
      invoice_number: formattedNum,
      customer_id: customerId,
      warehouse_id: warehouseId,
      invoice_date: invoiceDate,
      status: 'approved',
      subtotal,
      discount: discountVal,
      total: grandTotal,
      paid_amount: paidVal,
      remaining_balance: remainingVal,
      notes,
      items: itemsPrepared,
    });

    setIsCreateModalOpen(false);
    setCustomerId('');
    setLineItems([]);
    setPaidAmountInput('');
    setDiscountInput('0');
    setNotes('');
  };

  const filteredInvoices = salesInvoices.filter((inv) => {
    const cust = customers.find((c) => c.id === inv.customer_id);
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCust = selectedCustomerId === 'all' || inv.customer_id === selectedCustomerId;
    return matchesSearch && matchesCust;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'فواتير مبيعات الأخشاب' : 'Wood Sales Invoices'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إصدار فواتير الألواح الخشبية، التخصيص الآلي من المخزن، والتحكم في المدفوع والمتبقي'
              : 'Issue wood sheet sales invoices with automatic inventory deduction.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (lineItems.length === 0 && products.length > 0) {
              handleAddLineItem();
            }
          }}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إنشاء فاتورة بيع ألواح جديدة' : 'New Sales Invoice'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'Search invoice # or customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {customers.length > 0 && (
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white px-4 py-2 font-bold focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">جميع العملاء</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">رقم الفاتورة</th>
                  <th className="px-6 py-3.5">العميل</th>
                  <th className="px-6 py-3.5">التاريخ</th>
                  <th className="px-6 py-3.5">إجمالي الفاتورة</th>
                  <th className="px-6 py-3.5">المدفوع</th>
                  <th className="px-6 py-3.5">المتبقي (دين)</th>
                  <th className="px-6 py-3.5 text-center">معاينة وطباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-amber-700 dark:text-amber-400">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {cust?.name || 'عميل'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                        {inv.total.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {inv.paid_amount.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600">
                        {inv.remaining_balance.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>عرض الفاتورة</span>
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
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد فواتير مبيعات مسجلة' : 'No sales invoices found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Create Sales Invoice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  إصدار فاتورة بيع أخشاب جديدة - شركة الدالي
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اختر العميل *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المخزن المصدر *
                  </label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الفاتورة
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    بنود الفاتورة (الألواح الخشبية)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف لوح</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => {
                    const selectedProd = products.find((p) => p.id === item.productId);
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex-1">
                          <select
                            value={item.productId}
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.wood_type}) - المتوفر: {p.stock_quantity} لوح - سعر: {p.selling_price} EGP
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <label className="text-[10px] text-slate-400 block text-center">عدد الألواح</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 1)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold"
                          />
                        </div>

                        <div className="w-24">
                          <label className="text-[10px] text-slate-400 block text-center">سعر اللوح</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold"
                          />
                        </div>

                        <div className="w-24 text-left font-mono font-bold text-xs text-amber-600">
                          {item.lineTotal.toLocaleString()} EGP
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{subtotal.toLocaleString()} EGP</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">الخصم المباشر (جنيه):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-right font-bold"
                  />
                </div>

                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>إجمالي الفاتورة النهائي:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">{grandTotal.toLocaleString()} EGP</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المبلغ المدفوع كاش (جنيه)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`تلقائي: ${grandTotal}`}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المتبقي كدين على العميل
                    </label>
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-black text-red-600">
                      {remainingVal.toLocaleString()} EGP
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
                >
                  اعتماد خصم المخزن وإصدار الفاتورة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Receipt Modal */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-700 print:m-0 print:p-0">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-700 print:hidden">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                فاتورة مبيعات أخشاب #{selectedInvoiceForView.invoice_number}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة</span>
                </button>
                <button onClick={() => setSelectedInvoiceForView(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="space-y-4">
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-black text-slate-900">شركة الدالي لتجارة الأخشاب</h2>
                <p className="text-xs text-slate-500">متخصصون في توريد كافة أنواع الألواح الخشبية (MDF - كونتر - أبلكاش)</p>
                <div className="text-xs font-mono font-bold mt-2 text-amber-700">
                  رقم الفاتورة: {selectedInvoiceForView.invoice_number}
                </div>
              </div>

              <div className="grid grid-cols-2 text-xs gap-2 text-slate-700">
                <div>
                  <span className="font-bold">العميل:</span>{' '}
                  {customers.find((c) => c.id === selectedInvoiceForView.customer_id)?.name || 'عميل'}
                </div>
                <div>
                  <span className="font-bold">التاريخ:</span> {selectedInvoiceForView.invoice_date}
                </div>
              </div>

              <table className="w-full text-xs text-right border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">الصنف (اللوح الخشبي)</th>
                    <th className="p-2 border">عدد الألواح</th>
                    <th className="p-2 border">سعر اللوح</th>
                    <th className="p-2 border">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoiceForView.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border font-bold">{item.product_name_snapshot} ({item.wood_type_snapshot})</td>
                      <td className="p-2 border text-center font-bold">{item.quantity_sheets} لوح</td>
                      <td className="p-2 border font-mono">{item.unit_price} EGP</td>
                      <td className="p-2 border font-mono font-bold">{item.line_total} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-xs text-left pt-2 border-t">
                <div className="font-bold">الإجمالي: {selectedInvoiceForView.total.toLocaleString()} ج.م</div>
                <div className="text-emerald-700 font-bold">المدفوع كاش: {selectedInvoiceForView.paid_amount.toLocaleString()} ج.م</div>
                <div className="text-red-600 font-black">المتبقي دين: {selectedInvoiceForView.remaining_balance.toLocaleString()} ج.م</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
