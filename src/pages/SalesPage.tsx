import React, { useState } from 'react';
import { Customer, Product, Warehouse, SalesInvoice, SalesInvoiceItem } from '../types';
import { Search, Plus, Receipt, Printer, Trash2, X, FileText, CheckCircle2, Edit3, ArrowUpRight, Check, AlertCircle } from 'lucide-react';
import { amountToArabicWords } from '../lib/numberToArabicWords';

interface SalesPageProps {
  salesInvoices: SalesInvoice[];
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  language: 'ar' | 'en';
  onCreateInvoice: (invoice: Omit<SalesInvoice, 'id' | 'created_at'>) => void;
  onUpdateInvoice: (invoiceId: string, invoice: Omit<SalesInvoice, 'id' | 'created_at'>) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  isCreateOpenInitially?: boolean;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  salesInvoices,
  customers,
  products,
  warehouses,
  language,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  isCreateOpenInitially = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<SalesInvoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(isCreateOpenInitially);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  
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
  
  // Fast product search input for invoice creation
  const [productQuery, setProductQuery] = useState('');

  React.useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const firstProd = products[0];
    setLineItems([
      ...lineItems,
      {
        productId: firstProd.id,
        quantity: 1,
        unitPrice: firstProd.selling_price || 100,
        lineTotal: 1 * (firstProd.selling_price || 100),
      },
    ]);
  };

  const handleAddProductToInvoice = (prod: Product) => {
    const existingIndex = lineItems.findIndex((item) => item.productId === prod.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, lineItems[existingIndex].quantity + 1);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.selling_price || 100,
          lineTotal: 1 * (prod.selling_price || 100),
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

    const nextNumberSeq = salesInvoices.length + 1;
    const yearStr = new Date().getFullYear();
    const formattedNum = `INV-WOOD-${yearStr}-${String(nextNumberSeq).padStart(4, '0')}`;

    const itemsPrepared: SalesInvoiceItem[] = lineItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      return {
        id: crypto.randomUUID(),
        invoice_id: '',
        product_id: item.productId,
        product_name_snapshot: prod ? prod.name : 'لوح خشب',
        wood_type_snapshot: prod ? prod.wood_type : 'ألواح',
        quantity_sheets: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      };
    });

    const finalWarehouseId = warehouseId || warehouses[0]?.id;
    if (!finalWarehouseId) {
      alert('برجاء اختيار المخزن');
      return;
    }

    if (editingInvoiceId) {
      onUpdateInvoice(editingInvoiceId, {
        invoice_number: salesInvoices.find(i => i.id === editingInvoiceId)?.invoice_number || formattedNum,
        customer_id: customerId,
        warehouse_id: finalWarehouseId,
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
    } else {
      onCreateInvoice({
        invoice_number: formattedNum,
        customer_id: customerId,
        warehouse_id: finalWarehouseId,
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
    }

    setIsCreateModalOpen(false);
    setEditingInvoiceId(null);
    setCustomerId('');
    setLineItems([]);
    setPaidAmountInput('');
    setDiscountInput('0');
    setNotes('');
    setProductQuery('');
  };

  const handleEditClick = (invoice: SalesInvoice) => {
    setEditingInvoiceId(invoice.id);
    setCustomerId(invoice.customer_id);
    setWarehouseId(invoice.warehouse_id);
    setInvoiceDate(invoice.invoice_date);
    setDiscountInput(String(invoice.discount));
    setPaidAmountInput(String(invoice.paid_amount));
    setNotes(invoice.notes || '');
    
    if (invoice.items) {
      const existingLineItems = invoice.items.map(item => ({
        productId: item.product_id || '',
        quantity: item.quantity_sheets,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      }));
      setLineItems(existingLineItems);
    }
    
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingInvoiceId(null);
    setCustomerId('');
    setLineItems([]);
    setPaidAmountInput('');
    setDiscountInput('0');
    setNotes('');
    setProductQuery('');
  };

  // Filter products for fast autocomplete search
  const filteredProducts = productQuery.trim() === '' 
    ? [] 
    : products.filter(p => 
        p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(productQuery.toLowerCase()) ||
        p.wood_type.toLowerCase().includes(productQuery.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(productQuery.toLowerCase()))
      ).slice(0, 15);

  const filteredInvoices = salesInvoices
    .filter((inv) => !inv.invoice_number.startsWith('RET-'))
    .filter((inv) => {
      const cust = customers.find((c) => c.id === inv.customer_id);
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCust = selectedCustomerId === 'all' || inv.customer_id === selectedCustomerId;
      return matchesSearch && matchesCust;
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'فواتير مبيعات الأخشاب' : 'Wood Sales Invoices'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
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
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إصدار فاتورة بيع جديدة' : 'New Sales Invoice'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800/80 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'Search invoice # or customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/70"
          />
        </div>

        {customers.length > 0 && (
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500/70"
          >
            <option value="all">جميع العملاء ({customers.length})</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Invoices List Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">رقم الفاتورة</th>
                  <th className="px-4 py-3">العميل</th>
                  <th className="px-4 py-3">التاريخ</th>
                  <th className="px-4 py-3 text-left">إجمالي الفاتورة</th>
                  <th className="px-4 py-3 text-left">المدفوع</th>
                  <th className="px-4 py-3 text-left">المتبقي (دين)</th>
                  <th className="px-4 py-3 text-center">المعاينة</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400 text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-3 font-medium text-slate-100 text-xs">
                        {cust?.name || 'عميل'}
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]">{inv.invoice_date}</td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-bold text-slate-100 text-xs">
                        {inv.total.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ج.م</span>
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-semibold text-emerald-400 text-xs">
                        {inv.paid_amount.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600">ج.م</span>
                      </td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-semibold text-xs">
                        {inv.remaining_balance > 0 ? (
                          <span className="text-rose-400">
                            {inv.remaining_balance.toLocaleString()} <span className="text-[10px] font-normal text-rose-500">ج.م</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold">0 ج.م (خالص)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded text-[11px] font-medium transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>عرض الفاتورة</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(inv)}
                            title="تعديل الفاتورة"
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const confirmed = window.confirm(
                                `متأكد إنك تريد حذف فاتورة "${inv.invoice_number}" نهائيًا؟ سيتم استرجاع رصيد الألواح المباعة للمخزون، وتحديث كشف حساب العميل.`
                              );
                              if (confirmed) onDeleteInvoice(inv.id);
                            }}
                            title="حذف الفاتورة"
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
            <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2.5 stroke-[1.5]" />
            <p className="font-semibold text-slate-300 text-sm">
              {language === 'ar' ? 'لا يوجد فواتير مبيعات مسجلة' : 'No sales invoices found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Create/Edit Sales Invoice — HIGH-END SPACIOUS MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-700/80 max-h-[94vh] flex flex-col text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  {editingInvoiceId ? 'تعديل فاتورة بيع أخشاب' : 'إصدار فاتورة بيع أخشاب جديدة — شركة الدالي'}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Client & Metadata Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#0b0f19] rounded-lg border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    اختر العميل *
                  </label>
                  <select
                    required
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141c2e] border border-slate-700 rounded-md text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile || '-'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    المخزن المصدر *
                  </label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141c2e] border border-slate-700 rounded-md text-xs font-medium text-white focus:outline-none focus:border-amber-500"
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
                    تاريخ الفاتورة *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#141c2e] border border-slate-700 rounded-md text-xs font-mono font-medium text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* DEDICATED PROMINENT PRODUCT SEARCH & QUICK-ADD BAR (Never clipped) */}
              <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-amber-400" />
                    <span>بحث سريع وإضافة أصناف الألواح الخشبية للفاتورة</span>
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
                      placeholder="ابحث بالاسم (مثال: جوود وود، أرو، MDF، كونتر) أو الكود (مثال: WOOD-1728)..."
                      className="w-full pr-10 pl-8 py-2.5 bg-[#141c2e] border-2 border-slate-700 focus:border-amber-500 rounded-lg text-sm font-semibold text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
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

                  {/* Floating Dropdown Results Card - Spacious, High-Contrast, Never Clipped */}
                  {productQuery.trim() !== '' && (
                    <div className="absolute z-50 mt-1.5 w-full bg-[#111827] border-2 border-amber-500/70 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-800">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((prod) => {
                          const inCart = lineItems.find((it) => it.productId === prod.id);
                          const isOutOfStock = (prod.stock_quantity || 0) <= 0;
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleAddProductToInvoice(prod)}
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
                                  {inCart && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      مضاف للفاتورة ({inCart.quantity} لوح)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span className={isOutOfStock ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                                    {isOutOfStock ? 'رصيد المخزن: 0 لوح (نفد)' : `رصيد المخزن: ${prod.stock_quantity} لوح`}
                                  </span>
                                  {prod.category && <span>• {prod.category}</span>}
                                  {prod.notes && <span>• {prod.notes}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-left font-mono tabular-nums">
                                  <div className="text-sm font-bold text-amber-400">
                                    {prod.selling_price.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">سعر البيع / لوح</div>
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
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-slate-400">
                          <p className="text-sm font-semibold text-slate-200">
                            لم يتم العثور على ألواح تطابق بحثك: "{productQuery}"
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            تأكد من كتابة الاسم أو الكود بشكل صحيح، أو استخدم زر "إضافة صنف فارغ" بالأسفل
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items Table (Spacious & Clean) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200">
                    الألواح المدرجة في الفاتورة ({lineItems.length})
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
                          <th className="px-3 py-2.5 text-center w-32">سعر اللوح (ج.م)</th>
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
                                <div className="space-y-1">
                                  <select
                                    value={item.productId}
                                    onChange={(e) => handleProductChange(idx, e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-[#141c2e] border border-slate-700 rounded-md text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                                  >
                                    {products.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} ({p.wood_type}) — رصيد: {p.stock_quantity} لوح — سعر: {p.selling_price} ج.م
                                      </option>
                                    ))}
                                  </select>
                                  {selectedProd && (
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                      <span className="font-mono text-amber-400">كود: {selectedProd.code}</span>
                                      <span>•</span>
                                      <span className={(selectedProd.stock_quantity || 0) <= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                                        المتوفر بالمخزن: {selectedProd.stock_quantity} لوح
                                      </span>
                                    </div>
                                  )}
                                </div>
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
                                  <Trash2 className="w-4 h-4" />
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
                    <p className="text-[11px] text-slate-500 mt-1">
                      استخدم شريط البحث أعلاه لكتابة اسم اللوح أو كوده وإضافته مباشرة بنقرة واحدة
                    </p>
                  </div>
                )}
              </div>

              {/* Total Calculation Section */}
              <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                  <span className="text-slate-400">المجموع الفرعي للألواح:</span>
                  <span className="font-mono font-bold text-slate-200 text-sm tabular-nums">
                    {subtotal.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      الخصم المباشر (جنيه)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#141c2e] border border-slate-700 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      المبلغ المدفوع كاش (جنيه)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`تلقائي: ${grandTotal}`}
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#141c2e] border border-slate-700 rounded text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      المتبقي كدين على العميل
                    </label>
                    <div className="px-2.5 py-1.5 bg-[#141c2e] border border-slate-700/80 rounded text-xs font-mono tabular-nums font-bold text-rose-400">
                      {remainingVal.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-200">صافي إجمالي الفاتورة:</span>
                  <span className="font-mono text-lg font-black text-amber-400 tabular-nums">
                    {grandTotal.toLocaleString()} <span className="text-xs font-medium text-slate-300">ج.م</span>
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  placeholder="ملاحظات تسليم، رقم سيارة الشحن، شروط خاصة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  {editingInvoiceId ? 'حفظ التعديلات' : 'اعتماد خصم المخزن وإصدار الفاتورة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Receipt Modal — Unified Premium Design System */}
      {selectedInvoiceForView && (() => {
        const cust = customers.find((c) => c.id === selectedInvoiceForView.customer_id);
        const items = selectedInvoiceForView.items || [];
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:static print:bg-transparent print:p-0">
            <div
              id="sales-invoice-print-area"
              className="bg-white text-slate-950 rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 print:m-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:border-0 print:rounded-none"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-200 print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    فاتورة مبيعات أخشاب #{selectedInvoiceForView.invoice_number}
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
              <div className="invoice-print-sheet text-slate-900 text-xs bg-white border border-slate-400 p-4 rounded-lg shadow-sm">
                {/* Company Header */}
                <div className="flex items-center justify-between border-b border-slate-400 pb-2 mb-2">
                  <div className="text-right">
                    <h2 className="text-xl font-black text-slate-950">شركة الدالي لتجارة الأخشاب والقشرة</h2>
                    <p className="text-[11px] text-slate-700 font-mono mt-0.5">
                      العنوان: البدرشين - طريق أبوربع | ت: 01001911745 - 01119596070
                    </p>
                  </div>
                  <img
                    src="/logo.png"
                    alt="شركة الدالي"
                    className="h-16 w-auto object-contain shrink-0"
                  />
                </div>

                <div className="text-center border-y border-slate-800 py-1 my-2 bg-slate-100">
                  <h1 className="text-sm font-black tracking-wide text-slate-900">بيان فاتورة بيع أخشاب</h1>
                </div>

                {/* Metadata & Customer Box - Customer on RIGHT, Invoice No on LEFT */}
                <div className="flex justify-between items-start gap-3 mb-2.5">
                  {/* Right: Customer Info Box */}
                  <div className="border border-slate-700 rounded text-xs p-2 bg-slate-50 text-right min-w-[240px] max-w-sm">
                    <div className="font-black text-slate-900 border-b border-slate-300 pb-1 mb-1">
                      بيانات العميل:
                    </div>
                    <div className="space-y-0.5">
                      <div><span className="font-bold text-slate-700">الاسم: </span><span className="font-black text-slate-950">{cust?.name || 'عميل نقدي'}</span></div>
                      {cust?.code && <div><span className="font-bold text-slate-700">الكود: </span><span className="font-mono font-bold text-slate-900">{cust.code}</span></div>}
                      {cust?.mobile && <div><span className="font-bold text-slate-700">التليفون: </span><span className="font-mono text-slate-900">{cust.mobile}</span></div>}
                      {cust?.address && <div><span className="font-bold text-slate-700">العنوان: </span><span className="text-slate-900">{cust.address}</span></div>}
                    </div>
                  </div>

                  {/* Left: Invoice Number & Date Box */}
                  <div className="border border-slate-700 rounded overflow-hidden text-xs w-52 shrink-0">
                    <div className="flex justify-between px-2.5 py-1 border-b border-slate-300 bg-slate-100">
                      <span className="font-bold text-slate-800">رقم الفاتورة:</span>
                      <span className="font-mono font-black text-slate-950">{selectedInvoiceForView.invoice_number}</span>
                    </div>
                    <div className="flex justify-between px-2.5 py-1 bg-white">
                      <span className="font-bold text-slate-800">تاريخ الفاتورة:</span>
                      <span className="font-mono font-bold text-slate-950">{selectedInvoiceForView.invoice_date}</span>
                    </div>
                  </div>
                </div>

                {/* Line Items Table - Widened and Clear Item Description */}
                <table className="w-full text-xs border-collapse border border-slate-800 mb-2">
                  <thead>
                    <tr className="bg-slate-200 text-slate-950 font-black text-[12px]">
                      <th className="border border-slate-700 py-1.5 px-1 text-center w-[6%]">م</th>
                      <th className="border border-slate-700 py-1.5 px-3 text-right w-[48%]">بيان الصنف</th>
                      <th className="border border-slate-700 py-1.5 px-1 text-center w-[10%]">الوحدة</th>
                      <th className="border border-slate-700 py-1.5 px-1 text-center w-[10%]">الكمية</th>
                      <th className="border border-slate-700 py-1.5 px-2 text-left w-[12%]">سعر اللوح</th>
                      <th className="border border-slate-700 py-1.5 px-2 text-left w-[14%]">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="border border-slate-400 py-1 px-1 text-center font-mono font-bold text-slate-800">{idx + 1}</td>
                        <td className="border border-slate-400 py-1 px-3 text-right font-black text-slate-950 text-sm leading-snug">
                          {item.product_name_snapshot}
                          {item.wood_type_snapshot ? (
                            <span className="text-xs font-bold text-slate-600 mr-1.5">({item.wood_type_snapshot})</span>
                          ) : ''}
                        </td>
                        <td className="border border-slate-400 py-1 px-1 text-center font-bold text-slate-800">لوح</td>
                        <td className="border border-slate-400 py-1 px-1 text-center font-mono font-black text-slate-950 text-sm">{item.quantity_sheets}</td>
                        <td className="border border-slate-400 py-1 px-2 text-left font-mono font-bold text-slate-900">{item.unit_price.toLocaleString()}</td>
                        <td className="border border-slate-400 py-1 px-2 text-left font-mono font-black text-slate-950 text-sm">{item.line_total.toLocaleString()}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border border-slate-400 py-3 text-center text-slate-400 font-bold">لا توجد أصناف</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Bank-Style Full Width Horizontal Tafqeet & Payment Bar */}
                <div className="border border-slate-800 rounded bg-slate-50 p-2 mb-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 pb-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">المبلغ بالحروف:</span>
                      <span className="font-black text-slate-950 text-sm bg-amber-100/70 px-2.5 py-0.5 rounded border border-amber-400">
                        {amountToArabicWords(selectedInvoiceForView.total)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Horizontal Financial Summary like Bank Deposit */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-1 bg-white border border-slate-300 rounded">
                      <div className="text-[10px] font-bold text-slate-600">إجمالي الفاتورة</div>
                      <div className="font-mono font-black text-slate-950 text-sm">{selectedInvoiceForView.subtotal.toLocaleString()} ج.م</div>
                    </div>
                    {selectedInvoiceForView.discount > 0 && (
                      <div className="p-1 bg-white border border-slate-300 rounded">
                        <div className="text-[10px] font-bold text-rose-600">قيمة الخصم</div>
                        <div className="font-mono font-black text-rose-700 text-sm">-{selectedInvoiceForView.discount.toLocaleString()} ج.م</div>
                      </div>
                    )}
                    <div className="p-1 bg-amber-50 border border-amber-400 rounded">
                      <div className="text-[10px] font-extrabold text-slate-800">صافي المطلوب</div>
                      <div className="font-mono font-black text-slate-950 text-sm">{selectedInvoiceForView.total.toLocaleString()} ج.م</div>
                    </div>
                    <div className="p-1 bg-emerald-50 border border-emerald-400 rounded">
                      <div className="text-[10px] font-extrabold text-emerald-800">المدفوع نقداً</div>
                      <div className="font-mono font-black text-emerald-700 text-sm">{selectedInvoiceForView.paid_amount.toLocaleString()} ج.م</div>
                    </div>
                    <div className="p-1 bg-rose-50 border border-rose-300 rounded">
                      <div className="text-[10px] font-extrabold text-rose-800">المتبقي (آجل)</div>
                      <div className="font-mono font-black text-rose-700 text-sm">{selectedInvoiceForView.remaining_balance.toLocaleString()} ج.م</div>
                    </div>
                  </div>

                  {selectedInvoiceForView.notes && (
                    <div className="text-[11px] text-slate-700 mt-1.5 pt-1.5 border-t border-slate-200">
                      <span className="font-bold">ملاحظات: </span>{selectedInvoiceForView.notes}
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="flex justify-between pt-4 mt-2 border-t border-slate-300 text-xs">
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-800 mb-5">أمين المخزن المسلِّم</div>
                    <div className="border-t border-dashed border-slate-500" />
                  </div>
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-800 mb-5">توقيع العميل المستلم</div>
                    <div className="border-t border-dashed border-slate-500" />
                  </div>
                  <div className="text-center w-36">
                    <div className="font-bold text-slate-800 mb-5">المحاسب المسؤول</div>
                    <div className="border-t border-dashed border-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Print style */}
            <style>{`
              @media print {
                @page { size: A4; margin: 12mm; }
                body * { visibility: hidden; }
                #sales-invoice-print-area, #sales-invoice-print-area * { visibility: visible; }
                #sales-invoice-print-area { position: absolute; inset: 0; }
              }
            `}</style>
          </div>
        );
      })()}
    </div>
  );
};