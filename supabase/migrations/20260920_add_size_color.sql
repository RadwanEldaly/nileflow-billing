-- ================================================================================
-- شركة الدالي لتجارة الأخشاب - Nileflow Billing
-- Supabase Migration: إصلاح مشكلة عدم إضافة المنتجات + دعم المقاسات والألوان
-- Created: 2026-09-20
-- Author: Radwan
-- ================================================================================

-- المشكلة الأساسية:
-- ────────────────
-- عمود `code` كان عليه UNIQUE constraint بمفرده
-- اللي يحصل: محاولة إضافة صنف بنفس الكود لكن مقاس/لون مختلف → فشل في الإضافة
-- 
-- الحل:
-- ─────
-- 1. إضافة عمودي size و color للمنتجات
-- 2. حذف UNIQUE constraint القديم على code بمفرده
-- 3. إنشاء UNIQUE constraint جديد على (code, size, color) معاً
--    بحيث يسمح بـ: نفس الكود بمقاسات مختلفة ✅
--    ويمنع: نفس الكود + نفس المقاس + نفس اللون معاً ❌
-- ================================================================================

-- ==================== المرحلة 1: إضافة الحقول الجديدة ====================

-- 1.1 إضافة عمود المقاس واللون لجدول products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS size VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color VARCHAR(100);

-- تعليقات للتوثيق
COMMENT ON COLUMN products.size IS 'حجم/مقاس المنتج، مثلاً: 08"22 أو 18"22';
COMMENT ON COLUMN products.color IS 'لون المنتج، مثلاً: BEYAZ أو MOZAMBI';

-- 1.2 إضافة indexes للبحث والتصفية السريع
CREATE INDEX IF NOT EXISTS idx_products_size ON products(size);
CREATE INDEX IF NOT EXISTS idx_products_color ON products(color);
CREATE INDEX IF NOT EXISTS idx_products_code_size_color ON products(code, size, color);

-- ==================== المرحلة 2: إصلاح القيد الفريد ====================

-- 2.1 حذف القيد الفريد القديم على code بمفرده
-- (قد يكون باسم products_code_key أو شيء آخر)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;

-- 2.2 القيد الفريد الجديد - مركب على (code, size, color)
-- COALESCE: نحول NULL إلى نص فاضي '' عشان UNIQUE يعامله نفس المعاملة
-- (في PostgreSQL، NULL != NULL، فبدونها ممكن يكون عندك قيم NULL كتير)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_size_color_unique
  ON products (code, COALESCE(size, ''), COALESCE(color, ''));

-- تعليق يشرح القيد
COMMENT ON INDEX idx_products_code_size_color_unique IS 
  'منع تكرار نفس الكود + نفس المقاس + نفس اللون، مع السماح بتكرار الكود بمقاسات/ألوان مختلفة';

-- ==================== المرحلة 3: بيانات الفواتير ====================

-- 3.1 إضافة أعمدة المقاس واللون في بنود فواتير المشتريات
ALTER TABLE purchase_invoice_items
  ADD COLUMN IF NOT EXISTS size_snapshot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_snapshot VARCHAR(100);

COMMENT ON COLUMN purchase_invoice_items.size_snapshot IS 
  'نسخة من المقاس وقت إنشاء الفاتورة (لا تتغيّر لو الصنف اتعدّل بعدين)';
COMMENT ON COLUMN purchase_invoice_items.color_snapshot IS 
  'نسخة من اللون وقت إنشاء الفاتورة (لا تتغيّر لو الصنف اتعدّل بعدين)';

-- 3.2 إضافة نفس الأعمدة في بنود فواتير البيع
ALTER TABLE sales_invoice_items
  ADD COLUMN IF NOT EXISTS size_snapshot VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_snapshot VARCHAR(100);

COMMENT ON COLUMN sales_invoice_items.size_snapshot IS 
  'نسخة من المقاس وقت إنشاء فاتورة البيع (لا تتغيّر لو الصنف اتعدّل بعدين)';
COMMENT ON COLUMN sales_invoice_items.color_snapshot IS 
  'نسخة من اللون وقت إنشاء فاتورة البيع (لا تتغيّر لو الصنف اتعدّل بعدين)';

-- ==================== المرحلة 4: RLS Policies ====================
-- (آمان طبقة الصفوف - اختياري حسب احتياجاتك)

-- تفعيل RLS على جدول products إذا كان معطّل
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- السماح بكل العمليات (للتطوير والاستخدام)
-- في الإنتاج، غيّر هذا لقيود أكثر أماناً
DROP POLICY IF EXISTS "Allow all access to products" ON products;
CREATE POLICY "Allow all access to products" ON products
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- نفس الشيء للـ purchase_invoice_items
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to purchase_invoice_items" ON purchase_invoice_items;
CREATE POLICY "Allow all access to purchase_invoice_items" ON purchase_invoice_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ونفس الشيء للـ sales_invoice_items
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to sales_invoice_items" ON sales_invoice_items;
CREATE POLICY "Allow all access to sales_invoice_items" ON sales_invoice_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== المرحلة 5: التحقق والتجميل ====================

-- عرض الجداول الجديدة (للتأكد):
-- SELECT * FROM products LIMIT 1;
-- SELECT column_name, data_type FROM information_schema.columns 
--   WHERE table_name = 'products' AND column_name IN ('size', 'color');

-- ================================================================================
-- ✅ تم بنجاح!
-- الآن يمكنك إضافة نفس الكود بمقاسات/ألوان مختلفة بدون مشاكل
-- ================================================================================