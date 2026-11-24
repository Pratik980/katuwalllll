import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, KeyRound, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '' });
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [devCode, setDevCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const submitDetails = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      setStep('verify');
      const receivedCode = response.data?.code || response.data?.devCode || '';
      setDevCode(receivedCode);
      if (receivedCode) {
        setForm((prev) => ({ ...prev, code: receivedCode }));
      }
      setMessage(response.data?.message || 'A 6-digit verification code has been sent to your email.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not start account registration. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError('');
    setMessage('');
    setResending(true);
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
      setMessage(response.data?.message || 'A new verification code has been dispatched.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not resend the verification code.');
    } finally {
      setResending(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email: form.email,
        code: form.code.trim(),
        purpose: 'signup',
      });
      setCsrfToken(response.data.csrfToken);
      updateUser(response.data.user);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={step === 'details' ? (t('create_user_account') || 'Create Account') : (t('step_verify') || 'Verify Your Email')}
      subtitle={
        step === 'details'
          ? (t('create_account_description') || 'Join the family tree and connect with your lineage.')
          : `${t('otp_sent_to') || 'We sent a 6-digit code to'} ${form.email}.`
      }
    >
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-between text-xs font-semibold">
        <span className={step === 'details' ? 'text-emerald-700' : 'text-slate-400'}>
          {t('step_details') || '1. Account Details'}
        </span>
        <div className="flex-1 mx-3 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full bg-emerald-600 transition-all duration-300 ${
              step === 'details' ? 'w-1/2' : 'w-full'
            }`}
          />
        </div>
        <span className={step === 'verify' ? 'text-emerald-700' : 'text-slate-400'}>
          {t('step_verify') || '2. Verification'}
        </span>
      </div>

      {/* Status & Error Alerts */}
      {message && (
        <div
          role="status"
          className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-2xs"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs sm:text-sm">{message}</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-2xs"
        >
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <p className="flex-1 text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* Dev helper card if email service is in dev / sandbox */}
      {step === 'verify' && devCode && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Instant Verification Code</span>
            </span>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, code: devCode }))}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline"
            >
              Fill code
            </button>
          </div>
          <p className="mt-1.5 text-2xl font-bold tracking-widest font-mono text-amber-950">
            {devCode}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Enter this 6-digit code below to instantly confirm your account.
          </p>
        </div>
      )}

      {step === 'details' ? (
        <form className="space-y-4" onSubmit={submitDetails}>
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
              Must be at least 12 characters long.
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
                <span>{t('sending_code')}</span>
              </>
            ) : (
              <>
                <span>{t('continue_email_verification')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={verify}>
          <div>
            <label htmlFor="signup-code" className="block text-sm font-medium text-slate-700 text-center">
              {t('verification_code')}
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <KeyRound className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="signup-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                placeholder="123456"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-2xl font-mono text-center tracking-widest font-bold text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 text-center">
              {t('check_inbox_hint') || 'Please check your email inbox for the 6-digit confirmation code.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || form.code.length < 6}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-emerald-800 hover:to-teal-900 hover:shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('verifying')}</span>
              </>
            ) : (
              <>
                <span>{t('verify_and_create_account')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
            <button
              type="button"
              onClick={resendCode}
              disabled={resending}
              className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-60 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending new code...' : (t('resend_code') || 'Resend code')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('details');
                setMessage('');
                setError('');
              }}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('back_to_account_details')}</span>
            </button>
          </div>
        </form>
      )}

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
