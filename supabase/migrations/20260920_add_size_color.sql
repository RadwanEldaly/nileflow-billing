-- شركة الدالي لتجارة الأخشاب - إضافة المقاس واللون + إصلاح مشكلة عدم إضافة المنتجات
-- Created: 2026-09-20
--
-- المشكلة اللي كانت بتمنع إضافة المنتجات:
-- عمود code كان عليه قيد UNIQUE بمفرده، فأي صنف بنفس الكود ومقاس/لون مختلف
-- كان بيفشل في الإضافة من غير أي رسالة واضحة للمستخدم.
--
-- الحل: نضيف size و color، ونستبدل القيد الفريد المفرد على code بقيد مركب
-- على (code, size, color) بحيث يفرق بين نفس الكود بمقاسات/ألوان مختلفة،
-- ويمنع فعلياً تكرار نفس الصنف (نفس الكود + نفس المقاس + نفس اللون).

-- 1) إضافة عمودي المقاس واللون لجدول المنتجات
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

CREATE INDEX IF NOT EXISTS idx_products_size ON products(size);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);

-- 2) إزالة القيد الفريد القديم على code بمفرده (اسمه الافتراضي products_code_key)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;

-- 3) قيد فريد جديد يسمح بتكرار الكود لو المقاس أو اللون مختلف،
--    لكنه يمنع تكرار نفس الكود + نفس المقاس + نفس اللون بالظبط.
--    (COALESCE عشان لو المقاس أو اللون فاضي NULL، الـ UNIQUE في بوستجرس
--     بيتعامل مع NULL كقيم مختلفة دايماً، فبنحولها لنص فاضي بدل NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_size_color_unique
  ON products (code, COALESCE(size, ''), COALESCE(color, ''));

-- 4) إضافة نفس الحقول لبنود فواتير المشتريات والمبيعات
--    (snapshot يعني نسخة تاريخية وقت الفاتورة، ما تتغيرش لو الصنف اتعدل بعدين)
ALTER TABLE purchase_invoice_items
  ADD COLUMN IF NOT EXISTS size_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS color_snapshot TEXT;

ALTER TABLE sales_invoice_items
  ADD COLUMN IF NOT EXISTS size_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS color_snapshot TEXT;
