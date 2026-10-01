import React, { useState, useMemo } from 'react';
import { Category, WoodType, Product } from '../types';
import {
  FolderTree,
  Plus,
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  Layers,
  Boxes,
  Wallet,
  AlertTriangle,
  X,
  Check,
  Tag,
  HelpCircle,
} from 'lucide-react';

interface CategoriesPageProps {
  categories: Category[];
  woodTypes: WoodType[];
  products: Product[];
  language: 'ar' | 'en';
  onAddCategory: (name: string, description?: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string, description?: string, oldName?: string) => Promise<void>;
  onDeleteCategory: (
    id: string,
    categoryName: string,
    reassignCategoryId: string | null,
    targetCategoryName: string | null
  ) => Promise<void>;
  onAddWoodType: (name: string, category_id: string | null) => Promise<void>;
  onUpdateWoodType: (
    id: string,
    updates: { name?: string; category_id?: string | null },
    oldName?: string,
    parentCategoryName?: string
  ) => Promise<void>;
  onDeleteWoodType: (id: string, woodTypeName: string, reassignTypeName: string | null) => Promise<void>;
  onNavigateToCatalogWithFilter: (categoryName: string, typeName?: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  woodTypes,
  products,
  language,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddWoodType,
  onUpdateWoodType,
  onDeleteWoodType,
  onNavigateToCatalogWithFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<WoodType | null>(null);
  const [typeFormData, setTypeFormData] = useState({ name: '', category_id: '' });

  // Delete category confirmation modal
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<string>('');
  const [reassignAction, setReassignAction] = useState<'reassign' | 'detach'>('reassign');

  // Delete wood type confirmation modal
  const [deletingType, setDeletingType] = useState<WoodType | null>(null);
  const [reassignTypeId, setReassignTypeId] = useState<string>('');

  // Calculate statistics per category and type
  const { categoryStats, unassignedTypes, totalMetrics } = useMemo(() => {
    // Map wood_type name to its type object
    const typeNameToType = new Map<string, WoodType>();
    for (const t of woodTypes) {
      typeNameToType.set(t.name.trim().toLowerCase(), t);
    }

    // Map category_id to stats
    const stats: Record<
      string,
      {
        types: WoodType[];
        productCount: number;
        totalStock: number;
        stockValue: number;
      }
    > = {};

    for (const cat of categories) {
      stats[cat.id] = {
        types: [],
        productCount: 0,
        totalStock: 0,
        stockValue: 0,
      };
    }

    const unassigned: WoodType[] = [];
    for (const t of woodTypes) {
      if (t.category_id && stats[t.category_id]) {
        stats[t.category_id].types.push(t);
      } else {
        unassigned.push(t);
      }
    }

    // Map products to categories
    for (const p of products) {
      const wtName = (p.wood_type || '').trim().toLowerCase();
      const matchedType = typeNameToType.get(wtName);
      let catId: string | null = null;

      if (matchedType && matchedType.category_id) {
        catId = matchedType.category_id;
      } else if (p.category) {
        const found = categories.find(
          (c) => c.name.trim().toLowerCase() === p.category!.trim().toLowerCase()
        );
        if (found) catId = found.id;
      }

      const qty = p.stock_quantity || 0;
      const val = qty * (p.selling_price || 0);

      if (catId && stats[catId]) {
        stats[catId].productCount += 1;
        stats[catId].totalStock += qty;
        stats[catId].stockValue += val;
      }
    }

    return {
      categoryStats: stats,
      unassignedTypes: unassigned,
      totalMetrics: {
        totalCategories: categories.length,
        totalTypes: woodTypes.length,
        unassignedCount: unassigned.length,
      },
    };
  }, [categories, woodTypes, products]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter((c) => {
      const matchCat = c.name.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term);
      const catTypes = categoryStats[c.id]?.types || [];
      const matchType = catTypes.some((t) => t.name.toLowerCase().includes(term));
      return matchCat || matchType;
    });
  }, [categories, searchTerm, categoryStats]);

  // Handlers for Category Add/Edit
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', description: '' });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryFormData({ name: cat.name, description: cat.description || '' });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) return;

    if (editingCategory) {
      await onUpdateCategory(
        editingCategory.id,
        categoryFormData.name,
        categoryFormData.description,
        editingCategory.name
      );
    } else {
      await onAddCategory(categoryFormData.name, categoryFormData.description);
    }
    setIsCategoryModalOpen(false);
  };

  // Safe Category Delete
  const handleOpenDeleteCategory = (cat: Category) => {
    setDeletingCategory(cat);
    // Find first other category as default reassign target
    const other = categories.find((c) => c.id !== cat.id);
    setReassignCategoryId(other ? other.id : '');
    setReassignAction('reassign');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    const targetCat = categories.find((c) => c.id === reassignCategoryId);
    const targetCatId = reassignAction === 'reassign' && targetCat ? targetCat.id : null;
    const targetCatName = reassignAction === 'reassign' && targetCat ? targetCat.name : null;

    await onDeleteCategory(deletingCategory.id, deletingCategory.name, targetCatId, targetCatName);
    setDeletingCategory(null);
  };

  // Handlers for Wood Type Add/Edit
  const handleOpenAddType = (defaultCategoryId?: string) => {
    setEditingType(null);
    setTypeFormData({ name: '', category_id: defaultCategoryId || '' });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (type: WoodType) => {
    setEditingType(type);
    setTypeFormData({ name: type.name, category_id: type.category_id || '' });
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeFormData.name.trim()) return;

    const parentCat = categories.find((c) => c.id === typeFormData.category_id);
    const parentCatName = parentCat ? parentCat.name : undefined;

    if (editingType) {
      await onUpdateWoodType(
        editingType.id,
        {
          name: typeFormData.name,
          category_id: typeFormData.category_id || null,
        },
        editingType.name,
        parentCatName
      );
    } else {
      await onAddWoodType(typeFormData.name, typeFormData.category_id || null);
    }
    setIsTypeModalOpen(false);
  };

  // Type Delete
  const handleOpenDeleteType = (type: WoodType) => {
    setDeletingType(type);
    const other = woodTypes.find((t) => t.id !== type.id);
    setReassignTypeId(other ? other.name : '');
  };

  const handleConfirmDeleteType = async () => {
    if (!deletingType) return;
    await onDeleteWoodType(deletingType.id, deletingType.name, reassignTypeId || null);
    setDeletingType(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span>{language === 'ar' ? 'التصنيفات وهيكل الأخشاب' : 'Categories & Wood Classification'}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'الهيكل الهرمي: التصنيف (Category) ← نوع الخشب (Type) ← صنف اللوح الخشبي (Product)'
                  : 'Hierarchical Structure: Category → Wood Type → Product Item'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddType()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs px-3 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
          >
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ar' ? 'إضافة نوع خشب' : 'Add Wood Type'}</span>
          </button>

          <button
            onClick={handleOpenAddCategory}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'إضافة تصنيف جديد' : 'Add Category'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 rtl:sm:divide-x-reverse overflow-hidden shadow-xs">
        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FolderTree className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'إجمالي التصنيفات' : 'Categories'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {totalMetrics.totalCategories}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'أنواع الأخشاب المسجلة' : 'Wood Types'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {totalMetrics.totalTypes}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'أصناف الألواح في النظام' : 'Sheet Products'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {products.length}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className={`p-2 rounded ${totalMetrics.unassignedCount > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'أنواع بانتظار التصنيف' : 'Unassigned Types'}
            </div>
            <div className={`text-lg font-bold font-mono leading-tight tabular-nums ${totalMetrics.unassignedCount > 0 ? 'text-amber-400' : 'text-slate-100'}`}>
              {totalMetrics.unassignedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800 flex items-center">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute top-3 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={
              language === 'ar'
                ? 'ابحث باسم التصنيف (MDF، كونتر...) أو بنوع الخشب التابع له...'
                : 'Search category name or type...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Unassigned Types Section (إذا وجدت أنواع غير مرتبطة بتصنيف) */}
      {unassignedTypes.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-amber-300">
                {language === 'ar'
                  ? `أنواع أخشاب غير مرتبطة بتصنيف رئيسي (${unassignedTypes.length})`
                  : `Unassigned Wood Types (${unassignedTypes.length})`}
              </h3>
            </div>
            <span className="text-[11px] text-amber-400/80">
              {language === 'ar'
                ? 'اضغط على زر الربط لتحديد التصنيف الأب بأمان دون فقدان أي بيانات'
                : 'Assign to a category safely without losing any data'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {unassignedTypes.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-amber-500/30 rounded-md px-2.5 py-1.5 flex items-center gap-2 text-xs"
              >
                <span className="font-semibold text-slate-200">{t.name}</span>
                <button
                  onClick={() => handleOpenEditType(t)}
                  className="text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded text-[11px] font-medium transition"
                >
                  {language === 'ar' ? 'ربط بتصنيف ↵' : 'Assign Category'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCategories.map((cat) => {
          const stats = categoryStats[cat.id] || {
            types: [],
            productCount: 0,
            totalStock: 0,
            stockValue: 0,
          };

          return (
            <div
              key={cat.id}
              className="bg-[#0e1424] rounded-lg border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between overflow-hidden shadow-xs"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-100">{cat.name}</span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {stats.types.length} {language === 'ar' ? 'نوع خشب' : 'types'}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cat.description}</p>
                  )}
                </div>

                {/* Card Top Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    title={language === 'ar' ? 'تعديل التصنيف' : 'Edit Category'}
                    className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteCategory(cat)}
                    title={language === 'ar' ? 'حذف نهائي للتصنيف' : 'Permanently Delete Category'}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-metrics Strip */}
              <div className="grid grid-cols-3 divide-x divide-slate-800 rtl:divide-x-reverse bg-slate-950/40 py-2.5 px-3 border-b border-slate-800/60 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">{language === 'ar' ? 'عدد الأصناف' : 'Products'}</div>
                  <div className="text-xs font-bold font-mono text-slate-200 tabular-nums">
                    {stats.productCount.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'صنف' : 'items'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{language === 'ar' ? 'رصيد الألواح' : 'Total Stock'}</div>
                  <div className="text-xs font-bold font-mono text-slate-200 tabular-nums">
                    {stats.totalStock.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'لوح' : 'sheets'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{language === 'ar' ? 'قيمة المخزون' : 'Stock Value'}</div>
                  <div className="text-xs font-bold font-mono text-amber-400 tabular-nums">
                    {stats.stockValue.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-500">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>
                </div>
              </div>

              {/* Associated Types Section */}
              <div className="p-4 space-y-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {language === 'ar' ? 'أنواع الأخشاب التابعة:' : 'Associated Types:'}
                  </span>
                  <button
                    onClick={() => handleOpenAddType(cat.id)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{language === 'ar' ? 'إضافة نوع فرعي' : 'Add Type'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[50px]">
                  {stats.types.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">
                      {language === 'ar' ? 'لا توجد أنواع خشب مربوطة بهذا التصنيف حالياً' : 'No types associated yet'}
                    </div>
                  ) : (
                    stats.types.map((type) => {
                      const prodCountForType = products.filter(
                        (p) => (p.wood_type || '').trim().toLowerCase() === type.name.trim().toLowerCase()
                      ).length;

                      return (
                        <div
                          key={type.id}
                          className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 flex items-center gap-2 group hover:border-slate-600 transition"
                        >
                          <span
                            onClick={() => onNavigateToCatalogWithFilter(cat.name, type.name)}
                            className="text-xs font-medium text-slate-200 cursor-pointer hover:text-amber-400 transition"
                            title={language === 'ar' ? 'تصفية الكتالوج بهذا النوع' : 'Filter catalog by this type'}
                          >
                            {type.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                            {prodCountForType}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEditType(type)}
                              title={language === 'ar' ? 'تعديل النوع' : 'Edit Type'}
                              className="p-0.5 text-slate-400 hover:text-amber-400"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDeleteType(type)}
                              title={language === 'ar' ? 'حذف النوع' : 'Delete Type'}
                              className="p-0.5 text-slate-400 hover:text-rose-400"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Card Footer: Quick Jump to Catalog */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ar' ? 'تصفح الأصناف المخزنة' : 'Browse inventory'}
                </span>
                <button
                  onClick={() => onNavigateToCatalogWithFilter(cat.name)}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-medium transition"
                >
                  <span>{language === 'ar' ? 'عرض في الكتالوج' : 'View in Catalog'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* Add / Edit Category Modal */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-400" />
                <span>
                  {editingCategory
                    ? language === 'ar' ? 'تعديل التصنيف' : 'Edit Category'
                    : language === 'ar' ? 'إضافة تصنيف جديد' : 'New Category'}
                </span>
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'اسم التصنيف *' : 'Category Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={language === 'ar' ? 'مثال: MDF أو كونتر أو 5 بلاي' : 'e.g. MDF, Counter'}
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'وصف / ملاحظات' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'ar' ? 'وصف مختصر للتصنيف...' : 'Brief description...'}
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md text-xs transition"
                >
                  {editingCategory
                    ? language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'
                    : language === 'ar' ? 'إضافة التصنيف' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Add / Edit Wood Type Modal */}
      {/* ========================================================================= */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-[#0e1424] border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>
                  {editingType
                    ? language === 'ar' ? 'تعديل نوع الخشب' : 'Edit Wood Type'
                    : language === 'ar' ? 'إضافة نوع خشب جديد' : 'New Wood Type'}
                </span>
              </h3>
              <button
                onClick={() => setIsTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'اسم نوع الخشب المحدد *' : 'Wood Type Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={language === 'ar' ? 'مثال: MDF N.L أو كونتر LG' : 'e.g. MDF N.L'}
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'ar' ? 'التصنيف الأب التابع له' : 'Parent Category'}
                </label>
                <select
                  value={typeFormData.category_id}
                  onChange={(e) => setTypeFormData({ ...typeFormData, category_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 font-medium"
                >
                  <option value="">{language === 'ar' ? '-- بدون تصنيف حالياً --' : '-- Unassigned --'}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'ar'
                    ? 'سيتم تجميع هذا النوع تحت التصنيف المختار في الفلاتر والتقارير'
                    : 'This type will be grouped under the selected category'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md text-xs transition"
                >
                  {editingType
                    ? language === 'ar' ? 'حفظ التعديل' : 'Save Changes'
                    : language === 'ar' ? 'إضافة النوع' : 'Add Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Permanent & Safe Category Delete Modal */}
      {/* ========================================================================= */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-[#0e1424] border border-rose-900/60 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {language === 'ar' ? `تأكيد الحذف النهائي لتصنيف "${deletingCategory.name}"` : `Delete Category`}
                </h3>
                <p className="text-[11px] text-rose-400 mt-0.5">
                  {language === 'ar' ? 'حذف نهائي فوري (بدون أرشفة) مع حماية بيانات الأصناف' : 'Permanent safe deletion'}
                </p>
              </div>
            </div>

            {/* Check if category has types or products */}
            {(() => {
              const stats = categoryStats[deletingCategory.id] || { types: [], productCount: 0 };
              const hasItems = stats.types.length > 0 || stats.productCount > 0;

              return (
                <div className="space-y-3.5 text-xs text-slate-300">
                  {hasItems ? (
                    <>
                      <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-amber-200 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>
                            {language === 'ar'
                              ? `هذا التصنيف يحتوي على (${stats.types.length}) أنواع و (${stats.productCount}) صنف لوح.`
                              : `This category has ${stats.types.length} types and ${stats.productCount} products.`}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-300/80">
                          {language === 'ar'
                            ? 'لمنع أي كسر في المراجع أو ضياع في بيانات المخزون، يرجى اختيار الإجراء المطلوب للأصناف والأنواع التابعة:'
                            : 'Select how to handle associated types and products safely:'}
                        </p>
                      </div>

                      <div className="space-y-2 pt-1">
                        {categories.filter((c) => c.id !== deletingCategory.id).length > 0 && (
                          <label className="flex items-start gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                            <input
                              type="radio"
                              name="reassign"
                              checked={reassignAction === 'reassign'}
                              onChange={() => setReassignAction('reassign')}
                              className="mt-0.5 text-amber-500"
                            />
                            <div className="flex-1">
                              <span className="font-semibold text-slate-200 block">
                                {language === 'ar' ? 'نقل الأنواع والأصناف إلى تصنيف آخر' : 'Reassign to another category'}
                              </span>
                              {reassignAction === 'reassign' && (
                                <select
                                  value={reassignCategoryId}
                                  onChange={(e) => setReassignCategoryId(e.target.value)}
                                  className="w-full mt-2 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
                                >
                                  {categories
                                    .filter((c) => c.id !== deletingCategory.id)
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          </label>
                        )}

                        <label className="flex items-start gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                          <input
                            type="radio"
                            name="reassign"
                            checked={reassignAction === 'detach'}
                            onChange={() => setReassignAction('detach')}
                            className="mt-0.5 text-amber-500"
                          />
                          <div>
                            <span className="font-semibold text-slate-200 block">
                              {language === 'ar' ? 'فصل الأنواع (تركها غير مصنفة بدون حذفها)' : 'Detach types (unassigned)'}
                            </span>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {language === 'ar'
                                ? 'ستبقى جميع أنواع الأخشاب والألواح محفوظة في النظام ويمكن تصنيفها لاحقاً.'
                                : 'All types and products remain safely in the system.'}
                            </span>
                          </div>
                        </label>
                      </div>
                    </>
                  ) : (
                    <p className="text-slate-300">
                      {language === 'ar'
                        ? 'هذا التصنيف لا يحتوي على أي أنواع خشب أو أصناف مرتبطة به. سيتم حذفه نهائياً من النظام.'
                        : 'This category is empty and will be permanently deleted.'}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDeletingCategory(null)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteCategory}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md text-xs transition"
                    >
                      {language === 'ar' ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Delete Wood Type Modal */}
      {/* ========================================================================= */}
      {deletingType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-[#0e1424] border border-rose-900/60 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-400 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  {language === 'ar' ? `حذف نوع الخشب "${deletingType.name}"` : `Delete Wood Type`}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'ar' ? 'حذف نهائي للنوع' : 'Permanent deletion of type'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              {(() => {
                const count = products.filter(
                  (p) => (p.wood_type || '').trim().toLowerCase() === deletingType.name.trim().toLowerCase()
                ).length;

                return (
                  <>
                    {count > 0 && (
                      <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-amber-200 space-y-2">
                        <div className="font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>
                            {language === 'ar'
                              ? `هناك (${count}) صنف لوح مسجل بهذا النوع حالياً.`
                              : `${count} products use this type.`}
                          </span>
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">
                            {language === 'ar' ? 'إعادة توجيه الأصناف إلى نوع آخر:' : 'Reassign products to:'}
                          </label>
                          <select
                            value={reassignTypeId}
                            onChange={(e) => setReassignTypeId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-medium"
                          >
                            <option value="">{language === 'ar' ? '-- بدون تغيير --' : '-- No change --'}</option>
                            {woodTypes
                              .filter((t) => t.id !== deletingType.id)
                              .map((t) => (
                                <option key={t.id} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setDeletingType(null)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
                      >
                        {language === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteType}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md text-xs transition"
                      >
                        {language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
