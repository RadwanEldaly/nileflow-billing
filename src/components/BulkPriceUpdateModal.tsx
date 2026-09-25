import React, { useMemo, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, Banknote } from 'lucide-react';
import { Product } from '../types';
import {
  BulkPriceMode,
  getPriceStats,
  computeNewPrice,
  countWouldGoNegative,
  performBulkPriceUpdate,
  BulkPriceUpdateResult,
} from '../services/bulkPriceService';

interface BulkPriceUpdateModalProps {
  woodType: string;
  selectedProducts: Product[];
  performedBy: string;
  language: 'ar' | 'en';
  onClose: () => void;
  /** Called after a successful (even partially successful) update so the parent can refresh product data. */
  onUpdated: () => void;
}

const MODE_LABELS: Record<BulkPriceMode, { ar: string; short: string }> = {
  set: { ar: 'سعر موحد جديد', short: 'سعر جديد' },
  increase_amount: { ar: 'زيادة بمبلغ ثابت', short: '+ مبلغ' },
  increase_percent: { ar: 'زيادة بنسبة', short: '+ نسبة' },
  decrease_amount: { ar: 'خفض بمبلغ ثابت', short: '- مبلغ' },
  decrease_percent: { ar: 'خفض بنسبة', short: '- نسبة' },
};

type Step = 'form' | 'confirm' | 'result';

export const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({
  woodType,
  selectedProducts,
  performedBy,
  language,
  onClose,
  onUpdated,
}) => {
  const [mode, setMode] = useState<BulkPriceMode>('set');
  const [valueInput, setValueInput] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkPriceUpdateResult | null>(null);

  const count = selectedProducts.length;
  const stats = useMemo(() => getPriceStats(selectedProducts), [selectedProducts]);
  const value = parseFloat(valueInput);
  const isValueValid =
    valueInput.trim() !== '' &&
    !Number.isNaN(value) &&
    value >= 0 &&
    !(mode === 'decrease_percent' && value > 100);
  const wouldGoNegative = isValueValid ? countWouldGoNegative(selectedProducts, mode, value) : 0;
  const isAr = language === 'ar';

  const formatPrice = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} EGP`;

  const modeDescription = (): string => {
    if (!isValueValid) return '';
    switch (mode) {
      case 'set':
        return `جميع الأصناف المحددة ستصبح ${formatPrice(value)}`;
      case 'increase_amount':
        return `سيُضاف ${formatPrice(value)} لكل صنف محدد`;
      case 'increase_percent':
        return `سيُضاف ${value}% لسعر كل صنف محدد`;
      case 'decrease_amount':
        return `سيُخصم ${formatPrice(value)} من كل صنف محدد`;
      case 'decrease_percent':
        return `سيُخصم ${value}% من سعر كل صنف محدد`;
      default:
        return '';
    }
  };

  // Small preview sample (first few) showing current -> new price
  const previewSample = useMemo(() => {
    if (!isValueValid) return [];
    return selectedProducts.slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      current: Number(p.selling_price) || 0,
      next: computeNewPrice(Number(p.selling_price) || 0, mode, value),
    }));
  }, [selectedProducts, mode, value, isValueValid]);

  const handleGoToConfirm = () => {
    if (!isValueValid || count === 0) return;
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const res = await performBulkPriceUpdate({
      woodType,
      productIds: selectedProducts.map((p) => p.id),
      mode,
      value,
      performedBy,
      note: 'تحديث سعر جماعي من كتالوج الألواح الخشبية',
    });
    setIsSubmitting(false);
    setResult(res);
    setStep('result');
    if (res.success && res.updatedCount > 0) {
      onUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-amber-600" />
            {isAr ? 'تعديل سعر البيع بالجملة' : 'Bulk Price Update'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── STEP: FORM ───────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الخشب:</span>
                <span className="font-bold text-slate-900 dark:text-white">{woodType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">عدد الأصناف المحددة:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">{count} صنف</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">السعر الحالي:</span>
                {stats.hasMixedPrices ? (
                  <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">
                    الأصناف المحددة تحتوي على أسعار مختلفة ({formatPrice(stats.minPrice)} – {formatPrice(stats.maxPrice)})
                  </span>
                ) : (
                  <span className="font-bold text-slate-900 dark:text-white">{formatPrice(stats.singlePrice || 0)}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                طريقة التحديث
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(MODE_LABELS) as BulkPriceMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition text-right ${
                      mode === m
                        ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                    }`}
                  >
                    {MODE_LABELS[m].ar}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {mode === 'set' && 'السعر الجديد (EGP)'}
                {mode === 'increase_amount' && 'قيمة الزيادة (EGP)'}
                {mode === 'increase_percent' && 'نسبة الزيادة (%)'}
                {mode === 'decrease_amount' && 'قيمة الخفض (EGP)'}
                {mode === 'decrease_percent' && 'نسبة الخفض (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                placeholder={mode.includes('percent') ? 'مثال: 10' : 'مثال: 1800'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-extrabold text-amber-600 focus:ring-2 focus:ring-amber-500"
              />
              {valueInput.trim() !== '' && !isValueValid && (
                <p className="text-xs text-red-600 mt-1">قيمة غير صالحة (يجب أن تكون رقمًا موجبًا)</p>
              )}
            </div>

            {isValueValid && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{modeDescription()}</p>
                {previewSample.length > 0 && (
                  <div className="space-y-1">
                    {previewSample.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 truncate max-w-[45%]">{row.name}</span>
                        <span className="font-mono">
                          <span className="text-slate-400">{formatPrice(row.current)}</span>
                          <span className="mx-1.5 text-slate-400">→</span>
                          <span className={row.next === null ? 'text-red-600 font-bold' : 'font-bold text-emerald-700 dark:text-emerald-400'}>
                            {row.next === null ? 'سيُتخطى (سعر سالب)' : formatPrice(row.next)}
                          </span>
                        </span>
                      </div>
                    ))}
                    {count > previewSample.length && (
                      <p className="text-[11px] text-slate-400">و {count - previewSample.length} صنف آخر...</p>
                    )}
                  </div>
                )}
                {wouldGoNegative > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {wouldGoNegative} صنف سينتج عنه سعر سالب ولن يتم تحديثه — سيتم تخطيه تلقائيًا للحفاظ على سلامة البيانات.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!isValueValid || count === 0}
                onClick={handleGoToConfirm}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white"
              >
                تحديث الأسعار
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-4 space-y-2">
              <h4 className="font-black text-amber-900 dark:text-amber-200">تأكيد تحديث الأسعار</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                سيتم تحديث سعر البيع لـ <span className="font-black">{count} صنف</span> من نوع:{' '}
                <span className="font-black">{woodType}</span>
              </p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{modeDescription()}</p>
              {wouldGoNegative > 0 && (
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">
                  ملاحظة: {wouldGoNegative} صنف سيُتخطى تلقائيًا لأن السعر الناتج سيكون سالبًا.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('form')}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                تأكيد تحديث الأسعار
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: RESULT ─────────────────────────────────────────── */}
        {step === 'result' && result && (
          <div className="space-y-4">
            {result.success ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900 dark:text-emerald-200 font-bold space-y-1">
                  {result.failedCount === 0 && result.skippedCount === 0 && (
                    <p>تم تحديث أسعار {result.updatedCount} صنفًا بنجاح.</p>
                  )}
                  {(result.failedCount > 0 || result.skippedCount > 0) && (
                    <>
                      <p>تم تحديث {result.updatedCount} صنفًا بنجاح.</p>
                      {result.failedCount > 0 && <p className="text-red-700 dark:text-red-400">وفشل تحديث {result.failedCount} صنفًا.</p>}
                      {result.skippedCount > 0 && (
                        <p className="text-orange-700 dark:text-orange-400">وتم تخطي {result.skippedCount} صنفًا (سعر سالب).</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900 dark:text-red-200 font-bold">
                  <p>فشل تحديث الأسعار.</p>
                  {result.error && <p className="text-xs font-normal mt-1 text-red-700 dark:text-red-400">{result.error}</p>}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};