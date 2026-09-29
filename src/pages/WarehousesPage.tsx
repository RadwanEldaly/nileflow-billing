import React, { useState } from 'react';
import { Warehouse, Product, StockMovement } from '../types';
import { Warehouse as WarehouseIcon, History, Plus, ArrowUpRight, ArrowDownLeft, X, Filter } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <WarehouseIcon className="w-5 h-5 text-amber-400" />
            <span>{language === 'ar' ? 'إدارة المخازن وحركة الألواح' : 'Warehouses & Stock Movements'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'ar'
              ? 'تتبع رصيد الألواح لكل مخزن، وسجل حركات الإيداع والصرف والتسويات المخزنية'
              : 'Track wooden sheet counts per warehouse and maintain stock audit logs.'}
          </p>
        </div>

        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-md shadow-xs transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'تسوية رصيد يدوي' : 'Adjust Stock'}</span>
        </button>
      </div>

      {/* Warehouses Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {warehouses.map((wh) => {
          const warehouseMovements = movements.filter((m) => m.warehouse_id === wh.id);
          return (
            <div
              key={wh.id}
              className="bg-[#0e1424] p-4 rounded-lg border border-slate-800/80 shadow-xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                    <WarehouseIcon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-100">{wh.name}</h3>
                </div>
                {wh.is_default && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    رئيسي
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400">{wh.location || 'البدرشين، الجيزة'}</div>

              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
                <span>إجمالي الحركات المسجلة:</span>
                <span className="font-mono tabular-nums font-bold text-slate-200">
                  {warehouseMovements.length} حركة
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Movements Table */}
      <div className="bg-[#0e1424] rounded-lg border border-slate-800/80 overflow-hidden shadow-xs">
        {/* Table Filter Topbar */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-slate-200">
              {language === 'ar' ? 'سجل حركات المخزون التفصيلي' : 'Stock Movements Audit Trail'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs font-medium text-slate-200 px-2.5 py-1 focus:outline-none focus:border-amber-500"
            >
              <option value="all">جميع المخازن ({warehouses.length})</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredMovements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">التاريخ والوقت</th>
                  <th className="px-4 py-3">اسم اللوح الخشبي</th>
                  <th className="px-4 py-3">نوع الحركة</th>
                  <th className="px-4 py-3">المخزن</th>
                  <th className="px-4 py-3 text-left">الكمية (ألواح)</th>
                  <th className="px-4 py-3">ملاحظات / مرجع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMovements.map((m) => {
                  const isPositive = m.quantity > 0;
                  const wh = warehouses.find((w) => w.id === m.warehouse_id);
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-400 text-[11px]">
                        {new Date(m.created_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {m.product_name || 'لوح خشب'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            m.movement_type === 'sale'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : m.movement_type === 'purchase'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {m.movement_type === 'sale'
                            ? 'صرف فاتورة بيع'
                            : m.movement_type === 'purchase'
                            ? 'إيداع فاتورة شراء'
                            : m.movement_type === 'manual_add'
                            ? 'تسوية إضافة (+)'
                            : m.movement_type === 'manual_subtract'
                            ? 'تسوية خصم (-)'
                            : m.movement_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{wh?.name || '—'}</td>
                      <td className="px-4 py-3 text-left font-mono tabular-nums font-bold">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? `+${m.quantity}` : m.quantity}{' '}
                          <span className="text-[10px] font-normal text-slate-500">لوح</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">{m.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
            <p className="font-semibold text-slate-300 text-sm">
              {language === 'ar' ? 'لا توجد حركات مخزون مسجلة حتى الآن' : 'No stock movements recorded'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'ar'
                ? 'الحركات تظهر تلقائياً عند إصدار فواتير البيع، فواتير الشراء، أو التسويات'
                : 'Movements automatically log on sales, purchases, or adjustments'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Manual Adjustment */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0e1424] rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-700/80 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <WarehouseIcon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">تسوية رصيد ألواح مخزني يدوي</h3>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  اختر صنف اللوح *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر اللوح الخشبي --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المتوفر حالياً: {p.stock_quantity} لوح)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  المخزن المعني *
                </label>
                <select
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    نوع العملية
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-semibold text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="manual_add">إضافة ألواح (+)</option>
                    <option value="manual_subtract">خصم ألواح (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    عدد الألواح *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs font-mono font-medium text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  سبب التسوية / ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="مثال: تسوية جرد دوري، تلف، إرجاع..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-[0.99]"
                >
                  حفظ الحركة واعتماد الرصيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
