// src/api/admin.js
import axios from './axios';

export const getAdminUsers = async () => {
  const { data } = await axios.get('/admin/users');
  return data.data || [];
};

export const getAdminStaff = async (params = {}) => {
  const { data } = await axios.get('/admin/staff', { params });
  return data;
};

export const createStaffUser = async (payload) => {
  const { data } = await axios.post('/admin/staff', payload);
  return data;
};

export const updateManagedUser = async (id, payload) => {
  const { data } = await axios.patch(`/admin/users/${id}`, payload);
  return data;
};

export const updateManagedUserPhoto = async (id, payload) => {
  const { data } = await axios.patch(`/admin/users/${id}/photo`, payload);
  return data;
};

export const resetManagedUserPassword = async (id, password) => {
  const { data } = await axios.post(`/admin/users/${id}/reset-password`, { password });
  return data;
};

export const deleteManagedUser = async (id) => {
  const { data } = await axios.delete(`/admin/users/${id}`);
  return data;
};

export const getAdminProfile = async () => {
  const { data } = await axios.get('/admin/profile');
  return data;
};

export const updateAdminProfile = async (profile) => {
  const { data } = await axios.put('/admin/profile', profile);
  return data;
};

export const changePassword = async (passwordData) => {
  const { data } = await axios.put('/admin/change-password', passwordData);
  return data;
};

export const updateTwoFactor = async (twoFactorData) => {
  const { data } = await axios.put('/admin/two-factor', twoFactorData);
  return data;
};