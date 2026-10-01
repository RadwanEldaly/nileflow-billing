import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, Supplier, StockMovement, Category, WoodType } from '../types';
import {
  Search,
  Plus,
  Trees,
  Edit3,
  Trash2,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Banknote,
  MoreVertical,
  Eye,
  Layers,
  Wallet,
  PackageX,
  Boxes,
  Clock,
  History,
  FolderTree,
  Tag,
} from 'lucide-react';
import { BulkPriceUpdateModal } from '../components/BulkPriceUpdateModal';
import { SEED_CATEGORIES, SEED_WOOD_TYPES } from '../services/classificationService';

interface ProductsPageProps {
  products: Product[];
  categories?: Category[];
  woodTypesList?: WoodType[];
  suppliers: Supplier[];
  movements: StockMovement[];
  language: 'ar' | 'en';
  initialCategoryFilter?: string;
  initialTypeFilter?: string;
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onNavigateToImport: () => void;
  onRefreshProducts?: () => void;
  onNavigateToCategories?: () => void;
}

// Reused everywhere in the app as the "low stock" line
const DEFAULT_LOW_STOCK_THRESHOLD = 10;

type StockStatusFilter = 'all' | 'available' | 'low' | 'out';

const MOVEMENT_TYPE_LABELS_AR: Record<StockMovement['movement_type'], string> = {
  purchase: 'شراء (إضافة)',
  sale: 'بيع',
  purchase_return: 'مرتجع شراء',
  sales_return: 'مرتجع بيع',
  manual_add: 'إضافة يدوية',
  manual_subtract: 'خصم يدوي',
  transfer: 'تحويل بين مخازن',
};

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  categories = [],
  woodTypesList = [],
  suppliers,
  movements,
  language,
  initialCategoryFilter = 'all',
  initialTypeFilter = 'all',
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToImport,
  onRefreshProducts,
  onNavigateToCategories,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryFilter);
  const [selectedWoodType, setSelectedWoodType] = useState<string>(initialTypeFilter);
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Bulk price update state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);

  // Row "⋮" actions menu + product details drawer state
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

  // Toggle for adding custom wood type in the modal if not in list
  const [isCustomTypeInput, setIsCustomTypeInput] = useState(false);

  // Sync initial filter props if changed from navigation
  useEffect(() => {
    if (initialCategoryFilter) setSelectedCategory(initialCategoryFilter);
    if (initialTypeFilter) setSelectedWoodType(initialTypeFilter);
  }, [initialCategoryFilter, initialTypeFilter]);

  // Unified, resilient categories list: props -> seeds -> product categories
  const allCategories = useMemo(() => {
    const base = categories && categories.length > 0 ? categories : SEED_CATEGORIES;
    const map = new Map<string, Category>();
    for (const c of base) {
      map.set(c.name.trim().toLowerCase(), c);
    }
    for (const p of products) {
      const cat = (p.category || '').trim();
      if (cat && cat !== 'ألواح أخشاب' && !map.has(cat.toLowerCase())) {
        map.set(cat.toLowerCase(), { id: `cat-custom-${cat}`, name: cat, description: '' });
      }
    }
    return Array.from(map.values());
  }, [categories, products]);

  // Unified, resilient wood types list: props -> seeds -> product types
  const allWoodTypes = useMemo(() => {
    const base = woodTypesList && woodTypesList.length > 0 ? woodTypesList : SEED_WOOD_TYPES;
    const map = new Map<string, WoodType>();
    for (const wt of base) {
      map.set(wt.name.trim().toLowerCase(), wt);
    }
    for (const p of products) {
      const wt = (p.wood_type || '').trim();
      if (wt && !map.has(wt.toLowerCase())) {
        map.set(wt.toLowerCase(), { id: `type-custom-${wt}`, name: wt, category_id: null });
      }
    }
    return Array.from(map.values());
  }, [woodTypesList, products]);

  // Fast mapping from type name to parent category name
  const woodTypeToCategoryName = useMemo(() => {
    const map = new Map<string, string>();
    const catIdToName = new Map<string, string>();
    for (const c of allCategories) {
      catIdToName.set(c.id, c.name);
    }
    for (const wt of allWoodTypes) {
      if (wt.category_id && catIdToName.has(wt.category_id)) {
        map.set(wt.name.trim().toLowerCase(), catIdToName.get(wt.category_id)!);
      }
    }
    return map;
  }, [allCategories, allWoodTypes]);

  // Helper: Get all types belonging to a specific category
  const getTypesForCategory = (catName: string): string[] => {
    const targetCatLower = (catName || '').trim().toLowerCase();
    const targetCatId = allCategories.find((c) => c.name.trim().toLowerCase() === targetCatLower)?.id;

    const fromList = allWoodTypes
      .filter((wt) => wt.category_id === targetCatId)
      .map((wt) => wt.name.trim());

    const fromProducts = products
      .filter((p) => {
        const pCat = (p.category || '').trim().toLowerCase();
        const derived = woodTypeToCategoryName.get((p.wood_type || '').trim().toLowerCase())?.toLowerCase();
        return pCat === targetCatLower || derived === targetCatLower;
      })
      .map((p) => p.wood_type.trim());

    return Array.from(new Set([...fromList, ...fromProducts])).filter(Boolean);
  };

  // Context-aware wood types for the filter bar
  const availableFilterWoodTypes = useMemo(() => {
    const allDistinct = Array.from(new Set(allWoodTypes.map((t) => t.name.trim()))).filter(Boolean);
    if (selectedCategory === 'all') {
      return allDistinct;
    }
    const catTypes = getTypesForCategory(selectedCategory);
    return catTypes.length > 0 ? catTypes : allDistinct;
  }, [selectedCategory, allWoodTypes, allCategories, products, woodTypeToCategoryName]);

  // Handler for category filter change (context-aware: reset type filter if no longer valid)
  const handleCategoryFilterChange = (newCat: string) => {
    setSelectedCategory(newCat);
    if (newCat === 'all') {
      setSelectedWoodType('all');
      return;
    }
    const allowedTypes = new Set(getTypesForCategory(newCat).map((t) => t.trim().toLowerCase()));
    if (selectedWoodType !== 'all' && allowedTypes.size > 0 && !allowedTypes.has(selectedWoodType.trim().toLowerCase())) {
      setSelectedWoodType('all');
    }
  };

  // Distinct category options for the filter bar
  const categoryFilterOptions = useMemo(() => {
    return allCategories.map((c) => c.name);
  }, [allCategories]);

  // Catalog overall metrics
  const catalogStats = useMemo(() => {
    let totalStock = 0;
    let stockValue = 0;
    let outOfStock = 0;
    for (const p of products) {
      const qty = p.stock_quantity || 0;
      totalStock += qty;
      stockValue += qty * (p.selling_price || 0);
      if (qty <= 0) outOfStock += 1;
    }
    return {
      totalItems: products.length,
      totalStock,
      stockValue,
      outOfStock,
    };
  }, [products]);

  // Form state for add / edit product
  const defaultCategory = allCategories.length > 0 ? allCategories[0].name : 'MDF';
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: defaultCategory,
    wood_type: 'MDF N.L',
    size: '',
    color: '',
    received_date: new Date().toISOString().slice(0, 10),
    selling_price: '',
    stock_quantity: '',
    min_stock_level: '10',
    notes: '',
    purchasing_price: '',
  });

  // Types matching the selected category
  const matchingCategoryTypes = useMemo(() => {
    return getTypesForCategory(formData.category);
  }, [formData.category, allCategories, allWoodTypes, products, woodTypeToCategoryName]);

  // All distinct types in system
  const allDistinctTypes = useMemo(() => {
    const set = new Set<string>();
    for (const wt of allWoodTypes) set.add(wt.name.trim());
    for (const p of products) if (p.wood_type) set.add(p.wood_type.trim());
    return Array.from(set).filter(Boolean);
  }, [allWoodTypes, products]);

  // Other types not in the current category
  const otherCategoryTypes = useMemo(() => {
    const matchingSet = new Set(matchingCategoryTypes.map((t) => t.toLowerCase()));
    return allDistinctTypes.filter((t) => !matchingSet.has(t.toLowerCase()));
  }, [matchingCategoryTypes, allDistinctTypes]);

  const handleCategoryChangeInForm = (newCat: string) => {
    const catTypes = getTypesForCategory(newCat);
    const nextType = catTypes.length > 0 ? catTypes[0] : formData.wood_type;
    setFormData((prev) => ({
      ...prev,
      category: newCat,
      wood_type: nextType,
    }));
    setIsCustomTypeInput(false);
  };

  const handleWoodTypeChangeInForm = (newType: string) => {
    const detectedCat = woodTypeToCategoryName.get(newType.trim().toLowerCase());
    setFormData((prev) => ({
      ...prev,
      wood_type: newType,
      category: detectedCat || prev.category,
    }));
  };

  const getStockStatus = (p: Product): Exclude<StockStatusFilter, 'all'> => {
    const threshold = p.min_stock_level ?? DEFAULT_LOW_STOCK_THRESHOLD;
    if (p.stock_quantity <= 0) return 'out';
    if (p.stock_quantity <= threshold) return 'low';
    return 'available';
  };

  // Memoized, high-performance product filtering
  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      // 1. Search filter
      if (term) {
        const matchesSearch =
          p.name.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          p.wood_type.toLowerCase().includes(term) ||
          (p.category || '').toLowerCase().includes(term) ||
          (p.size || '').toLowerCase().includes(term) ||
          (p.color || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all') {
        const pCat = p.category ? p.category.trim().toLowerCase() : '';
        const derivedCat = woodTypeToCategoryName.get((p.wood_type || '').trim().toLowerCase())?.toLowerCase() || '';
        const targetCat = selectedCategory.trim().toLowerCase();
        if (pCat !== targetCat && derivedCat !== targetCat) {
          return false;
        }
      }

      // 3. Type filter
      if (selectedWoodType !== 'all') {
        if ((p.wood_type || '').trim().toLowerCase() !== selectedWoodType.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. Stock status filter
      if (stockStatusFilter !== 'all' && getStockStatus(p) !== stockStatusFilter) {
        return false;
      }

      return true;
    });
  }, [products, searchTerm, selectedCategory, selectedWoodType, stockStatusFilter, woodTypeToCategoryName]);

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProductIds(newSet);
  };

  const selectedProducts = products.filter((p) => selectedProductIds.has(p.id));
  const selectedWoodTypeForBulk = selectedProducts.length > 0 ? selectedProducts[0].wood_type : '';
  const allSelectedSameWoodType = selectedProducts.every((p) => p.wood_type === selectedWoodTypeForBulk);

  const visibleSelectedCount = filteredProducts.filter((p) => selectedProductIds.has(p.id)).length;
  const hiddenSelectedCount = selectedProductIds.size - visibleSelectedCount;

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const sPrice = parseFloat(formData.selling_price) || 0;
    const stockQty = parseFloat(formData.stock_quantity) || 0;
    const minStock = parseFloat(formData.min_stock_level) || 10;

    if (!formData.name || sPrice <= 0) {
      alert(language === 'ar' ? 'يرجى التأكد من إدخال اسم المنتج وسعر البيع.' : 'Please enter product name and selling price.');
      return;
    }

    if (editingProduct) {
      const updates: Partial<Product> = {
        code: formData.code || editingProduct.code,
        name: formData.name,
        wood_type: formData.wood_type,
        category: formData.category,
        selling_price: sPrice,
        stock_quantity: stockQty,
        min_stock_level: minStock,
      };
      if (formData.size) updates.size = formData.size;
      if (formData.color) updates.color = formData.color;
      if (formData.notes) updates.notes = formData.notes;
      onUpdateProduct(editingProduct.id, updates);
      setEditingProduct(null);
    } else {
      const generatedCode = formData.code || `WOOD-${Math.floor(1000 + Math.random() * 9000)}`;
      const newProd: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        code: generatedCode,
        name: formData.name,
        wood_type: formData.wood_type,
        category: formData.category,
        purchase_price: 0,
        selling_price: sPrice,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        is_active: true,
      };
      if (formData.size) newProd.size = formData.size;
      if (formData.color) newProd.color = formData.color;
      if (formData.notes) newProd.notes = formData.notes;
      onAddProduct(newProd);
    }

    setFormData({
      code: '',
      name: '',
      category: defaultCategory,
      wood_type: 'MDF N.L',
      size: '',
      color: '',
      received_date: new Date().toISOString().slice(0, 10),
      selling_price: '',
      stock_quantity: '',
      min_stock_level: '10',
      notes: '',
      purchasing_price: '',
    });
    setIsCustomTypeInput(false);
    setIsAddModalOpen(false);
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);

    // Determine safe parent category
    let safeCat = prod.category;
    if (!safeCat || safeCat === 'ألواح أخشاب') {
      safeCat = woodTypeToCategoryName.get((prod.wood_type || '').trim().toLowerCase()) || defaultCategory;
    }

    setFormData({
      code: prod.code,
      name: prod.name,
      wood_type: prod.wood_type,
      category: safeCat,
      size: prod.size || '',
      color: prod.color || '',
      received_date: prod.received_date || '',
      selling_price: String(prod.selling_price),
      stock_quantity: String(prod.stock_quantity),
      min_stock_level: String(prod.min_stock_level || 10),
      notes: prod.notes || '',
      purchasing_price: String(prod.purchase_price),
    });
    setIsCustomTypeInput(false);
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (prod: Product) => {
    const confirmed = window.confirm(
      language === 'ar'
        ? `متأكد إنك تريد مسح "${prod.name}" نهائيًا؟ هذا الإجراء لا يمكن التراجع عنه.`
        : `Are you sure you want to permanently delete "${prod.name}"?`
    );
    if (confirmed) {
      onDeleteProduct(prod.id);
    }
  };

  const handleOpenRowDetails = (prod: Product) => {
    setDetailsProduct(prod);
    setOpenMenuRowId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Trees className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'كتالوج وإدارة الألواح الخشبية' : 'Wood Sheets Catalog'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'إدارة أصناف الألواح الخشبية، الأسعار، وتصنيف الأخشاب الهرمي'
              : 'Manage wooden sheet products, pricing, and hierarchical classifications.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToCategories && (
            <button
              onClick={onNavigateToCategories}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 font-medium text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
              title={language === 'ar' ? 'إدارة الهيكل الهرمي للتصنيفات والأنواع' : 'Manage Categories & Types'}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ar' ? 'التصنيفات والأنواع' : 'Categories & Types'}</span>
            </button>
          )}

          <button
            onClick={onNavigateToImport}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700/80 font-medium text-xs px-3.5 py-2 rounded-md transition shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'ar' ? 'استيراد إكسيل' : 'Import Excel'}</span>
          </button>

          {/* Bulk Price Update Button */}
          {selectedProductIds.size > 0 && allSelectedSameWoodType && (
            <button
              onClick={() => setIsBulkPriceModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-amber-300 border border-amber-500/40 font-medium text-xs px-3 py-2 rounded-md transition shadow-xs"
            >
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {language === 'ar'
                  ? `تحديث أسعار (${selectedProductIds.size})`
                  : `Update Prices (${selectedProductIds.size})`}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingProduct(null);
              const today = new Date().toISOString().slice(0, 10);
              const initialCat = allCategories.length > 0 ? allCategories[0].name : 'MDF';
              const initialCatTypes = getTypesForCategory(initialCat);
              const initialType = initialCatTypes.length > 0 ? initialCatTypes[0] : (allWoodTypes[0]?.name || 'MDF N.L');
              setFormData({
                code: '',
                name: '',
                category: initialCat,
                wood_type: initialType,
                size: '',
                color: '',
                received_date: today,
                selling_price: '',
                stock_quantity: '',
                min_stock_level: '10',
                notes: '',
                purchasing_price: '',
              });
              setIsCustomTypeInput(false);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'إضافة صنف لوح جديد' : 'Add Sheet Item'}</span>
          </button>
        </div>
      </div>

      {/* Compact Inventory Metrics Strip */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 rtl:sm:divide-x-reverse overflow-hidden shadow-xs">
        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Boxes className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {catalogStats.totalItems.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'إجمالي المخزون' : 'Total Stock'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {catalogStats.totalStock.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'لوح' : 'sheets'}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'قيمة المخزون' : 'Stock Value'}
            </div>
            <div className="text-lg font-bold font-mono text-slate-100 leading-tight tabular-nums">
              {catalogStats.stockValue.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className={`p-2 rounded ${catalogStats.outOfStock > 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'}`}>
            <PackageX className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-400 font-medium truncate">
              {language === 'ar' ? 'أصناف نفد مخزونها' : 'Out of Stock'}
            </div>
            <div className={`text-lg font-bold font-mono leading-tight tabular-nums ${catalogStats.outOfStock > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {catalogStats.outOfStock.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk selection warning if mixed wood types */}
      {selectedProductIds.size > 0 && !allSelectedSameWoodType && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 flex items-start gap-2">
          <span className="text-xs text-amber-300 font-medium">
            {language === 'ar'
              ? '⚠️ لا يمكن تحديث الأسعار لأصناف من أنواع خشب مختلفة. يرجى اختيار أصناف من نفس النوع فقط.'
              : '⚠️ Cannot update prices for products with different wood types. Please select products of the same type only.'}
          </span>
        </div>
      )}

      {/* Search & Hierarchical Filter Controls */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute top-3 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={
              language === 'ar'
                ? 'ابحث باسم اللوح، الكود، التصنيف، أو نوع الخشب (MDF، كونتر، 5 بلاي)...'
                : 'Search sheet name, code, category, or wood type...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>

        {/* 1. Category Filter Dropdown (التصنيف الرئيسي) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            {language === 'ar' ? 'التصنيف:' : 'Category:'}
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-md text-xs text-amber-300 px-3 py-1.5 font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="all">{language === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
            {categoryFilterOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Context-Aware Wood Type Filter Dropdown (النوع الفرعي التابع) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            {language === 'ar' ? 'النوع:' : 'Type:'}
          </span>
          <select
            value={selectedWoodType}
            onChange={(e) => setSelectedWoodType(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="all">
              {selectedCategory === 'all'
                ? language === 'ar' ? 'جميع أنواع الأخشاب' : 'All Wood Types'
                : language === 'ar' ? `كل أنواع ${selectedCategory}` : `All ${selectedCategory} Types`}
            </option>
            {availableFilterWoodTypes.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Stock status filter */}
        <select
          value={stockStatusFilter}
          onChange={(e) => setStockStatusFilter(e.target.value as StockStatusFilter)}
          className="bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
        >
          <option value="all">{language === 'ar' ? 'كل الأصناف' : 'All Statuses'}</option>
          <option value="available">{language === 'ar' ? 'متوفر' : 'In Stock'}</option>
          <option value="low">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</option>
          <option value="out">{language === 'ar' ? 'نفد' : 'Out of Stock'}</option>
        </select>
      </div>

      {/* Selection safety notice */}
      {hiddenSelectedCount > 0 && (
        <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-2.5 flex items-start gap-2">
          <span className="text-xs text-blue-300 font-medium">
            {language === 'ar'
              ? `ملحوظة: (${hiddenSelectedCount}) من الأصناف المحددة غير ظاهرة حالياً بسبب الفلاتر، وستظل ضمن التحديد وتتأثر بتحديث الأسعار.`
              : `Note: (${hiddenSelectedCount}) selected products are hidden by the current filters but remain selected and will be affected by a price update.`}
          </span>
        </div>
      )}

      {/* Products Table Container */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[320px]">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              {language === 'ar'
                ? 'لا توجد أصناف مطابقة لمعايير البحث والتصفية الحالية'
                : 'No products match the selected filters.'}
            </div>
          ) : (
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-slate-400 hover:text-amber-400 transition"
                      title={language === 'ar' ? 'تحديد كل المعروض' : 'Select all visible'}
                    >
                      {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'كود اللوح' : 'SKU'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'اسم اللوح الخشبي' : 'Product Name'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'التصنيف والنوع' : 'Classification'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'اللون / الدرجة' : 'Color'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'تاريخ الإضافة' : 'Date Added'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'رصيد الألواح' : 'Current Stock'}</th>
                  <th className="px-3.5 py-2.5 text-center font-semibold">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock_quantity <= (p.min_stock_level || 10);
                  const isSelected = selectedProductIds.has(p.id);
                  const isMenuOpen = openMenuRowId === p.id;
                  const derivedCat =
                    p.category ||
                    woodTypeToCategoryName.get((p.wood_type || '').trim().toLowerCase()) ||
                    '';

                  return (
                    <tr key={p.id} className={`hover:bg-slate-850/50 transition ${isSelected ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          onClick={() => toggleSelectProduct(p.id)}
                          className="flex items-center justify-center text-slate-500 hover:text-amber-400 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-400 font-medium">{p.code}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-100">{p.name}</td>
                      
                      {/* Classification: Category + Wood Type */}
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col gap-0.5 items-start">
                          {derivedCat && derivedCat !== 'ألواح أخشاب' && (
                            <span className="text-[10px] font-semibold text-amber-400 leading-tight">
                              {derivedCat}
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700/80">
                            {p.wood_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 font-mono text-slate-300">{p.size || '—'}</td>
                      <td className="px-3.5 py-2.5 text-slate-300">{p.color || '—'}</td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-400 text-[11px]">
                        {p.created_at
                          ? new Date(p.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-100 tabular-nums">
                        {p.selling_price} <span className="text-[10px] text-slate-400 font-normal">EGP</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold tabular-nums ${
                            p.stock_quantity === 0
                              ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                              : isLowStock
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-900/60'
                              : 'text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.stock_quantity === 0 ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {p.stock_quantity} {language === 'ar' ? 'لوح' : 'sheets'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenuRowId(isMenuOpen ? null : p.id)}
                            title={language === 'ar' ? 'إجراءات' : 'Actions'}
                            className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 transition"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenMenuRowId(null)}
                              />
                              <div className="absolute left-0 rtl:left-0 rtl:right-auto ltr:right-0 ltr:left-auto mt-1 w-32 bg-slate-900 border border-slate-700/80 rounded-md shadow-xl z-30 py-1 text-xs">
                                <button
                                  onClick={() => handleOpenRowDetails(p)}
                                  className="w-full px-3 py-1.5 text-right rtl:text-right ltr:text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{language === 'ar' ? 'عرض التفاصيل' : 'Details'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditClick(p);
                                    setOpenMenuRowId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-right rtl:text-right ltr:text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteClick(p);
                                    setOpenMenuRowId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-right rtl:text-right ltr:text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>{language === 'ar' ? 'حذف' : 'Delete'}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Modal: Add / Edit Product with Context-Aware Category & Type */}
      {/* ========================================================================= */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="bg-[#0e1424] border border-slate-700/90 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Trees className="w-4 h-4 text-amber-400" />
                <span>
                  {editingProduct
                    ? language === 'ar' ? 'تعديل بيانات اللوح الخشبي' : 'Edit Sheet Product'
                    : language === 'ar' ? 'إضافة صنف لوح جديد' : 'New Sheet Product'}
                </span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  اسم اللوح الخشبي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: N.LAM 5195 أو PVC EV - P.003"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>

              {/* Hierarchical Classification Fields: Category -> Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    كود الصنف (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="تلقائي إن ترك فارغاً"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    التصنيف (Category) *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {!allCategories.some((c) => c.name === formData.category) && formData.category && (
                      <option value={formData.category}>{formData.category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      نوع الخشب (Type) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTypeInput(!isCustomTypeInput)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 transition"
                    >
                      {isCustomTypeInput ? 'اختيار من القائمة' : '+ نوع جديد'}
                    </button>
                  </div>
                  {isCustomTypeInput ? (
                    <input
                      type="text"
                      required
                      placeholder="اكتب نوع الخشب..."
                      value={formData.wood_type}
                      onChange={(e) => setFormData({ ...formData, wood_type: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-amber-500/60 rounded-md text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                    />
                  ) : (
                    <select
                      required
                      value={formData.wood_type}
                      onChange={(e) => handleWoodTypeChangeInForm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-medium text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                    >
                      {matchingCategoryTypes.length > 0 ? (
                        <>
                          <optgroup label={`أنواع تابعة لـ ${formData.category}`}>
                            {matchingCategoryTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </optgroup>
                          {otherCategoryTypes.length > 0 && (
                            <optgroup label="باقي أنواع الخشب المتاحة">
                              {otherCategoryTypes.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      ) : (
                        allDistinctTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))
                      )}
                      {!allDistinctTypes.some((t) => t.toLowerCase() === (formData.wood_type || '').toLowerCase()) && formData.wood_type && (
                        <option value={formData.wood_type}>{formData.wood_type}</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    المقاس
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 08*22"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    اللون / الدرجة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: BEYAZ MAT 1001"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    سعر البيع (للّوح) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono font-bold text-amber-400 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    رصيد الألواح الحالي
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    الحد الأدنى للتنبيه
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ملاحظات
                  </label>
                  <input
                    type="text"
                    placeholder="ملاحظات اختيارية..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-md text-xs transition"
                >
                  {editingProduct
                    ? language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'
                    : language === 'ar' ? 'إضافة الصنف' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Product Details Drawer */}
      {detailsProduct && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-950/70 backdrop-blur-xs" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-md bg-[#0e1424] border-l rtl:border-l-0 rtl:border-r border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {language === 'ar' ? 'تفاصيل وحركة الصنف' : 'Item Details & Movements'}
                </h3>
              </div>
              <button onClick={() => setDetailsProduct(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Product Details Grid */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  {language === 'ar' ? 'بيانات الصنف' : 'Product Details'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-md border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'اسم المنتج' : 'Name'}</div>
                    <div className="text-xs font-semibold text-slate-100 mt-0.5">{detailsProduct.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'كود اللوح' : 'Code'}</div>
                    <div className="text-xs font-mono font-medium text-slate-200 mt-0.5">{detailsProduct.code}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'التصنيف' : 'Category'}</div>
                    <div className="text-xs font-semibold text-amber-400 mt-0.5">
                      {detailsProduct.category ||
                        woodTypeToCategoryName.get((detailsProduct.wood_type || '').trim().toLowerCase()) ||
                        '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'نوع الخشب' : 'Wood Type'}</div>
                    <div className="text-xs font-medium text-slate-200 mt-0.5">{detailsProduct.wood_type}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'المقاس' : 'Size'}</div>
                    <div className="text-xs font-mono text-slate-200 mt-0.5">{detailsProduct.size || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'اللون' : 'Color'}</div>
                    <div className="text-xs text-slate-200 mt-0.5">{detailsProduct.color || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</div>
                    <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">{detailsProduct.selling_price} EGP</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'سعر الشراء' : 'Purchase Price'}</div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">{detailsProduct.purchase_price ?? '—'} EGP</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'الرصيد الحالي' : 'Current Stock'}</div>
                    <div className="text-xs font-mono font-bold text-slate-100 mt-0.5">{detailsProduct.stock_quantity} لوح</div>
                  </div>
                </div>
              </div>

              {/* Movements history for this product */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'ar' ? 'سجل حركات المخزن للصنف' : 'Stock Movements History'}</span>
                </h4>
                {(() => {
                  const prodMovements = movements.filter((m) => m.product_id === detailsProduct.id);
                  if (prodMovements.length === 0) {
                    return (
                      <div className="bg-slate-950 p-4 rounded-md border border-slate-800 text-center text-xs text-slate-500">
                        {language === 'ar' ? 'لا توجد حركات مسجلة لهذا الصنف بعد' : 'No movements recorded yet.'}
                      </div>
                    );
                  }
                  return (
                    <div className="bg-slate-950 rounded-md border border-slate-800 divide-y divide-slate-800 max-h-72 overflow-y-auto">
                      {prodMovements.map((m) => (
                        <div key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-medium text-slate-200">
                              {MOVEMENT_TYPE_LABELS_AR[m.movement_type] || m.movement_type}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{new Date(m.created_at).toLocaleString('ar-EG')}</span>
                            </div>
                          </div>
                          <span
                            className={`font-mono font-bold ${
                              m.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} لوح
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Price Update Modal */}
      {isBulkPriceModalOpen && (
        <BulkPriceUpdateModal
          isOpen={isBulkPriceModalOpen}
          onClose={() => setIsBulkPriceModalOpen(false)}
          selectedProducts={selectedProducts}
          woodType={selectedWoodTypeForBulk}
          onSuccess={() => {
            setSelectedProductIds(new Set());
            if (onRefreshProducts) onRefreshProducts();
          }}
          language={language}
        />
      )}
    </div>
  );
};