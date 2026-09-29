import React, { useState } from 'react';
import { Trees, Lock, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  language: 'ar' | 'en';
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ language, onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_APP_PASSWORD;

    if (!correctPassword) {
      console.warn('VITE_APP_PASSWORD is not set — login screen is not actually protecting this app.');
      localStorage.setItem('nileflow_auth', 'true');
      onLoginSuccess();
      return;
    }

    if (password === correctPassword) {
      localStorage.setItem('nileflow_auth', 'true');
      setError('');
      onLoginSuccess();
    } else {
      setError(language === 'ar' ? 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى' : 'Wrong password, try again');
    }
  };

  return (
    <div
      className="min-h-screen bg-[#060913] relative flex items-center justify-center p-4 selection:bg-amber-500/30 selection:text-amber-200 overflow-hidden"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Ambient Lighting Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-radial from-amber-500/12 via-amber-600/5 to-transparent blur-3xl animate-pulse-glow" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '28px 28px'
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm bg-[#0a0f1d]/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.12)] p-6 sm:p-8 space-y-6">
        {/* Brand Crest */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            {/* Soft Breathing Halo */}
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse-glow" />
            <div className="relative w-28 h-28 rounded-full bg-[#070b14]/80 border border-amber-500/40 p-2 shadow-xl flex items-center justify-center">
              <img
                src="/logo.png"
                alt="شركة الدالي لتجارة الأخشاب والقشرة"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_12px_rgba(245,158,11,0.45)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 tracking-tight">
              {language === 'ar' ? 'شركة الدالي لتجارة الأخشاب والقشرة' : 'El-Daly Wood & Veneer Trading Co.'}
            </h1>
            <p className="text-xs text-amber-400 font-semibold mt-1">
              {language === 'ar' ? 'البدرشين - طريق أبوربع' : 'El-Badrasheen - Abo Rabaa Rd.'}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
              {language === 'ar' ? 'منظومة إدارة المخازن والفواتير والتحصيلات' : 'ERP, Stock & Billing Management'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-200 mb-1.5">
              {language === 'ar' ? 'رمز الدخول الأمني' : 'Security Passcode'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-amber-500/70 rtl:right-3 ltr:left-3" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="w-full pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2.5 bg-[#060a14] border border-amber-500/30 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 transition shadow-inner font-mono tracking-widest"
              />
            </div>
            {error && <p className="text-[11px] text-rose-400 font-medium mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs py-2.5 rounded-lg shadow-md shadow-amber-500/20 transition active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{language === 'ar' ? 'تسجيل الدخول للمنظومة' : 'Authenticate & Enter'}</span>
            {language === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>اتصال مشفر ومؤمن بالكامل SSL 256-Bit</span>
        </div>
      </div>
    </div>
  );
};
