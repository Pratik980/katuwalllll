// src/components/StatCard.jsx
const colorMap = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  red: 'bg-rose-50 text-rose-700 ring-rose-100',
  pink: 'bg-pink-50 text-pink-700 ring-pink-100',
  purple: 'bg-violet-50 text-violet-700 ring-violet-100',
  yellow: 'bg-amber-50 text-amber-700 ring-amber-100',
};

const StatCard = ({ title, value, icon: Icon, color = 'green' }) => {
  return (
    <div className="dashboard-surface dashboard-stat min-w-0 p-5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-slate-500">{title}</p>
          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${colorMap[color] || colorMap.green}`}>
          <Icon className="h-[21px] w-[21px]" />
        </div>
      </div>
      <div className="mt-4 border-t border-slate-100" />
    </div>
  );
};

export default StatCard;