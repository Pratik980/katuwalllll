import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

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
      setError(requestError.response?.data?.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">Katuwal Banshabatika</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t('sign_in')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('sign_in_description')}</p>
        {(error || initializationError) && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || initializationError}</p>
        )}
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-slate-700">
            {t('email')}
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('password')}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-emerald-700 hover:underline">{t('forgot_password')}</Link>
          </div>
          <button disabled={submitting} className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
            {submitting ? t('signing_in') : t('sign_in')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          {t('new_to_platform')} <Link to="/signup" className="font-medium text-emerald-700 hover:underline">{t('create_user_account')}</Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
