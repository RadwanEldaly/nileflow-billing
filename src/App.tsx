import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import {
  Customer,
  Supplier,
  Product,
  Warehouse,
  SalesInvoice,
  SalesInvoiceItem,
  PurchaseInvoice,
  StockMovement,
  FinancialTransaction,
} from './types';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ImportPage } from './pages/ImportPage';
import { ReportsPage } from './pages/ReportsPage';
import { BackupModal } from './components/BackupModal';

export function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [currentUser, setCurrentUser] = useState({ name: 'إدارة شركة الدالي (Admin)', role: 'admin' as const });
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nileflow_sidebar_open');
      if (saved !== null) return saved === 'true';
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('nileflow_sidebar_open', String(next));
      return next;
    });
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nileflow_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nileflow_auth');
    setIsAuthenticated(false);
  };

  // Application Central Data States
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Navigation modals triggers
  const [isSalesModalOpenInitially, setIsSalesModalOpenInitially] = useState(false);
  const [isPurchaseModalOpenInitially, setIsPurchaseModalOpenInitially] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Sync RTL / LTR document direction
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Initial Data Fetch from Supabase
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [whRes, custRes, supRes, prodRes, salesRes, purchRes, movRes, txRes] = await Promise.all([
        supabase.from('warehouses').select('*'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_invoices').select('*, items:sales_invoice_items(*)').order('created_at', { ascending: false }),
        supabase.from('purchase_invoices').select('*, items:purchase_invoice_items(*)').order('created_at', { ascending: false }),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
        supabase.from('financial_transactions').select('*').order('created_at', { ascending: false }),
      ]);

      if (whRes.data) setWarehouses(whRes.data);
      if (custRes.data) setCustomers(custRes.data);
      if (supRes.data) setSuppliers(supRes.data);
      if (prodRes.data) setProducts(prodRes.data);
      if (salesRes.data) setSalesInvoices(salesRes.data);
      if (purchRes.data) setPurchaseInvoices(purchRes.data);
      if (movRes.data) setStockMovements(movRes.data);
      if (txRes.data) setTransactions(txRes.data);

      // Add default warehouse if empty
      if (whRes.data && whRes.data.length === 0) {
        const { data: newWh } = await supabase.from('warehouses').insert([
          { code: 'WH-01', name: 'المخزن الرئيسي', is_default: true }
        ]).select();
        if (newWh) setWarehouses(newWh);
      }
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // HANDLERS (Supabase Integrated)
  const handleAddProduct = async (newProdData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('products').insert([newProdData]).select();
    if (data && data[0]) {
      setProducts([data[0], ...products]);
    } else {
      console.error('Error adding product:', error);
      const msg = error?.message || 'حدث خطأ غير معروف';
      alert(language === 'ar' ? `فشل إضافة الصنف:\n${msg}` : `Failed to add product:\n${msg}`);
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
    if (data && data[0]) {
      setProducts(products.map((p) => (p.id === id ? data[0] : p)));
    } else {
      console.error('Error updating product:', error);
      const msg = error?.message || 'حدث خطأ غير معروف';
      alert(language === 'ar' ? `فشل تحديث الصنف:\n${msg}` : `Failed to update product:\n${msg}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(products.filter((p) => p.id !== id));
    } else {
      console.error('Error deleting product:', error);
    }
  };

  const handleUpdateCustomer = async (id: string, updates: Partial<Customer>) => {
    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select();
    if (data && data[0]) {
      setCustomers(customers.map((c) => (c.id === id ? data[0] : c)));
    } else {
      console.error('Error updating customer:', error);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) {
      setCustomers(customers.filter((c) => c.id !== id));
    } else {
      console.error('Error deleting customer:', error);
    }
  };

  const handleUpdateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select();
    if (data && data[0]) {
      setSuppliers(suppliers.map((s) => (s.id === id ? data[0] : s)));
    } else {
      console.error('Error updating supplier:', error);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (!error) {
      setSuppliers(suppliers.filter((s) => s.id !== id));
    } else {
      console.error('Error deleting supplier:', error);
    }
  };

  const handleAddCustomer = async (newCustData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'balance'>) => {
    const { data, error } = await supabase.from('customers').insert([{ ...newCustData, balance: 0 }]).select();
    if (data && data[0]) {
      setCustomers([data[0], ...customers]);
    } else {
      console.error('Error adding customer:', error);
    }
  };

  const handleAddSupplier = async (newSupData: Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'balance'>) => {
    const { data, error } = await supabase.from('suppliers').insert([{ ...newSupData, balance: 0 }]).select();
    if (data && data[0]) {
      setSuppliers([data[0], ...suppliers]);
    } else {
      console.error('Error adding supplier:', error);
    }
  };

  const handleAddStockMovement = async (movementData: Omit<StockMovement, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('stock_movements').insert([movementData]).select();
    if (data && data[0]) {
      setStockMovements([data[0], ...stockMovements]);

      // Update product stock quantity
      const targetProd = products.find((p) => p.id === movementData.product_id);
      if (targetProd) {
        await handleUpdateProduct(targetProd.id, {
          stock_quantity: (targetProd.stock_quantity || 0) + movementData.quantity,
        });
      }
    } else {
      console.error('Error adding stock movement:', error);
    }
  };

  const handleCreateSalesInvoice = async (invoiceData: Omit<SalesInvoice, 'id' | 'created_at'>) => {
    const { items, ...rawRecord } = invoiceData;
    
    // Explicitly sanitize and map only valid columns for sales_invoices table in Supabase
    const invoiceRecord = {
      invoice_number: rawRecord.invoice_number,
      customer_id: rawRecord.customer_id,
      warehouse_id: rawRecord.warehouse_id || warehouses[0]?.id,
      invoice_date: rawRecord.invoice_date,
      status: rawRecord.status || 'approved',
      subtotal: rawRecord.subtotal || 0,
      discount: rawRecord.discount || 0,
      total: rawRecord.total || 0,
      paid_amount: rawRecord.paid_amount || 0,
      remaining_balance: rawRecord.remaining_balance || 0,
      notes: rawRecord.notes || '',
    };

    // Insert invoice
    const { data: invData, error: invError } = await supabase.from('sales_invoices').insert([invoiceRecord]).select();
    if (invError) {
      console.error('Error creating sales invoice:', invError);
      alert('خطأ أثناء حفظ فاتورة المبيعات: ' + (invError.message || JSON.stringify(invError)));
      return;
    }

    if (invData && invData[0]) {
      const newInvoice = invData[0];
      
      // Insert items
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          invoice_id: newInvoice.id,
          product_id: item.product_id || null,
          product_name_snapshot: item.product_name_snapshot || 'لوح خشب',
          wood_type_snapshot: item.wood_type_snapshot || 'ألواح',
          quantity_sheets: item.quantity_sheets || 1,
          unit_price: item.unit_price || 0,
          line_total: item.line_total || 0,
        }));
        const { error: itemsError } = await supabase.from('sales_invoice_items').insert(itemsToInsert);
        if (itemsError) {
          console.error('Error inserting sales invoice items:', itemsError);
          alert('خطأ في حفظ بنود الفاتورة: ' + itemsError.message);
        }
        newInvoice.items = itemsToInsert as any;
      }

      setSalesInvoices((prev) => [newInvoice, ...prev]);

      // Deduct stock
      if (items) {
        for (const item of items) {
          if (item.product_id) {
            await handleAddStockMovement({
              product_id: item.product_id,
              product_name: item.product_name_snapshot,
              warehouse_id: newInvoice.warehouse_id,
              movement_type: 'sale',
              quantity: -item.quantity_sheets,
              reference_id: newInvoice.invoice_number,
              notes: `فاتورة بيع ألواح رقم ${newInvoice.invoice_number}`,
            });
          }
        }
      }

      // Update customer balance
      const cust = customers.find((c) => c.id === newInvoice.customer_id);
      if (cust) {
        const updatedBalance = (cust.balance || 0) + newInvoice.remaining_balance;
        const { data: updatedCust } = await supabase.from('customers').update({ balance: updatedBalance }).eq('id', cust.id).select();
        if (updatedCust && updatedCust[0]) {
          setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updatedCust[0] : c)));
        }
      }
    }
  };

  const handleUpdateSalesInvoice = async (
    invoiceId: string,
    invoiceData: Omit<SalesInvoice, 'id' | 'created_at'>
  ) => {
    const oldInvoice = salesInvoices.find((i) => i.id === invoiceId);
    if (!oldInvoice) return;

    const { items: newItems, ...rawRecord } = invoiceData;
    const invoiceRecord = {
      invoice_number: rawRecord.invoice_number,
      customer_id: rawRecord.customer_id,
      warehouse_id: rawRecord.warehouse_id || oldInvoice.warehouse_id,
      invoice_date: rawRecord.invoice_date,
      status: rawRecord.status || 'approved',
      subtotal: rawRecord.subtotal || 0,
      discount: rawRecord.discount || 0,
      total: rawRecord.total || 0,
      paid_amount: rawRecord.paid_amount || 0,
      remaining_balance: rawRecord.remaining_balance || 0,
      notes: rawRecord.notes || '',
    };

    // 1) Reverse the OLD invoice's stock effect (same pattern as handleDeleteSalesInvoice)
    if (oldInvoice.items) {
      for (const item of oldInvoice.items) {
        if (item.product_id) {
          await handleAddStockMovement({
            product_id: item.product_id,
            product_name: item.product_name_snapshot,
            warehouse_id: oldInvoice.warehouse_id,
            movement_type: 'sales_return',
            quantity: item.quantity_sheets,
            reference_id: oldInvoice.invoice_number,
            notes: `تعديل فاتورة بيع رقم ${oldInvoice.invoice_number} - إرجاع الكمية قبل التعديل`,
          });
        }
      }
    }

    // 2) Reverse the OLD invoice's effect on the old customer's balance
    const oldCust = customers.find((c) => c.id === oldInvoice.customer_id);
    let oldCustBalanceAfterReversal = 0;
    if (oldCust) {
      oldCustBalanceAfterReversal = (oldCust.balance || 0) - oldInvoice.remaining_balance;
      const { data } = await supabase.from('customers').update({ balance: oldCustBalanceAfterReversal }).eq('id', oldCust.id).select();
      if (data && data[0]) {
        oldCustBalanceAfterReversal = data[0].balance;
        setCustomers((prev) => prev.map((c) => (c.id === oldCust.id ? data[0] : c)));
      }
    }

    // 3) Update the invoice header row
    const { data: updatedInvData, error: updateError } = await supabase
      .from('sales_invoices')
      .update(invoiceRecord)
      .eq('id', invoiceId)
      .select();

    if (!updatedInvData || !updatedInvData[0]) {
      console.error('Error updating sales invoice:', updateError);
      alert(language === 'ar' ? 'فشل تحديث الفاتورة: ' + (updateError?.message || '') : 'Failed to update invoice: ' + (updateError?.message || ''));
      return;
    }

    // 4) Replace the invoice's items with the edited set
    await supabase.from('sales_invoice_items').delete().eq('invoice_id', invoiceId);
    let insertedItems: SalesInvoiceItem[] = [];
    if (newItems && newItems.length > 0) {
      const itemsToInsert = newItems.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        product_name_snapshot: item.product_name_snapshot || 'لوح خشب',
        wood_type_snapshot: item.wood_type_snapshot || 'ألواح',
        quantity_sheets: item.quantity_sheets || 1,
        unit_price: item.unit_price || 0,
        line_total: item.line_total || 0,
      }));
      const { data: insertedData } = await supabase.from('sales_invoice_items').insert(itemsToInsert).select();
      if (insertedData) insertedItems = insertedData;
    }

    const finalInvoice: SalesInvoice = { ...updatedInvData[0], items: insertedItems };
    setSalesInvoices((prev) => prev.map((i) => (i.id === invoiceId ? finalInvoice : i)));

    // 5) Apply the NEW invoice's stock effect (same pattern as handleCreateSalesInvoice)
    if (insertedItems.length > 0) {
      for (const item of insertedItems) {
        if (item.product_id) {
          await handleAddStockMovement({
            product_id: item.product_id,
            product_name: item.product_name_snapshot,
            warehouse_id: finalInvoice.warehouse_id,
            movement_type: 'sale',
            quantity: -item.quantity_sheets,
            reference_id: finalInvoice.invoice_number,
            notes: `تعديل فاتورة بيع رقم ${finalInvoice.invoice_number} - تطبيق الكمية بعد التعديل`,
          });
        }
      }
    }

    // 6) Apply the NEW invoice's effect on the (possibly different) customer's balance.
    // If it's the same customer as before, start from the already-reversed balance
    // from step 2 instead of the stale pre-reversal value in local state.
    const sameCustomer = !!oldCust && oldCust.id === finalInvoice.customer_id;
    const baseBalance = sameCustomer
      ? oldCustBalanceAfterReversal
      : customers.find((c) => c.id === finalInvoice.customer_id)?.balance || 0;

    if (finalInvoice.customer_id) {
      const newBalance = baseBalance + finalInvoice.remaining_balance;
      const { data: newCustData } = await supabase.from('customers').update({ balance: newBalance }).eq('id', finalInvoice.customer_id).select();
      if (newCustData && newCustData[0]) {
        setCustomers((prev) => prev.map((c) => (c.id === finalInvoice.customer_id ? newCustData[0] : c)));
      }
    }
  };

  const handleCreatePurchaseInvoice = async (invoiceData: Omit<PurchaseInvoice, 'id' | 'created_at'>) => {
    const { items, ...invoiceRecord } = invoiceData;
    
    // Insert invoice
    const { data: invData, error: invError } = await supabase.from('purchase_invoices').insert([invoiceRecord]).select();
    if (invData && invData[0]) {
      const newInvoice = invData[0];
      
      // Insert items
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          invoice_id: newInvoice.id
        }));
        await supabase.from('purchase_invoice_items').insert(itemsToInsert);
        newInvoice.items = itemsToInsert;
      }

      setPurchaseInvoices([newInvoice, ...purchaseInvoices]);

      // Add stock
      if (items) {
        for (const item of items) {
          if (item.product_id) {
            await handleAddStockMovement({
              product_id: item.product_id,
              product_name: item.product_name_snapshot,
              warehouse_id: newInvoice.warehouse_id,
              movement_type: 'purchase',
              quantity: item.quantity_sheets,
              reference_id: newInvoice.invoice_number,
              notes: `فاتورة شراء ألواح رقم ${newInvoice.invoice_number}`,
            });
          }
        }
      }

      // Update supplier balance
      const sup = suppliers.find((s) => s.id === newInvoice.supplier_id);
      if (sup) {
        const updatedBalance = (sup.balance || 0) + newInvoice.remaining_balance;
        const { data: updatedSup } = await supabase.from('suppliers').update({ balance: updatedBalance }).eq('id', sup.id).select();
        if (updatedSup && updatedSup[0]) {
          setSuppliers(suppliers.map((s) => (s.id === sup.id ? updatedSup[0] : s)));
        }
      }
    } else {
      console.error('Error creating purchase invoice:', invError);
    }
  };

  const handleDeleteSalesInvoice = async (invoiceId: string) => {
    const invoice = salesInvoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    // Reverse stock: give back every sheet this invoice had deducted
    if (invoice.items) {
      for (const item of invoice.items) {
        if (item.product_id) {
          await handleAddStockMovement({
            product_id: item.product_id,
            product_name: item.product_name_snapshot,
            warehouse_id: invoice.warehouse_id,
            movement_type: 'sales_return',
            quantity: item.quantity_sheets,
            reference_id: invoice.invoice_number,
            notes: `إلغاء/حذف فاتورة بيع رقم ${invoice.invoice_number}`,
          });
        }
      }
    }

    // Reverse the customer's balance (undo what this invoice had added as debt)
    const cust = customers.find((c) => c.id === invoice.customer_id);
    if (cust) {
      const updatedBalance = (cust.balance || 0) - invoice.remaining_balance;
      const { data: updatedCust } = await supabase.from('customers').update({ balance: updatedBalance }).eq('id', cust.id).select();
      if (updatedCust && updatedCust[0]) {
        setCustomers(customers.map((c) => (c.id === cust.id ? updatedCust[0] : c)));
      }
    }

    // Delete the invoice (sales_invoice_items cascade-delete automatically)
    const { error } = await supabase.from('sales_invoices').delete().eq('id', invoiceId);
    if (!error) {
      setSalesInvoices(salesInvoices.filter((i) => i.id !== invoiceId));
    } else {
      console.error('Error deleting sales invoice:', error);
    }
  };

  const handleDeletePurchaseInvoice = async (invoiceId: string) => {
    const invoice = purchaseInvoices.find((i) => i.id === invoiceId);
    if (!invoice) return;

    // Reverse stock: remove back out every sheet this invoice had added
    if (invoice.items) {
      for (const item of invoice.items) {
        if (item.product_id) {
          await handleAddStockMovement({
            product_id: item.product_id,
            product_name: item.product_name_snapshot,
            warehouse_id: invoice.warehouse_id,
            movement_type: 'purchase_return',
            quantity: -item.quantity_sheets,
            reference_id: invoice.invoice_number,
            notes: `إلغاء/حذف فاتورة شراء رقم ${invoice.invoice_number}`,
          });
        }
      }
    }

    // Reverse the supplier's balance (undo what this invoice had added as payable)
    const sup = suppliers.find((s) => s.id === invoice.supplier_id);
    if (sup) {
      const updatedBalance = (sup.balance || 0) - invoice.remaining_balance;
      const { data: updatedSup } = await supabase.from('suppliers').update({ balance: updatedBalance }).eq('id', sup.id).select();
      if (updatedSup && updatedSup[0]) {
        setSuppliers(suppliers.map((s) => (s.id === sup.id ? updatedSup[0] : s)));
      }
    }

    // Delete the invoice (purchase_invoice_items cascade-delete automatically)
    const { error } = await supabase.from('purchase_invoices').delete().eq('id', invoiceId);
    if (!error) {
      setPurchaseInvoices(purchaseInvoices.filter((i) => i.id !== invoiceId));
    } else {
      console.error('Error deleting purchase invoice:', error);
    }
  };

  const handleCreateSalesReturn = async (returnData: {
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
  }) => {
    try {
      const year = new Date().getFullYear();
      const count = salesInvoices.filter((i) => i.invoice_number.startsWith('RET-SALES-')).length + 1;
      const invoiceNumber = `RET-SALES-${year}-${String(count).padStart(4, '0')}`;

      const invoiceRecord = {
        invoice_number: invoiceNumber,
        customer_id: returnData.customerId,
        warehouse_id: returnData.warehouseId || warehouses[0]?.id,
        invoice_date: new Date().toISOString().slice(0, 10),
        status: 'approved',
        subtotal: returnData.total,
        discount: 0,
        total: returnData.total,
        paid_amount: returnData.refundMethod === 'cash' ? returnData.total : 0,
        remaining_balance: returnData.refundMethod === 'credit' ? returnData.total : 0,
        notes: `مرتجع مبيعات ${returnData.originalInvoiceNumber ? 'للفاتورة ' + returnData.originalInvoiceNumber : ''} ${returnData.notes ? '- ' + returnData.notes : ''}`.trim(),
      };

      const { data: invData, error: invError } = await supabase.from('sales_invoices').insert([invoiceRecord]).select();
      if (!invData || !invData[0]) {
        console.error('Error creating sales return:', invError);
        alert(language === 'ar' ? 'فشل تسجيل مرتجع المبيعات: ' + (invError?.message || '') : 'Failed to create sales return');
        return;
      }

      const returnInvoiceId = invData[0].id;
      let insertedItems: SalesInvoiceItem[] = [];

      if (returnData.items.length > 0) {
        const itemsToInsert = returnData.items.map((it) => ({
          invoice_id: returnInvoiceId,
          product_id: it.productId || null,
          product_name_snapshot: it.productName,
          wood_type_snapshot: it.woodType || 'MDF',
          quantity_sheets: it.quantitySheets,
          unit_price: it.unitPrice,
          line_total: it.lineTotal,
        }));

        const { data: itemsData } = await supabase.from('sales_invoice_items').insert(itemsToInsert).select();
        if (itemsData) insertedItems = itemsData;
      }

      setSalesInvoices([{ ...invData[0], items: insertedItems }, ...salesInvoices]);

      // Stock movements: restock returned sheets with positive quantity
      for (const it of returnData.items) {
        if (it.productId) {
          await handleAddStockMovement({
            product_id: it.productId,
            product_name: it.productName,
            warehouse_id: invoiceRecord.warehouse_id,
            movement_type: 'sales_return',
            quantity: it.quantitySheets,
            reference_id: invoiceNumber,
            notes: `مرتجع مبيعات ${invoiceNumber}`,
          });
        }
      }

      // Financial balance adjustments:
      if (returnData.refundMethod === 'credit') {
        const cust = customers.find((c) => c.id === returnData.customerId);
        if (cust) {
          const updatedBalance = (cust.balance || 0) - returnData.total;
          const { data: updatedCust } = await supabase.from('customers').update({ balance: updatedBalance }).eq('id', cust.id).select();
          if (updatedCust && updatedCust[0]) {
            setCustomers(customers.map((c) => (c.id === cust.id ? updatedCust[0] : c)));
          }
        }
      } else {
        await handleAddTransaction({
          transaction_type: 'customer_payment',
          party_type: 'customer',
          party_id: returnData.customerId,
          amount: -returnData.total,
          payment_method: 'cash',
          reference_invoice_id: returnInvoiceId,
          transaction_date: invoiceRecord.invoice_date,
          notes: `رد نقدي لمرتجع مبيعات رقم ${invoiceNumber}`,
        });
      }

      alert(language === 'ar' ? `تم تسجيل مرتجع المبيعات رقم ${invoiceNumber} وإعادة الألواح للمخزن بنجاح!` : `Sales return ${invoiceNumber} created successfully!`);
    } catch (err: any) {
      console.error('Error handling sales return:', err);
      alert('حدث خطأ أثناء حفظ المرتجع: ' + err.message);
    }
  };

  const handleCreatePurchaseReturn = async (returnData: {
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
  }) => {
    try {
      const year = new Date().getFullYear();
      const count = purchaseInvoices.filter((i) => i.invoice_number.startsWith('RET-PURCH-')).length + 1;
      const invoiceNumber = `RET-PURCH-${year}-${String(count).padStart(4, '0')}`;

      const invoiceRecord = {
        invoice_number: invoiceNumber,
        supplier_id: returnData.supplierId,
        warehouse_id: returnData.warehouseId || warehouses[0]?.id,
        invoice_date: new Date().toISOString().slice(0, 10),
        status: 'approved',
        total: returnData.total,
        paid_amount: returnData.refundMethod === 'cash' ? returnData.total : 0,
        remaining_balance: returnData.refundMethod === 'credit' ? returnData.total : 0,
        notes: `مرتجع مشتريات ${returnData.originalInvoiceNumber ? 'للفاتورة ' + returnData.originalInvoiceNumber : ''} ${returnData.notes ? '- ' + returnData.notes : ''}`.trim(),
      };

      const { data: invData, error: invError } = await supabase.from('purchase_invoices').insert([invoiceRecord]).select();
      if (!invData || !invData[0]) {
        console.error('Error creating purchase return:', invError);
        alert(language === 'ar' ? 'فشل تسجيل مرتجع المشتريات: ' + (invError?.message || '') : 'Failed to create purchase return');
        return;
      }

      const returnInvoiceId = invData[0].id;
      let insertedItems: any[] = [];

      if (returnData.items.length > 0) {
        const itemsToInsert = returnData.items.map((it) => ({
          invoice_id: returnInvoiceId,
          product_id: it.productId || null,
          product_name_snapshot: it.productName,
          wood_type_snapshot: it.woodType || 'MDF',
          quantity_sheets: it.quantitySheets,
          unit_price: it.unitPrice,
          line_total: it.lineTotal,
        }));

        const { data: itemsData } = await supabase.from('purchase_invoice_items').insert(itemsToInsert).select();
        if (itemsData) insertedItems = itemsData;
      }

      setPurchaseInvoices([{ ...invData[0], items: insertedItems }, ...purchaseInvoices]);

      // Stock movements: remove returned sheets with negative quantity
      for (const it of returnData.items) {
        if (it.productId) {
          await handleAddStockMovement({
            product_id: it.productId,
            product_name: it.productName,
            warehouse_id: invoiceRecord.warehouse_id,
            movement_type: 'purchase_return',
            quantity: -it.quantitySheets,
            reference_id: invoiceNumber,
            notes: `مرتجع مشتريات ${invoiceNumber}`,
          });
        }
      }

      // Financial balance adjustments: reduce supplier debt
      const sup = suppliers.find((s) => s.id === returnData.supplierId);
      if (sup) {
        const updatedBalance = (sup.balance || 0) - returnData.total;
        const { data: updatedSup } = await supabase.from('suppliers').update({ balance: updatedBalance }).eq('id', sup.id).select();
        if (updatedSup && updatedSup[0]) {
          setSuppliers(suppliers.map((s) => (s.id === sup.id ? updatedSup[0] : s)));
        }
      }

      alert(language === 'ar' ? `تم تسجيل مرتجع المشتريات رقم ${invoiceNumber} وخصم الألواح من المخزن بنجاح!` : `Purchase return ${invoiceNumber} created successfully!`);
    } catch (err: any) {
      console.error('Error handling purchase return:', err);
      alert('حدث خطأ أثناء حفظ المرتجع: ' + err.message);
    }
  };

  const handleAddTransaction = async (txData: Omit<FinancialTransaction, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('financial_transactions').insert([txData]).select();
    if (data && data[0]) {
      setTransactions([data[0], ...transactions]);

      // Update party balance
      if (txData.party_type === 'customer') {
        const cust = customers.find((c) => c.id === txData.party_id);
        if (cust) {
          const { data: updatedCust } = await supabase.from('customers').update({ balance: (cust.balance || 0) - txData.amount }).eq('id', cust.id).select();
          if (updatedCust && updatedCust[0]) setCustomers(customers.map((c) => (c.id === cust.id ? updatedCust[0] : c)));
        }
      } else if (txData.party_type === 'supplier') {
        const sup = suppliers.find((s) => s.id === txData.party_id);
        if (sup) {
          const { data: updatedSup } = await supabase.from('suppliers').update({ balance: (sup.balance || 0) - txData.amount }).eq('id', sup.id).select();
          if (updatedSup && updatedSup[0]) setSuppliers(suppliers.map((s) => (s.id === sup.id ? updatedSup[0] : s)));
        }
      }
    } else {
      console.error('Error adding transaction:', error);
    }
  };

  const handleCommitProductsImport = async (
    newProds: Omit<Product, 'id' | 'created_at' | 'updated_at'>[],
    updates: { id: string; changes: Partial<Product> }[]
  ) => {
    // Perform bulk updates
    for (const u of updates) {
      await supabase.from('products').update(u.changes).eq('id', u.id);
    }
    // Perform bulk inserts
    if (newProds.length > 0) {
      await supabase.from('products').insert(newProds);
    }
    // Refetch to sync state
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const handleCommitCustomersImport = async (
    newCusts: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'balance'>[],
    updates: { id: string; changes: Partial<Customer> }[]
  ) => {
    // Perform bulk updates
    for (const u of updates) {
      await supabase.from('customers').update(u.changes).eq('id', u.id);
    }
    // Perform bulk inserts
    if (newCusts.length > 0) {
      await supabase.from('customers').insert(newCusts);
    }
    // Refetch to sync state
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (data) setCustomers(data);
  };

  if (!isAuthenticated) {
    return <LoginScreen language={language} onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-800 border-t-amber-500"></div>
        <span className="text-xs text-slate-400 font-mono tracking-wider">جاري تحميل بيانات النظام...</span>
      </div>
    );
  }

  const tabTitles: Record<NavTab, { ar: string; en: string }> = {
    dashboard: { ar: 'لوحة المتابعة والمؤشرات', en: 'Dashboard & Metrics' },
    products: { ar: 'كتالوج الألواح الخشبية', en: 'Wood Sheets Catalog' },
    warehouses: { ar: 'المخازن وحركة الألواح', en: 'Warehouses & Stock' },
    sales: { ar: 'فواتير مبيعات الأخشاب', en: 'Wood Sales Invoices' },
    purchases: { ar: 'فواتير مشتريات وتوريد الأخشاب', en: 'Wood Purchase Invoices' },
    returns: { ar: 'مرتجعات الألواح والخشب', en: 'Returns Management' },
    customers: { ar: 'سجل العملاء وكشوف الحساب', en: 'Customers Ledger' },
    suppliers: { ar: 'سجل الموردين والمصانع', en: 'Suppliers Ledger' },
    payments: { ar: 'المدفوعات والتحصيلات', en: 'Payments & Collections' },
    import: { ar: 'استيراد شيتات إكسيل', en: 'Excel Batch Import' },
    reports: { ar: 'التقارير التحليلية والمالية الشاملة', en: 'Executive Reports' },
  };

  return (
    <div
      className="min-h-screen bg-transparent text-slate-100 flex selection:bg-amber-500/30 selection:text-amber-200"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Sidebar Navigation (القائمة الجانبية) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
          }
        }}
        language={language}
        isOpen={isSidebarOpen}
        onClose={() => {
          setIsSidebarOpen(false);
          localStorage.setItem('nileflow_sidebar_open', 'false');
        }}
        onOpenBackup={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        {/* Subtle Watermark Logo in Background of All Pages */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-[0.045] select-none no-print"
        >
          <img
            src="/logo.png"
            alt=""
            className="w-[560px] h-[560px] max-w-[70vw] max-h-[70vh] object-contain drop-shadow-2xl"
          />
        </div>

        {/* Top Header */}
        <Header
          language={language}
          onLanguageChange={setLanguage}
          currentUser={currentUser as any}
          onUserChange={setCurrentUser as any}
          onLogout={handleLogout}
          activeTabTitle={language === 'ar' ? tabTitles[activeTab]?.ar : tabTitles[activeTab]?.en}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          onOpenBackup={() => setIsBackupModalOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1600px] w-full mx-auto relative z-1">
          {activeTab === 'dashboard' && (
            <DashboardPage
              products={products}
              customers={customers}
              suppliers={suppliers}
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              stockMovements={stockMovements}
              language={language}
              onNavigate={setActiveTab}
              onOpenNewSale={() => {
                setIsSalesModalOpenInitially(true);
                setActiveTab('sales');
              }}
              onOpenNewPurchase={() => {
                setIsPurchaseModalOpenInitially(true);
                setActiveTab('purchases');
              }}
            />
          )}

          {activeTab === 'products' && (
            <ProductsPage
              products={products}
              suppliers={suppliers}
              movements={stockMovements}
              language={language}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onNavigateToImport={() => setActiveTab('import')}
              onRefreshProducts={async () => {
                const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
                if (data) setProducts(data);
              }}
            />
          )}

          {activeTab === 'warehouses' && (
            <WarehousesPage
              warehouses={warehouses}
              products={products}
              movements={stockMovements}
              language={language}
              onAddMovement={handleAddStockMovement}
            />
          )}

          {activeTab === 'sales' && (
            <SalesPage
              salesInvoices={salesInvoices}
              customers={customers}
              products={products}
              warehouses={warehouses}
              language={language}
              onCreateInvoice={handleCreateSalesInvoice}
              onUpdateInvoice={handleUpdateSalesInvoice}
              onDeleteInvoice={handleDeleteSalesInvoice}
              isCreateOpenInitially={isSalesModalOpenInitially}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesPage
              purchaseInvoices={purchaseInvoices}
              suppliers={suppliers}
              products={products}
              warehouses={warehouses}
              language={language}
              onCreatePurchase={handleCreatePurchaseInvoice}
              onDeleteInvoice={handleDeletePurchaseInvoice}
            />
          )}

          {activeTab === 'returns' && (
            <ReturnsPage
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              customers={customers}
              suppliers={suppliers}
              products={products}
              warehouses={warehouses}
              language={language}
              onCreateSalesReturn={handleCreateSalesReturn}
              onCreatePurchaseReturn={handleCreatePurchaseReturn}
              onDeleteInvoice={async (id, type) => {
                if (type === 'sales') await handleDeleteSalesInvoice(id);
                else await handleDeletePurchaseInvoice(id);
              }}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersPage
              customers={customers}
              salesInvoices={salesInvoices}
              transactions={transactions}
              language={language}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersPage
              suppliers={suppliers}
              purchaseInvoices={purchaseInvoices}
              transactions={transactions}
              language={language}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsPage
              transactions={transactions}
              customers={customers}
              suppliers={suppliers}
              language={language}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'import' && (
            <ImportPage
              existingCustomers={customers}
              existingProducts={products}
              language={language}
              onCommitCustomersImport={handleCommitCustomersImport}
              onCommitProductsImport={handleCommitProductsImport}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPage
              products={products}
              customers={customers}
              suppliers={suppliers}
              salesInvoices={salesInvoices}
              purchaseInvoices={purchaseInvoices}
              language={language}
            />
          )}
        </main>
      </div>

      {/* Full Database Backup & Excel Export Modal */}
      {isBackupModalOpen && (
        <BackupModal
          products={products}
          customers={customers}
          suppliers={suppliers}
          warehouses={warehouses}
          salesInvoices={salesInvoices}
          purchaseInvoices={purchaseInvoices}
          stockMovements={stockMovements}
          financialTransactions={transactions}
          language={language}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;