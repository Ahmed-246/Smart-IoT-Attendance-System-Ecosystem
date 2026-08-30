import client from './client';

export const adminCenterApi = {
  getUsers: () => client.get('/admin-center/users'),
  assignCapability: (userId, capability) => client.post(`/admin-center/users/${userId}/capabilities`, capability),
  revokeCapability: (userId, capabilityName) => client.delete(`/admin-center/users/${userId}/capabilities/${capabilityName}`),
  recommendRole: (taskDescription) => client.post('/admin-center/assistant/recommend', { task_description: taskDescription }),
  getActiveUsers: () => client.get('/monitoring/active-users')
};
