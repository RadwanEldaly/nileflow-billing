-- NileFlow Billing Database Schema Migration
-- Created: 2026-09-18

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    governorate TEXT,
    notes TEXT,
    total_purchases_cache NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_governorate ON customers(governorate);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    product_code TEXT,
    type_category TEXT NOT NULL DEFAULT 'thinner', -- e.g. thinner, nafd, solvent, etc.
    weight TEXT, -- e.g. 1 kg, 5 kg, 20 kg
    size TEXT,
    unit TEXT DEFAULT 'carton', -- e.g. carton, piece, drum, bottle
    current_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(type_category);

-- 4. PRODUCT PRICE HISTORY TABLE
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);

-- 5. INVOICE NUMBER SEQUENCE AND FUNCTION
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    seq_val INT;
    year_str TEXT;
BEGIN
    seq_val := nextval('invoice_number_seq');
    year_str := TO_CHAR(NOW(), 'YYYY');
    RETURN 'NF-' || year_str || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL DEFAULT generate_invoice_number(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 7. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    product_details_snapshot TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- 8. CUSTOMER REWARDS TABLE
CREATE TABLE IF NOT EXISTS customer_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    target_month TEXT NOT NULL, -- Format: YYYY-MM
    discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
    gift_product_id UUID REFERENCES products(id),
    gift_quantity NUMERIC(10, 2) DEFAULT 0.00,
    reward_status TEXT DEFAULT 'awarded' CHECK (reward_status IN ('pending', 'awarded', 'claimed')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. IMPORT LOGS TABLE
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_type TEXT NOT NULL CHECK (import_type IN ('customers', 'products')),
    filename TEXT NOT NULL,
    added_count INT DEFAULT 0,
    updated_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    imported_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
