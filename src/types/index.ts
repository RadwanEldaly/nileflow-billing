export type UserRole = 'admin' | 'sales' | 'warehouse';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location?: string;
  is_default: boolean;
  created_at?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  mobile: string;
  address?: string;
  notes?: string;
  balance: number; // Positive = owes company, Negative = credit
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  mobile?: string;
  address?: string;
  notes?: string;
  balance: number; // Positive = company owes supplier, Negative = advance
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  wood_type: string; // MDF, Counter (كونتر), Plywood (أبلكاش), Beech (زان), Pine (موسكي), etc.
  category?: string;
  size?: string;
  color?: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number; // Sheet count (عدد الألواح)
  min_stock_level: number;
  default_warehouse_id?: string;
  supplier_id?: string;
  notes?: string;
  received_date?: string; // تاريخ استلام/وصول الحمولة (بتاريخ الشحنة، مختلف عن created_at)
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseStock {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
}

export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'purchase_return'
  | 'sales_return'
  | 'manual_add'
  | 'manual_subtract'
  | 'transfer';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  warehouse_id: string;
  movement_type: StockMovementType;
  quantity: number; // Positive or negative
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface SalesInvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name_snapshot: string;
  wood_type_snapshot?: string;
  quantity_sheets: number; // Sheet count
  unit_price: number;
  line_total: number;
}

export interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: Customer;
  warehouse_id: string;
  invoice_date: string;
  status: 'draft' | 'approved' | 'cancelled';
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_balance: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: SalesInvoiceItem[];
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name_snapshot: string;
  wood_type_snapshot?: string;
  quantity_sheets: number;
  unit_price: number;
  line_total: number;
}

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  supplier?: Supplier;
  warehouse_id: string;
  invoice_date: string;
  status: 'draft' | 'approved' | 'cancelled';
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  remaining_balance: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  items?: PurchaseInvoiceItem[];
}

export interface FinancialTransaction {
  id: string;
  transaction_type: 'customer_payment' | 'supplier_payment';
  party_type: 'customer' | 'supplier';
  party_id: string;
  amount: number;
  payment_method: string;
  reference_invoice_id?: string;
  transaction_date: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface ImportPreviewRow<T> {
  rowIndex: number;
  raw: Record<string, any>;
  parsed: Partial<T>;
  status: 'new' | 'update' | 'skip' | 'invalid';
  existingRecord?: T;
  changes?: Record<string, { old: any; new: any }>;
  validationErrors?: string[];
}
