import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { setCsrfToken } from '../api/csrfToken';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../components/AuthLayout';

const SignUp = () => {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (response.data.csrfToken) {
        setCsrfToken(response.data.csrfToken);
      }
      if (response.data.user) {
        updateUser(response.data.user);
      }

      toast.success(response.data.message || 'Account created successfully!');
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        'Could not create account. Please check your information and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('create_user_account') || 'Create Account'}
      subtitle={t('create_account_description') || 'Join the family tree and connect with your lineage.'}
    >
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-2xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Registration Notice</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700">
            {t('full_name')}
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. Roshan Katuwal"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
            {t('email')}
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              placeholder="your.email@example.com"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <PasswordInput
            label={t('password_min_length')}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete="new-password"
            placeholder="••••••••••••"
            minLength={12}
            maxLength={128}
            required
            icon={Lock}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Password must be at least 12 characters long.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-emerald-800 hover:to-teal-900 hover:shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('creating_account') || 'Creating account...'}</span>
            </>
          ) : (
            <>
              <span>{t('create_user_account')}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Alternate Link */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-center">
        <p className="text-sm text-slate-600">
          {t('already_registered')}{' '}
          <Link
            to="/login"
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline transition ml-1"
          >
            {t('sign_in')}
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
