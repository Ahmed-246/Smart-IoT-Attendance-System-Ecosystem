import axios from 'axios';

const API_URL = '/api/system';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const systemApi = {
  getConfig: () => axios.get(`${API_URL}/config`, getAuthHeaders()),
  
  getMetrics: () => axios.get(`${API_URL}/metrics`, getAuthHeaders()),
  
  updateConfig: (updates) => axios.patch(`${API_URL}/config`, updates, getAuthHeaders()),
  
  toggleLockdown: () => axios.post(`${API_URL}/lockdown`, {}, getAuthHeaders()),
  
  clearCache: () => axios.post(`${API_URL}/cache/clear`, {}, getAuthHeaders()),
  
  purgeAuditLogs: () => axios.delete(`${API_URL}/audit/purge`, getAuthHeaders()),
  
  downloadBackup: () => {
    // Return the response as a blob so we can trigger a file download in the browser
    return axios.get(`${API_URL}/backup`, {
      ...getAuthHeaders(),
      responseType: 'blob'
    });
  }
};
