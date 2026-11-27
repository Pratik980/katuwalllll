const colorMap = {
  green: 'bg-emerald-50 text-emerald-800',
  emerald: 'bg-emerald-50 text-emerald-800',
  neutral: 'bg-slate-100 text-slate-700',
  blue: 'bg-emerald-50 text-emerald-800',
  indigo: 'bg-emerald-50 text-emerald-800',
  pink: 'bg-emerald-50 text-emerald-800',
  purple: 'bg-emerald-50 text-emerald-800',
  red: 'bg-emerald-50 text-emerald-800',
  yellow: 'bg-emerald-50 text-emerald-800',
};

const StatCard = ({ title, value, icon: Icon, color = 'green' }) => {
  return (
    <article className="dashboard-surface dashboard-stat rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorMap[color] || colorMap.green}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
};

export default StatCard;
