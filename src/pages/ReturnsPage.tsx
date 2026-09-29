import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  Calendar,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ShoppingBag,
  Trash2,
  Eye,
  Layers,
  Banknote,
  Boxes,
} from 'lucide-react';
import {
  SalesInvoice,
  PurchaseInvoice,
  Customer,
  Supplier,
  Product,
  Warehouse,
} from '../types';
import { amountToArabicWords } from '../lib/numberToArabicWords';

interface ReturnsPageProps {
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  warehouses: Warehouse[];
  language: 'ar' | 'en';
  onCreateSalesReturn: (returnData: {
    customerId: string;
    warehouseId: string;
    originalInvoiceNumber?: string;
    items: {
      productId?: string;
      productName: string;
      woodType?: string;
      quantitySheets: number;
      unitPrice: number;
      lineTotal: number;
    }[];
    total: number;
    refundMethod: 'credit' | 'cash';
    notes?: string;
  }) => Promise<void>;
  onCreatePurchaseReturn: (returnData: {
    supplierId: string;
    warehouseId: string;
    originalInvoiceNumber?: string;
    items: {
      productId?: string;
      productName: string;
      woodType?: string;
      quantitySheets: number;
      unitPrice: number;
      lineTotal: number;
    }[];
    total: number;
    refundMethod: 'credit' | 'cash';
    notes?: string;
  }) => Promise<void>;
  onDeleteInvoice: (id: string, type: 'sales' | 'purchase') => Promise<void>;
}

export const ReturnsPage: React.FC<ReturnsPageProps> = ({
  salesInvoices,
  purchaseInvoices,
  customers,
  suppliers,
  products,
  warehouses,
  language,
  onCreateSalesReturn,
  onCreatePurchaseReturn,
  onDeleteInvoice,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'purchases'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<{
    invoice: SalesInvoice | PurchaseInvoice;
    type: 'sales' | 'purchase';
  } | null>(null);

  // Form State for Creating Return
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedOriginalInvoiceId, setSelectedOriginalInvoiceId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [refundMethod, setRefundMethod] = useState<'credit' | 'cash'>('credit');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItems, setReturnItems] = useState<
    {
      productId: string;
      productName: string;
      woodType: string;
      quantitySheets: number;
      unitPrice: number;
      lineTotal: number;
    }[]
  >([]);

  // Filter returns from the general invoice lists
  const salesReturns = useMemo(() => {
    return salesInvoices.filter(
      (inv) => inv.invoice_number.startsWith('RET-') || inv.notes?.includes('مرتجع')
    );
  }, [salesInvoices]);

  const purchaseReturns = useMemo(() => {
    return purchaseInvoices.filter(
      (inv) => inv.invoice_number.startsWith('RET-') || inv.notes?.includes('مرتجع')
    );
  }, [purchaseInvoices]);

  // Current list based on active tab
  const currentList = activeSubTab === 'sales' ? salesReturns : purchaseReturns;

  const filteredReturns = useMemo(() => {
    return currentList.filter((item) => {
      const matchSearch =
        item.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchWh = selectedWarehouseFilter === 'all' || item.warehouse_id === selectedWarehouseFilter;
      return matchSearch && matchWh;
    });
  }, [currentList, searchTerm, selectedWarehouseFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalSalesRetVal = salesReturns.reduce((sum, r) => sum + r.total, 0);
    const totalPurchRetVal = purchaseReturns.reduce((sum, r) => sum + r.total, 0);
    const totalSheetsReturned = salesReturns.reduce((sum, r) => {
      const itemsCount = (r.items || []).reduce((acc, it) => acc + (it.quantity_sheets || 0), 0);
      return sum + itemsCount;
    }, 0);
    return {
      totalSalesRetCount: salesReturns.length,
      totalSalesRetVal,
      totalPurchRetCount: purchaseReturns.length,
      totalPurchRetVal,
      totalSheetsReturned,
    };
  }, [salesReturns, purchaseReturns]);

  // When picking an original sales invoice, auto-fill items
  const handleSelectOriginalInvoice = (invoiceId: string) => {
    setSelectedOriginalInvoiceId(invoiceId);
    if (!invoiceId) {
      setReturnItems([]);
      return;
    }

    if (activeSubTab === 'sales') {
      const original = salesInvoices.find((i) => i.id === invoiceId);
      if (original) {
        setSelectedPartyId(original.customer_id);
        setSelectedWarehouseId(original.warehouse_id);
        if (original.items && original.items.length > 0) {
          setReturnItems(
            original.items.map((it) => ({
              productId: it.product_id || '',
              productName: it.product_name_snapshot,
              woodType: it.wood_type_snapshot || 'MDF',
              quantitySheets: it.quantity_sheets,
              unitPrice: it.unit_price,
              lineTotal: it.line_total,
            }))
          );
        }
      }
    } else {
      const original = purchaseInvoices.find((i) => i.id === invoiceId);
      if (original) {
        setSelectedPartyId(original.supplier_id);
        setSelectedWarehouseId(original.warehouse_id);
        if (original.items && original.items.length > 0) {
          setReturnItems(
            original.items.map((it) => ({
              productId: it.product_id || '',
              productName: it.product_name_snapshot,
              woodType: it.wood_type_snapshot || 'MDF',
              quantitySheets: it.quantity_sheets,
              unitPrice: it.unit_price,
              lineTotal: it.line_total,
            }))
          );
        }
      }
    }
  };

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setReturnItems([
      ...returnItems,
      {
        productId: prod.id,
        productName: prod.name,
        woodType: prod.wood_type,
        quantitySheets: 1,
        unitPrice: prod.selling_price || 0,
        lineTotal: prod.selling_price || 0,
      },
    ]);
  };

  const handleUpdateItemQty = (index: number, qty: number) => {
    const updated = [...returnItems];
    updated[index].quantitySheets = Math.max(1, qty);
    updated[index].lineTotal = updated[index].quantitySheets * updated[index].unitPrice;
    setReturnItems(updated);
  };

  const handleUpdateItemPrice = (index: number, price: number) => {
    const updated = [...returnItems];
    updated[index].unitPrice = Math.max(0, price);
    updated[index].lineTotal = updated[index].quantitySheets * updated[index].unitPrice;
    setReturnItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const returnTotal = returnItems.reduce((acc, it) => acc + it.lineTotal, 0);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) {
      alert(language === 'ar' ? 'يرجى اختيار العميل أو المورد' : 'Please select customer or supplier');
      return;
    }
    if (returnItems.length === 0) {
      alert(language === 'ar' ? 'يرجى إضافة صنف واحد على الأقل للمرتجع' : 'Please add at least one item');
      return;
    }

    const originalInv =
      activeSubTab === 'sales'
        ? salesInvoices.find((i) => i.id === selectedOriginalInvoiceId)
        : purchaseInvoices.find((i) => i.id === selectedOriginalInvoiceId);

    if (activeSubTab === 'sales') {
      await onCreateSalesReturn({
        customerId: selectedPartyId,
        warehouseId: selectedWarehouseId || warehouses[0]?.id,
        originalInvoiceNumber: originalInv?.invoice_number,
        items: returnItems,
        total: returnTotal,
        refundMethod,
        notes: returnNotes,
      });
    } else {
      await onCreatePurchaseReturn({
        supplierId: selectedPartyId,
        warehouseId: selectedWarehouseId || warehouses[0]?.id,
        originalInvoiceNumber: originalInv?.invoice_number,
        items: returnItems,
        total: returnTotal,
        refundMethod,
        notes: returnNotes,
      });
    }

    setIsCreateModalOpen(false);
    // Reset Form
    setSelectedPartyId('');
    setSelectedOriginalInvoiceId('');
    setReturnItems([]);
    setReturnNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-400" />
            <span>{language === 'ar' ? 'إدارة مرتجعات الألواح الخشبية' : 'Returns Management'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'توثيق مرتجعات المبيعات (إشعارات دائن) ومرتجعات التوريد والمشتريات وإعادة الألواح للمخزن آلياً'
              : 'Record customer returns & supplier returns with automatic stock replenishment.'}
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedPartyId('');
            setSelectedOriginalInvoiceId('');
            setReturnItems([]);
            setReturnNotes('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeSubTab === 'sales'
              ? language === 'ar'
                ? '+ إنشاء مرتجع مبيعات (إشعار دائن)'
                : '+ New Sales Return'
              : language === 'ar'
              ? '+ إنشاء مرتجع مشتريات للمورد'
              : '+ New Purchase Return'}
          </span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 rtl:sm:divide-x-reverse overflow-hidden shadow-xs">
        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">مرتجعات المبيعات</div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {metrics.totalSalesRetCount}{' '}
              <span className="text-xs font-normal text-slate-400">({metrics.totalSalesRetVal.toLocaleString()} ج.م)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">مرتجعات المشتريات</div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {metrics.totalPurchRetCount}{' '}
              <span className="text-xs font-normal text-slate-400">({metrics.totalPurchRetVal.toLocaleString()} ج.م)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">ألواح معادة للمخزن</div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {metrics.totalSheetsReturned.toLocaleString()} <span className="text-xs font-normal text-slate-400">لوح</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">المخازن المتاحة</div>
            <div className="text-lg font-bold font-mono text-slate-100">
              {warehouses.length} <span className="text-xs font-normal text-slate-400">مستودع</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Sales Returns vs Purchase Returns */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveSubTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeSubTab === 'sales'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>مرتجعات المبيعات (العملاء)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {salesReturns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('purchases')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeSubTab === 'purchases'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>مرتجعات المشتريات (الموردين)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {purchaseReturns.length}
          </span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'sales'
                ? 'بحث برقم المرتجع أو اسم العميل أو الملاحظات...'
                : 'بحث برقم المرتجع أو اسم المورد أو الملاحظات...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-9 pl-4 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-rose-500 transition"
          />
        </div>

        <select
          value={selectedWarehouseFilter}
          onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-rose-500"
        >
          <option value="all">كل المخازن</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Returns Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 select-none">
              <tr>
                <th className="py-3 px-4 font-bold">رقم الإشعار / المرتجع</th>
                <th className="py-3 px-4 font-bold">التاريخ</th>
                <th className="py-3 px-4 font-bold">
                  {activeSubTab === 'sales' ? 'العميل' : 'المورد'}
                </th>
                <th className="py-3 px-4 font-bold">المخزن المستلم</th>
                <th className="py-3 px-4 font-bold">الألواح المعادة</th>
                <th className="py-3 px-4 font-bold">إجمالي المرتجع</th>
                <th className="py-3 px-4 font-bold">الملاحظات</th>
                <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30 text-rose-400" />
                    <p className="text-xs">
                      {activeSubTab === 'sales'
                        ? 'لا توجد فواتير مرتجع مبيعات مسجلة حالياً'
                        : 'لا توجد فواتير مرتجع مشتريات مسجلة حالياً'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((item) => {
                  const partyName =
                    activeSubTab === 'sales'
                      ? customers.find((c) => c.id === (item as SalesInvoice).customer_id)?.name || 'عميل'
                      : suppliers.find((s) => s.id === (item as PurchaseInvoice).supplier_id)?.name || 'مورد';
                  const whName = warehouses.find((w) => w.id === item.warehouse_id)?.name || 'المخزن الرئيسي';
                  const totalSheets = (item.items || []).reduce(
                    (acc, it) => acc + (it.quantity_sheets || 0),
                    0
                  );

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4 font-mono font-black text-rose-400 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                        <span>{item.invoice_number}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{item.invoice_date}</td>
                      <td className="py-3 px-4 font-bold text-white">{partyName}</td>
                      <td className="py-3 px-4 text-slate-400">{whName}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {totalSheets}{' '}
                        <span className="text-[11px] font-normal text-slate-400">لوح</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-400">
                        {item.total.toLocaleString()} ج.م
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{item.notes || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() =>
                              setSelectedInvoiceForView({
                                invoice: item,
                                type: activeSubTab,
                              })
                            }
                            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700/60 transition"
                            title="عرض وطباعة إشعار المرتجع"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('هل أنت متأكد من حذف هذا المرتجع؟')) {
                                await onDeleteInvoice(item.id, activeSubTab);
                              }
                            }}
                            className="p-1.5 rounded-md bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RETURN MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f172a] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 sticky top-0 bg-[#0f172a] z-10">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span>
                  {activeSubTab === 'sales'
                    ? 'تسجيل مرتجع مبيعات جديد (إشعار دائن)'
                    : 'تسجيل مرتجع مشتريات جديد للمورد'}
                </span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              {/* Party selection & Optional Original Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    {activeSubTab === 'sales' ? 'العميل *' : 'المورد / المصنع *'}
                  </label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="">
                      {activeSubTab === 'sales' ? 'اختر العميل...' : 'اختر المورد...'}
                    </option>
                    {(activeSubTab === 'sales' ? customers : suppliers).map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name} ({party.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    ربط بفاتورة سابقة (اختياري)
                  </label>
                  <select
                    value={selectedOriginalInvoiceId}
                    onChange={(e) => handleSelectOriginalInvoice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="">بدون ربط (إدخال يدوي)</option>
                    {(activeSubTab === 'sales' ? salesInvoices : purchaseInvoices)
                      .filter((i) => !i.invoice_number.startsWith('RET-'))
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} ({inv.invoice_date}) - {inv.total.toLocaleString()} ج.م
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Warehouse & Settlement Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">المخزن المستلم للألواح *</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">طريقة تسوية قيمة المرتجع *</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
                  >
                    <option value="credit">
                      {activeSubTab === 'sales'
                        ? 'إشعار دائن (خصم من مديونية وحساب العميل)'
                        : 'خصم من رصيد ومستحقات المورد'}
                    </option>
                    <option value="cash">رد المبلغ نقداً من الخزينة</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>الأصناف المسترجعة ({returnItems.length})</span>
                  </span>

                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItem(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300"
                  >
                    <option value="">+ إضافة صنف يدوي...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {returnItems.length === 0 ? (
                  <p className="text-center py-4 text-slate-500 text-xs">
                    اختر فاتورة سابقة أعلاه لجلب الأصناف تلقائياً، أو أضف أصناف من القائمة.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {returnItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-xs"
                      >
                        <div className="min-w-[160px] flex-1">
                          <span className="font-black text-slate-100">{item.productName}</span>
                          <span className="text-[10px] text-slate-400 block">{item.woodType}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-slate-400 text-[10px]">الكمية (ألواح):</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantitySheets}
                            onChange={(e) => handleUpdateItemQty(idx, parseFloat(e.target.value) || 1)}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-slate-100"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-slate-400 text-[10px]">سعر الإرجاع:</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-slate-100"
                          />
                        </div>

                        <div className="w-24 text-left font-mono font-bold text-emerald-400">
                          {item.lineTotal.toLocaleString()} ج.م
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 px-2 font-bold">
                      <span className="text-slate-300">إجمالي قيمة المرتجع:</span>
                      <span className="text-base font-mono font-black text-emerald-400">
                        {returnTotal.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ملاحظات / سبب المرتجع</label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="سبب الإرجاع، كسر، عيب مصنعي، مقاس مختلف، إلخ..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition shadow-sm"
                >
                  حفظ وتأكيد المرتجع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW & PRINT RETURN INVOICE MODAL (Bank Deposit Style) */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#0f172a] rounded-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 bg-[#0a0f1d] sticky top-0 z-10 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-200">
                  {selectedInvoiceForView.type === 'sales'
                    ? 'إشعار مرتجع مبيعات (إشعار دائن)'
                    : 'إشعار مرتجع شراء أخشاب'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الإشعار</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceForView(null)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Sheet */}
            <div className="p-6 bg-white text-slate-950 print:p-0">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Header with Company Details */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                  <div className="text-right">
                    <h1 className="text-xl font-black text-slate-950">شركة الدالي لتجارة الأخشاب والقشرة</h1>
                    <p className="text-xs text-slate-700 mt-1 font-semibold">
                      العنوان: البدرشين - طريق أبوربع | ت: 01001911745 - 01119596070
                    </p>
                  </div>
                  <img
                    src="/logo.png"
                    alt="شعار شركة الدالي"
                    className="w-16 h-16 object-contain rounded-full border border-amber-600 shadow-xs"
                  />
                </div>

                {/* Document Title Banner */}
                <div className="text-center py-1 bg-rose-50 border border-rose-300 rounded font-black text-sm text-rose-900">
                  {selectedInvoiceForView.type === 'sales'
                    ? 'إشعار مرتجع مبيعات (إشعار دائن للعميل)'
                    : 'إشعار مرتجع شراء أخشاب (إشعار مدين للمورد)'}
                </div>

                {/* Metadata Boxes (Customer on the RIGHT, Details on the LEFT) */}
                <div className="flex justify-between items-start gap-4 text-xs">
                  {/* Right box: Customer/Supplier */}
                  <div className="p-2 border border-slate-800 rounded bg-slate-50 min-w-[240px]">
                    <div className="font-bold text-slate-900 border-b border-slate-300 pb-1 mb-1">
                      {selectedInvoiceForView.type === 'sales' ? 'بيانات العميل:' : 'بيانات المورد:'}
                    </div>
                    {selectedInvoiceForView.type === 'sales' ? (
                      (() => {
                        const cust = customers.find(
                          (c) => c.id === (selectedInvoiceForView.invoice as SalesInvoice).customer_id
                        );
                        return (
                          <div className="space-y-0.5 text-slate-800">
                            <div>الاسم: <span className="font-bold">{cust?.name || 'عميل'}</span></div>
                            <div>الكود: <span className="font-mono">{cust?.code || '—'}</span></div>
                            <div>التليفون: <span className="font-mono">{cust?.mobile || '—'}</span></div>
                            <div>العنوان: <span>{cust?.address || 'البدرشين'}</span></div>
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const sup = suppliers.find(
                          (s) => s.id === (selectedInvoiceForView.invoice as PurchaseInvoice).supplier_id
                        );
                        return (
                          <div className="space-y-0.5 text-slate-800">
                            <div>الاسم: <span className="font-bold">{sup?.name || 'مورد'}</span></div>
                            <div>الكود: <span className="font-mono">{sup?.code || '—'}</span></div>
                            <div>التليفون: <span className="font-mono">{sup?.mobile || '—'}</span></div>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Left box: Invoice numbers & date */}
                  <div className="p-2 border border-slate-800 rounded bg-slate-50 min-w-[200px] text-left">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">رقم الإشعار:</span>
                        <span className="font-mono font-black text-rose-700">
                          {selectedInvoiceForView.invoice.invoice_number}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">تاريخ الإشعار:</span>
                        <span className="font-mono font-bold">
                          {selectedInvoiceForView.invoice.invoice_date}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-right text-xs border border-slate-900 border-collapse">
                  <thead className="bg-slate-200 text-slate-950 font-black border-b border-slate-900">
                    <tr>
                      <th className="p-2 border border-slate-700 w-10 text-center">م</th>
                      <th className="p-2 border border-slate-700 w-[48%]">بيان الصنف المعـاد</th>
                      <th className="p-2 border border-slate-700 text-center">الوحدة</th>
                      <th className="p-2 border border-slate-700 text-center">الكمية</th>
                      <th className="p-2 border border-slate-700 text-center">سعر اللوح</th>
                      <th className="p-2 border border-slate-700 text-center">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoiceForView.invoice.items || []).map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-700 text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border border-slate-700 font-black text-slate-950">
                          {it.product_name_snapshot}
                        </td>
                        <td className="p-2 border border-slate-700 text-center">لوح</td>
                        <td className="p-2 border border-slate-700 text-center font-mono font-bold">
                          {it.quantity_sheets}
                        </td>
                        <td className="p-2 border border-slate-700 text-center font-mono font-bold">
                          {it.unit_price.toLocaleString()}
                        </td>
                        <td className="p-2 border border-slate-700 text-center font-mono font-black">
                          {it.line_total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Bank-Style Full Width Horizontal Bar with Arabic Words */}
                <div className="border border-slate-800 rounded bg-slate-50 p-2 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-slate-900 text-sm">المبلغ بالحروف:</span>
                    <span className="font-black text-slate-950 text-sm bg-rose-100/70 px-2.5 py-0.5 rounded border border-rose-300">
                      {amountToArabicWords(selectedInvoiceForView.invoice.total)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-1 bg-white border border-slate-300 rounded">
                      <div className="text-[10px] font-bold text-slate-600">إجمالي المرتجع</div>
                      <div className="font-mono font-black text-rose-700 text-sm">
                        {selectedInvoiceForView.invoice.total.toLocaleString()} ج.م
                      </div>
                    </div>
                    <div className="p-1 bg-white border border-slate-300 rounded">
                      <div className="text-[10px] font-bold text-slate-600">تسوية الحساب</div>
                      <div className="font-bold text-slate-900 text-sm">
                        خصم من الرصيد (إشعار دائن)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs font-bold text-slate-900">
                  <div className="border-t border-slate-400 pt-1">أمين المخزن المستلم</div>
                  <div className="border-t border-slate-400 pt-1">
                    {selectedInvoiceForView.type === 'sales' ? 'توقيع العميل / المندوب' : 'توقيع المورد'}
                  </div>
                  <div className="border-t border-slate-400 pt-1">المحاسب المسؤول</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
