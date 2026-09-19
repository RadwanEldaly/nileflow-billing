import React, { useState } from 'react';
import { Product, Supplier } from '../types';
import { Search, Plus, Trees, Edit3, X, FileSpreadsheet } from 'lucide-react';

interface ProductsPageProps {
  products: Product[];
  suppliers: Supplier[];
  language: 'ar' | 'en';
  onAddProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onNavigateToImport: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  suppliers,
  language,
  onAddProduct,
  onUpdateProduct,
  onNavigateToImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWoodType, setSelectedWoodType] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    wood_type: 'MDF',
    category: 'ألواح أخشاب',
    purchase_price: '',
    selling_price: '',
    stock_quantity: '',
    min_stock_level: '10',
    supplier_id: '',
    notes: '',
  });

  const woodTypes = Array.from(new Set(products.map((p) => p.wood_type).filter(Boolean)));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.wood_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWood = selectedWoodType === 'all' || p.wood_type === selectedWoodType;
    return matchesSearch && matchesWood;
  });

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const pPrice = parseFloat(formData.purchase_price) || 0;
    const sPrice = parseFloat(formData.selling_price) || 0;
    const stockQty = parseFloat(formData.stock_quantity) || 0;
    const minStock = parseFloat(formData.min_stock_level) || 10;

    if (!formData.name || sPrice <= 0) return;

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, {
        code: formData.code || editingProduct.code,
        name: formData.name,
        wood_type: formData.wood_type,
        category: formData.category,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        supplier_id: formData.supplier_id || undefined,
        notes: formData.notes,
      });
      setEditingProduct(null);
    } else {
      const generatedCode = formData.code || `WOOD-${String(products.length + 1).padStart(4, '0')}`;
      onAddProduct({
        code: generatedCode,
        name: formData.name,
        wood_type: formData.wood_type,
        category: formData.category,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: stockQty,
        min_stock_level: minStock,
        supplier_id: formData.supplier_id || undefined,
        notes: formData.notes,
        is_active: true,
      });
    }

    setFormData({
      code: '',
      name: '',
      wood_type: 'MDF',
      category: 'ألواح أخشاب',
      purchase_price: '',
      selling_price: '',
      stock_quantity: '',
      min_stock_level: '10',
      supplier_id: '',
      notes: '',
    });
    setIsAddModalOpen(false);
  };

  const handleEditClick = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      code: prod.code,
      name: prod.name,
      wood_type: prod.wood_type,
      category: prod.category || 'ألواح أخشاب',
      purchase_price: String(prod.purchase_price),
      selling_price: String(prod.selling_price),
      stock_quantity: String(prod.stock_quantity),
      min_stock_level: String(prod.min_stock_level || 10),
      supplier_id: prod.supplier_id || '',
      notes: prod.notes || '',
    });
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Trees className="w-6 h-6 text-amber-600" />
            <span>{language === 'ar' ? 'كتالوج الألواح الخشبية' : 'Wooden Sheet Catalog'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'إدارة ألواح الـ MDF، الكونتر، الأبلكاش، والزان - بحساب عدد الألواح وأسعار الشراء والبيع'
              : 'Manage MDF, Counter, Plywood, and hardwood sheet stock & prices.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToImport}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'ar' ? 'استيراد إكسيل دفعة واحدة' : 'Import Excel'}</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                code: '',
                name: '',
                wood_type: 'MDF',
                category: 'ألواح أخشاب',
                purchase_price: '',
                selling_price: '',
                stock_quantity: '',
                min_stock_level: '10',
                supplier_id: '',
                notes: '',
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'ar' ? 'إضافة صنف لوح جديد' : 'Add Sheet Item'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 right-3 text-slate-400 rtl:right-3 ltr:left-3" />
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث باسم اللوح، الكود، أو نوع الخشب (MDF، كونتر، أبلكاش)...' : 'Search sheet name, code, or wood type...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 rtl:pr-10 rtl:pl-4 ltr:pl-10 ltr:pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {woodTypes.length > 0 && (
          <select
            value={selectedWoodType}
            onChange={(e) => setSelectedWoodType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white px-4 py-2 font-bold focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">{language === 'ar' ? 'جميع أنواع الأخشاب' : 'All Wood Types'}</option>
            {woodTypes.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">كود اللوح</th>
                  <th className="px-6 py-3.5">اسم المنتج / اللوح</th>
                  <th className="px-6 py-3.5">نوع الخشب</th>
                  <th className="px-6 py-3.5">سعر الشراء</th>
                  <th className="px-6 py-3.5">سعر البيع</th>
                  <th className="px-6 py-3.5">رصيد الألواح الحالي</th>
                  <th className="px-6 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredProducts.map((p) => {
                  const isLowStock = p.stock_quantity <= (p.min_stock_level || 10);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-bold text-xs text-slate-500">{p.code}</td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {p.wood_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">{p.purchase_price} EGP</td>
                      <td className="px-6 py-4 font-extrabold text-amber-700 dark:text-amber-400">{p.selling_price} EGP</td>
                      <td className="px-6 py-4 font-black">
                        <span className={`px-2.5 py-1 rounded-lg ${isLowStock ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}>
                          {p.stock_quantity} لوح
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleEditClick(p)}
                          className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Trees className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد أصناف أخشاب مسجلة حالياً' : 'No wooden sheets found'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'ar'
                ? 'قم باستيراد شيت إكسيل يحتوي على أصناف الأخشاب أو أضف صنف لوح جديد يدوياً.'
                : 'Import Excel file containing wood items or add a new item manually.'}
            </p>
            <button
              onClick={onNavigateToImport}
              className="mt-4 bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition"
            >
              استيراد أصناف الأخشاب من Excel
            </button>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Product */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingProduct ? 'تعديل بيانات صنف الخشب' : 'إضافة صنف لوح خشب جديد'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنتج / اللوح الخشبي *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: لوح MDF أبيض إسباني 18 مم"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    كود الصنف (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="تلقائي إن ترك فارغاً"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الخشب *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MDF / كونتر / أبلكاش"
                    value={formData.wood_type}
                    onChange={(e) => setFormData({ ...formData, wood_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر الشراء (للّوح)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    سعر البيع (للّوح) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-extrabold text-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رصيد الألواح الأولي
                  </label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    حد إعادة الطلب (ألواح)
                  </label>
                  <input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  حفظ صنف اللوح
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
