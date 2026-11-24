// src/api/axios.js
import axios from 'axios';
import toast from 'react-hot-toast';
import { getCsrfToken, setCsrfToken } from './csrfToken';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 45000, // 45 seconds for cold start and uploads
});

const isFormData = (data) => typeof FormData !== 'undefined' && data instanceof FormData;

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    if (isFormData(config.data) && config.headers) {
      delete config.headers['Content-Type'];
    }
    const csrfToken = getCsrfToken();
    if (csrfToken && config.headers) {
      config.headers['x-csrf-token'] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const refreshCsrfToken = async () => {
  const { data } = await axiosInstance.get('/auth/csrf', {
    _csrfBootstrap: true,
    _skipErrorToast: true,
  });
  setCsrfToken(data?.csrfToken || '');
  return data?.csrfToken || '';
};

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const method = String(config.method || '').toUpperCase();
    const url = String(config.url || '');

    if (
      status === 403 &&
      !config._csrfBootstrap &&
      !config._csrfRetried &&
      !url.startsWith('/auth/csrf') &&
      !['GET', 'HEAD', 'OPTIONS'].includes(method)
    ) {
      config._csrfRetried = true;
      let csrfRefreshed;
      try {
        await refreshCsrfToken();
        csrfRefreshed = true;
      } catch {
        csrfRefreshed = false;
      }
      if (csrfRefreshed) {
        config.headers = config.headers || {};
        config.headers['x-csrf-token'] = getCsrfToken();
        return await axiosInstance(config);
      }
    }

    const data = error.response?.data;
    const message = data?.message || data?.errors?.[0]?.message || 'Something went wrong';

    // Don't show toast for 404 errors in search.
    if (!config._skipErrorToast && status !== 401 && status !== 404 && data?.code !== 'POSSIBLE_DUPLICATE') {
      toast.error(message);
    }

    if (status === 401 && !url.startsWith('/auth/')) {
      setCsrfToken('');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    refreshCsrfToken().catch(() => undefined);
  });
}

export default axiosInstance;