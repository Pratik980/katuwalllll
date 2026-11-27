import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  deleteDonation,
  exportAllDonations,
  exportDonation,
  getDonationStats,
  getDonations,
} from '../api/donations';
import DonationStats from '../components/DonationStats';
import DonationFormModal from '../components/DonationFormModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const emptyFilters = {
  search: '',
  paymentMethod: '',
  category: '',
  paymentStatus: '',
  startDate: '',
  endDate: '',
  minAmount: '',
  maxAmount: '',
};

const Donations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const canUseDonations = ['admin', 'staff'].includes(user?.role);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(emptyFilters);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [formMode, setFormMode] = useState('create');

  const donationsQuery = useQuery({
    queryKey: ['donations', page, filters],
    queryFn: () => getDonations({ page, limit: 10, ...filters }),
    enabled: canUseDonations,
    placeholderData: (previous) => previous,
  });

  const statsQuery = useQuery({
    queryKey: ['donationStats'],
    queryFn: getDonationStats,
    enabled: isAdmin,
    refetchInterval: isAdmin ? 30000 : false,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['donationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast.success(t('donation_deleted'));
    },
    onError: () => toast.error(t('error_deleting_donation')),
  });

  const updateFilter = (field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      const blob = await exportAllDonations();
      downloadBlob(blob, `donations_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('export_success'));
    } catch {
      toast.error(t('export_failed'));
    }
  };

  const handleExportSingle = async (donation) => {
    try {
      const blob = await exportDonation(donation._id);
      downloadBlob(blob, `donation_${donation.receiptNumber || 'record'}.xlsx`);
      toast.success(t('export_success'));
    } catch {
      toast.error(t('export_failed'));
    }
  };

  const openCreate = () => {
    setSelectedDonation(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const openEdit = (donation) => {
    setSelectedDonation(donation);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const donations = donationsQuery.data?.data || [];
  const pagination = donationsQuery.data?.pagination || { page: 1, pages: 1, total: 0 };
  const hasFilters = Object.values(filters).some(Boolean);
  const methodLabels = {
    qr: t('qr_code'),
    cash: t('cash'),
    bank_transfer: t('bank_transfer'),
    cheque: t('cheque'),
  };
  const statusLabels = {
    paid: t('paid'),
    pending: t('pending'),
    failed: t('failed'),
  };

  if (!canUseDonations) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">{t('donations')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('donations_not_available')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t('donations')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin ? t('track_donations') : t('donation_entry_description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleExportAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-green-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t('export_all')}
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            <PlusIcon className="h-4 w-4" />
            {t('add_donation')}
          </button>
        </div>
      </header>

      {isAdmin && <DonationStats stats={statsQuery.data} isLoading={statsQuery.isLoading} />}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block w-full lg:max-w-md">
              <span className="sr-only">{t('search_donations')}</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
                placeholder={t('search_donations')}
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.paymentMethod}
                onChange={(event) => updateFilter('paymentMethod', event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label={t('payment_method')}
              >
                <option value="">{t('all_payment_methods')}</option>
                <option value="cash">{t('cash')}</option>
                <option value="qr">{t('qr_code')}</option>
                <option value="bank_transfer">{t('bank_transfer')}</option>
                <option value="cheque">{t('cheque')}</option>
              </select>
              <select
                value={filters.category}
                onChange={(event) => updateFilter('category', event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label={t('category')}
              >
                <option value="">{t('all_categories')}</option>
                {['general', 'temple', 'education', 'emergency', 'event', 'other'].map((category) => (
                  <option key={category} value={category}>{t(category)}</option>
                ))}
              </select>
              <select
                value={filters.paymentStatus}
                onChange={(event) => updateFilter('paymentStatus', event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label={t('payment_status')}
              >
                <option value="">{t('all_status')}</option>
                <option value="paid">{t('paid')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="failed">{t('failed')}</option>
              </select>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t('clear_filters')}
                </button>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-medium text-slate-600">
                {t('date_from')}
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t('date_to')}
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t('minimum_amount')}
                <input
                  type="number"
                  min="0"
                  value={filters.minAmount}
                  onChange={(event) => updateFilter('minAmount', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t('maximum_amount')}
                <input
                  type="number"
                  min="0"
                  value={filters.maxAmount}
                  onChange={(event) => updateFilter('maxAmount', event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {t('showing')} {donations.length} {t('of')} {pagination.total || 0} {t('records')}
            {!isAdmin && ` · ${t('financial_values_hidden')}`}
          </p>
        </div>

        {donationsQuery.isLoading ? (
          <p className="p-6 text-sm text-slate-500">{t('loading')}</p>
        ) : donationsQuery.error ? (
          <p role="alert" className="p-6 text-sm text-slate-700">{t('donations_load_failed')}</p>
        ) : donations.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">{t('no_donations')}</p>
            <p className="mt-1 text-xs text-slate-500">{t('no_donations_hint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('receipt')}</th>
                  <th className="px-4 py-3 font-medium">{t('donor')}</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">{t('amount')}</th>}
                  <th className="px-4 py-3 font-medium">{t('payment_method')}</th>
                  <th className="px-4 py-3 font-medium">{t('category')}</th>
                  <th className="px-4 py-3 font-medium">{t('date')}</th>
                  <th className="px-4 py-3 font-medium">{t('status')}</th>
                  {isAdmin && <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((donation) => (
                  <tr key={donation._id} className="hover:bg-green-50/40">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{donation.receiptNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{donation.donorName}</p>
                      <p className="text-xs text-slate-500">{donation.donorPhone}</p>
                      <p className="text-xs text-slate-500">{donation.donorEmail}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 font-semibold text-green-800">
                        {t('currency_amount', { amount: Number(donation.amount || 0).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-700">{methodLabels[donation.paymentMethod] || donation.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-700">{t(donation.category || 'general')}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {donation.donationDate ? new Date(donation.donationDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${donation.paymentStatus === 'paid' ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[donation.paymentStatus] || donation.paymentStatus}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleExportSingle(donation)}
                            className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800"
                            title={t('export_excel')}
                            aria-label={t('export_excel')}
                          >
                            <DocumentArrowDownIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(donation)}
                            className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800"
                            title={t('edit')}
                            aria-label={t('edit')}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(t('confirm_delete'))) deleteMutation.mutate(donation._id);
                            }}
                            className="rounded-md p-2 text-slate-600 hover:bg-green-50 hover:text-green-800"
                            title={t('delete')}
                            aria-label={t('delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">{t('page')} {pagination.page} {t('of')} {pagination.pages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('previous')}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                disabled={pagination.page >= pagination.pages}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </section>

      <DonationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        donation={selectedDonation}
        mode={isAdmin ? formMode : 'create'}
      />
    </div>
  );
};

export default Donations;
