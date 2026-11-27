import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFamilies,
  closeFamily,
  reopenFamily,
  createFamily,
  updateFamily,
  deleteFamily,
} from '../api/families';
import { getMembersByFamily } from '../api/members';
import Modal from '../components/Modal';
import FamilyTreeView from '../components/FamilyTreeView';
import MemberProfileModal from '../components/tree/MemberProfileModal';
import Button from '../components/Button';
import FloatingInput from '../components/FloatingInput';
import SearchableSelect from '../components/SearchableSelect';
import {
  BuildingOfficeIcon,
  CheckIcon,
  HomeIcon,
  InformationCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Families = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canManage = user?.role !== 'user';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [profileMemberId, setProfileMemberId] = useState(null);
  const queryClient = useQueryClient();

  const initialFamilyForm = {
    familyName: '',
    familyNumber: '',
    houseNumber: '',
    houseName: '',
    vanshaGenerationNumber: '',
    familyHead: '',
    clan: '',
    origin: '',
    currentAddress: '',
    description: '',
    status: 'open',
  };

  const [familyForm, setFamilyForm] = useState(initialFamilyForm);
  const [formErrors, setFormErrors] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['families', page, search, statusFilter],
    queryFn: () => getFamilies({ page, limit: 10, search, ...(statusFilter ? { status: statusFilter } : {}) }),
  });

  const openFamilyId = (isDetailsModalOpen && selectedFamily?._id) || (isEditModalOpen && editingFamily?._id) || null;
  const { data: openFamilyMembers } = useQuery({
    queryKey: ['family-members', openFamilyId],
    queryFn: () => getMembersByFamily(openFamilyId),
    enabled: !!openFamilyId,
  });
  const openFamilyMemberData = openFamilyMembers?.data;
  const familyMembers = useMemo(() => openFamilyMemberData || [], [openFamilyMemberData]);

  const getFamilyCount = (family, key) => family?.[key] ?? 0;
  const getFamilyGenerations = (familyId) =>
    data?.data?.find((family) => family._id === familyId)?.generationCount ?? 0;
  const getFamilyMemberCount = (familyId) =>
    data?.data?.find((family) => family._id === familyId)?.memberCount ?? 0;
  const getFamilyHeadName = (family) =>
    family?.familyHead?.name || family?.familyHeadName || t('unknown');
  const hasActiveFilters = Boolean(search.trim() || statusFilter);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const memberOptions = useMemo(() => {
    if (!isEditModalOpen) return [];
    return familyMembers.map((member) => ({
      value: member._id,
      label: `${member.name}${member.surname ? ` ${member.surname}` : ''} (${member.memberNumber || t('unknown')})`,
    }));
  }, [familyMembers, isEditModalOpen, t]);

  const closeMutation = useMutation({
    mutationFn: ({ id, reason }) => closeFamily(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      toast.success(t('family_closed'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('family_close_failed')),
  });

  const reopenMutation = useMutation({
    mutationFn: (id) => reopenFamily(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      toast.success(t('family_reopened'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('family_reopen_failed')),
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: (id) => deleteFamily(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success(t('family_deleted'));
    },
  });

  const createFamilyMutation = useMutation({
    mutationFn: createFamily,
    onSuccess: () => {
      toast.success(t('family_created'));
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      setIsCreateModalOpen(false);
      setFamilyForm(initialFamilyForm);
      setFormErrors({});
    },
    onError: (error) => toast.error(error.response?.data?.message || t('family_create_failed')),
  });

  const updateFamilyMutation = useMutation({
    mutationFn: ({ id, data }) => updateFamily(id, data),
    onSuccess: () => {
      toast.success(t('family_updated'));
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['members-for-families'] });
      setIsEditModalOpen(false);
      setEditingFamily(null);
      setFamilyForm(initialFamilyForm);
      setFormErrors({});
    },
    onError: (error) => toast.error(error.response?.data?.message || t('family_update_failed')),
  });

  const handleViewTree = (family) => {
    setSelectedFamily(family);
    setIsTreeModalOpen(true);
  };
  const handleViewDetails = (family) => {
    setSelectedFamily(family);
    setIsDetailsModalOpen(true);
  };
  const handleCloseFamily = (family) => {
    if (!window.confirm(t('confirm_close_family'))) return;
    const reason = window.prompt(t('close_reason_prompt'));
    if (reason !== null) closeMutation.mutate({ id: family._id, reason });
  };
  const handleReopenFamily = (family) => {
    if (window.confirm(t('confirm_reopen_family'))) reopenMutation.mutate(family._id);
  };
  const handleDeleteFamily = (family) => {
    if (getFamilyMemberCount(family._id) > 0) {
      toast.error(t('delete_family_blocked'));
      return;
    }
    if (window.confirm(t('confirm_delete_family', { name: family.familyName }))) {
      deleteFamilyMutation.mutate(family._id);
    }
  };
  const handleAddFamily = () => {
    setFamilyForm(initialFamilyForm);
    setFormErrors({});
    setIsCreateModalOpen(true);
  };
  const handleEditFamily = (family) => {
    setEditingFamily(family);
    setFamilyForm({
      familyName: family.familyName || '',
      familyNumber: family.familyNumber || '',
      houseNumber: family.house?.houseNumber || '',
      houseName: family.house?.houseName || '',
      vanshaGenerationNumber: family.vanshaGenerationNumber || '',
      familyHead: family.familyHead?._id || family.familyHead || '',
      clan: family.clan || '',
      origin: family.origin || '',
      currentAddress: family.currentAddress || '',
      description: family.description || '',
      status: family.status || 'open',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleFamilyFormChange = (event) => {
    const { name, value } = event.target;
    setFamilyForm((current) => ({ ...current, [name]: value }));
    if (formErrors[name]) setFormErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleFamilySelectChange = (name, value) => {
    setFamilyForm((current) => ({ ...current, [name]: value }));
    if (formErrors[name]) setFormErrors((current) => ({ ...current, [name]: '' }));
  };

  const validateFamilyForm = () => {
    const errors = {};
    if (!familyForm.familyName?.trim()) errors.familyName = t('family_name_required');
    if (!familyForm.houseNumber?.trim()) errors.houseNumber = t('house_number_required');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFamilySubmit = async (event) => {
    event.preventDefault();
    if (!validateFamilyForm()) return;

    const submitData = {
      familyName: familyForm.familyName.trim(),
      houseNumber: familyForm.houseNumber.trim(),
      houseName: familyForm.houseName?.trim() || undefined,
      vanshaGenerationNumber: familyForm.vanshaGenerationNumber?.trim() || undefined,
      familyHead: familyForm.familyHead || undefined,
      clan: familyForm.clan?.trim() || undefined,
      origin: familyForm.origin?.trim() || undefined,
      currentAddress: familyForm.currentAddress?.trim() || undefined,
      description: familyForm.description?.trim() || undefined,
      status: familyForm.status || 'open',
    };

    if (editingFamily) {
      await updateFamilyMutation.mutateAsync({ id: editingFamily._id, data: submitData });
    } else {
      await createFamilyMutation.mutateAsync(submitData);
    }
  };

  const getRelationshipLabel = (relationship) => {
    if (!relationship) return t('relationship_member');
    const key = `relationship_${relationship}`;
    const label = t(key);
    return label === key ? relationship : label;
  };

  const closeForm = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingFamily(null);
    setFamilyForm(initialFamilyForm);
    setFormErrors({});
  };

  const renderFamilyForm = (isEdit = false) => (
    <form onSubmit={handleFamilySubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FloatingInput label={`${t('family_name')} *`} name="familyName" value={familyForm.familyName} onChange={handleFamilyFormChange} icon={HomeIcon} required error={formErrors.familyName} />
        </div>
        <FloatingInput label={`${t('house_number')} *`} name="houseNumber" value={familyForm.houseNumber} onChange={handleFamilyFormChange} icon={BuildingOfficeIcon} required error={formErrors.houseNumber} placeholder={t('house_number_placeholder')} />
        <FloatingInput label={t('house_name')} name="houseName" value={familyForm.houseName} onChange={handleFamilyFormChange} icon={BuildingOfficeIcon} placeholder={t('house_name_placeholder')} />
        <FloatingInput label={t('family_number')} name="familyNumber" value={familyForm.familyNumber} onChange={handleFamilyFormChange} icon={UserGroupIcon} disabled placeholder={t('auto_generated_hint')} />
        <FloatingInput label={t('vansha_generation_number')} name="vanshaGenerationNumber" value={familyForm.vanshaGenerationNumber} onChange={handleFamilyFormChange} icon={UserGroupIcon} placeholder={t('auto_generated_hint')} />
        <SearchableSelect label={t('family_head')} name="familyHead" value={familyForm.familyHead} onChange={handleFamilySelectChange} options={memberOptions} placeholder={t('search_family_head')} />
        <FloatingInput label={t('clan')} name="clan" value={familyForm.clan} onChange={handleFamilyFormChange} icon={UserGroupIcon} />
        <FloatingInput label={t('origin')} name="origin" value={familyForm.origin} onChange={handleFamilyFormChange} icon={HomeIcon} />
        <FloatingInput label={t('current_address')} name="currentAddress" value={familyForm.currentAddress} onChange={handleFamilyFormChange} icon={HomeIcon} />
        <div className="md:col-span-2">
          <FloatingInput label={t('description')} name="description" value={familyForm.description} onChange={handleFamilyFormChange} type="textarea" rows={2} icon={InformationCircleIcon} />
        </div>
        <SearchableSelect
          label={t('status')}
          name="status"
          value={familyForm.status}
          onChange={handleFamilySelectChange}
          options={[{ value: 'open', label: t('open') }, { value: 'closed', label: t('closed') }]}
        />
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
        <Button type="submit" variant="primary" disabled={createFamilyMutation.isPending || updateFamilyMutation.isPending} className="flex-1">
          {createFamilyMutation.isPending || updateFamilyMutation.isPending ? (
            <span className="flex items-center justify-center">
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {isEdit ? t('updating') : t('adding')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <CheckIcon className="h-4 w-4" />
              {isEdit ? t('update_family') : t('add_family')}
            </span>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={closeForm}>
          <XMarkIcon className="mr-1.5 h-4 w-4" />
          {t('cancel')}
        </Button>
      </div>
    </form>
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <HomeIcon className="h-6 w-6 text-emerald-800" />
            {t('families')}
          </h1>
          <p className="text-slate-600">{t('families_description')}</p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={handleAddFamily} className="flex items-center">
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('add_family')}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-lg">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_families_placeholder')}
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 sm:w-44"
          aria-label={t('status')}
        >
          <option value="">{t('all_status')}</option>
          <option value="open">{t('open')}</option>
          <option value="closed">{t('closed')}</option>
        </select>
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            <XMarkIcon className="mr-1.5 h-4 w-4" />
            {t('clear_filters')}
          </Button>
        )}
      </div>

      {data?.data?.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <HomeIcon className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">{t('no_families')}</p>
          <p className="mt-1 text-sm text-slate-400">{t('no_families_hint')}</p>
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters} className="mt-4">
              <XMarkIcon className="mr-1.5 h-4 w-4" />
              {t('clear_filters')}
            </Button>
          )}
        </div>
      ) : (
        <div className="dashboard-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <caption className="sr-only">{t('families_list')}</caption>
              <thead>
                <tr>
                  {[
                    t('family_name'),
                    t('family_number'),
                    t('family_head'),
                    t('total_members'),
                    t('male_members'),
                    t('female_members'),
                    t('generations'),
                    t('house_number'),
                    t('actions'),
                  ].map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={`px-4 py-3 font-semibold ${index === 8 ? 'text-right' : ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.data?.map((family) => {
                  const isClosed = family.status === 'closed';
                  return (
                    <tr key={family._id} className={isClosed ? 'bg-slate-50/70' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                            isClosed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {family.familyPhoto ? (
                              <img src={family.familyPhoto} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <HomeIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleViewDetails(family)}
                              className="block max-w-full truncate rounded font-semibold text-slate-900 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                              title={family.familyName}
                            >
                              {family.familyName || t('unnamed_family')}
                            </button>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {family.houseName && <span className="truncate">{family.houseName}</span>}
                              <span className={`rounded-full px-2 py-0.5 font-medium ${
                                isClosed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {isClosed ? t('closed') : t('open')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{family.familyNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{getFamilyHeadName(family)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{getFamilyCount(family, 'memberCount')}</td>
                      <td className="px-4 py-3 text-slate-700">{getFamilyCount(family, 'maleCount')}</td>
                      <td className="px-4 py-3 text-slate-700">{getFamilyCount(family, 'femaleCount')}</td>
                      <td className="px-4 py-3 text-slate-700">{getFamilyGenerations(family._id)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="block whitespace-nowrap">{family.house?.houseNumber || family.houseNumber || '—'}</span>
                        {family.houseIdentifier && (
                          <span className="block truncate text-xs text-slate-500" title={family.houseIdentifier}>
                            {family.houseIdentifier}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => handleViewTree(family)} title={t('view_family_tree')} aria-label={t('view_family_tree')}>
                            <UserGroupIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleViewDetails(family)} title={t('view_details')} aria-label={t('view_details')}>
                            <InformationCircleIcon className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEditFamily(family)} title={t('edit')} aria-label={t('edit')}>
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              {isClosed ? (
                                <Button size="sm" variant="outline" onClick={() => handleReopenFamily(family)} title={t('reopen_family')} aria-label={t('reopen_family')}>
                                  <LockOpenIcon className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleCloseFamily(family)} title={t('close_family')} aria-label={t('close_family')}>
                                  <LockClosedIcon className="h-4 w-4" />
                                </Button>
                              )}
                              {getFamilyCount(family, 'memberCount') === 0 && (
                                <Button size="sm" variant="outline" onClick={() => handleDeleteFamily(family)} title={t('delete_family')} aria-label={t('delete_family')}>
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.pagination && data.pagination.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
            {t('previous')}
          </Button>
          <span className="flex items-center px-3 text-sm text-slate-600">
            {t('page_x_of_y', { current: page, total: data.pagination.pages })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((current) => Math.min(data.pagination.pages, current + 1))} disabled={page === data.pagination.pages}>
            {t('next')}
          </Button>
        </div>
      )}

      {canManage && (
        <>
          <Modal isOpen={isCreateModalOpen} onClose={closeForm} title={t('add_family')} size="lg">
            {renderFamilyForm(false)}
          </Modal>
          <Modal isOpen={isEditModalOpen} onClose={closeForm} title={t('update_family')} size="lg">
            {renderFamilyForm(true)}
          </Modal>
        </>
      )}

      <Modal
        isOpen={isTreeModalOpen}
        onClose={() => {
          if (profileMemberId) {
            setProfileMemberId(null);
            return;
          }
          setIsTreeModalOpen(false);
          setSelectedFamily(null);
        }}
        title={t('family_tree_title', { name: selectedFamily?.familyName || '' })}
        size="xl"
      >
        {selectedFamily && (
          <div className="max-h-[75vh] min-h-[400px] overflow-auto">
            <FamilyTreeView familyId={selectedFamily._id} onMemberClick={(member) => setProfileMemberId(member._id)} />
            <MemberProfileModal memberId={profileMemberId} onClose={() => setProfileMemberId(null)} />
          </div>
        )}
      </Modal>

      <Modal isOpen={isDetailsModalOpen} onClose={() => { setIsDetailsModalOpen(false); setSelectedFamily(null); }} title={t('family_details')} size="lg">
        {selectedFamily && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('family_name'), selectedFamily.familyName],
                [t('family_number'), selectedFamily.familyNumber],
                [t('house_number'), selectedFamily.house?.houseNumber || '—'],
                [t('house_id'), selectedFamily.houseIdentifier || '—'],
                [t('house_name'), selectedFamily.house?.houseName || '—'],
                [t('vansha_generation_number'), selectedFamily.vanshaGenerationNumber || '—'],
                [t('total_members'), getFamilyCount(selectedFamily, 'memberCount')],
                [t('male_members'), getFamilyCount(selectedFamily, 'maleCount')],
                [t('female_members'), getFamilyCount(selectedFamily, 'femaleCount')],
                [t('generations'), getFamilyGenerations(selectedFamily._id)],
                [t('family_head'), getFamilyHeadName(selectedFamily)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="font-medium text-slate-900">{value || '—'}</p>
                </div>
              ))}
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('status')}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                  selectedFamily.status === 'closed' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-800'
                }`}>
                  {selectedFamily.status === 'closed' ? t('closed') : t('open')}
                </span>
              </div>
              {selectedFamily.clan && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('clan')}</p>
                  <p className="font-medium text-slate-900">{selectedFamily.clan}</p>
                </div>
              )}
              {selectedFamily.currentAddress && (
                <div className="col-span-2 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{t('current_address')}</p>
                  <p className="font-medium text-slate-900">{selectedFamily.currentAddress}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
                <UserGroupIcon className="h-4 w-4 text-emerald-800" />
                {t('members')} ({getFamilyMemberCount(selectedFamily._id)})
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {[t('serial_no'), t('name'), t('relationship'), t('generation'), t('status')].map((label) => (
                        <th key={label} className="px-4 py-2 text-left text-xs font-medium text-slate-600">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {familyMembers.map((member, index) => (
                      <tr key={member._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-500">{index + 1}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{member.name}</td>
                        <td className="px-4 py-2 text-slate-600">
                          {member.lineageRole === 'lineage_head' ? t('family_head') : getRelationshipLabel(member.relationship)}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{member.generation || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            member.isAlive !== false ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {member.isAlive !== false ? t('living') : t('deceased')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Families;
