import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});


// Attach JWT to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Typed API helpers ─────────────────────────────────────────────────────

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
};

export const studentsApi = {
  list: () => api.get('/admin/students'),
  get: (id) => api.get(`/admin/students/${id}`),
  create: (data) => api.post('/admin/students', data),
  update: (id, data) => api.put(`/admin/students/${id}`, data),
  delete: (id) => api.delete(`/admin/students/${id}`),
  profile: (id) => api.get(`/admin/students/${id}/profile`),
  blacklist: (id, reason) => api.post(`/admin/students/${id}/blacklist`, { reason }),
  unblacklist: (id) => api.delete(`/admin/students/${id}/blacklist`),
  grades: (id) => api.get(`/admin/students/${id}/grades`),
};

export const adminApi = {
  listPendingStudents: () => api.get('/admin/students/pending'),
  approveStudent: (id) => api.post(`/admin/students/${id}/approve`, { status: 'APPROVED' }),
  rejectStudent: (id, reason) => api.post(`/admin/students/${id}/reject`, { reason }),
  listRegistrationHistory: (status) => api.get('/admin/students/history', { params: { status } }),
  exportRegistrationHistory: (status) => api.get('/admin/students/history/export', { params: { status }, responseType: 'blob' }),
  clearRegistrationHistory: () => api.post('/admin/registration/clear-rejected'),
  getAutoApproveHistory: () => api.get('/admin/pre-verified/history'),
  markAutoApproveHistorySeen: () => api.post('/admin/pre-verified/history/mark-seen'),
  exportAutoApproveHistory: () => api.get('/admin/pre-verified/history/export', { responseType: 'blob' }),
  clearAutoApproveHistory: () => api.delete('/admin/pre-verified/history/clear'),
  listPreVerified: () => api.get('/admin/pre-verified'),
  addPreVerified: (data) => api.post('/admin/pre-verified', data),
  deletePreVerified: (id) => api.delete(`/admin/pre-verified/${id}`),
  exportPreVerified: () => api.get('/admin/pre-verified/export', { responseType: 'blob' }),
  importPreVerified: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/pre-verified/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const coursesApi = {
  list: () => api.get('/admin/courses'),
  create: (data) => api.post('/admin/courses', data),
  update: (id, data) => api.put(`/admin/courses/${id}`, data),
  delete: (id) => api.delete(`/admin/courses/${id}`),
  detail: (id) => api.get(`/admin/courses/${id}/detail`),
  students: (id) => api.get(`/admin/courses/${id}/students`),
};

export const sessionsApi = {
  active: () => api.get('/sessions/active'),
  all: () => api.get('/sessions/all'),
  create: (data) => api.post('/sessions/', data),
  close: (id) => api.patch(`/sessions/${id}/close`),
  history: (params) => api.get('/sessions/history', { params }),
  exportCSV: () => api.get('/sessions/history/export', { responseType: 'blob' }),
};

export const attendanceApi = {
  byStudent: (id) => api.get(`/attendance/student/${id}`),
  bySession: (id) => api.get(`/attendance/session/${id}`),
  report: (sessionId) => api.get(`/admin/reports/session/${sessionId}`),
  discovery: {
    start: () => api.post('/attendance/discovery/start'),
    check: (token) => api.get('/attendance/discovery/check', { params: { token } }),
  }
};

export const usersApi = {
  list: () => api.get('/admin/users'),
  create: (data) => api.post('/admin/users', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  delete: (id) => api.delete(`/admin/users/${id}`),
  myProfile: () => api.get('/admin/me/profile'),
};

export const devicesApi = {
  list: () => api.get('/admin/devices'),
  create: (data) => api.post('/admin/devices', data),
  update: (id, data) => api.put(`/admin/devices/${id}`, data),
  delete: (id) => api.delete(`/admin/devices/${id}`),
};

export const iotApi = {
  pending: () => api.get('/iot/pending'),
  claim: (id, name, location) => api.post(`/iot/claim/${id}`, null, { params: { name, location } }),
};

export const instructorsApi = {
  create: (data) => api.post('/admin/instructors', data),
  list: () => api.get('/admin/instructors'),
  update: (id, data) => api.put(`/admin/instructors/${id}`, data),
  delete: (id) => api.delete(`/admin/instructors/${id}`),
  profile: (id) => api.get(`/admin/instructors/${id}/profile`),
};

export const doctorsApi = {
  create: (data) => api.post('/admin/doctors', data),
  list: () => api.get('/admin/doctors'),
  update: (id, data) => api.put(`/admin/doctors/${id}`, data),
  delete: (id) => api.delete(`/admin/doctors/${id}`),
  profile: (id) => api.get(`/admin/doctors/${id}/profile`),
};

export const facultiesApi = {
  list: () => api.get('/faculties/'),
  get: (id) => api.get(`/faculties/${id}`),
  create: (data) => api.post('/faculties/', data),
  update: (id, data) => api.put(`/faculties/${id}`, data),
  delete: (id) => api.delete(`/faculties/${id}`),
  curriculum: (id) => api.get(`/faculties/${id}/curriculum`),
};

export const departmentsApi = {
  list: (facultyId) => {
    const params = {};
    if (facultyId) params.faculty_id = facultyId;
    return api.get('/departments/', { params });
  },
  get: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments/', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  curriculum: (id) => api.get(`/departments/${id}/curriculum`),
};

export const enrollmentsApi = {
  create: (data) => api.post('/admin/enrollments', data),
  list: () => api.get('/admin/enrollments'),
  delete: (id) => api.delete(`/admin/enrollments/${id}`),
};

export const gradesApi = {
  create: (data) => api.post('/admin/grades', data),
  delete: (id) => api.delete(`/admin/grades/${id}`),
};

export const aiApi = {
  query: (question, messageCount) => api.post('/ai/query', { question, message_count: messageCount }),
};

export const assessmentsApi = {
  list: () => api.get('/assessments/'),
  get: (id) => api.get(`/assessments/${id}`),
  create: (data) => api.post('/assessments/', data),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  delete: (id) => api.delete(`/assessments/${id}`),
  updateStatus: (id, status) => api.patch(`/assessments/${id}/status`, { status }),
};

export const gradebookApi = {
  get: (id) => api.get(`/gradebook/${id}`),
  commit: (id, payload) => api.patch(`/gradebook/${id}/commit`, payload),
  upload: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/gradebook/upload?assessment_id=${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const academicApi = {
  transcript: (studentId) => api.get(`/academic/students/${studentId}/transcript`),
  processPromotion: (academicYear) => api.post(`/academic/process-promotion`, null, { params: { academic_year: academicYear } }),
  getReadiness: () => api.get(`/academic/readiness`),
  transition: (data) => api.post(`/academic/transition`, data),
  toggleAttendanceException: (enrollmentId) => api.patch(`/academic/enrollments/${enrollmentId}/attendance-exception`),
  facultyReport: (facultyId) => api.get(`/academic/faculties/${facultyId}/report`),
  deptReport: (deptId) => api.get(`/academic/departments/${deptId}/report`),
};

export const gradebookDashboardApi = {
  termInfo: () => api.get('/gradebook-dashboard/term-info'),
  report: (params) => api.get('/gradebook-dashboard/report', { params }),
};

export const archiveApi = {
  records: (params) => api.get('/archive/records', { params }),
  studentTimeline: (id) => api.get(`/archive/student/${id}/timeline`),
};

export const monitoringApi = {
  summary: () => api.get('/monitoring/summary'),
  logs: (params) => api.get('/monitoring/logs', { params }),
  logTelemetry: (events) => api.post('/monitoring/telemetry', { events }),
  sessionDetails: (sessionId) => api.get(`/monitoring/session/${sessionId}`),
  exportCSV: () => api.get('/monitoring/logs/export', { responseType: 'blob' }),
  clearLogs: (password) => api.post('/monitoring/logs/clear', { password }),
};
