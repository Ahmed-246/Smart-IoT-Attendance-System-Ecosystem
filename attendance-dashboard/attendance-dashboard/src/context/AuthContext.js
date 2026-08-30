import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]   = useState(() => localStorage.getItem('token') || '');
  const [role,  setRole]    = useState(() => localStorage.getItem('role')  || '');
  const [name,  setName]    = useState(() => localStorage.getItem('name')  || '');
  const [email, setEmail]   = useState(() => localStorage.getItem('email') || '');
  const [userId, setUserId] = useState(() => Number(localStorage.getItem('userId')) || 0);
  const [studentId, setStudentId] = useState(() => Number(localStorage.getItem('studentId')) || 0);
  const [instructorId, setInstructorId] = useState(() => Number(localStorage.getItem('instructorId')) || 0);
  const [doctorId, setDoctorId] = useState(() => Number(localStorage.getItem('doctorId')) || 0);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('profileImage') || '');
  const [assignedDeptIds, setAssignedDeptIds] = useState(() => JSON.parse(localStorage.getItem('assignedDeptIds') || '[]'));
  const [assignedFacIds, setAssignedFacIds] = useState(() => JSON.parse(localStorage.getItem('assignedFacIds') || '[]'));
  const [capabilities, setCapabilities] = useState(() => JSON.parse(localStorage.getItem('capabilities') || '[]'));
  const [systemLogo, setSystemLogo] = useState(() => localStorage.getItem('systemLogo') || '/logo.jpg');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/auth/config');
      if (res.data.system_logo_url) {
        localStorage.setItem('systemLogo', res.data.system_logo_url);
        setSystemLogo(res.data.system_logo_url);
      }
    } catch (err) {
      console.error('Failed to fetch system config:', err);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!token) return;
    try {
      // Use the profile endpoint which now returns the latest capabilities
      const res = await api.get('/admin/me/profile');
      const { user } = res.data;
      if (user.capabilities) {
        localStorage.setItem('capabilities', JSON.stringify(user.capabilities));
        setCapabilities(user.capabilities);
      }
    } catch (err) {
      console.warn('Failed to refresh auth state:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
    if (token) refreshAuth();
  }, [fetchConfig, token, refreshAuth]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, role, name, user_id, student_id, instructor_id, doctor_id, profile_image_url, assigned_department_ids, assigned_faculty_ids, capabilities } = res.data;
    localStorage.setItem('token',     access_token);
    localStorage.setItem('role',      role);
    localStorage.setItem('name',      name || '');
    localStorage.setItem('email',     email);
    localStorage.setItem('userId',    user_id);
    localStorage.setItem('assignedDeptIds', JSON.stringify(assigned_department_ids || []));
    localStorage.setItem('assignedFacIds',  JSON.stringify(assigned_faculty_ids || []));
    localStorage.setItem('capabilities',    JSON.stringify(capabilities || []));
    
    if (student_id) localStorage.setItem('studentId', student_id);
    else localStorage.removeItem('studentId');
    
    if (instructor_id) localStorage.setItem('instructorId', instructor_id);
    else localStorage.removeItem('instructorId');
    
    if (doctor_id) localStorage.setItem('doctorId', doctor_id);
    else localStorage.removeItem('doctorId');
    
    if (profile_image_url) localStorage.setItem('profileImage', profile_image_url);
    else localStorage.removeItem('profileImage');
    
    const expiresAt = Date.now() + (30 * 60 * 1000); // 30 minutes
    localStorage.setItem('sessionExpiresAt', expiresAt.toString());

    setToken(access_token);
    setRole(role);
    setName(name || '');
    setEmail(email);
    setUserId(user_id);
    setStudentId(student_id || 0);
    setInstructorId(instructor_id || 0);
    setDoctorId(doctor_id || 0);
    setProfileImage(profile_image_url || '');
    setAssignedDeptIds(assigned_department_ids || []);
    setAssignedFacIds(assigned_faculty_ids || []);
    setCapabilities(capabilities || []);
    return role;
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Send logout action to the backend to immediately invalidate the session and log it
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Backend logout call failed, clearing local state anyway', err);
    }
    localStorage.clear();
    setToken(''); setRole(''); setName(''); setEmail(''); setUserId(0); setStudentId(0); setInstructorId(0); setDoctorId(0); setProfileImage('');
    setAssignedDeptIds([]); setAssignedFacIds([]); setCapabilities([]);
  }, []);

  // Active Session Monitoring (Watchdog)
  useEffect(() => {
    if (!token) return;

    const checkSession = async () => {
      // 1. Check local expiration
      const expiresAt = Number(localStorage.getItem('sessionExpiresAt'));
      if (expiresAt && Date.now() > expiresAt) {
        console.warn('Session expired locally. Logging out.');
        logout();
        return;
      }
      
      // 2. Proactive server check for multi-device security
      try {
        await api.get('/auth/config');
      } catch (err) {
        // A 401 here means the session was killed by another login. 
        // The global api client interceptor will handle the redirect.
        console.warn('Proactive session check failed. Session may have been invalidated.');
      }
    };

    // Check every 10 seconds to strictly enforce single-session
    const interval = setInterval(checkSession, 10000);
    
    return () => clearInterval(interval);
  }, [token, logout]);

  const updateProfileImage = useCallback((url) => {
    localStorage.setItem('profileImage', url);
    setProfileImage(url);
  }, []);

  const updateSystemLogo = useCallback((url) => {
    localStorage.setItem('systemLogo', url);
    setSystemLogo(url);
  }, []);

  const isAdmin      = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{ 
      token, role, name, email, userId, studentId, instructorId, doctorId, profileImage, 
      assignedDeptIds, assignedFacIds, capabilities, systemLogo,
      updateProfileImage, updateSystemLogo, isAdmin, isSuperAdmin, login, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
