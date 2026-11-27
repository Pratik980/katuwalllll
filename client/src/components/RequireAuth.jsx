import { useState, useEffect } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const RequireAuth = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [tookLong, setTookLong] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setTookLong(true), 6000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen animate-fadeIn flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-800 text-2xl font-bold text-white shadow-sm">
          KB
        </div>
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-emerald-700 border-t-transparent" />
        <h3 className="text-base font-bold text-slate-800">{t('connecting_to_account')}</h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{t('verifying_session')}</p>

        {tookLong && (
          <div className="mt-4 max-w-sm animate-fadeIn space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
            <p className="text-slate-600">{t('server_waking')}</p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-emerald-800 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-700"
              >
                {t('retry')}
              </button>
              <Link
                to="/login"
                className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {t('go_to_login')}
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireAuth;
