import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Shield } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import { useLanguage } from '../context/LanguageContext';

export default function AuthLayout({ children, title, subtitle }) {
  const { logo, name: orgName } = useOrganization();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ne' : 'en');
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-gradient-to-b from-emerald-50/40 via-slate-50 to-emerald-50/30 font-sans selection:bg-emerald-600 selection:text-white px-4 py-6 sm:py-10">
      {/* Top Bar: Language Toggle */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-emerald-800 transition"
        >
          <Shield className="h-4 w-4 text-emerald-700" />
          <span>{orgName || 'Katuwal Banshabatika'}</span>
        </Link>

        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/90 backdrop-blur-sm text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95 cursor-pointer"
          title="Toggle Language / भाषा बदल्नुहोस्"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-700" />
          <span>{language === 'en' ? 'नेपाली' : 'English'}</span>
          <span className="text-xs">{language === 'en' ? '🇳🇵' : '🇬🇧'}</span>
        </button>
      </header>

      {/* Main Centered Auth Card */}
      <main className="w-full max-w-md mx-auto my-auto py-4">
        {/* Brand Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt={orgName || 'Katuwal Bansha'}
                className="h-16 w-16 rounded-2xl object-contain border border-slate-200/80 p-1.5 bg-white shadow-md shadow-slate-200/60"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-emerald-700/20">
                KB
              </div>
            )}
          </div>

          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
            {orgName || 'Katuwal Banshabatika'}
          </h1>
          <p className="text-xs font-medium text-emerald-700 mt-0.5">
            {language === 'ne' ? 'आधिकारिक वंशावली पोर्टल' : 'Official Genealogy & Lineage Portal'}
          </p>
        </div>

        {/* Elevated Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </main>

      {/* Clean, Respectful Footer */}
      <footer className="w-full max-w-md mx-auto text-center text-xs text-slate-400 pt-4">
        <p>
          {language === 'ne'
            ? 'कटुवाल वंश समाज • पुर्खाको इतिहास, भावी पुस्ताको पहिचान'
            : '© 2026 Katuwal Bansha Batika. All rights reserved.'}
        </p>
      </footer>
    </div>
  );
}
