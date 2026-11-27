import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../components/AuthLayout';

const Login = () => {
  const { signIn, initializationError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await signIn(form);
      navigate(user.mustChangePassword ? '/change-password' : location.state?.from || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('sign_in_failed_message'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title={t('welcome_back')} subtitle={t('sign_in_description')}>
      {(error || initializationError) && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-2xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error ? t('sign_in_failed') : t('connection_notice')}</p>
            <p className="mt-0.5 text-xs text-red-700">{error || initializationError}</p>
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
            {t('email')}
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder={t('email_placeholder')}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <PasswordInput
            label={t('password')}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            icon={Lock}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-600">{t('remember_device')}</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition"
          >
            {t('forgot_password')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('signing_in')}</span>
            </>
          ) : (
            <>
              <span>{t('sign_in')}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Alternate Link */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-600">
          {t('new_to_platform')}{' '}
          <Link
            to="/signup"
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition ml-1"
          >
            {t('create_user_account')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
