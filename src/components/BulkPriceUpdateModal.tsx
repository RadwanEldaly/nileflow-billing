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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-800 text-slate-100">
        <div className="flex items-center justify-between border-b pb-3 border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-amber-400" />
            {isAr ? 'تعديل سعر البيع بالجملة' : 'Bulk Price Update'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP: FORM ───────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-slate-950 rounded-md p-3 space-y-1.5 text-xs border border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">نوع الخشب:</span>
                <span className="font-semibold text-slate-200">{woodType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">عدد الأصناف المحددة:</span>
                <span className="font-semibold text-amber-400 tabular-nums">{count} صنف</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">السعر الحالي:</span>
                {stats.hasMixedPrices ? (
                  <span className="font-semibold text-amber-400/90 text-[11px] tabular-nums">
                    أسعار مختلفة ({formatPrice(stats.minPrice)} – {formatPrice(stats.maxPrice)})
                  </span>
                ) : (
                  <span className="font-semibold text-slate-100 tabular-nums">{formatPrice(stats.singlePrice || 0)}</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                طريقة التحديث
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(MODE_LABELS) as BulkPriceMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition text-right ${
                      mode === m
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {MODE_LABELS[m].ar}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
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
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-md text-xs font-mono font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
              />
              {valueInput.trim() !== '' && !isValueValid && (
                <p className="text-[11px] text-rose-400 mt-1">قيمة غير صالحة (يجب أن تكون رقمًا موجبًا)</p>
              )}
            </div>

            {isValueValid && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-300">{modeDescription()}</p>
                {previewSample.length > 0 && (
                  <div className="space-y-1">
                    {previewSample.map((row) => (
                      <div key={row.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 truncate max-w-[45%]">{row.name}</span>
                        <span className="font-mono text-[11px] tabular-nums">
                          <span className="text-slate-500">{formatPrice(row.current)}</span>
                          <span className="mx-1.5 text-slate-600">→</span>
                          <span className={row.next === null ? 'text-rose-400 font-bold' : 'font-semibold text-emerald-400'}>
                            {row.next === null ? 'سيُتخطى (سعر سالب)' : formatPrice(row.next)}
                          </span>
                        </span>
                      </div>
                    ))}
                    {count > previewSample.length && (
                      <p className="text-[10px] text-slate-500">و {count - previewSample.length} صنف آخر...</p>
                    )}
                  </div>
                )}
                {wouldGoNegative > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-rose-300 bg-rose-950/30 border border-rose-900/40 rounded p-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-rose-400" />
                    <span className="text-[11px]">
                      {wouldGoNegative} صنف سينتج عنه سعر سالب ولن يتم تحديثه — سيتم تخطيه تلقائيًا.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!isValueValid || count === 0}
                onClick={handleGoToConfirm}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition active:scale-[0.99]"
              >
                متابعة التحديث
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: CONFIRM ────────────────────────────────────────── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-4 space-y-2">
              <h4 className="font-bold text-sm text-amber-300">تأكيد تحديث الأسعار</h4>
              <p className="text-xs text-slate-200">
                سيتم تحديث سعر البيع لـ <span className="font-bold font-mono text-amber-400">{count} صنف</span> من نوع:{' '}
                <span className="font-semibold text-slate-100">{woodType}</span>
              </p>
              <p className="text-xs font-medium text-slate-400">{modeDescription()}</p>
              {wouldGoNegative > 0 && (
                <p className="text-[11px] text-rose-400">
                  ملاحظة: {wouldGoNegative} صنف سيُتخطى تلقائيًا لأن السعر الناتج سيكون سالبًا.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('form')}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
              >
                رجوع
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 transition active:scale-[0.99]"
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
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-md p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 font-medium space-y-1">
                  {result.failedCount === 0 && result.skippedCount === 0 && (
                    <p className="font-semibold">تم تحديث أسعار {result.updatedCount} صنفًا بنجاح.</p>
                  )}
                  {(result.failedCount > 0 || result.skippedCount > 0) && (
                    <>
                      <p>تم تحديث {result.updatedCount} صنفًا بنجاح.</p>
                      {result.failedCount > 0 && <p className="text-rose-400">وفشل تحديث {result.failedCount} صنفًا.</p>}
                      {result.skippedCount > 0 && (
                        <p className="text-amber-400">وتم تخطي {result.skippedCount} صنفًا (سعر سالب).</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-md p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200 font-medium">
                  <p className="font-semibold">فشل تحديث الأسعار.</p>
                  {result.error && <p className="text-[11px] font-normal mt-1 text-rose-300">{result.error}</p>}
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
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