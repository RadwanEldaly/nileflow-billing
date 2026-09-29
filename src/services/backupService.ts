import { Product, Customer, Supplier, Warehouse, SalesInvoice, PurchaseInvoice, StockMovement, FinancialTransaction } from '../types';

export interface FullBackupPayload {
  exportDate: string;
  version: string;
  system: string;
  summary: {
    totalProducts: number;
    totalCustomers: number;
    totalSuppliers: number;
    totalWarehouses: number;
    totalSalesInvoices: number;
    totalPurchaseInvoices: number;
    totalStockMovements: number;
    totalFinancialTransactions: number;
  };
  data: {
    products: Product[];
    customers: Customer[];
    suppliers: Supplier[];
    warehouses: Warehouse[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    stockMovements: StockMovement[];
    financialTransactions: FinancialTransaction[];
  };
}

/**
 * Downloads a string as a file on the client's machine.
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to escape CSV cell content and prepend UTF-8 BOM so Excel opens Arabic correctly.
 */
function toCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) so Excel natively recognizes Arabic encoding
  return '\uFEFF' + headerRow + '\r\n' + dataRows;
}

/**
 * Creates and downloads a complete system JSON backup file.
 */
export function downloadFullJSONBackup(data: {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  stockMovements: StockMovement[];
  financialTransactions: FinancialTransaction[];
}) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

  const payload: FullBackupPayload = {
    exportDate: now.toISOString(),
    version: '2.0',
    system: 'شركة الدالي لتجارة الأخشاب والقشرة',
    summary: {
      totalProducts: data.products.length,
      totalCustomers: data.customers.length,
      totalSuppliers: data.suppliers.length,
      totalWarehouses: data.warehouses.length,
      totalSalesInvoices: data.salesInvoices.length,
      totalPurchaseInvoices: data.purchaseInvoices.length,
      totalStockMovements: data.stockMovements.length,
      totalFinancialTransactions: data.financialTransactions.length,
    },
    data,
  };

  const jsonContent = JSON.stringify(payload, null, 2);
  const filename = `eldaly_wood_backup_${dateStr}_${timeStr}.json`;
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8');
}

/**
 * Export Products to Excel-compatible CSV.
 */
export function exportProductsCSV(products: Product[]) {
  const headers = [
    'كود الصنف',
    'اسم الصنف',
    'نوع الخشب',
    'المقاس',
    'اللون / المواصفة',
    'سعر الشراء',
    'سعر البيع',
    'الرصيد الحالي (ألواح)',
    'حد الطلب',
    'ملاحظات',
  ];

  const rows = products.map((p) => [
    p.code,
    p.name,
    p.wood_type,
    p.size || '',
    p.color || '',
    p.purchase_price || 0,
    p.selling_price || 0,
    p.stock_quantity || 0,
    p.min_stock_level || 10,
    p.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  const filename = `أصناف_أخشاب_الدالي_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * Export Customers to Excel-compatible CSV.
 */
export function exportCustomersCSV(customers: Customer[]) {
  const headers = ['كود العميل', 'اسم العميل', 'رقم الهاتف', 'العنوان', 'الرصيد الحالي (ج.م)', 'ملاحظات'];
  const rows = customers.map((c) => [
    c.code,
    c.name,
    c.mobile || '',
    c.address || '',
    c.balance || 0,
    c.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  const filename = `عملاء_شركة_الدالي_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * Export Suppliers to Excel-compatible CSV.
 */
export function exportSuppliersCSV(suppliers: Supplier[]) {
  const headers = ['كود المورد', 'اسم المورد / المصنع', 'رقم الهاتف', 'العنوان', 'مستحقات المورد (ج.م)', 'ملاحظات'];
  const rows = suppliers.map((s) => [
    s.code,
    s.name,
    s.mobile || '',
    s.address || '',
    s.balance || 0,
    s.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  const filename = `موردي_شركة_الدالي_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}

/**
 * Export Sales Invoices to Excel-compatible CSV.
 */
export function exportSalesInvoicesCSV(invoices: SalesInvoice[], customers: Customer[]) {
  const custMap = new Map(customers.map((c) => [c.id, c.name]));
  const headers = [
    'رقم الفاتورة',
    'التاريخ',
    'العميل',
    'إجمالي الأصناف',
    'الخصم',
    'الصافي المطلوب',
    'المدفوع نقداً',
    'المتبقي (آجل)',
    'الحالة',
    'ملاحظات',
  ];

  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.invoice_date,
    custMap.get(inv.customer_id) || 'عميل',
    inv.subtotal,
    inv.discount,
    inv.total,
    inv.paid_amount,
    inv.remaining_balance,
    inv.status === 'approved' ? 'معتمدة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة',
    inv.notes || '',
  ]);

  const csv = toCSV(headers, rows);
  const filename = `فواتير_مبيعات_الدالي_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8');
}
