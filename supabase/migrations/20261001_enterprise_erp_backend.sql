-- ================================================================================
-- شركة الدالي لتجارة الأخشاب - Nileflow Billing ERP
-- Enterprise Database Architecture & Atomic Transaction Engine
-- Migration: 20261001_enterprise_erp_backend.sql
-- ================================================================================

SET search_path TO public, extensions;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================================
-- 1. جداول التصنيفات وأنواع الأخشاب (Categories & Wood Types)
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);

CREATE TABLE IF NOT EXISTS public.wood_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wood_types_category_id ON public.wood_types(category_id);
CREATE INDEX IF NOT EXISTS idx_wood_types_name ON public.wood_types(name);

-- ربط جدول المنتجات بالتصنيفات
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.wood_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON public.products(type_id);

-- ================================================================================
-- 2. جدول سجل تدقيق العمليات الحساسة (Audit Logs)
-- ================================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    performed_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ================================================================================
-- 3. فهارس الأداء العالي لسرعة الاستعلامات والتقارير (High-Performance Indexes)
-- ================================================================================

CREATE INDEX IF NOT EXISTS idx_sales_inv_cust ON public.sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_date ON public.sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_inv_num ON public.sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_inv_status ON public.sales_invoices(status);

CREATE INDEX IF NOT EXISTS idx_sales_items_inv ON public.sales_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_prod ON public.sales_invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_purch_inv_supp ON public.purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purch_inv_date ON public.purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purch_inv_num ON public.purchase_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_purch_items_inv ON public.purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purch_items_prod ON public.purchase_invoice_items(product_id);

CREATE INDEX IF NOT EXISTS idx_movements_prod_wh ON public.stock_movements(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON public.stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_fin_tx_party ON public.financial_transactions(party_type, party_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON public.financial_transactions(transaction_date);

-- ================================================================================
-- 4. سياسات الأمان (Row Level Security - RLS)
-- ================================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.wood_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to wood_types" ON public.wood_types;
CREATE POLICY "Allow all access to wood_types" ON public.wood_types FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ================================================================================
-- 5. إدراج تصنيفات وأنواع الخشب الأساسية بأمان دون المساس بالبيانات
-- ================================================================================

INSERT INTO public.categories (name, description)
VALUES 
  ('MDF', 'ألواح MDF بمختلف التشطيبات والأنواع'),
  ('كونتر', 'ألواح الكونتر بمختلف الماركات والأنواع'),
  ('5 بلاي', 'ألواح 5 بلاي بمختلف المقاسات والسماكات'),
  ('3 بلاي', 'ألواح 3 بلاي'),
  ('هاي بلاي', 'ألواح هاي بلاي عالية الجودة'),
  ('ميلامين ساندوتش', 'ألواح ميلامين ساندوتش')
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع MDF
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('MDF N.L'),
  ('MDF PVC EV'),
  ('MDF PVC  EV'),
  ('MDF UV LAK'),
  ('MDF 5K')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = 'MDF'
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع الكونتر
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('كونتر LG'),
  ('كونتر ايليت'),
  ('كونتر اكريلك')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = 'كونتر'
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع 5 بلاي
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('5 بلاي'),
  ('5 بلاي 18M'),
  ('5 بلاي 17M')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = '5 بلاي'
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع 3 بلاي
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('3 بلاي')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = '3 بلاي'
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع هاي بلاي
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('هاي بلاي'),
  ('هاي بلاي '),
  ('هاي بلاي 18M')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = 'هاي بلاي'
ON CONFLICT (name) DO NOTHING;

-- ربط أنواع ميلامين ساندوتش
INSERT INTO public.wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('ميلامين ساندوتش جديد'),
  ('ميلامين ساندوتش مميز')
) AS val(name)
CROSS JOIN public.categories c
WHERE c.name = 'ميلامين ساندوتش'
ON CONFLICT (name) DO NOTHING;


-- ================================================================================
-- 6. الإجراءات المخزنة الذرية (PostgreSQL Atomic Stored Procedures / RPC)
-- ================================================================================

-- --------------------------------------------------------------------------------
-- 6.1 إنشاء فاتورة مبيعات ذرية بالكامل (Atomic Sales Invoice Creation)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_sales_invoice_atomic(
    p_invoice JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_invoice_id UUID;
    v_customer_id UUID;
    v_warehouse_id UUID;
    v_invoice_number TEXT;
    v_invoice_date DATE;
    v_subtotal NUMERIC(12, 2);
    v_discount NUMERIC(12, 2);
    v_total NUMERIC(12, 2);
    v_paid_amount NUMERIC(12, 2);
    v_remaining_balance NUMERIC(12, 2);
    v_notes TEXT;
    
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC(10, 2);
    v_unit_price NUMERIC(10, 2);
    v_line_total NUMERIC(12, 2);
    v_prod_name TEXT;
    v_wood_type TEXT;
    v_size TEXT;
    v_color TEXT;
    v_cur_stock NUMERIC(10, 2);
    
    v_result JSONB;
BEGIN
    v_customer_id := (p_invoice->>'customer_id')::UUID;
    v_warehouse_id := (p_invoice->>'warehouse_id')::UUID;
    v_invoice_number := p_invoice->>'invoice_number';
    v_invoice_date := COALESCE((p_invoice->>'invoice_date')::DATE, CURRENT_DATE);
    v_subtotal := COALESCE((p_invoice->>'subtotal')::NUMERIC, 0);
    v_discount := COALESCE((p_invoice->>'discount')::NUMERIC, 0);
    v_total := COALESCE((p_invoice->>'total')::NUMERIC, 0);
    v_paid_amount := COALESCE((p_invoice->>'paid_amount')::NUMERIC, 0);
    v_remaining_balance := COALESCE((p_invoice->>'remaining_balance')::NUMERIC, 0);
    v_notes := COALESCE(p_invoice->>'notes', '');

    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = v_customer_id) THEN
        RAISE EXCEPTION 'Customer with ID % not found', v_customer_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.sales_invoices WHERE invoice_number = v_invoice_number) THEN
        RAISE EXCEPTION 'Invoice number % already exists', v_invoice_number;
    END IF;

    -- 1. إدراج رأس الفاتورة
    INSERT INTO public.sales_invoices (
        invoice_number,
        customer_id,
        warehouse_id,
        invoice_date,
        status,
        subtotal,
        discount,
        total,
        paid_amount,
        remaining_balance,
        notes
    ) VALUES (
        v_invoice_number,
        v_customer_id,
        v_warehouse_id,
        v_invoice_date,
        'approved',
        v_subtotal,
        v_discount,
        v_total,
        v_paid_amount,
        v_remaining_balance,
        v_notes
    )
    RETURNING id INTO v_invoice_id;

    -- 2. إدراج البنود وخصم المخزون وتسجيل الحركات
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_product_id := NULL;
            IF v_item->>'product_id' IS NOT NULL AND (v_item->>'product_id') <> '' THEN
                v_product_id := (v_item->>'product_id')::UUID;
            END IF;

            v_prod_name := COALESCE(v_item->>'product_name_snapshot', 'لوح خشب');
            v_wood_type := COALESCE(v_item->>'wood_type_snapshot', 'ألواح');
            v_qty := COALESCE((v_item->>'quantity_sheets')::NUMERIC, 1);
            v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
            v_line_total := COALESCE((v_item->>'line_total')::NUMERIC, v_qty * v_unit_price);
            v_size := v_item->>'size_snapshot';
            v_color := v_item->>'color_snapshot';

            INSERT INTO public.sales_invoice_items (
                invoice_id,
                product_id,
                product_name_snapshot,
                wood_type_snapshot,
                quantity_sheets,
                unit_price,
                line_total,
                size_snapshot,
                color_snapshot
            ) VALUES (
                v_invoice_id,
                v_product_id,
                v_prod_name,
                v_wood_type,
                v_qty,
                v_unit_price,
                v_line_total,
                v_size,
                v_color
            );

            IF v_product_id IS NOT NULL THEN
                SELECT stock_quantity INTO v_cur_stock
                FROM public.products
                WHERE id = v_product_id
                FOR UPDATE;

                IF FOUND THEN
                    UPDATE public.products
                    SET stock_quantity = stock_quantity - v_qty,
                        updated_at = NOW()
                    WHERE id = v_product_id;

                    INSERT INTO public.stock_movements (
                        product_id,
                        warehouse_id,
                        movement_type,
                        quantity,
                        reference_id,
                        reference_type,
                        notes
                    ) VALUES (
                        v_product_id,
                        v_warehouse_id,
                        'sale',
                        -v_qty,
                        v_invoice_number,
                        'sales_invoice',
                        'فاتورة بيع ألواح رقم ' || v_invoice_number
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 3. تحديث رصيد العميل
    IF v_remaining_balance <> 0 THEN
        UPDATE public.customers
        SET balance = COALESCE(balance, 0) + v_remaining_balance,
            updated_at = NOW()
        WHERE id = v_customer_id;
    END IF;

    -- 4. تسجيل دفعة مالية إن وجدت
    IF v_paid_amount > 0 THEN
        INSERT INTO public.financial_transactions (
            transaction_type,
            party_type,
            party_id,
            amount,
            payment_method,
            reference_invoice_id,
            transaction_date,
            notes
        ) VALUES (
            'customer_payment',
            'customer',
            v_customer_id,
            v_paid_amount,
            'cash',
            v_invoice_id,
            v_invoice_date,
            'سداد نقدي عند تحرير فاتورة بيع رقم ' || v_invoice_number
        );
    END IF;

    -- 5. سجل التدقيق
    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'CREATE_SALES_INVOICE',
        'sales_invoice',
        v_invoice_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'customer_id', v_customer_id,
            'total', v_total,
            'paid_amount', v_paid_amount,
            'remaining_balance', v_remaining_balance,
            'items_count', jsonb_array_length(p_items)
        )
    );

    SELECT jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------------------
-- 6.2 إنشاء فاتورة مشتريات وتوريد ذرية بالكامل (Atomic Purchase Invoice Creation)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_purchase_invoice_atomic(
    p_invoice JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_invoice_id UUID;
    v_supplier_id UUID;
    v_warehouse_id UUID;
    v_invoice_number TEXT;
    v_invoice_date DATE;
    v_subtotal NUMERIC(12, 2);
    v_discount NUMERIC(12, 2);
    v_total NUMERIC(12, 2);
    v_paid_amount NUMERIC(12, 2);
    v_remaining_balance NUMERIC(12, 2);
    v_notes TEXT;
    
    v_item JSONB;
    v_product_id UUID;
    v_qty NUMERIC(10, 2);
    v_unit_price NUMERIC(10, 2);
    v_line_total NUMERIC(12, 2);
    v_prod_name TEXT;
    v_wood_type TEXT;
    v_cur_stock NUMERIC(10, 2);
    
    v_result JSONB;
BEGIN
    v_supplier_id := (p_invoice->>'supplier_id')::UUID;
    v_warehouse_id := (p_invoice->>'warehouse_id')::UUID;
    v_invoice_number := p_invoice->>'invoice_number';
    v_invoice_date := COALESCE((p_invoice->>'invoice_date')::DATE, CURRENT_DATE);
    v_subtotal := COALESCE((p_invoice->>'subtotal')::NUMERIC, 0);
    v_discount := COALESCE((p_invoice->>'discount')::NUMERIC, 0);
    v_total := COALESCE((p_invoice->>'total')::NUMERIC, 0);
    v_paid_amount := COALESCE((p_invoice->>'paid_amount')::NUMERIC, 0);
    v_remaining_balance := COALESCE((p_invoice->>'remaining_balance')::NUMERIC, 0);
    v_notes := COALESCE(p_invoice->>'notes', '');

    IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE id = v_supplier_id) THEN
        RAISE EXCEPTION 'Supplier with ID % not found', v_supplier_id;
    END IF;

    IF EXISTS (SELECT 1 FROM public.purchase_invoices WHERE invoice_number = v_invoice_number) THEN
        RAISE EXCEPTION 'Purchase invoice number % already exists', v_invoice_number;
    END IF;

    INSERT INTO public.purchase_invoices (
        invoice_number,
        supplier_id,
        warehouse_id,
        invoice_date,
        status,
        subtotal,
        discount,
        total,
        paid_amount,
        remaining_balance,
        notes
    ) VALUES (
        v_invoice_number,
        v_supplier_id,
        v_warehouse_id,
        v_invoice_date,
        'approved',
        v_subtotal,
        v_discount,
        v_total,
        v_paid_amount,
        v_remaining_balance,
        v_notes
    )
    RETURNING id INTO v_invoice_id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_product_id := NULL;
            IF v_item->>'product_id' IS NOT NULL AND (v_item->>'product_id') <> '' THEN
                v_product_id := (v_item->>'product_id')::UUID;
            END IF;

            v_prod_name := COALESCE(v_item->>'product_name_snapshot', 'لوح خشب');
            v_wood_type := COALESCE(v_item->>'wood_type_snapshot', 'ألواح');
            v_qty := COALESCE((v_item->>'quantity_sheets')::NUMERIC, 1);
            v_unit_price := COALESCE((v_item->>'unit_price')::NUMERIC, 0);
            v_line_total := COALESCE((v_item->>'line_total')::NUMERIC, v_qty * v_unit_price);

            INSERT INTO public.purchase_invoice_items (
                invoice_id,
                product_id,
                product_name_snapshot,
                wood_type_snapshot,
                quantity_sheets,
                unit_price,
                line_total
            ) VALUES (
                v_invoice_id,
                v_product_id,
                v_prod_name,
                v_wood_type,
                v_qty,
                v_unit_price,
                v_line_total
            );

            IF v_product_id IS NOT NULL THEN
                SELECT stock_quantity INTO v_cur_stock
                FROM public.products
                WHERE id = v_product_id
                FOR UPDATE;

                IF FOUND THEN
                    UPDATE public.products
                    SET stock_quantity = stock_quantity + v_qty,
                        purchase_price = CASE WHEN v_unit_price > 0 THEN v_unit_price ELSE purchase_price END,
                        updated_at = NOW()
                    WHERE id = v_product_id;

                    INSERT INTO public.stock_movements (
                        product_id,
                        warehouse_id,
                        movement_type,
                        quantity,
                        reference_id,
                        reference_type,
                        notes
                    ) VALUES (
                        v_product_id,
                        v_warehouse_id,
                        'purchase',
                        v_qty,
                        v_invoice_number,
                        'purchase_invoice',
                        'فاتورة شراء وتوريد ألواح رقم ' || v_invoice_number
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    IF v_remaining_balance <> 0 THEN
        UPDATE public.suppliers
        SET balance = COALESCE(balance, 0) + v_remaining_balance,
            updated_at = NOW()
        WHERE id = v_supplier_id;
    END IF;

    IF v_paid_amount > 0 THEN
        INSERT INTO public.financial_transactions (
            transaction_type,
            party_type,
            party_id,
            amount,
            payment_method,
            reference_invoice_id,
            transaction_date,
            notes
        ) VALUES (
            'supplier_payment',
            'supplier',
            v_supplier_id,
            v_paid_amount,
            'cash',
            v_invoice_id,
            v_invoice_date,
            'دفعة مسددة للمورد عند تحرير فاتورة شراء رقم ' || v_invoice_number
        );
    END IF;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'CREATE_PURCHASE_INVOICE',
        'purchase_invoice',
        v_invoice_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_invoice_number,
            'supplier_id', v_supplier_id,
            'total', v_total,
            'paid_amount', v_paid_amount,
            'remaining_balance', v_remaining_balance,
            'items_count', jsonb_array_length(p_items)
        )
    );

    SELECT jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------------------
-- 6.3 إلغاء أو حذف فاتورة مبيعات ذرياً (Atomic Sales Invoice Cancellation)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_sales_invoice_atomic(
    p_invoice_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_inv FROM public.sales_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales invoice % not found', p_invoice_id;
    END IF;

    FOR v_item IN SELECT * FROM public.sales_invoice_items WHERE invoice_id = p_invoice_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + v_item.quantity_sheets,
                updated_at = NOW()
            WHERE id = v_item.product_id;

            INSERT INTO public.stock_movements (
                product_id,
                warehouse_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                v_item.product_id,
                v_inv.warehouse_id,
                'sales_return',
                v_item.quantity_sheets,
                v_inv.invoice_number,
                'sales_invoice_cancellation',
                'إلغاء فاتورة بيع رقم ' || v_inv.invoice_number || ' - إعادة الألواح'
            );
        END IF;
    END LOOP;

    IF v_inv.remaining_balance <> 0 THEN
        UPDATE public.customers
        SET balance = COALESCE(balance, 0) - v_inv.remaining_balance,
            updated_at = NOW()
        WHERE id = v_inv.customer_id;
    END IF;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'CANCEL_SALES_INVOICE',
        'sales_invoice',
        p_invoice_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_inv.invoice_number,
            'customer_id', v_inv.customer_id,
            'total', v_inv.total
        )
    );

    DELETE FROM public.sales_invoices WHERE id = p_invoice_id;

    RETURN jsonb_build_object('success', true, 'deleted_id', p_invoice_id);
END;
$$;


-- --------------------------------------------------------------------------------
-- 6.4 إلغاء أو حذف فاتورة مشتريات ذرياً (Atomic Purchase Invoice Cancellation)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_purchase_invoice_atomic(
    p_invoice_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_inv RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_inv FROM public.purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice % not found', p_invoice_id;
    END IF;

    FOR v_item IN SELECT * FROM public.purchase_invoice_items WHERE invoice_id = p_invoice_id
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - v_item.quantity_sheets,
                updated_at = NOW()
            WHERE id = v_item.product_id;

            INSERT INTO public.stock_movements (
                product_id,
                warehouse_id,
                movement_type,
                quantity,
                reference_id,
                reference_type,
                notes
            ) VALUES (
                v_item.product_id,
                v_inv.warehouse_id,
                'purchase_return',
                -v_item.quantity_sheets,
                v_inv.invoice_number,
                'purchase_invoice_cancellation',
                'إلغاء فاتورة شراء رقم ' || v_inv.invoice_number || ' - خصم الكميات'
            );
        END IF;
    END LOOP;

    IF v_inv.remaining_balance <> 0 THEN
        UPDATE public.suppliers
        SET balance = COALESCE(balance, 0) - v_inv.remaining_balance,
            updated_at = NOW()
        WHERE id = v_inv.supplier_id;
    END IF;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'CANCEL_PURCHASE_INVOICE',
        'purchase_invoice',
        p_invoice_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_inv.invoice_number,
            'supplier_id', v_inv.supplier_id,
            'total', v_inv.total
        )
    );

    DELETE FROM public.purchase_invoices WHERE id = p_invoice_id;

    RETURN jsonb_build_object('success', true, 'deleted_id', p_invoice_id);
END;
$$;


-- --------------------------------------------------------------------------------
-- 6.5 تسجيل مرتجع مبيعات ذري (Atomic Sales Return)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_sales_return_atomic(
    p_return JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_inv_id UUID;
    v_cust_id UUID;
    v_wh_id UUID;
    v_inv_num TEXT;
    v_total NUMERIC(12, 2);
    v_method TEXT;
    v_notes TEXT;
    
    v_item JSONB;
    v_prod_id UUID;
    v_qty NUMERIC(10, 2);
    v_price NUMERIC(10, 2);
    v_line_tot NUMERIC(12, 2);
    v_pname TEXT;
    v_wtype TEXT;
BEGIN
    v_cust_id := (p_return->>'customerId')::UUID;
    v_wh_id := (p_return->>'warehouseId')::UUID;
    v_inv_num := p_return->>'invoiceNumber';
    v_total := COALESCE((p_return->>'total')::NUMERIC, 0);
    v_method := COALESCE(p_return->>'refundMethod', 'credit');
    v_notes := COALESCE(p_return->>'notes', 'مرتجع مبيعات ألواح');

    INSERT INTO public.sales_invoices (
        invoice_number,
        customer_id,
        warehouse_id,
        invoice_date,
        status,
        subtotal,
        discount,
        total,
        paid_amount,
        remaining_balance,
        notes
    ) VALUES (
        v_inv_num,
        v_cust_id,
        v_wh_id,
        CURRENT_DATE,
        'approved',
        v_total,
        0,
        v_total,
        CASE WHEN v_method = 'cash' THEN v_total ELSE 0 END,
        CASE WHEN v_method = 'credit' THEN v_total ELSE 0 END,
        v_notes
    )
    RETURNING id INTO v_inv_id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_prod_id := NULL;
            IF v_item->>'productId' IS NOT NULL AND (v_item->>'productId') <> '' THEN
                v_prod_id := (v_item->>'productId')::UUID;
            END IF;

            v_pname := COALESCE(v_item->>'productName', 'لوح خشب مرتجع');
            v_wtype := COALESCE(v_item->>'woodType', 'MDF');
            v_qty := COALESCE((v_item->>'quantitySheets')::NUMERIC, 1);
            v_price := COALESCE((v_item->>'unitPrice')::NUMERIC, 0);
            v_line_tot := COALESCE((v_item->>'lineTotal')::NUMERIC, v_qty * v_price);

            INSERT INTO public.sales_invoice_items (
                invoice_id,
                product_id,
                product_name_snapshot,
                wood_type_snapshot,
                quantity_sheets,
                unit_price,
                line_total
            ) VALUES (
                v_inv_id,
                v_prod_id,
                v_pname,
                v_wtype,
                v_qty,
                v_price,
                v_line_tot
            );

            IF v_prod_id IS NOT NULL THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity + v_qty,
                    updated_at = NOW()
                WHERE id = v_prod_id;

                INSERT INTO public.stock_movements (
                    product_id,
                    warehouse_id,
                    movement_type,
                    quantity,
                    reference_id,
                    reference_type,
                    notes
                ) VALUES (
                    v_prod_id,
                    v_wh_id,
                    'sales_return',
                    v_qty,
                    v_inv_num,
                    'sales_return',
                    'مرتجع مبيعات رقم ' || v_inv_num
                );
            END IF;
        END LOOP;
    END IF;

    IF v_method = 'credit' THEN
        UPDATE public.customers
        SET balance = COALESCE(balance, 0) - v_total,
            updated_at = NOW()
        WHERE id = v_cust_id;
    ELSE
        INSERT INTO public.financial_transactions (
            transaction_type,
            party_type,
            party_id,
            amount,
            payment_method,
            reference_invoice_id,
            transaction_date,
            notes
        ) VALUES (
            'customer_payment',
            'customer',
            v_cust_id,
            -v_total,
            'cash',
            v_inv_id,
            CURRENT_DATE,
            'رد نقدي لمرتجع مبيعات رقم ' || v_inv_num
        );
    END IF;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'PROCESS_SALES_RETURN',
        'sales_return',
        v_inv_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_inv_num,
            'customer_id', v_cust_id,
            'total', v_total,
            'method', v_method
        )
    );

    RETURN jsonb_build_object('success', true, 'invoice_id', v_inv_id, 'invoice_number', v_inv_num);
END;
$$;


-- --------------------------------------------------------------------------------
-- 6.6 تسجيل مرتجع مشتريات ذري (Atomic Purchase Return)
-- --------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_purchase_return_atomic(
    p_return JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_inv_id UUID;
    v_supp_id UUID;
    v_wh_id UUID;
    v_inv_num TEXT;
    v_total NUMERIC(12, 2);
    v_method TEXT;
    v_notes TEXT;
    
    v_item JSONB;
    v_prod_id UUID;
    v_qty NUMERIC(10, 2);
    v_price NUMERIC(10, 2);
    v_line_tot NUMERIC(12, 2);
    v_pname TEXT;
    v_wtype TEXT;
BEGIN
    v_supp_id := (p_return->>'supplierId')::UUID;
    v_wh_id := (p_return->>'warehouseId')::UUID;
    v_inv_num := p_return->>'invoiceNumber';
    v_total := COALESCE((p_return->>'total')::NUMERIC, 0);
    v_method := COALESCE(p_return->>'refundMethod', 'credit');
    v_notes := COALESCE(p_return->>'notes', 'مرتجع مشتريات ألواح');

    INSERT INTO public.purchase_invoices (
        invoice_number,
        supplier_id,
        warehouse_id,
        invoice_date,
        status,
        subtotal,
        discount,
        total,
        paid_amount,
        remaining_balance,
        notes
    ) VALUES (
        v_inv_num,
        v_supp_id,
        v_wh_id,
        CURRENT_DATE,
        'approved',
        v_total,
        0,
        v_total,
        CASE WHEN v_method = 'cash' THEN v_total ELSE 0 END,
        CASE WHEN v_method = 'credit' THEN v_total ELSE 0 END,
        v_notes
    )
    RETURNING id INTO v_inv_id;

    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_prod_id := NULL;
            IF v_item->>'productId' IS NOT NULL AND (v_item->>'productId') <> '' THEN
                v_prod_id := (v_item->>'productId')::UUID;
            END IF;

            v_pname := COALESCE(v_item->>'productName', 'لوح خشب مرتجع للمورد');
            v_wtype := COALESCE(v_item->>'woodType', 'MDF');
            v_qty := COALESCE((v_item->>'quantitySheets')::NUMERIC, 1);
            v_price := COALESCE((v_item->>'unitPrice')::NUMERIC, 0);
            v_line_tot := COALESCE((v_item->>'lineTotal')::NUMERIC, v_qty * v_price);

            INSERT INTO public.purchase_invoice_items (
                invoice_id,
                product_id,
                product_name_snapshot,
                wood_type_snapshot,
                quantity_sheets,
                unit_price,
                line_total
            ) VALUES (
                v_inv_id,
                v_prod_id,
                v_pname,
                v_wtype,
                v_qty,
                v_price,
                v_line_tot
            );

            IF v_prod_id IS NOT NULL THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity - v_qty,
                    updated_at = NOW()
                WHERE id = v_prod_id;

                INSERT INTO public.stock_movements (
                    product_id,
                    warehouse_id,
                    movement_type,
                    quantity,
                    reference_id,
                    reference_type,
                    notes
                ) VALUES (
                    v_prod_id,
                    v_wh_id,
                    'purchase_return',
                    -v_qty,
                    v_inv_num,
                    'purchase_return',
                    'مرتجع مشتريات رقم ' || v_inv_num
                );
            END IF;
        END LOOP;
    END IF;

    IF v_method = 'credit' THEN
        UPDATE public.suppliers
        SET balance = COALESCE(balance, 0) - v_total,
            updated_at = NOW()
        WHERE id = v_supp_id;
    END IF;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, details)
    VALUES (
        'PROCESS_PURCHASE_RETURN',
        'purchase_return',
        v_inv_id::TEXT,
        jsonb_build_object(
            'invoice_number', v_inv_num,
            'supplier_id', v_supp_id,
            'total', v_total,
            'method', v_method
        )
    );

    RETURN jsonb_build_object('success', true, 'invoice_id', v_inv_id, 'invoice_number', v_inv_num);
END;
$$;

-- منح صلاحيات التنفيذ لـ anon و authenticated
GRANT EXECUTE ON FUNCTION public.create_sales_invoice_atomic(JSONB, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_purchase_invoice_atomic(JSONB, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_sales_invoice_atomic(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_purchase_invoice_atomic(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_sales_return_atomic(JSONB, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_purchase_return_atomic(JSONB, JSONB) TO anon, authenticated, service_role;
