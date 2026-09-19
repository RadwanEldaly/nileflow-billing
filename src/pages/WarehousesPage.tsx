import React, { useState } from 'react';
import { Warehouse, Product, StockMovement } from '../types';
import { Warehouse as WarehouseIcon, History, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface WarehousesPageProps {
  warehouses: Warehouse[];
  products: Product[];
  movements: StockMovement[];
  language: 'ar' | 'en';
  onAddMovement: (movement: Omit<StockMovement, 'id' | 'created_at'>) => void;
}

export const WarehousesPage: React.FC<WarehousesPageProps> = ({
  warehouses,
  products,
  movements,
  language,
  onAddMovement,
}) => {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('all');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [adjustmentType, setAdjustmentType] = useState<'manual_add' | 'manual_subtract'>('manual_add');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const filteredMovements = movements.filter((m) => {
    return selectedWarehouseId === 'all' || m.warehouse_id === selectedWarehouseId;
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (!productId || isNaN(qty) || qty <= 0) return;

    const prod = products.find((p) => p.id === productId);

    onAddMovement({
      product_id: productId,
      product_name: prod?.name,
      warehouse_id: warehouseId,
      movement_type: adjustmentType,
      quantity: adjustmentType === 'manual_add' ? qty : -qty,
      notes: notes || 'تعديل رصيد يدوي',
    });

    setIsAdjustModalOpen(false);
    setQuantity('1');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-amber-600" />
            <span>{language === 'ar' ? 'إدارة المخازن وحركة الألواح' : 'Warehouses & Stock Movements'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'ar'
              ? 'تتبع رصيد الألواح لكل مخزن، وسجل جميع حركات الدخول والخروج مع منع التضارب بين الأجهزة'
              : 'Track wooden sheet counts per warehouse and maintain stock audit logs.'}
          </p>
        </div>

        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'تعديل رصيد يدوي' : 'Adjust Stock'}</span>
        </button>
      </div>

      {/* Warehouses Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {warehouses.map((wh) => {
          const warehouseMovements = movements.filter((m) => m.warehouse_id === wh.id);
          return (
            <div key={wh.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WarehouseIcon className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white">{wh.name}</h3>
                </div>
                {wh.is_default && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    رئيسي
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-500">{wh.location || 'البدرشين'}</div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>حركات المخزن:</span>
                <span className="font-bold font-mono">{warehouseMovements.length} حركة</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm space-y-4">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              {language === 'ar' ? 'سجل حركات المخزون التفصيلي' : 'Stock Movements Audit Trail'}
            </h3>
          </div>

          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold px-3 py-1.5"
          >
            <option value="all">جميع المخازن</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {filteredMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 text-xs uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">التاريخ والوقت</th>
                  <th className="px-6 py-3.5">اسم اللوح الخشبي</th>
                  <th className="px-6 py-3.5">نوع الحركة</th>
                  <th className="px-6 py-3.5">المخزن</th>
                  <th className="px-6 py-3.5">الكمية (ألواح)</th>
                  <th className="px-6 py-3.5">ملاحظات / مرجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredMovements.map((m) => {
                  const isPositive = m.quantity > 0;
                  const wh = warehouses.find((w) => w.id === m.warehouse_id);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {new Date(m.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        {m.product_name || 'لوح خشب'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            m.movement_type === 'sale'
                              ? 'bg-red-100 text-red-800'
                              : m.movement_type === 'purchase'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.movement_type === 'sale'
                            ? 'بيع (خصم)'
                            : m.movement_type === 'purchase'
                            ? 'شراء (إضافة)'
                            : m.movement_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{wh?.name || '-'}</td>
                      <td className="px-6 py-4 font-extrabold font-mono">
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isPositive ? `+${m.quantity}` : m.quantity} لوح
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{m.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              {language === 'ar' ? 'لا يوجد حركات مخزون مسجلة حتى الآن' : 'No stock movements recorded'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Manual Adjustment */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">تعديل رصيد مخزون يدوي</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اختر صنف اللوح *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                >
                  <option value="">-- اختر اللوح الخشبي --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المتوفر: {p.stock_quantity} لوح)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع التعديل
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold"
                  >
                    <option value="manual_add">إضافة ألواح (+)</option>
                    <option value="manual_subtract">خصم ألواح (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    عدد الألواح *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل / ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسوية جرد سنوي"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  حفظ الحركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
