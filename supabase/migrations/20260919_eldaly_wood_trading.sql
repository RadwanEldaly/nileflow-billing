-- شركة الدالي لتجارة الأخشاب - Database Schema Migration
-- Created: 2026-09-19

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'warehouse')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WAREHOUSES TABLE
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    notes TEXT,
    balance NUMERIC(12, 2) DEFAULT 0.00, -- Positive = customer owes money, Negative = customer credit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 4. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    notes TEXT,
    balance NUMERIC(12, 2) DEFAULT 0.00, -- Positive = we owe supplier, Negative = supplier credit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 5. PRODUCTS TABLE (WOODEN SHEETS ONLY / الألواح الخشبية)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    wood_type TEXT NOT NULL DEFAULT 'MDF', -- e.g. MDF, Counter, Plywood (أبلكاش), Beech (زان), Pine (موسكي)
    category TEXT DEFAULT 'ألواح أخشاب',
    purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Sheet Count (عدد الألواح)
    min_stock_level NUMERIC(10, 2) DEFAULT 10.00,
    default_warehouse_id UUID REFERENCES warehouses(id),
    supplier_id UUID REFERENCES suppliers(id),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_wood_type ON products(wood_type);

-- 6. WAREHOUSE STOCK TABLE
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(warehouse_id, product_id)
);

-- 7. STOCK MOVEMENTS LOG
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN ('purchase', 'sale', 'purchase_return', 'sales_return', 'manual_add', 'manual_subtract', 'transfer')
    ),
    quantity NUMERIC(10, 2) NOT NULL, -- positive or negative
    reference_id TEXT,
    reference_type TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_warehouse ON stock_movements(warehouse_id);

-- 8. SALES INVOICES TABLE
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SALES INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    wood_type_snapshot TEXT,
    quantity_sheets NUMERIC(10, 2) NOT NULL DEFAULT 1.00, -- Number of wooden sheets
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 10. PURCHASE INVOICES TABLE
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PURCHASE INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    wood_type_snapshot TEXT,
    quantity_sheets NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 12. FINANCIAL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('customer_payment', 'supplier_payment')),
    party_type TEXT NOT NULL CHECK (party_type IN ('customer', 'supplier')),
    party_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    reference_invoice_id UUID,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
