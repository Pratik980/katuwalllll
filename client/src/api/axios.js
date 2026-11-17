// src/api/axios.js
import axios from 'axios';
import toast from 'react-hot-toast';
import { getCsrfToken } from './csrfToken';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds for large file uploads
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    if (!['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken) config.headers.set('X-CSRF-Token', csrfToken);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    
    // Don't show toast for 404 errors in search
    if (error.response?.status !== 404 && error.response?.status !== 401) {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;