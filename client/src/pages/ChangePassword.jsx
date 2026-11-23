import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { setCsrfToken } from '../api/csrfToken';
import PasswordInput from '../components/PasswordInput';

const ChangePassword = () => {
  const { updateUser, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.newPassword !== form.confirmPassword) {
      setError(t('passwords_do_not_match'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setCsrfToken('');
      updateUser(null);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Password could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">{user?.mustChangePassword ? t('set_new_password') : t('change_password')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('password_policy_and_session_revocation')}</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          {!user?.mustChangePassword && (
            <PasswordInput
              label={t('current_password')}
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
              autoComplete="current-password"
              required
            />
          )}
          <PasswordInput
            label={t('new_password')}
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <PasswordInput
            label={t('confirm_new_password')}
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <button disabled={busy} className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
            {busy ? t('updating') : t('update_password')}
          </button>
        </form>
      </section>
    </main>
  );
};

export default ChangePassword;
