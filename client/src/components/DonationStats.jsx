import { useLanguage } from '../context/LanguageContext';

const DonationStats = ({ stats, isLoading }) => {
  const { t, language } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-3 w-1/2 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-3/4 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  const summary = stats?.overall || stats?.summary || {};
  const totalDonations = summary.count || 0;
  const totalAmount = summary.totalAmount || 0;
  const pendingCount = summary.pendingPayments ?? summary.pendingCount ?? 0;
  const monthly = stats?.monthly || [];
  const currentMonth = monthly.length > 0 ? monthly[monthly.length - 1] : null;

  const cards = [
    { label: t('total_donors'), value: stats?.uniqueDonors || 0, format: 'number' },
    { label: t('total_amount'), value: totalAmount, format: 'currency', hint: `${totalDonations} ${t('donations')}` },
    { label: t('this_month'), value: currentMonth?.total || 0, format: 'currency', hint: `${currentMonth?.count || 0} ${t('donations')}` },
    { label: t('pending'), value: pendingCount, format: 'number' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className="mt-1 text-lg font-semibold text-green-800">
            {card.format === 'currency'
              ? t('currency_amount', { amount: Number(card.value || 0).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })
              : Number(card.value || 0).toLocaleString(language === 'ne' ? 'ne-NP' : 'en-US')}
          </p>
          {card.hint && <p className="mt-1 text-xs text-slate-500">{card.hint}</p>}
        </div>
      ))}
    </div>
  );
};

export default DonationStats;
