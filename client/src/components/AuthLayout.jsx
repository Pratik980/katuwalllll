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
    <div className="flex min-h-screen w-full flex-col justify-between bg-slate-50 px-4 py-6 font-sans selection:bg-emerald-700 selection:text-white sm:py-10">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-emerald-800"
        >
          <Shield className="h-4 w-4 text-emerald-800" />
          <span>{orgName || t('app_name')}</span>
        </Link>

        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95"
          title={t('toggle_language')}
        >
          <Globe className="h-3.5 w-3.5 text-emerald-800" />
          <span>{language === 'en' ? t('nepali') : t('english')}</span>
        </button>
      </header>

      <main className="mx-auto my-auto w-full max-w-md py-4">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center">
            {logo ? (
              <img
                src={logo}
                alt={orgName || t('app_name')}
                className="h-16 w-16 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 text-2xl font-bold text-white shadow-sm">
                KB
              </div>
            )}
          </div>

          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
            {orgName || t('app_name')}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-emerald-800">{t('app_tagline')}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
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

      <footer className="mx-auto w-full max-w-md pt-4 text-center text-xs text-slate-400">
        <p>{t('app_footer')}</p>
      </footer>
    </div>
  );
}
