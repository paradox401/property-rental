import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8001/api/admin',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const clearAdminSession = () => {
  localStorage.removeItem('adminToken');
};

export default API;
