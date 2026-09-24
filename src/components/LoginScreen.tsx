import React, { useState } from 'react';
import { Trees, Lock } from 'lucide-react';

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
      // Fail safe: if no password was configured on this deployment, don't lock the owner out —
      // but make it very visible in the console that protection isn't actually active.
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
      setError(language === 'ar' ? 'الباسورد غلط، حاول تاني' : 'Wrong password, try again');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="bg-amber-600/90 p-3 rounded-xl text-white shadow-md border border-amber-500/40">
            <Trees className="h-7 w-7 text-amber-100" />
          </div>
          <div>
            <h1 className="text-lg font-black text-amber-100">
              {language === 'ar' ? 'شركة الدالي لتجارة الأخشاب' : 'El-Daly Wood Trading Co.'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar' ? 'أدخل الباسورد للدخول على السيستم' : 'Enter the password to continue'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-slate-500" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder={language === 'ar' ? 'الباسورد' : 'Password'}
                className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-400 font-semibold mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm py-3 rounded-xl shadow-sm transition"
          >
            {language === 'ar' ? 'دخول' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};
