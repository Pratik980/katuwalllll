import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { setCsrfToken } from '../api/csrfToken';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';

const SignUp = () => {
  const { updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devCode, setDevCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitDetails = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/signup', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      setStep('verify');
      const receivedCode = response.data?.code || response.data?.devCode || '';
      setDevCode(receivedCode);
      if (receivedCode) {
        setForm((prev) => ({ ...prev, code: receivedCode }));
      }
      setMessage(response.data?.message || 'A verification code has been sent to your email address.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not start account registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/resend-otp', {
        email: form.email,
        purpose: 'signup',
      });
      const receivedCode = response.data?.code || response.data?.devCode || '';
      setDevCode(receivedCode);
      if (receivedCode) {
        setForm((prev) => ({ ...prev, code: receivedCode }));
      }
      setMessage(response.data?.message || 'A new verification code has been sent.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not resend the verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: form.email,
        code: form.code,
        purpose: 'signup',
      });
      setCsrfToken(response.data.csrfToken);
      updateUser(response.data.user);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not verify the email code.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (name, label, type = 'text', autocomplete = '') => (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        autoComplete={autocomplete || undefined}
        required
        minLength={name === 'password' ? 12 : undefined}
        maxLength={name === 'password' ? 128 : undefined}
        value={form[name]}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">Katuwal Banshabatika</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t('create_user_account')}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {step === 'details' ? t('signup_verification_info') : `${t('otp_sent_to')} ${form.email}.`}
        </p>
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        {step === 'verify' && devCode && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Verification Code</p>
            <p className="mt-1 text-2xl font-bold tracking-widest text-amber-950 font-mono">{devCode}</p>
            <p className="mt-1 text-xs text-amber-700">Enter this 6-digit code below to complete account registration.</p>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {step === 'details' ? (
          <form className="mt-6 space-y-4" onSubmit={submitDetails}>
            {field('name', t('full_name'), 'text', 'name')}
            {field('email', t('email'), 'email', 'email')}
            <PasswordInput
              label={t('password_min_length')}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <button disabled={submitting} className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
              {submitting ? t('sending_code') : t('continue_email_verification')}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={verify}>
            {field('code', t('verification_code'), 'text', 'one-time-code')}
            <button disabled={submitting} className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
              {submitting ? t('verifying') : t('verify_and_create_account')}
            </button>
            <button type="button" onClick={resendCode} disabled={submitting} className="w-full text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60">
              {t('resend_code') || 'Resend verification code'}
            </button>
            <button type="button" onClick={() => { setStep('details'); setMessage(''); setError(''); }} className="w-full text-sm text-slate-600 hover:text-slate-900">
              {t('back_to_account_details')}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-slate-600">
          {t('already_registered')} <Link to="/login" className="font-medium text-emerald-700 hover:underline">{t('sign_in')}</Link>
        </p>
      </section>
    </main>
  );
};

export default SignUp;
