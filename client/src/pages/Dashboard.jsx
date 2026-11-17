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
  HeartIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const canManageMembers = user?.role === 'admin' || user?.role === 'staff';
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  const stats = data?.summary || {};
  const demographics = data?.demographics || {};
  const maleCount = demographics.gender?.find(g => g._id === 'male')?.count || 0;
  const femaleCount = demographics.gender?.find(g => g._id === 'female')?.count || 0;
  const recentMembers = data?.recent?.members || [];
  const recentDonations = data?.recent?.donations || [];
  const personalMember = data?.personalMember;

  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="dashboard-hero rounded-[1.6rem] px-6 py-7 text-white sm:px-9 sm:py-9">
        <div className="relative z-10 flex flex-col justify-between gap-7 md:min-h-44 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-50">
              {t('family_community')}
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {t('family_archive_welcome')}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-[15px]">
              {t('family_archive_description')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManageMembers && <Link
              to="/data-entry"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <UserPlusIcon className="h-4 w-4" />
              {t('add_member')}
            </Link>}
            <Link
              to="/family-tree"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {t('explore_family_tree')}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {user?.role === 'user' && (
        <section aria-labelledby="personal-record-heading" className="dashboard-surface rounded-2xl bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {personalMember?.photo ? (
                <img
                  src={personalMember.photo}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-800">
                  {(personalMember?.name || user.name || '?').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="page-eyebrow">{t('personal_record')}</p>
                <h2 id="personal-record-heading" className="mt-1 truncate text-base font-semibold text-slate-900">
                  {personalMember?.name || t('unlinked_family_profile')}
                </h2>
                {personalMember && (
                  <p className="mt-1 text-sm text-slate-600">
                    {[personalMember.memberNumber, personalMember.family?.familyName]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>
            </div>
            {personalMember ? (
              <Link
                to={`/profile/${personalMember._id}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t('view_my_record')}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <p className="text-sm text-slate-600">{t('contact_administrator_for_link')}</p>
            )}
          </div>
        </section>
      )}

      <section aria-labelledby="overview-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="page-eyebrow">{t('at_a_glance')}</p>
            <h2 id="overview-heading" className="mt-1 text-lg font-semibold tracking-tight text-slate-800">
              {t('community_overview')}
            </h2>
          </div>
          {data && (
            <span className="hidden text-xs text-slate-400 sm:inline">
              {t('family_records_tagline')}
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p>{t('dashboard_load_failed')}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 sm:self-auto"
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
            <StatCard title={t('total_members')} value={stats.totalMembers || 0} icon={UsersIcon} color="green" />
            <StatCard title={t('total_families')} value={stats.totalFamilies || 0} icon={BuildingOfficeIcon} color="blue" />
            <StatCard title={t('total_male')} value={maleCount} icon={UserGroupIcon} color="indigo" />
            <StatCard title={t('total_female')} value={femaleCount} icon={UserGroupIcon} color="pink" />
            {isAdmin && <StatCard title={t('total_donations')} value={`Rs. ${(stats.totalDonationAmount || 0).toLocaleString()}`} icon={HeartIcon} color="red" />}
            <StatCard title={t('living_members')} value={demographics.lifeStatus?.find(status => status._id === true)?.count || 0} icon={UsersIcon} color="emerald" />
            <StatCard title={t('generations')} value={demographics.generations?.length || 0} icon={UserGroupIcon} color="purple" />
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/members" className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UsersIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">{t('browse_members')}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t('browse_members_description')}</span>
            </span>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
        </Link>
        <Link to="/families" className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <BuildingOfficeIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">{t('families')}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t('manage_families_description')}</span>
            </span>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentActivity title={t('recent_members')} items={recentMembers} type="member" />
        {isAdmin && <RecentActivity title={t('recent_donations')} items={recentDonations} type="donation" />}
      </section>
    </div>
  );
};

export default Dashboard;
