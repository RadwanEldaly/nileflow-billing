-- ================================================================================
-- شركة الدالي لتجارة الأخشاب - Nileflow Billing
-- الهيكل الهرمي لتصنيف المنتجات: التصنيف (Category) -> نوع الخشب (Type) -> المنتج (Product)
-- Migration: 20261001_hierarchical_product_classification.sql
-- ================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== 1. جدول التصنيفات الرئيسية (Categories) ====================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ==================== 2. جدول أنواع الأخشاب (Wood Types) ====================
CREATE TABLE IF NOT EXISTS wood_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wood_types_category_id ON wood_types(category_id);
CREATE INDEX IF NOT EXISTS idx_wood_types_name ON wood_types(name);

-- ==================== 3. تحديث جدول المنتجات (Products) ====================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES wood_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_wood_type ON products(wood_type);

-- ==================== 4. سياسات الأمان RLS ====================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to categories" ON categories;
CREATE POLICY "Allow all access to categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE wood_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to wood_types" ON wood_types;
CREATE POLICY "Allow all access to wood_types" ON wood_types
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==================== 5. إدراج التصنيفات المعتمدة الحالية بأمان ====================
INSERT INTO categories (name, description)
VALUES 
  ('MDF', 'ألواح MDF بمختلف التشطيبات والأنواع'),
  ('كونتر', 'ألواح الكونتر بمختلف الماركات والأنواع'),
  ('5 بلاي', 'ألواح 5 بلاي بمختلف المقاسات والسماكات'),
  ('3 بلاي', 'ألواح 3 بلاي'),
  ('هاي بلاي', 'ألواح هاي بلاي عالية الجودة'),
  ('ميلامين ساندوتش', 'ألواح ميلامين ساندوتش')
ON CONFLICT (name) DO NOTHING;

-- ==================== 6. إدراج أنواع الأخشاب وربطها بالتصنيفات بأمان تام ====================

-- ربط أنواع MDF
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('MDF N.L'),
  ('MDF PVC EV'),
  ('MDF PVC  EV'),
  ('MDF UV LAK'),
  ('MDF 5K')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = 'MDF'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ربط أنواع الكونتر
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('كونتر LG'),
  ('كونتر ايليت'),
  ('كونتر اكريلك')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = 'كونتر'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ربط أنواع 5 بلاي
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('5 بلاي'),
  ('5 بلاي 18M'),
  ('5 بلاي 17M')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = '5 بلاي'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ربط أنواع 3 بلاي
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('3 بلاي')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = '3 بلاي'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ربط أنواع هاي بلاي
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('هاي بلاي'),
  ('هاي بلاي '),
  ('هاي بلاي 18M')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = 'هاي بلاي'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- ربط أنواع ميلامين ساندوتش
INSERT INTO wood_types (name, category_id)
SELECT val.name, c.id
FROM (VALUES 
  ('ميلامين ساندوتش جديد'),
  ('ميلامين ساندوتش مميز')
) AS val(name)
CROSS JOIN categories c
WHERE c.name = 'ميلامين ساندوتش'
ON CONFLICT (name) DO UPDATE SET category_id = EXCLUDED.category_id;

-- الأنواع غير المصنفة قطعيًا تترك بدون تصنيف مسبق ليتم تحديدها يدوياً من الشاشة بأمان
INSERT INTO wood_types (name, category_id)
VALUES ('18M SAITO', NULL)
ON CONFLICT (name) DO NOTHING;

-- ==================== 7. تحديث تصنيفات المنتجات الحالية لتعكس التصنيف الأب ====================
-- تحديث MDF
UPDATE products
SET category = 'MDF',
    category_id = (SELECT id FROM categories WHERE name = 'MDF')
WHERE wood_type IN ('MDF N.L', 'MDF PVC EV', 'MDF PVC  EV', 'MDF UV LAK', 'MDF 5K');

-- تحديث كونتر
UPDATE products
SET category = 'كونتر',
    category_id = (SELECT id FROM categories WHERE name = 'كونتر')
WHERE wood_type IN ('كونتر LG', 'كونتر ايليت', 'كونتر اكريلك');

-- تحديث 5 بلاي
UPDATE products
SET category = '5 بلاي',
    category_id = (SELECT id FROM categories WHERE name = '5 بلاي')
WHERE wood_type IN ('5 بلاي', '5 بلاي 18M', '5 بلاي 17M');

-- تحديث 3 بلاي
UPDATE products
SET category = '3 بلاي',
    category_id = (SELECT id FROM categories WHERE name = '3 بلاي')
WHERE wood_type IN ('3 بلاي');

-- تحديث هاي بلاي
UPDATE products
SET category = 'هاي بلاي',
    category_id = (SELECT id FROM categories WHERE name = 'هاي بلاي')
WHERE wood_type IN ('هاي بلاي', 'هاي بلاي ', 'هاي بلاي 18M');

-- تحديث ميلامين ساندوتش
UPDATE products
SET category = 'ميلامين ساندوتش',
    category_id = (SELECT id FROM categories WHERE name = 'ميلامين ساندوتش')
WHERE wood_type IN ('ميلامين ساندوتش جديد', 'ميلامين ساندوتش مميز');

-- ربط type_id في جدول المنتجات
UPDATE products p
SET type_id = wt.id
FROM wood_types wt
WHERE p.wood_type = wt.name;
