import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState('email');
  const [form, setForm] = useState({ email: '', code: '', password: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (step === 'email') {
        const response = await api.post('/auth/forgot-password', { email: form.email });
        setMessage(response.data.message);
        setStep('verify');
      } else if (step === 'verify') {
        const response = await api.post('/auth/verify-otp', {
          email: form.email,
          code: form.code,
          purpose: 'password_reset',
        });
        setResetToken(response.data.resetToken);
        setStep('reset');
      } else {
        if (form.password !== form.confirmPassword) {
          setError(t('passwords_do_not_match'));
          return;
        }
        const response = await api.post('/auth/reset-password', {
          email: form.email,
          resetToken,
          newPassword: form.password,
        });
        setMessage(response.data.message);
        setStep('complete');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Password recovery could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-emerald-700">Katuwal Banshabatika</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{t('reset_password')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('password_reset_verification_info')}</p>
        {message && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {step !== 'complete' && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {step === 'email' && (
              <label className="block text-sm font-medium text-slate-700">
                {t('email')}
                <input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </label>
            )}
            {step === 'verify' && (
              <label className="block text-sm font-medium text-slate-700">
                {t('six_digit_code')}
                <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
              </label>
            )}
            {step === 'reset' && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  {t('new_password')}
                  <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {t('confirm_new_password')}
                  <input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
              </>
            )}
            <button disabled={busy} className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
              {busy ? t('please_wait') : step === 'email' ? t('send_verification_code') : step === 'verify' ? t('verify_code') : t('set_new_password')}
            </button>
          </form>
        )}
        {step === 'complete' && <Link to="/login" className="mt-5 inline-block font-medium text-emerald-700 hover:underline">{t('return_to_sign_in')}</Link>}
        {step !== 'complete' && <Link to="/login" className="mt-6 inline-block text-sm text-slate-600 hover:text-slate-900">{t('back_to_sign_in')}</Link>}
      </section>
    </main>
  );
};

export default ForgotPassword;
