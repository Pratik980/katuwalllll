import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '../context/LanguageContext';

const RecentActivity = ({ title, items, type }) => {
  const { t } = useLanguage();
  const emptyMessage = type === 'donation' ? t('no_recent_donations') : t('no_recent_members');

  if (!items || items.length === 0) {
    return (
      <div className="dashboard-surface rounded-2xl p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-800">{title}</h2>
        <p className="py-8 text-center text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-surface rounded-2xl p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-800">{title}</h2>
      <ul className="space-y-3">
        {items.map((item) => {
          const date = item.createdAt || item.donationDate;
          return (
            <li key={item._id} className="flex items-center gap-3">
              {item.photo ? (
                <img
                  src={item.photo}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                  {(item.name || item.donorName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to={type === 'donation' ? '/donations' : '/members'}
                  className="block truncate text-sm font-medium text-slate-800 transition hover:text-emerald-700"
                >
                  {item.name || item.donorName || t('anonymous_donation')}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : ''}
                </p>
              </div>
              {type === 'donation' && item.amount && (
                <span className="shrink-0 text-sm font-semibold text-emerald-700">
                  Rs. {item.amount.toLocaleString()}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RecentActivity;
