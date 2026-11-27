import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFamilies } from '../api/families';
import { fetchReport, fetchReportExcel } from '../api/reports';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  FaFilePdf, FaFileExcel, FaSearch, FaUsers, FaHome, FaTree,
  FaChartBar, FaMapMarker, FaQrcode, FaMoneyBillWave, FaDownload,
} from 'react-icons/fa';
import { provinces, districts } from '../data/nepalLocations';
import {
  downloadReportPdf,
  normalizeReportRows,
  reportFilename,
} from '../utils/reportExport';

const REPORTS = [
  { id: 'members', titleKey: 'report_members', descriptionKey: 'report_members_desc', endpoint: '/reports/members', icon: FaUsers },
  { id: 'genealogy', titleKey: 'report_genealogy', descriptionKey: 'report_genealogy_desc', endpoint: '/reports/genealogy', icon: FaTree },
  { id: 'family', titleKey: 'report_family', descriptionKey: 'report_family_desc', endpoint: '/reports/family', icon: FaHome, requiresFamily: true },
  { id: 'all-families', titleKey: 'report_all_families', descriptionKey: 'report_all_families_desc', endpoint: '/reports/all-families', icon: FaHome },
  { id: 'generation', titleKey: 'report_generation', descriptionKey: 'report_generation_desc', endpoint: '/reports/generation', icon: FaChartBar },
  { id: 'demographic', titleKey: 'report_demographic', descriptionKey: 'report_demographic_desc', endpoint: '/reports/demographic', icon: FaMapMarker },
  { id: 'qr', titleKey: 'report_qr', descriptionKey: 'report_qr_desc', endpoint: '/reports/qr', icon: FaQrcode },
  { id: 'donation', titleKey: 'report_donation', descriptionKey: 'report_donation_desc', endpoint: '/reports/donation', icon: FaMoneyBillWave, adminOnly: true },
];

const saveBlob = ({ blob, fileName }) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const EMPTY_FILTERS = {
  search: '',
  family: '',
  generation: '',
  gender: '',
  province: '',
  district: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

const Reports = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const canViewDonations = user?.role === 'admin';
  const [activeReportId, setActiveReportId] = useState('members');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busyReport, setBusyReport] = useState('');

  const { data: familiesData } = useQuery({
    queryKey: ['families-report'],
    queryFn: () => getFamilies({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const families = familiesData?.data || [];

  const activeReport = REPORTS.find((report) => report.id === activeReportId) || REPORTS[0];
  const districtOptions = useMemo(
    () => (filters.province ? districts[filters.province] || [] : Object.values(districts).flat()),
    [filters.province]
  );

  const paramsFor = (report) => {
    const params = {
      search: filters.search,
      generation: filters.generation,
      gender: filters.gender,
      province: filters.province,
      district: filters.district,
      status: filters.status,
      includePhoto: includePhotos ? 'true' : '',
    };
    if (report.requiresFamily) params.familyId = filters.family;
    else params.family = filters.family;
    if (filters.dateFrom && filters.dateTo) params.dateRange = `${filters.dateFrom},${filters.dateTo}`;
    return params;
  };

  const reportEnabled = (!activeReport.adminOnly || canViewDonations)
    && (!activeReport.requiresFamily || !!filters.family);

  const { data: reportData, isFetching, isPending } = useQuery({
    queryKey: ['report', activeReportId, filters, includePhotos],
    queryFn: () => fetchReport(activeReport.endpoint, paramsFor(activeReport)),
    enabled: reportEnabled,
  });

  const rows = useMemo(() => normalizeReportRows(reportData, activeReportId), [reportData, activeReportId]);
  const previewColumns = useMemo(() => {
    const columns = [];
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key === 'Photo' || columns.includes(key)) return;
        columns.push(key);
      });
    });
    if (includePhotos && rows.some((row) => row.Photo)) columns.unshift('Photo');
    return columns;
  }, [rows, includePhotos]);
  const previewRows = rows.slice(0, 12);

  const setFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'province' ? { district: '' } : {}),
    }));
  };

  const handleDownload = async (report, format) => {
    if (report.adminOnly && !canViewDonations) {
      toast.error(t('donation_report_forbidden'));
      return;
    }
    if (report.requiresFamily && !filters.family) {
      toast.error(t('select_family_first'));
      return;
    }

    const key = `${report.id}-${format}`;
    setBusyReport(key);
    try {
      const familyName = families.find((family) => family._id === filters.family)?.familyName || '';
      const filename = reportFilename(report.id, report.requiresFamily ? familyName : '', format);

      if (format === 'excel') {
        saveBlob(await fetchReportExcel(report.endpoint, paramsFor(report), filename));
      } else {
        const payload = await fetchReport(report.endpoint, paramsFor(report));
        const reportRows = normalizeReportRows(payload, report.id);
        const subtitle = [
          filters.search && `${t('search_label')}: ${filters.search}`,
          familyName && `${t('family_label')}: ${familyName}`,
          filters.dateFrom && filters.dateTo && `${filters.dateFrom} – ${filters.dateTo}`,
        ].filter(Boolean).join(' | ');
        await downloadReportPdf({
          title: t('report_title_suffix', { title: t(report.titleKey) }),
          subtitle,
          rows: reportRows,
          includePhotos,
          filename,
        });
      }

      toast.success(t('report_downloaded', { title: t(report.titleKey), format: format.toUpperCase() }));
    } catch (error) {
      console.error('Report export failed:', error);
      toast.error(t('report_download_failed', { title: t(report.titleKey) }));
    } finally {
      setBusyReport('');
    }
  };

  const selectClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500';
  const availableReports = REPORTS.filter((report) => !report.adminOnly || canViewDonations);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports')}</h1>
          <p className="text-sm text-gray-600">{t('reports_subtitle')}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <FaDownload className="text-green-600" />
          {rows.length} {t('records')}
        </span>
      </div>

      <section className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilter('search', event.target.value)}
              placeholder={t('search_reports')}
              className={`${selectClass} pl-9`}
            />
          </div>
          <select value={filters.family} onChange={(event) => setFilter('family', event.target.value)} className={selectClass}>
            <option value="">{t('all_families')}</option>
            {families.map((family) => (<option key={family._id} value={family._id}>{family.familyName}</option>))}
          </select>
          <select value={filters.generation} onChange={(event) => setFilter('generation', event.target.value)} className={selectClass}>
            <option value="">{t('all_generations')}</option>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((generation) => (
              <option key={generation} value={generation}>{t('generation')} {generation}</option>
            ))}
          </select>
          <select value={filters.gender} onChange={(event) => setFilter('gender', event.target.value)} className={selectClass}>
            <option value="">{t('all_genders')}</option>
            <option value="male">{t('male')}</option>
            <option value="female">{t('female')}</option>
            <option value="other">{t('other')}</option>
          </select>
          <select value={filters.province} onChange={(event) => setFilter('province', event.target.value)} className={selectClass}>
            <option value="">{t('all_provinces')}</option>
            {provinces.map((province) => (<option key={province} value={province}>{province}</option>))}
          </select>
          <select value={filters.district} onChange={(event) => setFilter('district', event.target.value)} className={selectClass}>
            <option value="">{t('all_districts')}</option>
            {districtOptions.map((district) => (<option key={district} value={district}>{district}</option>))}
          </select>
          <select value={filters.status} onChange={(event) => setFilter('status', event.target.value)} className={selectClass}>
            <option value="">{t('all_status')}</option>
            <option value="living">{t('living')}</option>
            <option value="deceased">{t('deceased')}</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={filters.dateFrom} onChange={(event) => setFilter('dateFrom', event.target.value)} className={selectClass} aria-label={t('date_from')} />
            <input type="date" value={filters.dateTo} onChange={(event) => setFilter('dateTo', event.target.value)} className={selectClass} aria-label={t('date_to')} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(event) => setIncludePhotos(event.target.checked)}
              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            {t('include_photos')}
          </label>
          <Button variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} className="text-sm">
            {t('clear_filters')}
          </Button>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {availableReports.map((report) => {
            const Icon = report.icon;
            return (
              <div
                key={report.id}
                onClick={() => setActiveReportId(report.id)}
                className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
                  activeReportId === report.id ? 'border-green-500 ring-1 ring-green-200' : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                    <Icon />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">{t(report.titleKey)}</h2>
                    <p className="mt-1 text-xs text-slate-500">{t(report.descriptionKey)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); handleDownload(report, 'pdf'); }}
                    disabled={!!busyReport}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FaFilePdf className="text-red-600" />
                    {busyReport === `${report.id}-pdf` ? t('exporting') : t('download_pdf')}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); handleDownload(report, 'excel'); }}
                    disabled={!!busyReport}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FaFileExcel className="text-green-700" />
                    {busyReport === `${report.id}-excel` ? t('exporting') : t('download_excel')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-slate-900">
            {t('report_preview')}: {t(activeReport.titleKey)}
          </h2>
          <span className="text-sm text-gray-500">
            {t('showing')} {previewRows.length} {t('of')} {rows.length} {t('records')}
            {isFetching || isPending ? ` • ${t('loading')}` : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {previewColumns.map((column) => (
                  <th key={column} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewRows.length ? previewRows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {previewColumns.map((column) => (
                    <td key={column} className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {column === 'Photo' && row.Photo ? (
                        <img src={row.Photo} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : row[column] || '-'}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={previewColumns.length || 1} className="px-4 py-10 text-center text-gray-500">
                    {isFetching || isPending ? t('loading') : t('no_data')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Reports;
