import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import {
  Customer,
  Supplier,
  Product,
  Warehouse,
  SalesInvoice,
  PurchaseInvoice,
  StockMovement,
  FinancialTransaction,
} from './types';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ImportPage } from './pages/ImportPage';
import { ReportsPage } from './pages/ReportsPage';

export function App() {
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [currentUser, setCurrentUser] = useState({ name: 'إدارة شركة الدالي (Admin)', role: 'admin' as const });
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

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
  // يرجع المنتج اللي اتضاف فعلاً (أو null لو فشلت الإضافة) عشان يستخدم فوراً
  // في شاشات تانية زي فاتورة المشتريات (إضافة صنف جديد أثناء إدخال الفاتورة).
  const handleAddProduct = async (
    newProdData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product | null> => {
    const { data, error } = await supabase.from('products').insert([newProdData]).select();
    if (data && data[0]) {
      setProducts((prev) => [data[0], ...prev]);
      return data[0];
    }

    console.error('Error adding product:', error);
    // رسالة واضحة للمستخدم بدل ما تفشل الإضافة بصمت
    if (error?.code === '23505') {
      alert(
        `⚠️ الصنف موجود بالفعل بنفس الكود والمقاس واللون (${newProdData.code} - ${newProdData.size || 'بدون مقاس'} - ${newProdData.color || 'بدون لون'}).\nلو عايز تضيف كمية لنفس الصنف، عدّل رصيده بدل إضافة صنف جديد.`
      );
    } else {
      alert(`⚠️ حصل خطأ أثناء إضافة الصنف: ${error?.message || 'خطأ غير معروف'}`);
    }
    return null;
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select();
    if (data && data[0]) {
      setProducts(products.map((p) => (p.id === id ? data[0] : p)));
    } else {
      console.error('Error updating product:', error);
      alert(`⚠️ حصل خطأ أثناء تعديل الصنف: ${error?.message || 'خطأ غير معروف'}`);
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
    const { items, ...invoiceRecord } = invoiceData;
    
    // Insert invoice
    const { data: invData, error: invError } = await supabase.from('sales_invoices').insert([invoiceRecord]).select();
    if (invData && invData[0]) {
      const newInvoice = invData[0];
      
      // Insert items
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          invoice_id: newInvoice.id
        }));
        await supabase.from('sales_invoice_items').insert(itemsToInsert);
        newInvoice.items = itemsToInsert;
      }

      setSalesInvoices([newInvoice, ...salesInvoices]);

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
          setCustomers(customers.map((c) => (c.id === cust.id ? updatedCust[0] : c)));
        }
      }
    } else {
      console.error('Error creating sales invoice:', invError);
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
      alert(`⚠️ حصل خطأ أثناء حفظ فاتورة الشراء: ${invError?.message || 'خطأ غير معروف'}`);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser as any}
        onUserChange={setCurrentUser as any}
      />

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} language={language} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            language={language}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onNavigateToImport={() => setActiveTab('import')}
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
            onAddProduct={handleAddProduct}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersPage
            customers={customers}
            salesInvoices={salesInvoices}
            transactions={transactions}
            language={language}
            onAddCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersPage
            suppliers={suppliers}
            purchaseInvoices={purchaseInvoices}
            transactions={transactions}
            language={language}
            onAddSupplier={handleAddSupplier}
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
  );
}

export default App;
