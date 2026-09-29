import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Database, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  language?: 'ar' | 'en';
  onComplete?: () => void;
}

const stepsAr = [
  'الاتصال الآمن بقاعدة البيانات المركزية...',
  'مزامنة كتالوج الألواح الخشبية والمخزون الحي...',
  'تحميل الفواتير وسجلات العملاء والموردين...',
  'تهيئة لوحة المتابعة والمؤشرات المالية...',
  'اكتمل التحميل بنجاح، مرحباً بك في المنظومة!'
];

const stepsEn = [
  'Establishing secure database handshake...',
  'Synchronizing wood sheets catalog & live stock...',
  'Loading invoices, customer & supplier ledgers...',
  'Calibrating executive financial dashboards...',
  'System ready. Welcome to El-Daly Enterprise!'
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ language = 'ar', onComplete }) => {
  const [progress, setProgress] = useState(12);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const steps = language === 'ar' ? stepsAr : stepsEn;

  useEffect(() => {
    // Stage 1
    const t1 = setTimeout(() => {
      setProgress(38);
      setStepIndex(1);
    }, 400);

    // Stage 2
    const t2 = setTimeout(() => {
      setProgress(68);
      setStepIndex(2);
    }, 900);

    // Stage 3
    const t3 = setTimeout(() => {
      setProgress(92);
      setStepIndex(3);
    }, 1400);

    // Final Stage
    const t4 = setTimeout(() => {
      setProgress(100);
      setStepIndex(4);
    }, 1850);

    // Fade out and finish
    const t5 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2100);

    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050811] text-slate-100 overflow-hidden select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Ambient Lighting Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-radial from-amber-500/15 via-amber-600/5 to-transparent blur-3xl animate-pulse-glow" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Main Luxury Emblem & Branding Card */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6 text-center">
        
        {/* Orbital Centerpiece */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center mb-6">
          {/* Outer Rotating Glowing Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/30 animate-spin-slow" />
          
          {/* Accent Glowing Arc */}
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500/50 animate-spin-slow"
            style={{ animationDuration: '9s' }}
          />

          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-3 sm:inset-4 rounded-full border border-amber-400/20 border-dotted animate-reverse-spin-slow" />

          {/* Ambient Golden Core Glow */}
          <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-amber-600/20 via-yellow-500/25 to-amber-300/10 blur-xl animate-pulse-glow" />

          {/* Central Logo with Float Motion */}
          <div className="relative z-20 w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0a0f1d]/90 p-3 shadow-2xl border border-amber-500/40 flex items-center justify-center animate-float-gentle backdrop-blur-md">
            <img
              src="/logo.png"
              alt="شركة الدالي لتجارة الأخشاب والقشرة"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]"
            />
          </div>

          {/* Decorative Orbit Jewels */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24] animate-pulse" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
        </div>

        {/* Company Title with Rich Gold Gradient */}
        <div className="space-y-1.5 mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide shadow-xs mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ar' ? 'منظومة الإدارة والمخازن والفوترة' : 'Enterprise ERP & Wood Stock OS'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 drop-shadow-sm">
            {language === 'ar' ? 'شركة الدالي لتجارة الأخشاب والقشرة' : 'El-Daly Wood & Veneer Trading Co.'}
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-slate-400">
            {language === 'ar' ? 'البدرشين - طريق أبوربع' : 'El-Badrasheen - Abo Rabaa Rd.'}
          </p>
        </div>

        {/* High-End Progress Bar */}
        <div className="w-full max-w-sm space-y-2.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              {steps[stepIndex]}
            </span>
            <span className="font-mono font-bold text-amber-400">{progress}%</span>
          </div>

          <div className="relative h-2.5 w-full bg-slate-900/90 rounded-full overflow-hidden border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.15)] backdrop-blur-sm">
            {/* Smooth Fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(251,191,36,0.8)]"
              style={{ width: `${progress}%` }}
            />
            {/* Moving Light Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-shimmer-progress" />
          </div>
        </div>

        {/* Trust & Performance Badges */}
        <div className="mt-8 pt-5 border-t border-slate-800/80 w-full flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>تشفير مالي آمن 256-bit</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>سيرفر سحابي فائق السرعة</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>إصدار 2026 المعتمد</span>
          </div>
        </div>

      </div>
    </div>
  );
};
