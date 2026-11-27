import axios from './axios';

export const fetchReport = async (path, params = {}) => {
  const { data } = await axios.get(path, { params: { ...params, format: 'json' } });
  return data;
};

export const fetchReportExcel = async (path, params = {}, fileName) => {
  const response = await axios.get(path, {
    params: { ...params, format: 'excel' },
    responseType: 'blob',
  });
  const disposition = response.headers?.['content-disposition'] || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const serverName = encoded ? decodeURIComponent(encoded) : quoted;
  return { blob: response.data, fileName: fileName || serverName || 'report.xlsx' };
};

export const getFamilyReport = (params) => fetchReport('/reports/family', params);
export const getAllFamiliesReport = (params) => fetchReport('/reports/all-families', params);
export const getMemberReport = (params) => fetchReport('/reports/members', params);
export const getGenerationReport = (params) => fetchReport('/reports/generation', params);
export const getDonationReport = (params) => fetchReport('/reports/donation', params);
export const getDemographicReport = (params) => fetchReport('/reports/demographic', params);
export const getGenealogyReport = (params) => fetchReport('/reports/genealogy', params);
export const getQRReport = (params) => fetchReport('/reports/qr', params);
export const getAllMembersForExport = (params) => fetchReport('/reports/members', params);
export const getFamilyTreeReport = (params) => fetchReport('/reports/export/family-tree', params);
