import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AccountProfile = () => {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [photo, setPhoto] = useState(null);

  const saveProfile = useMutation({
    mutationFn: async () => (await api.put('/auth/me', form)).data.user,
    onSuccess: (nextUser) => {
      updateUser(nextUser);
      toast.success(t('profile_updated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('profile_update_failed')),
  });
  const savePhoto = useMutation({
    mutationFn: async (formData) => (await api.put('/auth/me/photo', formData)).data.user,
    onSuccess: (nextUser) => {
      updateUser(nextUser);
      setPhoto(null);
      toast.success(t('profile_photo_updated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('photo_update_failed')),
  });

  const uploadPhoto = (event) => {
    event.preventDefault();
    const body = new FormData();
    if (photo) body.append('photo', photo);
    else body.append('removePhoto', 'true');
    savePhoto.mutate(body);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t('account_profile')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('account_profile_description')}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <form onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {t('full_name')}
            <input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('email')}
            <input disabled value={user?.email || ''} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('phone')}
            <input maxLength={30} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('preferred_language')}
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
              <option value="en">{t('english')}</option>
              <option value="ne">{t('nepali')}</option>
            </select>
          </label>
          <button disabled={saveProfile.isPending} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
            {t('save_profile')}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">{t('profile_photo')}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          {user?.photo ? (
            <img src={user.photo} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-500">
              {user?.name?.slice(0, 1)?.toUpperCase()}
            </div>
          )}
          <form onSubmit={uploadPhoto} className="flex flex-wrap items-center gap-3">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] || null)} className="max-w-full text-sm text-slate-600" />
            <button disabled={!photo || savePhoto.isPending} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{t('upload_photo')}</button>
            {user?.photo && <button type="button" onClick={() => { setPhoto(null); const body = new FormData(); body.append('removePhoto', 'true'); savePhoto.mutate(body); }} className="text-sm text-red-700 hover:underline">{t('remove_photo')}</button>}
          </form>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-slate-900">{t('password')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('password_change_revoke_info')}</p>
        </div>
        <a href="/change-password" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{t('change_password')}</a>
      </section>
    </div>
  );
};

export default AccountProfile;
