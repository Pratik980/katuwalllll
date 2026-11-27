import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../context/LanguageContext';

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
};

const formatDate = (date, locale) => {
  if (!date) return '-';
  return new Date(date).toLocaleString(locale === 'ne' ? 'ne-NP' : 'en-US');
};

const Table = ({
  columns,
  data,
  loading = false,
  onView,
  onEdit,
  onDelete,
  pagination,
  customActions,
}) => {
  const { t, language } = useLanguage();
  const hasActions = Boolean(onView || onEdit || onDelete || customActions);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-700" />
      </div>
    );
  }

  const renderCellContent = (item, column) => {
    const value = item[column.key];

    if (column.render) {
      return <span className="text-sm text-slate-900">{column.render(value, item)}</span>;
    }

    switch (column.type) {
      case 'member':
        if (value && typeof value === 'object') {
          return <span className="text-sm text-slate-900">{value.name || t('unknown')}</span>;
        }
        return <span className="text-sm text-slate-900">{value || '-'}</span>;

      case 'verified':
        return (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              value ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {value ? t('verified') : t('pending')}
          </span>
        );

      case 'image':
        return value ? (
          <img src={value} alt={item.name} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <span className="text-xs text-slate-500">{t('no_img')}</span>
          </div>
        );

      case 'status':
        return (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              value === 'completed' || value === 'success' || value === 'verified'
                ? 'bg-emerald-50 text-emerald-800'
                : value === 'pending' || value === 'processing'
                ? 'bg-slate-100 text-slate-600'
                : value === 'failed' || value === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {value ? t(value) || value : '-'}
          </span>
        );

      case 'boolean':
        return (
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              value ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {value ? t('yes') : t('no')}
          </span>
        );

      case 'filesize':
        return <span className="text-sm text-slate-900">{formatFileSize(value)}</span>;

      case 'date':
        return <span className="text-sm text-slate-900">{formatDate(value, language)}</span>;

      default:
        if (value && typeof value === 'object') {
          return (
            <span className="text-sm text-slate-900">
              {value.name || value.title || JSON.stringify(value)}
            </span>
          );
        }
        return <span className="text-sm text-slate-900">{value || '-'}</span>;
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
                >
                  {column.label}
                </th>
              ))}
              {hasActions && (
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {t('actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {data && data.length > 0 ? (
              data.map((item, index) => (
                <tr key={item._id || index} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-6 py-4">
                      {renderCellContent(item, column)}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {onView && (
                        <button
                          onClick={() => onView(item)}
                          className="mr-2 text-emerald-800 hover:text-emerald-950"
                          title={t('view')}
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item)}
                          className="mr-2 text-emerald-800 hover:text-emerald-950"
                          title={t('edit')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(item._id)}
                          className="text-red-700 hover:text-red-900"
                          title={t('delete')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                      {customActions?.(item)}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  {t('no_data_found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
          <div className="text-sm text-slate-700">
            {pagination.summary || t('page_x_of_y', { current: pagination.currentPage, total: pagination.totalPages })}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {t('previous')}
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;
