import React, { useState } from 'react';
import { Supplier, Product, Warehouse, PurchaseInvoice, PurchaseInvoiceItem } from '../types';
import { Search, Plus, ShoppingBag, Trash2, X, FileText } from 'lucide-react';

interface PurchasesPageProps {
  purchaseInvoices: PurchaseInvoice[];
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  language: 'ar' | 'en';
  onCreatePurchase: (invoice: Omit<PurchaseInvoice, 'id' | 'created_at'>) => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchaseInvoices,
  suppliers,
  products,
  warehouses,
  language,
  onCreatePurchase,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<PurchaseInvoice | null>(null);

  // Form states
  const [supplierId, setSupplierId] = useState('');
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
        quantity: 10,
        unitPrice: firstProd.purchase_price || 100,
        lineTotal: 10 * (firstProd.purchase_price || 100),
      },
    ]);
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const updated = [...lineItems];
    updated[index].productId = prodId;
    updated[index].unitPrice = prod.purchase_price;
    updated[index].lineTotal = updated[index].quantity * prod.purchase_price;
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
    if (!supplierId) {
      alert('برجاء اختيار المورد');
      return;
    }
    if (lineItems.length === 0) {
      alert('برجاء إضافة صنف واحد على الأقل');
      return;
    }

    const nextSeq = purchaseInvoices.length + 1;
    const formattedNum = `PUR-WOOD-${String(nextSeq).padStart(5, '0')}`;

    const itemsPrepared: PurchaseInvoiceItem[] = lineItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        id: crypto.randomUUID(),
        invoice_id: '',
        product_id: item.productId,
        product_name_snapshot: prod ? prod.name : 'صنف مجهول',
        wood_type_snapshot: prod ? prod.wood_type : 'ألواح',
        quantity_sheets: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      };
    });

    onCreatePurchase({
      invoice_number: formattedNum,
      supplier_id: supplierId,
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
    setSupplierId('');
    setLineItems([]);
    setPaidAmountInput('');
    setDiscountInput('0');
    setNotes('');
  };

  const filteredInvoices = purchaseInvoices.filter((inv) => {
    const sup = suppliers.find((s) => s.id === inv.supplier_id);
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sup && sup.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSup = selectedSupplierId === 'all' || inv.supplier_id === selectedSupplierId;
    return matchesSearch && matchesSup;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'ar' ? 'فواتير مشتريات الأخشاب' : 'Wood Purchase Invoices'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'تسجيل فواتير توريد الأخشاب وإضافة الألواح تلقائياً لرصيد المخزن'
              : 'Record incoming wood purchases and automatically increment warehouse stock.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (lineItems.length === 0 && products.length > 0) handleAddLineItem();
          }}
          className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'فاتورة توريد شراء جديدة' : 'New Purchase Invoice'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث برقم فاتورة الشراء أو اسم المورد...' : 'Search invoice # or supplier...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {suppliers.length > 0 && (
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white px-4 py-2 font-bold focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الموردين</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">رقم فاتورة الشراء</th>
                  <th className="px-6 py-3.5">المورد</th>
                  <th className="px-6 py-3.5">التاريخ</th>
                  <th className="px-6 py-3.5">إجمالي الفاتورة</th>
                  <th className="px-6 py-3.5">المدفوع</th>
                  <th className="px-6 py-3.5">المتبقي للمورد</th>
                  <th className="px-6 py-3.5 text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((inv) => {
                  const sup = suppliers.find((s) => s.id === inv.supplier_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {sup?.name || 'مورد'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                        {inv.total.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {inv.paid_amount.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600">
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
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد فواتير مشتريات مسجلة' : 'No purchase invoices found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Create Purchase Invoice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  فاتورة توريد شراء أخشاب جديدة - شركة الدالي
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
                    اختر المورد *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    إيداع بمخزن *
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
                    تاريخ التوريد
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

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    الألواح الخشبية المشتراة
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف لوح</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.wood_type}) - تكلفة الشراء: {p.purchase_price} EGP
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
                        <label className="text-[10px] text-slate-400 block text-center">سعر الشراء/لوح</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-24 text-left font-mono font-bold text-xs text-emerald-600">
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
                  ))}
                </div>
              </div>

              {/* Total calculation */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex justify-between text-base font-black text-slate-900 dark:text-white">
                  <span>إجمالي الفاتورة:</span>
                  <span className="font-mono text-emerald-600">{grandTotal.toLocaleString()} EGP</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المبلغ المدفوع كاش للمورد
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
                      المتبقي للمورد (مستحقات)
                    </label>
                    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-black text-indigo-600">
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
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-md"
                >
                  إضافة الألواح للمخزن واعتماد الشراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
