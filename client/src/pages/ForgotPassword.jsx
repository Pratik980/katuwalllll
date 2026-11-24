import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState('email');
  const [form, setForm] = useState({ email: '', code: '', password: '', confirmPassword: '' });
  const [resetToken, setResetToken] = useState('');
  const [devCode, setDevCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (step === 'email') {
        const response = await api.post('/auth/forgot-password', { email: form.email.trim() });
        setMessage(response.data.message);
        const receivedCode = response.data?.code || response.data?.devCode || '';
        setDevCode(receivedCode);
        if (receivedCode) {
          setForm((prev) => ({ ...prev, code: receivedCode }));
        }
        setStep('verify');
      } else if (step === 'verify') {
        const response = await api.post('/auth/verify-otp', {
          email: form.email.trim(),
          code: form.code.trim(),
          purpose: 'password_reset',
        });
        setResetToken(response.data.resetToken);
        setMessage(response.data.message || 'Verification successful. Please choose a new password.');
        setStep('reset');
      } else {
        if (form.password !== form.confirmPassword) {
          setError(t('passwords_do_not_match') || 'Passwords do not match.');
          return;
        }
        const response = await api.post('/auth/reset-password', {
          email: form.email.trim(),
          resetToken,
          newPassword: form.password,
        });
        setMessage(response.data.message || 'Password successfully updated.');
        setStep('complete');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Password recovery could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setResending(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/auth/resend-otp', {
        email: form.email.trim(),
        purpose: 'password_reset',
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

  const getStepTitle = () => {
    if (step === 'email') return t('forgot_password') || 'Reset Password';
    if (step === 'verify') return 'Enter Recovery Code';
    if (step === 'reset') return 'Set New Password';
    return 'Password Reset Successful';
  };

  const getStepSubtitle = () => {
    if (step === 'email') return 'Enter your account email to receive a recovery code.';
    if (step === 'verify') return `Enter the 6-digit code sent to ${form.email}.`;
    if (step === 'reset') return 'Choose a strong password with at least 12 characters.';
    return 'Your account password has been updated. You can now sign in.';
  };

  return (
    <AuthLayout title={getStepTitle()} subtitle={getStepSubtitle()}>
      {/* Progress Indicators */}
      {step !== 'complete' && (
        <div className="mb-6 flex items-center justify-between text-xs font-semibold">
          <span className={step === 'email' ? 'text-emerald-700' : 'text-slate-400'}>1. Email</span>
          <div className="flex-1 mx-3 h-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full bg-emerald-600 transition-all duration-300 ${
                step === 'email' ? 'w-1/3' : step === 'verify' ? 'w-2/3' : 'w-full'
              }`}
            />
          </div>
          <span className={step === 'verify' ? 'text-emerald-700' : 'text-slate-400'}>2. Code</span>
          <div className="flex-1 mx-3 h-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full bg-emerald-600 transition-all duration-300 ${
                step === 'reset' ? 'w-full' : 'w-0'
              }`}
            />
          </div>
          <span className={step === 'reset' ? 'text-emerald-700' : 'text-slate-400'}>3. New Password</span>
        </div>
      )}

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

      {/* Dev helper code */}
      {step === 'verify' && devCode && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Instant Recovery Code</span>
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
        </div>
      )}

      {step !== 'complete' ? (
        <form onSubmit={submit} className="space-y-4">
          {step === 'email' && (
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                {t('email')}
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="reset-email"
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
          )}

          {step === 'verify' && (
            <div>
              <label htmlFor="reset-code" className="block text-sm font-medium text-slate-700 text-center">
                {t('six_digit_code') || '6-Digit Verification Code'}
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="reset-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={form.code}
                  onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 text-2xl font-mono text-center tracking-widest font-bold text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-2xs"
                />
              </div>
            </div>
          )}

          {step === 'reset' && (
            <>
              <PasswordInput
                label={t('new_password')}
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
                placeholder="••••••••••••"
                minLength={12}
                maxLength={128}
                required
                icon={Lock}
              />
              <PasswordInput
                label={t('confirm_new_password')}
                value={form.confirmPassword}
                onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                autoComplete="new-password"
                placeholder="••••••••••••"
                minLength={12}
                maxLength={128}
                required
                icon={Lock}
              />
            </>
          )}

          <button
            type="submit"
            disabled={busy || (step === 'verify' && form.code.length < 6)}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-emerald-800 hover:to-teal-900 hover:shadow-md transition active:scale-98 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('please_wait')}</span>
              </>
            ) : (
              <>
                <span>
                  {step === 'email'
                    ? (t('send_verification_code') || 'Send Recovery Code')
                    : step === 'verify'
                    ? (t('verify_code') || 'Verify Code')
                    : (t('set_new_password') || 'Update Password')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {step === 'verify' && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={resendCode}
                disabled={resending}
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 hover:underline disabled:opacity-60 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : (t('resend_code') || 'Resend code')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep('email')}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Change email</span>
              </button>
            </div>
          )}
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 transition active:scale-98"
          >
            <span>{t('return_to_sign_in') || 'Proceed to Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {step !== 'complete' && (
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('back_to_sign_in') || 'Back to Sign In'}</span>
          </Link>
        </div>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
