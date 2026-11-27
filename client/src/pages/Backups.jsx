import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBackups,
  createBackup,
  deleteBackup,
  downloadBackup,
  restoreBackup,
} from '../api/backups';
import Button from '../components/Button';
import Table from '../components/Table';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CircleStackIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const formatBytes = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const BackupSettings = () => {
  const [page, setPage] = useState(1);
  const [restoreSummary, setRestoreSummary] = useState(null);
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const { data: backupsData, isLoading, refetch } = useQuery({
    queryKey: ['backups', page],
    queryFn: () => getBackups({ page, limit: 5 }),
  });

  const createBackupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success(t('bk_created'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('failed_to_create_backup')),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      toast.success(t('bk_deleted'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('failed_to_delete_backup')),
  });

  const downloadBackupMutation = useMutation({
    mutationFn: downloadBackup,
    onSuccess: ({ blob, fileName }) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('bk_downloaded'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('failed_to_download_backup')),
  });

  const restoreBackupMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      setRestoreSummary(result || null);
      toast.success(t('bk_restored'));
    },
    onError: (error) => toast.error(error.response?.data?.message || t('failed_to_restore_backup')),
  });

  const latestBackup = backupsData?.data?.[0] || null;

  const handleCreateBackup = async () => {
    await createBackupMutation.mutateAsync();
  };

  const handleDownloadBackup = async (id, fileName) => {
    if (!id) {
      toast.error(t('bk_no_backup_download'));
      return;
    }
    await downloadBackupMutation.mutateAsync({ id, fileName });
  };

  const handleDeleteBackup = (id) => {
    if (window.confirm(t('bk_confirm_delete'))) {
      deleteBackupMutation.mutate(id);
    }
  };

  const handleRestoreBackup = (item) => {
    if (!item?._id) {
      toast.error(t('bk_no_backup_restore'));
      return;
    }
    const response = window.prompt(t('bk_restore_prompt', { name: item.fileName }));
    if (response !== 'RESTORE') {
      toast.error(t('bk_restore_cancelled'));
      return;
    }
    restoreBackupMutation.mutate(item._id);
  };

  const backupColumns = [
    { key: 'fileName', label: t('bk_file_name') },
    { key: 'fileSize', label: t('bk_size'), type: 'filesize' },
    { key: 'backupType', label: t('bk_type') },
    { key: 'status', label: t('status'), type: 'status' },
    { key: 'createdAt', label: t('bk_created_col'), type: 'date' },
  ];

  const backupCustomActions = (item) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleDownloadBackup(item._id, item.fileName)}
        title={t('download')}
        aria-label={t('download')}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleRestoreBackup(item)}
        title={t('bk_restore')}
        aria-label={t('bk_restore')}
        disabled={restoreBackupMutation.isPending}
      >
        <ArrowPathIcon className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleDeleteBackup(item._id)}
        title={t('delete')}
        aria-label={t('delete')}
        className="text-red-600 hover:bg-red-50"
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CircleStackIcon className="h-6 w-6 text-emerald-800" />
          {t('bk_title')}
        </h1>
        <p className="text-slate-600">{t('bk_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="dashboard-surface p-4 text-center">
          <CircleStackIcon className="mx-auto mb-2 h-8 w-8 text-emerald-800" />
          <h4 className="font-semibold text-slate-900">{t('bk_create')}</h4>
          <p className="mb-3 mt-1 text-sm text-slate-600">{t('create_backup_desc')}</p>
          <Button variant="primary" onClick={handleCreateBackup} disabled={createBackupMutation.isPending} className="w-full">
            {createBackupMutation.isPending ? t('bk_creating') : t('bk_create')}
          </Button>
        </div>

        <div className="dashboard-surface p-4 text-center">
          <ArrowPathIcon className="mx-auto mb-2 h-8 w-8 text-emerald-800" />
          <h4 className="font-semibold text-slate-900">{t('bk_restore_latest')}</h4>
          <p className="mb-3 mt-1 text-sm text-slate-600">{t('bk_restore_latest_desc')}</p>
          <Button
            variant="outline"
            onClick={() => handleRestoreBackup(latestBackup)}
            disabled={!latestBackup || restoreBackupMutation.isPending}
            className="w-full"
          >
            {restoreBackupMutation.isPending ? t('bk_restoring') : t('bk_restore')}
          </Button>
        </div>

        <div className="dashboard-surface p-4 text-center">
          <ArrowDownTrayIcon className="mx-auto mb-2 h-8 w-8 text-emerald-800" />
          <h4 className="font-semibold text-slate-900">{t('bk_download_latest')}</h4>
          <p className="mb-3 mt-1 text-sm text-slate-600">{t('bk_download_latest_desc')}</p>
          <Button
            variant="secondary"
            onClick={() => handleDownloadBackup(latestBackup?._id, latestBackup?.fileName)}
            disabled={!latestBackup || downloadBackupMutation.isPending}
            className="w-full"
          >
            {downloadBackupMutation.isPending ? t('bk_downloading') : t('bk_download')}
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">{t('bk_recent')}</h4>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <ArrowPathIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('bk_refresh')}
          </Button>
        </div>
        <div className="dashboard-surface p-3 sm:p-4">
          <Table
            columns={backupColumns}
            data={backupsData?.data || []}
            loading={isLoading}
            customActions={backupCustomActions}
            pagination={{
              currentPage: backupsData?.pagination?.page || 1,
              totalPages: backupsData?.pagination?.pages || 1,
              onPageChange: setPage,
            }}
          />
        </div>
      </div>

      <div className="dashboard-surface grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
        {[
          [t('bk_last_backup_date'), latestBackup?.createdAt ? new Date(latestBackup.createdAt).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US') : t('bk_no_backup_yet')],
          [t('bk_latest_backup_size'), latestBackup ? formatBytes(latestBackup.fileSize) : '—'],
          [t('bk_total_backups'), backupsData?.pagination?.total || 0],
          [t('bk_backup_location'), t('bk_server_directory')],
          [t('status'), latestBackup?.status || '—'],
        ].map(([itemLabel, value]) => (
          <div key={itemLabel}>
            <p className="text-sm text-slate-600">{itemLabel}</p>
            <p className="font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {restoreSummary && (
        <div className="dashboard-surface space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-900">{t('bk_restore_summary')}</h4>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
              restoreSummary.dryRun ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
            }`}>
              {restoreSummary.dryRun ? t('bk_dry_run') : restoreSummary.status || t('bk_completed')}
            </span>
          </div>
          {restoreSummary.message && (
            <p className="text-sm text-slate-600">{restoreSummary.message}</p>
          )}
          {restoreSummary.counts && Object.keys(restoreSummary.counts).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700">{t('bk_counts')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(restoreSummary.counts).map(([collection, count]) => (
                  <span key={collection} className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    {collection}: <strong className="text-slate-900">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {restoreSummary.refusedCollections?.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-800">{t('bk_refused_collections')}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {restoreSummary.refusedCollections.map(({ collection, reason }) => (
                  <li key={collection}>{collection}: {reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackupSettings;
