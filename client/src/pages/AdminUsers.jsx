import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getFamilies } from '../api/families';
import { getMembers } from '../api/members';
import { createStaffUser, deleteManagedUser, getAdminUsers, resetManagedUserPassword, updateManagedUser } from '../api/admin';
import { useLanguage } from '../context/LanguageContext';
import PasswordInput from '../components/PasswordInput';

const AdminUsers = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', allowedFamilies: [] });
  const [staffAssignments, setStaffAssignments] = useState({});
  const [userEdits, setUserEdits] = useState({});
  const [passwordResets, setPasswordResets] = useState({});
  const usersQuery = useQuery({ queryKey: ['adminUsers'], queryFn: getAdminUsers });
  const familiesQuery = useQuery({ queryKey: ['adminUserFamilies'], queryFn: () => getFamilies({ limit: 1000 }) });
  const membersQuery = useQuery({ queryKey: ['adminUserMembers'], queryFn: () => getMembers({ limit: 1000 }) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  const saveUsers = useMutation({
    mutationFn: ({ id, data }) => updateManagedUser(id, data),
    onSuccess: () => {
      invalidate();
      toast.success(t('account_access_updated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('account_update_failed')),
  });
  const createStaff = useMutation({
    mutationFn: (data) => createStaffUser(data),
    onSuccess: (data) => {
      invalidate();
      setStaffForm({ name: '', email: '', password: '', allowedFamilies: [] });
      if (data?.warning) toast(data.warning);
      toast.success(t('staff_account_created'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('staff_account_creation_failed')),
  });
  const resetPassword = useMutation({
    mutationFn: ({ id, password }) => resetManagedUserPassword(id, password),
    onSuccess: (data, variables) => {
      setPasswordResets((prev) => ({ ...prev, [variables.id]: '' }));
      if (data?.warning) toast(data.warning);
      toast.success(data?.message || t('password_reset_success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('password_reset_failed')),
  });
  const removeUser = useMutation({
    mutationFn: deleteManagedUser,
    onSuccess: () => {
      invalidate();
      toast.success(t('account_deleted'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('account_delete_failed')),
  });

  const families = familiesQuery.data?.data || [];
  const members = membersQuery.data?.data || [];
  const users = usersQuery.data || [];
  const toggleStaffFamily = (familyId) => {
    setStaffForm((previous) => ({
      ...previous,
      allowedFamilies: previous.allowedFamilies.includes(familyId)
        ? previous.allowedFamilies.filter((id) => id !== familyId)
        : [...previous.allowedFamilies, familyId],
    }));
  };

  const editValue = (user, field) => userEdits[user._id]?.[field] ?? user[field] ?? '';
  const setEdit = (id, patch) => setUserEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  if (usersQuery.isLoading || familiesQuery.isLoading || membersQuery.isLoading) {
    return <p className="p-6 text-sm text-slate-600">{t('loading_account_management')}</p>;
  }
  if (usersQuery.error || familiesQuery.error || membersQuery.error) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{t('account_management_load_failed')}</p>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{t('user_staff_accounts')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('user_staff_access_description')}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">{t('create_staff_account')}</h2>
        <form onSubmit={(event) => { event.preventDefault(); createStaff.mutate(staffForm); }} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">{t('name')}
            <input required minLength={2} maxLength={120} value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">{t('email')}
            <input type="email" required value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-slate-700">{t('temporary_password')}
            <PasswordInput minLength={12} maxLength={128} required value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium text-slate-700">{t('authorized_families')}</legend>
            <div className="mt-2 grid max-h-40 grid-cols-1 gap-2 overflow-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              {families.map((family) => (
                <label key={family._id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={staffForm.allowedFamilies.includes(family._id)} onChange={() => toggleStaffFamily(family._id)} />
                  <span>{family.familyName} ({family.familyNumber})</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button disabled={createStaff.isPending} className="w-fit rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60">
            {t('create_staff')}
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">{t('registered_accounts')}</h2>
        </div>
        {users.length === 0 ? <p className="p-5 text-sm text-slate-600">{t('no_registered_accounts')}</p> : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <article key={user._id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)_auto]">
                <div className="space-y-3 min-w-0">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600">{t('name')}
                      <input value={editValue(user, 'name')} onChange={(event) => setEdit(user._id, { name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-medium text-slate-600">{t('email')}
                      <input type="email" value={editValue(user, 'email')} onChange={(event) => setEdit(user._id, { email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1 uppercase tracking-wide">{t(user.role)}</span>
                    <span>{user.emailVerified ? t('verified') : t('not_verified')}</span>
                    {user.mustChangePassword && <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{t('must_change_password') || 'Must change password'}</span>}
                  </div>
                  {userEdits[user._id] && (
                    <button type="button" disabled={saveUsers.isPending} onClick={() => saveUsers.mutate({ id: user._id, data: { name: editValue(user, 'name'), email: editValue(user, 'email') } })} className="text-xs font-semibold text-emerald-800 disabled:opacity-40">
                      {t('save_changes')}
                    </button>
                  )}
                </div>

                {user.role === 'user' ? (
                  <label className="text-xs font-medium text-slate-600">{t('linked_family_member')}
                    <select
                      value={user.linkedMember?._id || ''}
                      onChange={(event) => saveUsers.mutate({ id: user._id, data: { linkedMember: event.target.value || null } })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">{t('not_assigned')}</option>
                      {members.map((member) => <option key={member._id} value={member._id}>{member.name} — {member.memberNumber}</option>)}
                    </select>
                  </label>
                ) : user.role === 'staff' ? (
                  <label className="text-xs font-medium text-slate-600">{t('authorized_families')}
                    <select
                      multiple
                      value={staffAssignments[user._id] ?? (user.allowedFamilies || []).map((family) => family._id)}
                      onChange={(event) => setStaffAssignments((previous) => ({
                        ...previous,
                        [user._id]: Array.from(event.target.selectedOptions, (option) => option.value),
                      }))}
                      className="mt-1 h-24 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    >
                      {families.map((family) => <option key={family._id} value={family._id}>{family.familyName} ({family.familyNumber})</option>)}
                    </select>
                    <button
                      type="button"
                      disabled={saveUsers.isPending || staffAssignments[user._id] === undefined}
                      onClick={() => saveUsers.mutate({ id: user._id, data: { allowedFamilies: staffAssignments[user._id] } })}
                      className="mt-2 text-xs font-semibold text-emerald-800 disabled:opacity-40"
                    >
                      {t('save_family_access')}
                    </button>
                  </label>
                ) : <p className="text-sm text-slate-500">{t('admin_account_access')}</p>}

                <div className="flex flex-col gap-2">
                  {['user', 'staff'].includes(user.role) && (
                    <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <PasswordInput
                        minLength={12}
                        maxLength={128}
                        placeholder={t('temporary_password')}
                        value={passwordResets[user._id] || ''}
                        onChange={(event) => setPasswordResets((prev) => ({ ...prev, [user._id]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        disabled={resetPassword.isPending || (passwordResets[user._id] || '').length < 12}
                        onClick={() => resetPassword.mutate({ id: user._id, password: passwordResets[user._id] })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {t('reset_password')}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={saveUsers.isPending}
                    onClick={() => saveUsers.mutate({ id: user._id, data: { isActive: !user.isActive } })}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${user.isActive ? 'border border-amber-200 text-amber-700 hover:bg-amber-50' : 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50'}`}
                  >
                    {user.isActive ? t('deactivate') : t('activate')}
                  </button>
                  <button
                    type="button"
                    disabled={removeUser.isPending}
                    onClick={() => { if (window.confirm(t('confirm_delete_account') || 'Delete this account?')) removeUser.mutate(user._id); }}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {t('delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminUsers;
