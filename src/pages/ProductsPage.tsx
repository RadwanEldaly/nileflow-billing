import React, { useMemo, useState } from 'react';
import { Product, Supplier, StockMovement } from '../types';
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
} from 'lucide-react';
import { BulkPriceUpdateModal } from '../components/BulkPriceUpdateModal';

interface ProductsPageProps {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  language: 'ar' | 'en';
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onNavigateToImport: () => void;
}

// Reused everywhere in the app as the "low stock" line (see the existing
// isLowStock check further down) — kept here as a single named fallback so it's
// easy to change later if a product doesn't have its own min_stock_level.
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
  suppliers,
  movements,
  language,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWoodType, setSelectedWoodType] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<StockStatusFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Bulk price update state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);

  // Row "⋮" actions menu + product details drawer state
  const [openMenuRowId, setOpenMenuRowId] = useState<string | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);

  // ==================================================
  // PHASE 1 — Inventory summary (always computed from the FULL catalog,
  // never from filteredProducts, so it stays meaningful while searching/filtering)
  // ==================================================
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

  // واجهة نظيفة تماماً كما طلبت
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    wood_type: 'MDF',
    size: '',
    color: '',
    category: 'ألواح أخشاب',
    received_date: new Date().toISOString().slice(0, 10),
    selling_price: '',
    stock_quantity: '',
    min_stock_level: '10',
    notes: '',
    purchasing_price: '',
  });

  const woodTypes = Array.from(new Set(products.map((p) => p.wood_type).filter(Boolean)));

  // PHASE 2 — stock status check, reusing each product's own min_stock_level
  // (the threshold already used for the red "isLowStock" badge in the table)
  // instead of inventing a separate global setting.
  const getStockStatus = (p: Product): Exclude<StockStatusFilter, 'all'> => {
    const threshold = p.min_stock_level ?? DEFAULT_LOW_STOCK_THRESHOLD;
    if (p.stock_quantity <= 0) return 'out';
    if (p.stock_quantity <= threshold) return 'low';
    return 'available';
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.wood_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.size || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.color || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWood = selectedWoodType === 'all' || p.wood_type === selectedWoodType;
    const matchesStock = stockStatusFilter === 'all' || getStockStatus(p) === stockStatusFilter;
    return matchesSearch && matchesWood && matchesStock;
  });

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
  const selectedWoodTypeForBulk = selectedProducts.length > 0 
    ? selectedProducts[0].wood_type 
    : '';
  const allSelectedSameWoodType = selectedProducts.every((p) => p.wood_type === selectedWoodTypeForBulk);

  // Selection safety: selection is intentionally kept across filter changes (so switching
  // filters doesn't silently lose a bulk selection), but that means a selected product can
  // become hidden by the current search/wood-type/stock filter. Surface that clearly instead
  // of silently including invisible rows in the bulk price update.
  const visibleSelectedCount = filteredProducts.filter((p) => selectedProductIds.has(p.id)).length;
  const hiddenSelectedCount = selectedProductIds.size - visibleSelectedCount;

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const sPrice = parseFloat(formData.selling_price) || 0;
    const stockQty = parseFloat(formData.stock_quantity) || 0;
    const minStock = parseFloat(formData.min_stock_level) || 10;

    if (!formData.name || sPrice <= 0) {
      alert("يرجى التأكد من إدخال اسم المنتج وسعر البيع.");
      return;
    }

    if (editingProduct) {
      // تنظيف الحقول عند التحديث لتجنب إرسال نصوص فارغة
      // ملاحظة: received_date مش موجود في جدول products على Supabase — بنعتمد على created_at
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
      // توليد كود فريد لمنع خطأ التكرار في قاعدة البيانات
      const generatedCode = formData.code || `WOOD-${Math.floor(1000 + Math.random() * 9000)}`;
      // مابنتبعتش received_date لأن العمود مش موجود في الـ DB — created_at بيتسجل تلقائياً
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
      wood_type: 'MDF',
      size: '',
      color: '',
      category: 'ألواح أخشاب',
      received_date: new Date().toISOString().slice(0, 10),
      selling_price: '',
      stock_quantity: '',
      min_stock_level: '10',
      notes: '',
      purchasing_price: '',
    });
    setIsAddModalOpen(false);
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      code: prod.code,
      name: prod.name,
      wood_type: prod.wood_type,
      size: prod.size || '',
      color: prod.color || '',
      category: prod.category || 'ألواح أخشاب',
      received_date: prod.received_date || '',
      selling_price: String(prod.selling_price),
      stock_quantity: String(prod.stock_quantity),
      min_stock_level: String(prod.min_stock_level || 10),
      notes: prod.notes || '',
      purchasing_price: String(prod.purchase_price),
    });
    setIsAddModalOpen(true);
  };

  const handleDeleteClick = (prod: Product) => {
    const confirmed = window.confirm(
      `متأكد إنك عايز تمسح "${prod.name}" نهائيًا؟ الحذف ده مش هينفع ترجع فيه.`
    );
    if (confirmed) {
      onDeleteProduct(prod.id);
      // Remove from selection if deleted
      setSelectedProductIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(prod.id);
        return newSet;
      });
    }
  };

  const handleBulkPriceUpdateSuccess = () => {
    // Clear selection after successful update
    setSelectedProductIds(new Set());
    setIsBulkPriceModalOpen(false);
  };

  // Row menu actions
  const handleOpenDetails = (p: Product) => {
    setDetailsProduct(p);
    setOpenMenuRowId(null);
  };
  const handleEditPriceClick = (p: Product) => {
    setSelectedProductIds(new Set([p.id]));
    setIsBulkPriceModalOpen(true);
    setOpenMenuRowId(null);
  };

  // ==================================================
  // PHASE 3 — movement history for the details drawer.
  // `movements` (from stock_movements) is already loaded once at app start,
  // so filtering it here is a plain in-memory operation, not a new fetch.
  // The stock_movements table only stores each movement's own +/- quantity,
  // not a running "balance after" snapshot, so we derive it by walking
  // backwards from the product's current stock_quantity. This assumes stock
  // wasn't changed by anything other than logged movements (e.g. a direct
  // manual edit of "رصيد الألواح" in the edit form bypasses the movement log) —
  // see the implementation notes at the end of this task for details.
  const productMovements = useMemo(() => {
    if (!detailsProduct) return [];
    const rows = movements
      .filter((m) => m.product_id === detailsProduct.id)
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // oldest -> newest

    let runningBalance = detailsProduct.stock_quantity || 0;
    const withBalance = rows.map((m) => ({ movement: m, balanceAfter: 0 }));
    // Walk from the newest movement backwards: balance_after[newest] = current stock,
    // balance_after[i-1] = balance_after[i] - quantity[i]
    for (let i = withBalance.length - 1; i >= 0; i--) {
      withBalance[i].balanceAfter = runningBalance;
      runningBalance -= withBalance[i].movement.quantity;
    }
    return withBalance.reverse(); // newest first for display
  }, [movements, detailsProduct]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Trees className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'كتالوج الألواح الخشبية' : 'Wooden Sheet Catalog'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'إدارة ألواح الـ MDF، الكونتر، الأبلكاش، والزان - بحساب عدد الألواح وأسعار الشراء والبيع'
              : 'Manage MDF, Counter, Plywood, and hardwood sheet stock & prices.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToImport}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700/80 font-medium text-xs px-3 py-2 rounded-md transition shadow-xs"
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
              <span>{language === 'ar' ? `تحديث أسعار (${selectedProductIds.size})` : `Update Prices (${selectedProductIds.size})`}</span>
            </button>
          )}
          
          <button
            onClick={() => {
              setEditingProduct(null);
              const today = new Date().toISOString().slice(0, 10);
              setFormData({
                code: '',
                name: '',
                wood_type: 'MDF',
                size: '',
                color: '',
                category: 'ألواح أخشاب',
                received_date: today,
                selling_price: '',
                stock_quantity: '',
                min_stock_level: '10',
                notes: '',
                purchasing_price: '',
              });
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
              {catalogStats.totalStock.toLocaleString()} <span className="text-xs font-normal text-slate-400">{language === 'ar' ? 'لوح' : 'sheets'}</span>
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
              {catalogStats.stockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs font-normal text-slate-400">EGP</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
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

      {/* Search & Filter Controls */}
      <div className="bg-[#0e1424] p-3 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute top-3 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث باسم اللوح، الكود، أو نوع الخشب (MDF، كونتر، أبلكاش)...' : 'Search sheet name, code, or wood type...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          />
        </div>
        {woodTypes.length > 0 && (
          <select
            value={selectedWoodType}
            onChange={(e) => setSelectedWoodType(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-200 px-3 py-1.5 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
          >
            <option value="all">{language === 'ar' ? 'جميع أنواع الأخشاب' : 'All Wood Types'}</option>
            {woodTypes.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        )}

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

      {/* Enterprise Catalog Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800 overflow-hidden shadow-xs">
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-[#090d16] text-slate-400 text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center text-slate-500 hover:text-amber-400 transition"
                      title={language === 'ar' ? 'تحديد الكل' : 'Select All'}
                    >
                      {selectedProductIds.size === filteredProducts.length ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'كود اللوح' : 'Code'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'اسم المنتج / اللوح' : 'Item Name'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'نوع الخشب' : 'Wood Type'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'المقاس' : 'Size'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'اللون' : 'Color'}</th>
                  <th className="px-3.5 py-2.5 font-semibold">{language === 'ar' ? 'تاريخ الإضافة' : 'Date'}</th>
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
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700/80">
                          {p.wood_type}
                        </span>
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
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold tabular-nums ${
                          p.stock_quantity === 0
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-900/60'
                            : isLowStock
                            ? 'bg-amber-950/40 text-amber-300 border border-amber-900/60'
                            : 'text-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            p.stock_quantity === 0 ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {p.stock_quantity} لوح
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
                              {/* Backdrop to close on outside click */}
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuRowId(null)} />
                              <div className="absolute z-50 top-full mt-1 rtl:left-0 ltr:right-0 w-44 bg-slate-900 border border-slate-700/80 rounded-md shadow-xl py-1 text-right rtl:text-right ltr:text-left">
                                <button
                                  onClick={() => handleOpenDetails(p)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'عرض تفاصيل الصنف' : 'View Details'}</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleEditClick(p);
                                    setOpenMenuRowId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'تعديل الصنف' : 'Edit Item'}</span>
                                </button>
                                <button
                                  onClick={() => handleEditPriceClick(p)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                                >
                                  <Banknote className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{language === 'ar' ? 'تعديل السعر' : 'Edit Price'}</span>
                                </button>
                                <div className="my-1 border-t border-slate-800" />
                                <button
                                  onClick={() => {
                                    setOpenMenuRowId(null);
                                    handleDeleteClick(p);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/30 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'حذف الصنف' : 'Delete Item'}</span>
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
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            <Trees className="w-10 h-10 mx-auto text-slate-600 mb-2.5" />
            <p className="font-semibold text-xs text-slate-300">
              {language === 'ar' ? 'لا يوجد أصناف أخشاب مسجلة حالياً' : 'No wooden sheets found'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {language === 'ar'
                ? 'قم باستيراد شيت إكسيل يحتوي على أصناف الأخشاب أو أضف صنف لوح جديد يدوياً.'
                : 'Import Excel file containing wood items or add a new item manually.'}
            </p>
            <button
              onClick={onNavigateToImport}
              className="mt-3 bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700/80 font-medium text-xs px-3.5 py-2 rounded-md transition"
            >
              استيراد أصناف الأخشاب من Excel
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">
                {editingProduct ? 'تعديل بيانات صنف الخشب' : 'إضافة صنف لوح خشب جديد'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  اسم المنتج / اللوح الخشبي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: لوح MDF أبيض إسباني 18 مم"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
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
                    نوع الخشب *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MDF / كونتر / أبلكاش"
                    value={formData.wood_type}
                    onChange={(e) => setFormData({ ...formData, wood_type: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
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
                    تاريخ الإضافة
                  </label>
                  <input
                    type="text"
                    disabled
                    value="يُسجَّل تلقائياً عند الحفظ"
                    className="w-full px-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-md text-xs text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    سعر البيع (للّوح) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {editingProduct ? 'عدد الألواح (قابل للتعديل)' : 'رصيد الألواح الأولي'}
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    حد إعادة الطلب (ألواح)
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition active:scale-[0.99]"
                >
                  حفظ صنف اللوح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {isBulkPriceModalOpen && selectedProducts.length > 0 && allSelectedSameWoodType && (
        <BulkPriceUpdateModal
          woodType={selectedWoodTypeForBulk}
          selectedProducts={selectedProducts}
          performedBy="admin"
          language={language}
          onClose={() => setIsBulkPriceModalOpen(false)}
          onUpdated={handleBulkPriceUpdateSuccess}
        />
      )}

      {/* Product Details / Movement History Modal */}
      {detailsProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 sticky top-0 bg-slate-900 z-10">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Trees className="w-4 h-4 text-amber-400" />
                <span>{detailsProduct.name}</span>
              </h3>
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
                    <div className="text-xs font-mono font-bold text-slate-100 mt-0.5">{detailsProduct.stock_quantity} {language === 'ar' ? 'لوح' : ''}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">{language === 'ar' ? 'تاريخ الإضافة' : 'Added On'}</div>
                    <div className="text-xs font-mono text-slate-300 mt-0.5">
                      {detailsProduct.created_at
                        ? new Date(detailsProduct.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Movement history */}
              <div>
                <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'حركة الصنف بالمخازن' : 'Stock Movement'}</span>
                </h4>

                {productMovements.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-800 rounded-md">
                    <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                      <thead className="bg-[#090d16] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                          <th className="px-3 py-2">{language === 'ar' ? 'نوع الحركة' : 'Type'}</th>
                          <th className="px-3 py-2">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                          <th className="px-3 py-2">{language === 'ar' ? 'الرصيد بعد الحركة' : 'Balance After'}</th>
                          <th className="px-3 py-2">{language === 'ar' ? 'المرجع' : 'Reference'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {productMovements.map(({ movement: m, balanceAfter }) => {
                          const isPositive = m.quantity > 0;
                          return (
                            <tr key={m.id} className="hover:bg-slate-850/50">
                              <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {new Date(m.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {language === 'ar' ? MOVEMENT_TYPE_LABELS_AR[m.movement_type] : m.movement_type}
                              </td>
                              <td className={`px-3 py-2 font-bold font-mono tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? `+${m.quantity}` : m.quantity}
                              </td>
                              <td className="px-3 py-2 font-bold font-mono text-slate-100 tabular-nums">{balanceAfter}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{m.reference_id || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-5 text-center text-slate-400 border border-dashed border-slate-800 rounded-md text-xs">
                    {language === 'ar' ? 'لا توجد حركة مسجلة لهذا الصنف' : 'No movement recorded for this item'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};