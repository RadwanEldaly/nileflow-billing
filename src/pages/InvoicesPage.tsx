import React, { useState } from 'react';
import { Customer, Product, Invoice, InvoiceItem } from '../types';
import {
  Search,
  Plus,
  Receipt,
  Printer,
  Trash2,
  Calendar,
  User,
  DollarSign,
  X,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface InvoicesPageProps {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  language: 'ar' | 'en';
  onCreateInvoice: (invoice: Omit<Invoice, 'id' | 'created_at'>) => void;
  isCreateOpenInitially?: boolean;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({
  invoices,
  customers,
  products,
  language,
  onCreateInvoice,
  isCreateOpenInitially = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(isCreateOpenInitially);

  // New Invoice Generator State
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDiscount, setNewDiscount] = useState('0');
  const [newNotes, setNewNotes] = useState('');

  const [lineItems, setLineItems] = useState<
    { productId: string; quantity: number; unitPrice: number; lineTotal: number }[]
  >([]);

  // Add line item
  const handleAddLineItem = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setLineItems([
      ...lineItems,
      {
        productId: defaultProduct.id,
        quantity: 1,
        unitPrice: defaultProduct.current_price,
        lineTotal: defaultProduct.current_price,
      },
    ]);
  };

  const handleProductChange = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;
    const updated = [...lineItems];
    updated[index].productId = prodId;
    updated[index].unitPrice = prod.current_price;
    updated[index].lineTotal = updated[index].quantity * prod.current_price;
    setLineItems(updated);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = qty > 0 ? qty : 1;
    const updated = [...lineItems];
    updated[index].quantity = validQty;
    updated[index].lineTotal = validQty * updated[index].unitPrice;
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const discountVal = parseFloat(newDiscount) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) {
      alert(language === 'ar' ? 'برجاء اختيار العميل' : 'Please select a customer');
      return;
    }
    if (lineItems.length === 0) {
      alert(language === 'ar' ? 'برجاء إضافة منتج واحد على الأقل' : 'Please add at least one line item');
      return;
    }

    const nextNumberSeq = invoices.length + 1;
    const yearStr = new Date().getFullYear();
    const formattedNum = `NF-${yearStr}-${String(nextNumberSeq).padStart(4, '0')}`;

    const preparedItems: InvoiceItem[] = lineItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const detailsStr = prod ? `${prod.weight || ''} ${prod.unit}`.trim() : '';
      return {
        id: crypto.randomUUID(),
        invoice_id: '',
        product_id: item.productId,
        product_name_snapshot: prod ? prod.name : 'منتج محذوف',
        product_details_snapshot: detailsStr,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: 0,
        line_total: item.lineTotal,
      };
    });

    onCreateInvoice({
      invoice_number: formattedNum,
      customer_id: newCustomerId,
      invoice_date: newInvoiceDate,
      status: 'completed',
      payment_method: 'cash',
      subtotal,
      discount: discountVal,
      total: grandTotal,
      notes: newNotes,
      items: preparedItems,
    });

    // Reset Form
    setIsCreateModalOpen(false);
    setNewCustomerId('');
    setLineItems([]);
    setNewDiscount('0');
    setNewNotes('');
  };

  const filteredInvoices = invoices.filter((inv) => {
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
            {language === 'ar' ? 'إدارة فواتير المبيعات' : 'Sales Invoices Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'توليد الفواتير، الحفاظ الدائم على الأسعار التاريخية، والطباعة فورية'
              : 'Create sales invoices, lock immutable past prices, and export receipts.'}
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (lineItems.length === 0 && products.length > 0) {
              handleAddLineItem();
            }
          }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'Search invoice number or customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {customers.length > 0 && (
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{language === 'ar' ? 'جميع العملاء' : 'All Customers'}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'اسم العميل' : 'Customer'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</th>
                  <th className="px-6 py-3.5">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-6 py-3.5 text-center">{language === 'ar' ? 'عرض الفاتورة' : 'View'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {cust?.name || inv.customer?.name || 'عميل محذوف'}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {language === 'ar' ? 'نقداً (Cash)' : 'Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                        {inv.total.toLocaleString()} EGP
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedInvoiceForView(inv)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'معاينة / طباعة' : 'View / Print'}</span>
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
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد فواتير' : 'No invoices found'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Create Invoice */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'إنشاء فاتورة مبيعات جديدة' : 'New Sales Invoice'}
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              {/* Top Meta Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'اختيار العميل *' : 'Select Customer *'}
                  </label>
                  <select
                    required
                    value={newCustomerId}
                    onChange={(e) => setNewCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="">{language === 'ar' ? '-- اختر العميل --' : '-- Select Customer --'}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'تاريخ الفاتورة' : 'Invoice Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newInvoiceDate}
                    onChange={(e) => setNewInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                  </label>
                  <div className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold">
                    {language === 'ar' ? 'نقداً (Cash EGP)' : 'Cash (EGP)'}
                  </div>
                </div>
              </div>

              {/* Line Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'بنود الفاتورة والمنتجات' : 'Invoice Products'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? '+ إضافة صنف' : '+ Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.weight || ''} {p.unit}) - {p.current_price} EGP
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-24 text-left font-mono font-bold text-xs text-blue-600">
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

              {/* Total Calculation Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{subtotal.toLocaleString()} EGP</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{language === 'ar' ? 'خصم إضافي (جنيه):' : 'Discount (EGP):'}</span>
                  <input
                    type="number"
                    min="0"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-right font-bold"
                  />
                </div>

                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>{language === 'ar' ? 'إجمالي الفاتورة النهائي:' : 'Final Invoice Total:'}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{grandTotal.toLocaleString()} EGP</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                >
                  {language === 'ar' ? 'حفظ وإصدار الفاتورة' : 'Save & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Printable Invoice Modal */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 dark:border-slate-700 print:m-0 print:p-0">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-700 print:hidden">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice'} #{selectedInvoiceForView.invoice_number}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
                </button>
                <button onClick={() => setSelectedInvoiceForView(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="space-y-4">
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">نايل فلو للمبيعات والتوريدات</h2>
                <p className="text-xs text-slate-500">متخصصون في ثنر ونفض وجميع أنواع المذيبات</p>
                <div className="text-xs font-mono font-bold mt-2 text-blue-600">
                  رقم الفاتورة: {selectedInvoiceForView.invoice_number}
                </div>
              </div>

              <div className="grid grid-cols-2 text-xs gap-2 text-slate-600">
                <div>
                  <span className="font-bold">العميل:</span>{' '}
                  {customers.find((c) => c.id === selectedInvoiceForView.customer_id)?.name || 'عميل'}
                </div>
                <div>
                  <span className="font-bold">التاريخ:</span> {selectedInvoiceForView.invoice_date}
                </div>
                <div>
                  <span className="font-bold">طريقة الدفع:</span> نقداً (Cash)
                </div>
              </div>

              <table className="w-full text-xs text-right border border-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">الصنف</th>
                    <th className="p-2 border">الكمية</th>
                    <th className="p-2 border">سعر الوحدة</th>
                    <th className="p-2 border">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoiceForView.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 border font-bold">{item.product_name_snapshot} ({item.product_details_snapshot})</td>
                      <td className="p-2 border text-center">{item.quantity}</td>
                      <td className="p-2 border font-mono">{item.unit_price} EGP</td>
                      <td className="p-2 border font-mono font-bold">{item.line_total} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-left font-bold text-sm text-slate-900 pt-2 border-t">
                إجمالي الفاتورة: {selectedInvoiceForView.total.toLocaleString()} ج.م
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
