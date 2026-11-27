import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex flex-col items-center justify-between gap-3 px-6 py-4 text-sm text-slate-600 md:flex-row">
        <div>
          © {year} <span className="font-semibold text-emerald-800">{t('app_name')}</span>.{' '}
          {t('footer_rights')}
        </div>

        <div className="flex items-center gap-2">
          <span>{t('powered_by')}</span>
          <span className="font-semibold text-emerald-800">NDS Software</span>
        </div>
      </div>
    </footer>
  );
}
