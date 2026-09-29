import React, { useState } from 'react';
import { Supplier, Product, Warehouse, PurchaseInvoice, PurchaseInvoiceItem } from '../types';
import { Search, Plus, ShoppingBag, Trash2, X, FileText, Printer, Building2, Calendar, PackageCheck, ArrowDownRight } from 'lucide-react';
import { amountToArabicWords } from '../lib/numberToArabicWords';

interface PurchasesPageProps {
  purchaseInvoices: PurchaseInvoice[];
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  language: 'ar' | 'en';
  onCreatePurchase: (invoice: Omit<PurchaseInvoice, 'id' | 'created_at'>) => void;
  onDeleteInvoice: (invoiceId: string) => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchaseInvoices,
  suppliers,
  products,
  warehouses,
  language,
  onCreatePurchase,
  onDeleteInvoice,
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
  const [productQuery, setProductQuery] = useState('');

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

  const handleAddProductToPurchase = (prod: Product) => {
    const existingIndex = lineItems.findIndex((item) => item.productId === prod.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, lineItems[existingIndex].quantity + 10);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: prod.id,
          quantity: 10,
          unitPrice: prod.purchase_price || 100,
          lineTotal: 10 * (prod.purchase_price || 100),
        },
      ]);
    }
    setProductQuery('');
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
    setProductQuery('');
  };

  const filteredProducts = productQuery.trim() === ''
    ? []
    : products.filter(p =>
        p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.wood_type.toLowerCase().includes(productQuery.toLowerCase())
      ).slice(0, 15);

  const filteredInvoices = purchaseInvoices.filter((inv) => {
    const sup = suppliers.find((s) => s.id === inv.supplier_id);
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sup && sup.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSup = selectedSupplierId === 'all' || inv.supplier_id === selectedSupplierId;
    return matchesSearch && matchesSup;
  });

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'فواتير مشتريات الأخشاب' : 'Wood Purchase Invoices'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تسجيل فواتير توريد الأخشاب وإيداع الألواح تلقائياً في رصيد المخزن المحدد'
              : 'Record incoming wood purchases and automatically increment warehouse stock.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (lineItems.length === 0 && products.length > 0) handleAddLineItem();
          }}
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'فاتورة توريد شراء جديدة' : 'New Purchase Invoice'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث برقم الفاتورة، كود التوريد، أو اسم المورد...' : 'Search invoice # or supplier...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70"
          />
        </div>

        {suppliers.length > 0 && (
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500/70"
          >
            <option value="all">جميع الموردين ({suppliers.length})</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Purchases Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">رقم فاتورة الشراء</th>
                  <th className="px-4 py-3">المورد</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3 text-left">إجمالي الفاتورة</th>
                  <th className="px-4 py-3 text-left">المدفوع نقداً</th>
                  <th className="px-4 py-3 text-left">المتبقي للمورد</th>
                  <th className="px-4 py-3 text-center">المعاينة</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const sup = suppliers.find((s) => s.id === inv.supplier_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400 text-xs">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200">
                        {sup?.name || 'مورد'}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-400">
                        {inv.invoice_date}
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-slate-100">
                        {inv.total.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-semibold text-emerald-400">
                        {inv.paid_amount.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600">ج.م</span>
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-semibold text-amber-400">
                        {inv.remaining_balance.toLocaleString()} <span className="text-[10px] font-normal text-amber-600">ج.م</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded text-[11px] font-medium transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>عرض الفاتورة</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            const confirmed = window.confirm(
                              `متأكد إنك تريد حذف فاتورة الشراء "${inv.invoice_number}" نهائيًا؟ سيتم خصم رصيد الألواح المضافة من المخزن وتحديث كشف حساب المورد.`
                            );
                            if (confirmed) onDeleteInvoice(inv.id);
                          }}
                          title="حذف الفاتورة"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 mb-2.5 stroke-[1.5]" />
            <p className="font-semibold text-slate-300 text-sm">
              {language === 'ar' ? 'لا يوجد فواتير مشتريات مسجلة' : 'No purchase invoices found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Create Purchase Invoice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-700/80 max-h-[94vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  إصدار فاتورة شراء وتوريد أخشاب جديدة — شركة الدالي
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveInvoice} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0b0f19] rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    اختر المورد *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141b2d] border border-slate-700 rounded-md text-xs font-medium text-white focus:outline-none focus:border-amber-500"
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
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    إيداع بمخزن *
                  </label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141b2d] border border-slate-700 rounded-md text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    تاريخ التوريد *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141b2d] border border-slate-700 rounded-md text-xs font-mono font-medium text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* DEDICATED PROMINENT PRODUCT SEARCH & QUICK-ADD BAR */}
              <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span>بحث سريع عن أصناف الألواح لإضافتها لفاتورة الشراء</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    اكتب اسم اللوح أو كوده لإضافته فوراً
                  </span>
                </div>

                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-amber-400" />
                    <input
                      type="text"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="ابحث بالاسم (مثال: جوود وود، أرو، MDF، كونتر) أو الكود..."
                      className="w-full pr-10 pl-8 py-2.5 bg-[#141b2d] border-2 border-slate-700 focus:border-amber-500 rounded-lg text-sm font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
                    />
                    {productQuery && (
                      <button
                        type="button"
                        onClick={() => setProductQuery('')}
                        className="absolute left-2.5 text-slate-400 hover:text-white p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {productQuery.trim() !== '' && (
                    <div className="absolute z-50 mt-1.5 w-full bg-[#111827] border-2 border-amber-500/70 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-800">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleAddProductToPurchase(prod)}
                            className="px-4 py-3 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-4 transition group"
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white group-hover:text-amber-300 transition">
                                  {prod.name}
                                </span>
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                  {prod.code}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {prod.wood_type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400">
                                الرصيد الحالي بالمخزن: {prod.stock_quantity} لوح
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-left font-mono tabular-nums">
                                <div className="text-sm font-bold text-amber-400">
                                  {prod.purchase_price.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                                </div>
                                <div className="text-[10px] text-slate-500">تكلفة الشراء / لوح</div>
                              </div>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition active:scale-95 flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة</span>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-400">
                          <p className="text-sm font-semibold text-slate-200">لم يتم العثور على أصناف تطابق بحثك: "{productQuery}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200">
                    الألواح الخشبية المشتراة ({lineItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة بند فارغ</span>
                  </button>
                </div>

                {lineItems.length > 0 ? (
                  <div className="border border-slate-800 rounded-lg overflow-x-auto bg-[#0b0f19]">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-[#111827] text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-8">#</th>
                          <th className="px-3 py-2.5">اسم وبيان اللوح الخشبي</th>
                          <th className="px-3 py-2.5 text-center w-32">عدد الألواح</th>
                          <th className="px-3 py-2.5 text-center w-32">سعر الشراء (ج.م)</th>
                          <th className="px-3 py-2.5 text-left w-32">إجمالي البند</th>
                          <th className="px-3 py-2.5 text-center w-12">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {lineItems.map((item, idx) => {
                          const selectedProd = products.find((p) => p.id === item.productId);
                          return (
                            <tr key={idx} className="hover:bg-slate-800/40 transition">
                              <td className="px-3 py-3 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                              <td className="px-3 py-3">
                                <select
                                  value={item.productId}
                                  onChange={(e) => handleProductChange(idx, e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-[#141c2e] border border-slate-700 rounded-md text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                                >
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.wood_type}) — سعر الشراء: {p.purchase_price} ج.م
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(idx, Math.max(1, item.quantity - 1))}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-700"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 1)}
                                    className="w-14 px-2 py-1 bg-[#141c2e] border border-slate-700 rounded text-xs text-center font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-700"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 bg-[#141c2e] border border-slate-700 rounded text-xs text-center font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="px-3 py-3 text-left font-mono tabular-nums font-bold text-amber-400 text-xs">
                                {item.lineTotal.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLineItem(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                  title="حذف البند"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-lg bg-[#0b0f19]">
                    <p className="text-xs font-semibold text-slate-300">لا توجد ألواح مدرجة بالفاتورة حتى الآن</p>
                  </div>
                )}
              </div>

              {/* Financial Calculation Bar */}
              <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">المجموع الفرعي للألواح:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-200 text-sm">{subtotal.toLocaleString()} ج.م</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      الخصم المكتسب (جنيه)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#141b2d] border border-slate-700 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      المدفوع نقداً للمورد (ج.م)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`تلقائي: ${grandTotal}`}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#141b2d] border border-slate-700 rounded text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      المتبقي للمورد (دين آجل)
                    </label>
                    <div className="px-2.5 py-1.5 bg-[#141b2d] border border-slate-700/80 rounded text-xs font-mono tabular-nums font-bold text-amber-400">
                      {remainingVal.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-200">صافي إجمالي الفاتورة:</span>
                  <span className="font-mono tabular-nums text-lg font-black text-amber-400">
                    {grandTotal.toLocaleString()} <span className="text-xs font-medium text-slate-300">ج.م</span>
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">ملاحظات التوريد</label>
                <input
                  type="text"
                  placeholder="رقم بيان المورد الخارجي أو ملاحظات استلام..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  إضافة الألواح للمخزن واعتماد الشراء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Purchase Invoice Modal */}
      {selectedInvoiceForView && (() => {
        const sup = suppliers.find((s) => s.id === selectedInvoiceForView.supplier_id);
        const items = selectedInvoiceForView.items || [];
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:static print:bg-transparent print:p-0">
            <div
              id="purchase-invoice-print-area"
              className="bg-white text-slate-950 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 print:m-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:border-0 print:rounded-none"
              dir="rtl"
            >
              {/* Modal controls - hidden in print */}
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    فاتورة مشتريات أخشاب #{selectedInvoiceForView.invoice_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الفاتورة</span>
                  </button>
                  <button
                    onClick={() => setSelectedInvoiceForView(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Document */}
              <div className="invoice-print-sheet text-slate-900 text-xs">
                {/* Company Header */}
                <div className="flex items-center justify-between border-b border-slate-300 pb-3 mb-2">
                  <div className="text-right">
                    <h2 className="text-xl font-black text-slate-950">شركة الدالي لتجارة الأخشاب والقشرة</h2>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      متخصصون في توريد كافة أنواع الألواح الخشبية (MDF - كونتر - أبلكاش - قشرة)
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      العنوان: البدرشين - طريق أبوربع | ت: 01001911745 - 01119596070
                    </p>
                  </div>
                  <img
                    src="/logo.png"
                    alt="شركة الدالي"
                    className="h-16 w-auto object-contain shrink-0"
                  />
                </div>

                <div className="text-center border-y border-slate-800 py-1 my-2">
                  <h1 className="text-sm font-black tracking-wide text-slate-900">فاتورة توريد شراء أخشاب</h1>
                </div>

                {/* Metadata & Supplier Box */}
                <div className="flex flex-wrap justify-between gap-3 mb-3">
                  <div className="border border-slate-300 rounded overflow-hidden text-[11px] w-48">
                    <div className="flex justify-between px-2 py-1 border-b border-slate-200 bg-slate-100">
                      <span className="font-bold text-slate-700">رقم الفاتورة:</span>
                      <span className="font-mono font-bold">{selectedInvoiceForView.invoice_number}</span>
                    </div>
                    <div className="flex justify-between px-2 py-1">
                      <span className="font-bold text-slate-700">تاريخ التوريد:</span>
                      <span className="font-mono">{selectedInvoiceForView.invoice_date}</span>
                    </div>
                  </div>

                  <div className="text-[11px] space-y-0.5 text-right flex-1 max-w-xs border border-slate-300 rounded p-2 bg-slate-50">
                    <div><span className="font-bold text-slate-700">المورد:</span> {sup?.name || 'مورد'}</div>
                    {sup?.code && <div><span className="font-bold text-slate-700">كود المورد:</span> {sup.code}</div>}
                    {sup?.mobile && <div><span className="font-bold text-slate-700">التليفون:</span> {sup.mobile}</div>}
                    {sup?.address && <div><span className="font-bold text-slate-700">العنوان:</span> {sup.address}</div>}
                  </div>
                </div>

                {/* Line Items Table */}
                <table className="w-full text-[11px] border-collapse border border-slate-300 mb-3">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="border border-slate-300 p-1.5 text-center w-8">م</th>
                      <th className="border border-slate-300 p-1.5 text-right">بيان الصنف</th>
                      <th className="border border-slate-300 p-1.5 text-center w-14">الوحدة</th>
                      <th className="border border-slate-300 p-1.5 text-center w-16">الكمية</th>
                      <th className="border border-slate-300 p-1.5 text-left w-20">سعر الشراء</th>
                      <th className="border border-slate-300 p-1.5 text-left w-24">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-semibold text-slate-900">
                          {item.product_name_snapshot}
                          {item.wood_type_snapshot ? ` (${item.wood_type_snapshot})` : ''}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">لوح</td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono font-bold">{item.quantity_sheets}</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono">{item.unit_price.toLocaleString()}</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono font-bold">{item.line_total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border border-slate-300 p-3 text-center text-slate-400">لا توجد أصناف</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totals Box */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex-1 text-[11px] space-y-1.5">
                    <div className="p-2 border border-slate-200 rounded bg-slate-50">
                      <span className="font-bold text-slate-700">فقط وقدره: </span>
                      <span className="font-semibold text-slate-900">{amountToArabicWords(selectedInvoiceForView.total)}</span>
                    </div>
                    {selectedInvoiceForView.notes && (
                      <div className="text-[10px] text-slate-600">
                        <span className="font-bold">ملاحظات: </span>{selectedInvoiceForView.notes}
                      </div>
                    )}
                  </div>

                  <table className="text-[11px] border-collapse border border-slate-300 w-56">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 p-1.5 font-bold bg-slate-100 text-slate-700">إجمالي الأصناف:</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono">{selectedInvoiceForView.subtotal.toLocaleString()} ج.م</td>
                      </tr>
                      {selectedInvoiceForView.discount > 0 && (
                        <tr>
                          <td className="border border-slate-300 p-1.5 font-bold bg-slate-100 text-slate-700">قيمة الخصم:</td>
                          <td className="border border-slate-300 p-1.5 text-left font-mono text-rose-600">-{selectedInvoiceForView.discount.toLocaleString()} ج.م</td>
                        </tr>
                      )}
                      <tr>
                        <td className="border border-slate-300 p-1.5 font-bold bg-slate-100 text-slate-900">صافي الفاتورة:</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono font-black">{selectedInvoiceForView.total.toLocaleString()} ج.م</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1.5 font-bold bg-slate-100 text-slate-700">المدفوع نقداً:</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono font-bold text-emerald-700">{selectedInvoiceForView.paid_amount.toLocaleString()} ج.م</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 p-1.5 font-bold bg-slate-100 text-slate-700">المتبقي للمورد:</td>
                        <td className="border border-slate-300 p-1.5 text-left font-mono font-bold text-amber-700">{selectedInvoiceForView.remaining_balance.toLocaleString()} ج.م</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="flex justify-between pt-6 mt-4 border-t border-slate-200 text-xs">
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-700 mb-6">أمين المخزن المستلم</div>
                    <div className="border-t border-dashed border-slate-400" />
                  </div>
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-700 mb-6">توقيع المورد / المندوب</div>
                    <div className="border-t border-dashed border-slate-400" />
                  </div>
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-700 mb-6">المحاسب المسؤول</div>
                    <div className="border-t border-dashed border-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Print style */}
            <style>{`
              @media print {
                @page { size: A4; margin: 12mm; }
                body * { visibility: hidden; }
                #purchase-invoice-print-area, #purchase-invoice-print-area * { visibility: visible; }
                #purchase-invoice-print-area { position: absolute; inset: 0; }
              }
            `}</style>
          </div>
        );
      })()}
    </div>
  );
};
