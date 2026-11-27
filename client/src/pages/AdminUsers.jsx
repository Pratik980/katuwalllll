import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  KeyIcon,
  PowerIcon,
  TrashIcon,
  UserCircleIcon,
  PhotoIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import PasswordInput from '../components/PasswordInput';
import { getFamilies } from '../api/families';
import { getMembers } from '../api/members';
import {
  createStaffUser,
  deleteManagedUser,
  getAdminStaff,
  getAdminUsers,
  resetManagedUserPassword,
  updateManagedUser,
  updateManagedUserPhoto,
} from '../api/admin';
import { useLanguage } from '../context/LanguageContext';

const emptyStaffForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  allowedFamilies: [],
  photoFile: null,
  photoPreview: '',
};

const filePreview = (file, callback) => {
  if (!file) return callback('');
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result || ''));
  reader.readAsDataURL(file);
};

const Avatar = ({ name, photo, size = 'h-10 w-10' }) => (
  photo ? (
    <img src={photo} alt={name || 'Staff'} className={`${size} rounded-full object-cover ring-2 ring-green-100`} />
  ) : (
    <span className={`${size} inline-flex items-center justify-center rounded-full bg-green-50 text-green-800 ring-2 ring-green-100`}>
      <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
    </span>
  )
);

const StatusBadge = ({ active, labelActive, labelInactive }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
    {active ? labelActive : labelInactive}
  </span>
);

const AdminUsers = () => {
  const { t, language } = useLanguage();
  const getRoleLabel = (role) => {
    const key = `role_${role}`;
    const label = t(key);
    return label === key ? role : label;
  };
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('staff');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatus, setStaffStatus] = useState('');
  const [staffPage, setStaffPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyStaffForm);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState(emptyStaffForm);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' });
  const [userAssignments, setUserAssignments] = useState({});
  const [staffAssignments, setStaffAssignments] = useState({});

  const staffQuery = useQuery({
    queryKey: ['adminStaff', staffSearch, staffStatus, staffPage],
    queryFn: () => getAdminStaff({
      search: staffSearch.trim(),
      status: staffStatus,
      page: staffPage,
      limit: 25,
    }),
    placeholderData: (previous) => previous,
  });
  const usersQuery = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAdminUsers,
    enabled: activeTab === 'users',
  });
  const familiesQuery = useQuery({
    queryKey: ['adminUserFamilies'],
    queryFn: () => getFamilies({ limit: 1000 }),
  });
  const membersQuery = useQuery({
    queryKey: ['adminUserMembers'],
    queryFn: () => getMembers({ limit: 1000 }),
    enabled: activeTab === 'users',
  });

  const invalidateStaff = () => {
    queryClient.invalidateQueries({ queryKey: ['adminStaff'] });
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  };

  const createStaff = useMutation({
    mutationFn: (formData) => createStaffUser(formData),
    onSuccess: (data) => {
      invalidateStaff();
      setCreateOpen(false);
      setCreateForm(emptyStaffForm);
      if (data?.warning) toast(data.warning);
      toast.success(t('staff_account_created'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('staff_account_creation_failed')),
  });

  const saveStaff = useMutation({
    mutationFn: async ({ id, data, photoFile, removePhoto }) => {
      const result = await updateManagedUser(id, data);
      if (photoFile || removePhoto) {
        const photoPayload = new FormData();
        if (photoFile) photoPayload.append('photo', photoFile);
        if (removePhoto) photoPayload.append('removePhoto', 'true');
        await updateManagedUserPhoto(id, photoPayload);
      }
      return result;
    },
    onSuccess: () => {
      invalidateStaff();
      setEditingStaff(null);
      toast.success(t('staff_updated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('staff_update_failed')),
  });

  const saveUsers = useMutation({
    mutationFn: ({ id, data }) => updateManagedUser(id, data),
    onSuccess: () => {
      invalidateStaff();
      toast.success(t('account_access_updated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('account_update_failed')),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }) => resetManagedUserPassword(id, password),
    onSuccess: (data) => {
      setResetTarget(null);
      setResetForm({ password: '', confirm: '' });
      if (data?.warning) toast(data.warning);
      toast.success(data?.message || t('password_reset_success'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('password_reset_failed')),
  });

  const removeAccount = useMutation({
    mutationFn: deleteManagedUser,
    onSuccess: () => {
      invalidateStaff();
      setEditingStaff(null);
      toast.success(t('account_deleted'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('account_delete_failed')),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => updateManagedUser(id, { isActive }),
    onSuccess: (_data, variables) => {
      invalidateStaff();
      toast.success(variables.isActive ? t('staff_activated') : t('staff_deactivated'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('staff_status_update_failed')),
  });

  const families = familiesQuery.data?.data || [];
  const members = membersQuery.data?.data || [];
  const staffResponse = staffQuery.data || {};
  const staff = staffResponse.data || [];
  const counts = staffResponse.counts || { total: 0, active: 0, inactive: 0 };
  const pagination = staffResponse.pagination || { page: 1, pages: 1, total: 0 };
  const users = usersQuery.data || [];

  const openCreate = () => {
    setCreateForm(emptyStaffForm);
    setCreateOpen(true);
  };

  const openEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setEditForm({
      name: staffMember.name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      password: '',
      allowedFamilies: (staffMember.allowedFamilies || []).map((family) => family._id || family),
      photoFile: null,
      photoPreview: staffMember.photo || '',
    });
  };

  const openReset = (account) => {
    setResetTarget(account);
    setResetForm({ password: '', confirm: '' });
  };

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    const phoneDigits = createForm.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      toast.error(t('valid_staff_phone_required'));
      return;
    }
    const formData = new FormData();
    formData.append('name', createForm.name.trim());
    formData.append('email', createForm.email.trim());
    formData.append('phone', createForm.phone.trim());
    formData.append('password', createForm.password);
    formData.append('allowedFamilies', JSON.stringify(createForm.allowedFamilies));
    if (createForm.photoFile) formData.append('photo', createForm.photoFile);
    createStaff.mutate(formData);
  };

  const handleEditSubmit = (event) => {
    event.preventDefault();
    const phoneDigits = editForm.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      toast.error(t('valid_staff_phone_required'));
      return;
    }
    saveStaff.mutate({
      id: editingStaff._id,
      data: {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        allowedFamilies: editForm.allowedFamilies,
      },
      photoFile: editForm.photoFile,
      removePhoto: Boolean(editingStaff.photo) && !editForm.photoFile && !editForm.photoPreview,
    });
  };

  const handleResetSubmit = (event) => {
    event.preventDefault();
    if (resetForm.password.length < 12) {
      toast.error(t('password_min_length_error'));
      return;
    }
    if (resetForm.password !== resetForm.confirm) {
      toast.error(t('passwords_do_not_match'));
      return;
    }
    resetPassword.mutate({ id: resetTarget._id, password: resetForm.password });
  };

  const setCreatePhoto = (file) => {
    filePreview(file, (preview) => setCreateForm((previous) => ({
      ...previous,
      photoFile: file,
      photoPreview: preview,
    })));
  };

  const setEditPhoto = (file) => {
    filePreview(file, (preview) => setEditForm((previous) => ({
      ...previous,
      photoFile: file,
      photoPreview: preview,
    })));
  };

  const toggleFamily = (field, familyId) => {
    const updater = (previous) => {
      const selected = previous.allowedFamilies.includes(familyId)
        ? previous.allowedFamilies.filter((id) => id !== familyId)
        : [...previous.allowedFamilies, familyId];
      return { ...previous, allowedFamilies: selected };
    };
    if (field === 'create') setCreateForm(updater);
    else setEditForm(updater);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t('staff_management')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('staff_management_description')}</p>
        </div>
        {activeTab === 'staff' && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            {t('create_staff')}
          </button>
        )}
      </header>

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label={t('staff_management')}>
        {[
          { id: 'staff', label: t('staff_accounts') },
          { id: 'users', label: t('user_accounts') },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-green-700 text-white' : 'text-slate-600 hover:text-green-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: t('total_staff'), value: counts.total },
              { label: t('active'), value: counts.active },
              { label: t('inactive'), value: counts.inactive },
            ].map((card) => (
              <div key={card.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-semibold text-green-800">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <label className="relative block w-full md:max-w-sm">
                <span className="sr-only">{t('search_staff')}</span>
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={staffSearch}
                  onChange={(event) => { setStaffSearch(event.target.value); setStaffPage(1); }}
                  placeholder={t('search_staff')}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={staffStatus}
                  onChange={(event) => { setStaffStatus(event.target.value); setStaffPage(1); }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                  aria-label={t('account_status')}
                >
                  <option value="">{t('all_status')}</option>
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
                <span className="text-xs text-slate-500">
                  {t('listed_staff')}: {pagination.total || 0}
                </span>
              </div>
            </div>

            {staffQuery.isLoading ? (
              <p className="p-6 text-sm text-slate-500">{t('loading')}</p>
            ) : staffQuery.error ? (
              <p role="alert" className="p-6 text-sm text-slate-700">{t('account_management_load_failed')}</p>
            ) : staff.length === 0 ? (
              <div className="p-10 text-center">
                <UsersIcon className="mx-auto h-10 w-10 text-green-700" />
                <p className="mt-3 text-sm font-medium text-slate-700">{t('no_staff_found')}</p>
                <p className="mt-1 text-xs text-slate-500">{t('no_staff_found_hint')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('staff_name')}</th>
                      <th className="px-4 py-3 font-medium">{t('email')}</th>
                      <th className="px-4 py-3 font-medium">{t('phone')}</th>
                      <th className="px-4 py-3 font-medium">{t('account_status')}</th>
                      <th className="px-4 py-3 font-medium">{t('created_date')}</th>
                      <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((staffMember) => (
                      <tr key={staffMember._id} className="align-middle hover:bg-green-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={staffMember.name} photo={staffMember.photo} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{staffMember.name}</p>
                              <p className="text-xs text-slate-500">{t('role_staff')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{staffMember.email}</td>
                        <td className="px-4 py-3 text-slate-700">{staffMember.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <StatusBadge active={staffMember.isActive} labelActive={t('active')} labelInactive={t('inactive')} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(staffMember.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(staffMember)}
                              className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800"
                              title={t('edit_staff')}
                              aria-label={t('edit_staff')}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openReset(staffMember)}
                              className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800"
                              title={t('reset_password')}
                              aria-label={t('reset_password')}
                            >
                              <KeyIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleActive.mutate({ id: staffMember._id, isActive: !staffMember.isActive })}
                              disabled={toggleActive.isPending}
                              className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800 disabled:opacity-50"
                              title={staffMember.isActive ? t('deactivate') : t('activate')}
                              aria-label={staffMember.isActive ? t('deactivate') : t('activate')}
                            >
                              <PowerIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  {t('page')} {pagination.page} {t('of')} {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStaffPage((page) => Math.max(1, page - 1))}
                    disabled={pagination.page <= 1}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('previous')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffPage((page) => Math.min(pagination.pages, page + 1))}
                    disabled={pagination.page >= pagination.pages}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-900">{t('registered_accounts')}</h2>
          </div>
          {usersQuery.isLoading || familiesQuery.isLoading || membersQuery.isLoading ? (
            <p className="p-6 text-sm text-slate-500">{t('loading')}</p>
          ) : usersQuery.error || familiesQuery.error || membersQuery.error ? (
            <p role="alert" className="p-6 text-sm text-slate-700">{t('account_management_load_failed')}</p>
          ) : users.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">{t('no_registered_accounts')}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((account) => (
                <article key={account._id} className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(14rem,0.8fr)_auto]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={account.name} photo={account.photo} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{account.name}</p>
                        <p className="truncate text-xs text-slate-500">{account.email}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
                        {getRoleLabel(account.role)}
                      </span>
                      <StatusBadge active={account.isActive} labelActive={t('active')} labelInactive={t('inactive')} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {account.phone || t('no_phone')} · {formatDate(account.createdAt)}
                    </p>
                  </div>

                  {account.role === 'user' ? (
                    <label className="text-xs font-medium text-slate-600">
                      {t('linked_family_member')}
                      <select
                        value={userAssignments[account._id] ?? (account.linkedMember?._id || '')}
                        onChange={(event) => setUserAssignments((previous) => ({ ...previous, [account._id]: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">{t('not_assigned')}</option>
                        {members.map((member) => <option key={member._id} value={member._id}>{member.name} — {member.memberNumber}</option>)}
                      </select>
                      {userAssignments[account._id] !== undefined && (
                        <button
                          type="button"
                          onClick={() => saveUsers.mutate({ id: account._id, data: { linkedMember: userAssignments[account._id] || null } })}
                          disabled={saveUsers.isPending}
                          className="mt-2 text-xs font-semibold text-green-800 disabled:opacity-40"
                        >
                          {t('save_changes')}
                        </button>
                      )}
                    </label>
                  ) : account.role === 'staff' ? (
                    <label className="text-xs font-medium text-slate-600">
                      {t('authorized_families')}
                      <select
                        multiple
                        value={staffAssignments[account._id] ?? (account.allowedFamilies || []).map((family) => family._id)}
                        onChange={(event) => setStaffAssignments((previous) => ({
                          ...previous,
                          [account._id]: Array.from(event.target.selectedOptions, (option) => option.value),
                        }))}
                        className="mt-1 h-24 w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                      >
                        {families.map((family) => <option key={family._id} value={family._id}>{family.familyName} ({family.familyNumber})</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={saveUsers.isPending || staffAssignments[account._id] === undefined}
                        onClick={() => saveUsers.mutate({ id: account._id, data: { allowedFamilies: staffAssignments[account._id] } })}
                        className="mt-2 text-xs font-semibold text-green-800 disabled:opacity-40"
                      >
                        {t('save_family_access')}
                      </button>
                    </label>
                  ) : (
                    <p className="text-sm text-slate-500">{t('admin_account_access')}</p>
                  )}

                  <div className="flex flex-col gap-2">
                    {account.role !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => openReset(account)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {t('reset_password')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={saveUsers.isPending}
                      onClick={() => saveUsers.mutate({ id: account._id, data: { isActive: !account.isActive } })}
                      className="rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50 disabled:opacity-50"
                    >
                      {account.isActive ? t('deactivate') : t('activate')}
                    </button>
                    {account.role !== 'admin' && (
                      <button
                        type="button"
                        disabled={removeAccount.isPending}
                        onClick={() => {
                          if (window.confirm(t('confirm_delete_account'))) removeAccount.mutate(account._id);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('create_staff_account')}
        size="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-green-50 ring-2 ring-green-100">
              {createForm.photoPreview ? (
                <img src={createForm.photoPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <PhotoIcon className="h-8 w-8 text-green-700" />
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <PhotoIcon className="h-4 w-4" />
              {t('choose_photo')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => setCreatePhoto(event.target.files?.[0] || null)}
              />
            </label>
            {createForm.photoPreview && (
              <button
                type="button"
                onClick={() => setCreateForm((previous) => ({ ...previous, photoFile: null, photoPreview: '' }))}
                className="text-xs font-medium text-slate-600 hover:text-green-800"
              >
                {t('remove_photo')}
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              {t('full_name')} *
              <input
                required
                minLength={2}
                maxLength={120}
                value={createForm.name}
                onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('email')} *
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('phone')} *
              <input
                required
                inputMode="tel"
                value={createForm.phone}
                onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              {t('temporary_password')} *
              <PasswordInput
                required
                minLength={12}
                maxLength={128}
                value={createForm.password}
                onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700">{t('authorized_families')}</legend>
            <p className="mt-1 text-xs text-slate-500">{t('family_access_hint')}</p>
            <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
              {families.map((family) => (
                <label key={family._id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={createForm.allowedFamilies.includes(family._id)}
                    onChange={() => toggleFamily('create', family._id)}
                    className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
                  />
                  <span className="truncate">{family.familyName} ({family.familyNumber})</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={createStaff.isPending}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
            >
              {createStaff.isPending ? t('creating') : t('create_staff')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={t('edit_staff')}
        size="md"
      >
        {editingStaff && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-green-50 ring-2 ring-green-100">
                {editForm.photoPreview ? (
                  <img src={editForm.photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <PhotoIcon className="h-8 w-8 text-green-700" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <PhotoIcon className="h-4 w-4" />
                  {t('change_photo')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => setEditPhoto(event.target.files?.[0] || null)}
                  />
                </label>
                {editForm.photoPreview && (
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, photoFile: null, photoPreview: '' })}
                    className="text-xs font-medium text-slate-600 hover:text-green-800"
                  >
                    {t('remove_photo')}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                {t('full_name')} *
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {t('email')} *
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {t('phone')} *
                <input
                  required
                  inputMode="tel"
                  value={editForm.phone}
                  onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
                />
              </label>
              <div className="flex items-end">
                <StatusBadge active={editingStaff.isActive} labelActive={t('active')} labelInactive={t('inactive')} />
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">{t('authorized_families')}</legend>
              <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                {families.map((family) => (
                  <label key={family._id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={editForm.allowedFamilies.includes(family._id)}
                      onChange={() => toggleFamily('edit', family._id)}
                      className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600"
                    />
                    <span className="truncate">{family.familyName} ({family.familyNumber})</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(t('confirm_delete_staff'))) removeAccount.mutate(editingStaff._id);
                }}
                disabled={removeAccount.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <TrashIcon className="h-4 w-4" />
                {t('delete')}
              </button>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingStaff(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saveStaff.isPending}
                  className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {saveStaff.isPending ? t('saving') : t('save_changes')}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={t('reset_staff_password')}
        size="sm"
      >
        {resetTarget && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              {t('reset_password_for')} <span className="font-medium text-slate-900">{resetTarget.name}</span>
            </p>
            <label className="block text-sm font-medium text-slate-700">
              {t('new_password')}
              <PasswordInput
                required
                minLength={12}
                maxLength={128}
                value={resetForm.password}
                onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {t('confirm_password')}
              <PasswordInput
                required
                minLength={12}
                maxLength={128}
                value={resetForm.confirm}
                onChange={(event) => setResetForm({ ...resetForm, confirm: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <p className="text-xs text-slate-500">{t('password_reset_hint')}</p>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={resetPassword.isPending}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
              >
                {resetPassword.isPending ? t('resetting') : t('reset_password')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
