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
      className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 selection:bg-amber-500/30 selection:text-amber-200"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-sm bg-[#0e1424] border border-slate-800/80 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Brand Crest */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <img
              src="/logo.png"
              alt="شركة الدالي لتجارة الأخشاب والقشرة"
              className="w-32 h-auto object-contain mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">
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
            <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
              {language === 'ar' ? 'رمز الدخول الأمني' : 'Security Passcode'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-500 rtl:right-3 ltr:left-3" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="w-full pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 bg-[#0b0f19] border border-slate-700/80 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 transition"
              />
            </div>
            {error && <p className="text-[11px] text-rose-400 font-medium mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-md shadow-xs transition active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{language === 'ar' ? 'تسجيل الدخول للمنظومة' : 'Authenticate & Enter'}</span>
            {language === 'ar' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>اتصال محمي ومشفر بالكامل</span>
        </div>
      </div>
    </div>
  );
};
