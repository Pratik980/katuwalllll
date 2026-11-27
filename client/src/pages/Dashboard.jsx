import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import RecentActivity from '../components/RecentActivity';
import { useLanguage } from '../context/LanguageContext';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  HeartIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isUser = role === 'user';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardStats', role],
    queryFn: getDashboardStats,
  });

  const stats = data?.summary || {};
  const demographics = data?.demographics || {};
  const personal = data?.personal || {};
  const maleCount = demographics.gender?.find(g => g._id === 'male')?.count || 0;
  const femaleCount = demographics.gender?.find(g => g._id === 'female')?.count || 0;
  const livingCount = demographics.lifeStatus?.find(s => s._id === true)?.count || 0;
  const recentMembers = data?.recent?.members || [];
  const recentDonations = data?.recent?.donations || [];
  const registrationStats = data?.registrationStats || [];
  const overviewTitle = isAdmin
    ? t('admin_overview')
    : isStaff
      ? t('staff_overview')
      : t('personal_overview');
  const locale = language === 'ne' ? 'ne-NP' : 'en-US';
  const formatMonth = (month) => {
    const [year, monthNumber] = String(month).split('-');
    if (!year || !monthNumber) return month;
    return new Date(Number(year), Number(monthNumber) - 1, 1)
      .toLocaleDateString(locale, { year: 'numeric', month: 'short' });
  };

  const cards = [
    {
      title: isUser ? t('my_members_added') : t('total_members'),
      value: stats.totalMembers || 0,
      icon: UsersIcon,
      color: 'green',
    },
    {
      title: t('total_families'),
      value: stats.totalFamilies || 0,
      icon: BuildingOfficeIcon,
      color: 'green',
    },
    {
      title: t('total_male'),
      value: maleCount,
      icon: UserGroupIcon,
      color: 'neutral',
    },
    {
      title: t('total_female'),
      value: femaleCount,
      icon: UserGroupIcon,
      color: 'green',
    },
    {
      title: t('living_members'),
      value: livingCount,
      icon: UsersIcon,
      color: 'emerald',
    },
    {
      title: t('generations'),
      value: demographics.generations?.length || 0,
      icon: UserGroupIcon,
      color: 'neutral',
    },
  ];

  if (isAdmin) {
    cards.push(
      { title: t('total_staff'), value: stats.totalStaff || 0, icon: UserCircleIcon, color: 'green' },
      { title: t('total_users'), value: stats.totalUsers || 0, icon: UserGroupIcon, color: 'neutral' },
      { title: t('total_donations'), value: stats.totalDonations || 0, icon: HeartIcon, color: 'green' },
      { title: t('total_earnings'), value: t('currency_amount', { amount: (stats.totalEarnings || 0).toLocaleString(locale) }), icon: CurrencyDollarIcon, color: 'green' },
    );
  }

  if (isStaff) {
    cards.push(
      { title: t('total_users'), value: stats.totalUsers || 0, icon: UserGroupIcon, color: 'green' },
      { title: t('members_added_across_system'), value: stats.membersAddedAcrossSystem || 0, icon: ClipboardDocumentListIcon, color: 'green' },
    );
  }

  const quickLinks = [
    { to: '/members', title: t('browse_members'), description: t('browse_members_description'), icon: UsersIcon, iconClass: 'bg-emerald-50 text-emerald-700' },
    { to: '/families', title: t('families'), description: t('manage_families_description'), icon: BuildingOfficeIcon, iconClass: 'bg-emerald-50 text-emerald-800' },
    { to: '/data-entry', title: t('add_member'), description: isUser ? t('add_member_personal_description') : t('add_member'), icon: UserPlusIcon, iconClass: 'bg-slate-100 text-slate-700' },
  ];

  if (isAdmin || isStaff) {
    quickLinks.push({
      to: '/donations',
      title: isAdmin ? t('donations') : t('add_donation'),
      description: isAdmin ? t('track_donations') : t('donation_entry_description'),
      icon: HeartIcon,
      iconClass: 'bg-emerald-50 text-emerald-800',
    });
  }

  if (isAdmin) {
    quickLinks.push({
      to: '/reports',
      title: t('reports'),
      description: t('financial_reports'),
      icon: ChartBarIcon,
      iconClass: 'bg-slate-100 text-slate-700',
    });
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="dashboard-hero rounded-2xl px-5 py-6 text-white sm:px-8 sm:py-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-50">
              {t('family_community')}
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-[27px]">
              {t('family_archive_welcome')}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/90">
              {t('family_archive_description')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/data-entry"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              <UserPlusIcon className="h-4 w-4" />
              {t('add_member')}
            </Link>
            <Link
              to="/family-tree"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {t('explore_family_tree')}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="overview-heading">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-eyebrow">{t('at_a_glance')}</p>
            <h2 id="overview-heading" className="mt-1 text-lg font-semibold tracking-tight text-slate-800">
              {overviewTitle}
            </h2>
          </div>
          {data && (
            <span className="text-xs text-slate-400">{t('dashboard_subtitle')}</span>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
            <p>{t('dashboard_load_failed')}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 sm:self-auto"
            >
              <ArrowPathIcon className="h-4 w-4" />
              {t('try_again')}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="dashboard-surface h-32 animate-pulse bg-white p-5">
                <div className="h-3 w-24 rounded bg-slate-100" />
                <div className="mt-5 h-7 w-16 rounded bg-slate-100" />
                <div className="mt-4 h-px bg-slate-100" />
              </div>
            ))}
          </div>
        ) : !error ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="dashboard-surface p-5">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-emerald-700" />
          <h3 className="text-sm font-semibold text-slate-800">{t('registration_stats')}</h3>
        </div>
        {registrationStats.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {registrationStats.slice(-6).map((row) => (
              <span
                key={row.month}
                className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
              >
                {formatMonth(row.month)}: {row.count}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">{t('no_data')}</p>
        )}
      </section>

      {isUser && (
        <section className="dashboard-surface p-5">
          <h3 className="text-sm font-semibold text-slate-800">{t('personal_family')}</h3>
          {personal.family ? (
            <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <p><span className="font-medium text-slate-800">{t('family_name')}:</span> {personal.family.name}</p>
              <p><span className="font-medium text-slate-800">{t('family_number')}:</span> {personal.family.number}</p>
              <p><span className="font-medium text-slate-800">{t('house_number')}:</span> {personal.family.houseNumber || personal.family.houseIdentifier || '—'}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('no_family_info')}</p>
          )}
        </section>
      )}

      {isAdmin && data?.systemOverview && (
        <section className="dashboard-surface p-5">
          <h3 className="text-sm font-semibold text-slate-800">{t('system_overview')}</h3>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            <p><span className="font-medium text-slate-800">{t('total_members')}:</span> {data.systemOverview.totalMembers}</p>
            <p><span className="font-medium text-slate-800">{t('total_families')}:</span> {data.systemOverview.totalFamilies}</p>
            <p><span className="font-medium text-slate-800">{t('total_staff')}:</span> {data.systemOverview.totalStaff}</p>
            <p><span className="font-medium text-slate-800">{t('total_users')}:</span> {data.systemOverview.totalUsers}</p>
            <p><span className="font-medium text-slate-800">{t('total_donations')}:</span> {data.systemOverview.totalDonations}</p>
            <p><span className="font-medium text-slate-800">{t('total_earnings')}:</span> {t('currency_amount', { amount: (data.systemOverview.totalEarnings || 0).toLocaleString(locale) })}</p>
          </div>
        </section>
      )}

      {isAdmin && data?.activity && (
        <section className="dashboard-surface p-5">
          <h3 className="text-sm font-semibold text-slate-800">{t('activity')}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <StatCard title={t('staff_activity')} value={data.activity.staff} icon={UserCircleIcon} color="green" />
            <StatCard title={t('user_activity')} value={data.activity.user} icon={UserGroupIcon} color="neutral" />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to + link.title}
              to={link.to}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${link.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{link.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{link.description}</span>
                </span>
              </div>
              <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentActivity
          title={isUser ? t('my_recent_members') : t('recent_members')}
          items={recentMembers}
          type="member"
        />
        {isAdmin && (
          <RecentActivity title={t('recent_donations')} items={recentDonations} type="donation" />
        )}
      </section>
    </div>
  );
};

export default Dashboard;
