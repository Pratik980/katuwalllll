import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Camera, Trash2, X, Upload, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const AccountProfile = () => {
  const { user, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const fileInputRef = useRef(null);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.photo]);

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
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setPhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(t('profile_photo_updated'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('photo_update_failed'));
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('image_type_error'));
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('image_size_error'));
      event.target.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAvatarError(false);
  };

  const handleCancelSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhoto(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPhoto = (event) => {
    event?.preventDefault();
    if (!photo) return;
    const body = new FormData();
    body.append('photo', photo);
    savePhoto.mutate(body);
  };

  const handleRemovePhoto = () => {
    if (!window.confirm(t('confirm_remove_photo'))) return;
    handleCancelSelection();
    const body = new FormData();
    body.append('removePhoto', 'true');
    savePhoto.mutate(body);
  };

  const currentDisplayPhoto = previewUrl || (avatarError ? null : user?.photo);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t('account_profile')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('account_profile_description')}</p>
      </header>

      {/* Profile Photo Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900">{t('profile_photo')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('photo_size_hint')}</p>

        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar display */}
          <div className="relative group shrink-0">
            {currentDisplayPhoto ? (
              <img
                src={currentDisplayPhoto}
                alt={user?.name || 'User'}
                onError={() => setAvatarError(true)}
                className={`h-20 w-20 rounded-full object-cover border-2 shadow-sm ${
                  previewUrl ? 'border-emerald-500 ring-4 ring-emerald-100' : 'border-slate-200'
                }`}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-800 text-2xl font-bold text-white shadow-sm">
                {user?.name?.slice(0, 1)?.toUpperCase() || '?'}
              </div>
            )}

            {previewUrl && (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                {t('preview')}
              </span>
            )}
          </div>

          {/* Action buttons & file input */}
          <div className="flex-1 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="account-photo-input"
            />

            <div className="flex flex-wrap items-center gap-2.5">
              {!photo ? (
                <label
                  htmlFor="account-photo-input"
                  className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-98"
                >
                  <Camera className="h-4 w-4 text-slate-600" />
                  <span>{user?.photo ? t('choose_photo') : t('upload_photo')}</span>
                </label>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={uploadPhoto}
                    disabled={savePhoto.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 transition active:scale-98"
                  >
                    {savePhoto.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('uploading_photo')}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>{t('upload_photo')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    disabled={savePhoto.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    <X className="h-4 w-4" />
                    <span>{t('cancel_selection')}</span>
                  </button>
                </>
              )}

              {user?.photo && !photo && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={savePhoto.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t('remove_photo')}</span>
                </button>
              )}
            </div>

            {photo && (
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span className="font-medium text-emerald-700">{photo.name}</span>
                <span>({(photo.size / 1024).toFixed(0)} KB)</span>
                <span className="text-slate-400">— {t('click_to_save', { action: t('upload_photo') })}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Profile Details Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <form onSubmit={(event) => { event.preventDefault(); saveProfile.mutate(); }} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {t('full_name')}
            <input
              required
              minLength={2}
              maxLength={120}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('email')}
            <input
              disabled
              value={user?.email || ''}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500 cursor-not-allowed"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('phone')}
            <input
              maxLength={30}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('preferred_language')}
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="en">{t('english')}</option>
              <option value="ne">{t('nepali')}</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saveProfile.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60 transition active:scale-98 shadow-sm"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('saving')}</span>
              </>
            ) : (
              <span>{t('save_profile')}</span>
            )}
          </button>
        </form>
      </section>

      {/* Password Change Section */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <h2 className="font-semibold text-slate-900">{t('password')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('password_change_revoke_info')}</p>
        </div>
        <a
          href="/change-password"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          {t('change_password')}
        </a>
      </section>
    </div>
  );
};

export default AccountProfile;
