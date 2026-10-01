import { supabase } from '../lib/supabaseClient';
import { Category, WoodType, Product } from '../types';

// ============================================================================
// البذور المعتمدة استناداً للفحص الدقيق لقاعدة البيانات الحية (323 صنف خشب)
// ============================================================================
export const SEED_CATEGORIES: Array<{ id: string; name: string; description: string }> = [
  { id: 'cat-mdf', name: 'MDF', description: 'ألواح MDF بمختلف التشطيبات والأنواع (N.L, PVC EV, UV LAK, 5K)' },
  { id: 'cat-counter', name: 'كونتر', description: 'ألواح الكونتر بمختلف الماركات والتشطيبات (LG, ايليت, اكريلك)' },
  { id: 'cat-5ply', name: '5 بلاي', description: 'ألواح 5 بلاي بمختلف المقاسات والسماكات (17M, 18M)' },
  { id: 'cat-3ply', name: '3 بلاي', description: 'ألواح 3 بلاي' },
  { id: 'cat-highply', name: 'هاي بلاي', description: 'ألواح هاي بلاي عالية الجودة' },
  { id: 'cat-melamine', name: 'ميلامين ساندوتش', description: 'ألواح ميلامين ساندوتش (جديد ومميز)' },
];

export const SEED_WOOD_TYPES: Array<{ id: string; name: string; category_id: string | null }> = [
  // MDF types
  { id: 'type-mdf-nl', name: 'MDF N.L', category_id: 'cat-mdf' },
  { id: 'type-mdf-pvc-ev', name: 'MDF PVC EV', category_id: 'cat-mdf' },
  { id: 'type-mdf-pvc-ev-space', name: 'MDF PVC  EV', category_id: 'cat-mdf' },
  { id: 'type-mdf-uv-lak', name: 'MDF UV LAK', category_id: 'cat-mdf' },
  { id: 'type-mdf-5k', name: 'MDF 5K', category_id: 'cat-mdf' },

  // كونتر types
  { id: 'type-counter-lg', name: 'كونتر LG', category_id: 'cat-counter' },
  { id: 'type-counter-elite', name: 'كونتر ايليت', category_id: 'cat-counter' },
  { id: 'type-counter-acrylic', name: 'كونتر اكريلك', category_id: 'cat-counter' },

  // 5 بلاي types
  { id: 'type-5ply', name: '5 بلاي', category_id: 'cat-5ply' },
  { id: 'type-5ply-18m', name: '5 بلاي 18M', category_id: 'cat-5ply' },
  { id: 'type-5ply-17m', name: '5 بلاي 17M', category_id: 'cat-5ply' },

  // 3 بلاي types
  { id: 'type-3ply', name: '3 بلاي', category_id: 'cat-3ply' },

  // هاي بلاي types
  { id: 'type-highply', name: 'هاي بلاي', category_id: 'cat-highply' },
  { id: 'type-highply-space', name: 'هاي بلاي ', category_id: 'cat-highply' },
  { id: 'type-highply-18m', name: 'هاي بلاي 18M', category_id: 'cat-highply' },

  // ميلامين ساندوتش types
  { id: 'type-melamine-new', name: 'ميلامين ساندوتش جديد', category_id: 'cat-melamine' },
  { id: 'type-melamine-special', name: 'ميلامين ساندوتش مميز', category_id: 'cat-melamine' },

  // أنواع لم يتم الجزم القاطع بتصنيفها (تترك بدون تصنيف للربط اليدوي من الشاشة)
  { id: 'type-saito-18m', name: '18M SAITO', category_id: null },
];

const STORAGE_KEY_CATEGORIES = 'nileflow_categories';
const STORAGE_KEY_WOOD_TYPES = 'nileflow_wood_types';

function getLocalCategories(): Category[] {
  if (typeof window === 'undefined') return SEED_CATEGORIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading categories from localStorage:', e);
  }
  return SEED_CATEGORIES;
}

function saveLocalCategories(cats: Category[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(cats));
  } catch (e) {
    console.error('Error saving categories to localStorage:', e);
  }
}

function getLocalWoodTypes(): WoodType[] {
  if (typeof window === 'undefined') return SEED_WOOD_TYPES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WOOD_TYPES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading wood_types from localStorage:', e);
  }
  return SEED_WOOD_TYPES;
}

function saveLocalWoodTypes(types: WoodType[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_WOOD_TYPES, JSON.stringify(types));
  } catch (e) {
    console.error('Error saving wood_types to localStorage:', e);
  }
}

export const classificationService = {
  /**
   * جلب التصنيفات والأنواع: يحاول أولاً القراءة من جداول Supabase
   * إذا لم تكن الجداول منشأة بعد في PostgreSQL، يعتمد على التخزين المحلي الآمن وقيم البذور المعتمدة
   */
  async fetchClassification(existingProducts: Product[] = []): Promise<{
    categories: Category[];
    woodTypes: WoodType[];
  }> {
    let categories: Category[] = [];
    let woodTypes: WoodType[] = [];
    let supabaseSuccess = false;

    try {
      const [catRes, typeRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('wood_types').select('*').order('name'),
      ]);

      if (catRes.data && catRes.data.length > 0 && !catRes.error) {
        categories = catRes.data;
        supabaseSuccess = true;
      }
      if (typeRes.data && typeRes.data.length > 0 && !typeRes.error) {
        woodTypes = typeRes.data;
      }
    } catch (e) {
      // Supabase tables might not exist yet
    }

    if (!supabaseSuccess || categories.length === 0) {
      categories = getLocalCategories();
      woodTypes = getLocalWoodTypes();
    }

    // فحص المنتجات الموجودة: التأكد من تسجيل أي نوع خشب موجود في الأصناف تلقائياً
    const knownTypeNames = new Set(woodTypes.map((t) => (t.name || '').trim().toLowerCase()));
    let hasNewTypes = false;

    for (const p of existingProducts) {
      const wt = (p.wood_type || '').trim();
      if (wt && !knownTypeNames.has(wt.toLowerCase())) {
        knownTypeNames.add(wt.toLowerCase());
        // هل ينتمي لـ MDF أو كونتر أو بلاي؟
        let parentCatId: string | null = null;
        for (const cat of categories) {
          if (wt.toLowerCase().includes(cat.name.toLowerCase())) {
            parentCatId = cat.id;
            break;
          }
        }
        woodTypes.push({
          id: `type-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: wt,
          category_id: parentCatId,
        });
        hasNewTypes = true;
      }
    }

    if (hasNewTypes) {
      saveLocalWoodTypes(woodTypes);
    }

    return { categories, woodTypes };
  },

  /**
   * إضافة تصنيف جديد
   */
  async addCategory(name: string, description: string = ''): Promise<Category> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('اسم التصنيف مطلوب');

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      description: description.trim(),
      created_at: new Date().toISOString(),
    };

    // Try Supabase insert
    try {
      const { data, error } = await supabase.from('categories').insert([{
        name: trimmed,
        description: description.trim(),
      }]).select().single();

      if (data && !error) {
        newCat.id = data.id;
        newCat.created_at = data.created_at;
      }
    } catch (e) {
      // Fallback
    }

    const current = getLocalCategories();
    const updated = [...current.filter(c => c.name.toLowerCase() !== trimmed.toLowerCase()), newCat];
    saveLocalCategories(updated);
    return newCat;
  },

  /**
   * تعديل تصنيف
   */
  async updateCategory(
    id: string,
    name: string,
    description: string = '',
    oldName?: string
  ): Promise<Category> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('اسم التصنيف مطلوب');

    // Try Supabase update
    try {
      await supabase.from('categories').update({
        name: trimmed,
        description: description.trim(),
      }).eq('id', id);

      // If category name changed, update products in Supabase
      if (oldName && oldName !== trimmed) {
        await supabase.from('products').update({ category: trimmed }).eq('category', oldName);
      }
    } catch (e) {
      // Fallback
    }

    const current = getLocalCategories();
    const updated = current.map((c) =>
      c.id === id ? { ...c, name: trimmed, description: description.trim() } : c
    );
    saveLocalCategories(updated);

    return { id, name: trimmed, description: description.trim() };
  },

  /**
   * حذف تصنيف نهائياً وبأمان (حذف فعلي بدون أرشفة):
   * إذا كان للتصنيف أنواع تابعة أو منتجات، يمكن نقلها لتصنيف آخر أو فصلها
   */
  async deleteCategory(
    id: string,
    categoryName: string,
    reassignCategoryId: string | null = null,
    targetCategoryName: string | null = null
  ): Promise<void> {
    // 1. إعادة تعيين الأنواع في قاعدة البيانات والمحلي
    try {
      if (reassignCategoryId) {
        await supabase.from('wood_types').update({ category_id: reassignCategoryId }).eq('category_id', id);
        if (targetCategoryName) {
          await supabase.from('products').update({ category: targetCategoryName }).eq('category', categoryName);
        }
      } else {
        await supabase.from('wood_types').update({ category_id: null }).eq('category_id', id);
        await supabase.from('products').update({ category: 'غير مصنف' }).eq('category', categoryName);
      }

      // 2. حذف التصنيف من Supabase
      await supabase.from('categories').delete().eq('id', id);
    } catch (e) {
      // Fallback
    }

    // تحديث التخزين المحلي
    const currentCats = getLocalCategories().filter((c) => c.id !== id);
    saveLocalCategories(currentCats);

    const currentTypes = getLocalWoodTypes().map((t) => {
      if (t.category_id === id) {
        return { ...t, category_id: reassignCategoryId };
      }
      return t;
    });
    saveLocalWoodTypes(currentTypes);
  },

  /**
   * إضافة نوع خشب جديد
   */
  async addWoodType(name: string, category_id: string | null = null): Promise<WoodType> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('اسم نوع الخشب مطلوب');

    const newType: WoodType = {
      id: `type-${Date.now()}`,
      name: trimmed,
      category_id,
      created_at: new Date().toISOString(),
    };

    // Try Supabase insert
    try {
      const { data, error } = await supabase.from('wood_types').insert([{
        name: trimmed,
        category_id: category_id || null,
      }]).select().single();

      if (data && !error) {
        newType.id = data.id;
        newType.created_at = data.created_at;
      }
    } catch (e) {
      // Fallback
    }

    const current = getLocalWoodTypes();
    const updated = [...current.filter(t => t.name.toLowerCase() !== trimmed.toLowerCase()), newType];
    saveLocalWoodTypes(updated);
    return newType;
  },

  /**
   * تعديل نوع خشب (الاسم أو التصنيف الأب)
   */
  async updateWoodType(
    id: string,
    updates: { name?: string; category_id?: string | null },
    oldName?: string,
    parentCategoryName?: string
  ): Promise<WoodType> {
    const trimmedName = updates.name ? updates.name.trim() : undefined;

    // Try Supabase update
    try {
      const payload: any = {};
      if (trimmedName) payload.name = trimmedName;
      if (updates.category_id !== undefined) payload.category_id = updates.category_id;

      await supabase.from('wood_types').update(payload).eq('id', id);

      // تحديث المنتجات في Supabase إذا تم تغيير الاسم أو التصنيف
      const prodUpdates: any = {};
      if (trimmedName && oldName && trimmedName !== oldName) {
        prodUpdates.wood_type = trimmedName;
      }
      if (parentCategoryName) {
        prodUpdates.category = parentCategoryName;
      }

      if (Object.keys(prodUpdates).length > 0) {
        const queryName = oldName || trimmedName;
        if (queryName) {
          await supabase.from('products').update(prodUpdates).eq('wood_type', queryName);
        }
      }
    } catch (e) {
      // Fallback
    }

    const current = getLocalWoodTypes();
    let updatedType: WoodType | null = null;
    const updated = current.map((t) => {
      if (t.id === id) {
        updatedType = {
          ...t,
          ...(trimmedName ? { name: trimmedName } : {}),
          ...(updates.category_id !== undefined ? { category_id: updates.category_id } : {}),
        };
        return updatedType;
      }
      return t;
    });

    saveLocalWoodTypes(updated);
    return updatedType || { id, name: trimmedName || '', category_id: updates.category_id || null };
  },

  /**
   * حذف نوع خشب نهائياً وبأمان
   */
  async deleteWoodType(id: string, woodTypeName: string, reassignTypeName: string | null = null): Promise<void> {
    try {
      if (reassignTypeName) {
        await supabase.from('products').update({ wood_type: reassignTypeName }).eq('wood_type', woodTypeName);
      }
      await supabase.from('wood_types').delete().eq('id', id);
    } catch (e) {
      // Fallback
    }

    const current = getLocalWoodTypes().filter((t) => t.id !== id);
    saveLocalWoodTypes(current);
  },
};
