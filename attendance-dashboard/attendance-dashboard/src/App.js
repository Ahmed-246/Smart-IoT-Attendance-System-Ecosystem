import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import AdminCenterLayout from './components/layout/AdminCenterLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import SessionsPage from './pages/SessionsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import DevicesPage from './pages/DevicesPage';
import InstructorsPage from './pages/InstructorsPage';
import InstructorProfilePage from './pages/InstructorProfilePage';
import DoctorsPage from './pages/DoctorsPage';
import DoctorProfilePage from './pages/DoctorProfilePage';
import ChatbotPage from './pages/ChatbotPage';
import AdminsPage from './pages/AdminsPage';
import FacultiesPage from './pages/FacultiesPage';
import FacultyDetailPage from './pages/FacultyDetailPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import StudentAssessmentsPage from './pages/StudentAssessmentsPage';
import AssessmentsPage from './pages/AssessmentsPage';
import AssessmentGradingPage from './pages/AssessmentGradingPage';
import GradebookPage from './pages/GradebookPage';
import AcademicStandingPage from './pages/AcademicStandingPage';
import AcademicArchivePage from './pages/AcademicArchivePage';
import StudentArchiveProfilePage from './pages/StudentArchiveProfilePage';
import UpgradeReportPage from './pages/UpgradeReportPage';
import TransitionWorkspace from './pages/TransitionWorkspace';
import RegistrationRequestsPage from './pages/RegistrationRequestsPage';
import RegistrationHistoryPage from './pages/RegistrationHistoryPage';
import AutoApproveListPage from './pages/AutoApproveListPage';
import AdminProfilePage from './pages/AdminProfilePage';
import MonitoringPage from './pages/MonitoringPage';
import SessionDetailsPage from './pages/SessionDetailsPage';
import TelemetryTracker from './components/TelemetryTracker';
import HelpPage from './pages/HelpPage';
import SystemPreferencesPage from './pages/SystemPreferencesPage';

// Admin Center Pages
import AdminCenterDashboard from './pages/admin-center/Dashboard';
import AuthTreePage from './pages/admin-center/AuthTreePage';
import AdminsUsersPage from './pages/admin-center/AdminsUsersPage';
import AIAssistantPage from './pages/admin-center/AIAssistantPage';
import AdminSettingsPage from './pages/admin-center/AdminSettingsPage';

function PrivateRoute({ children, roles = [], capability = null }) {
  const { token, role, capabilities } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  
  const hasRole = roles.length === 0 || roles.includes(role);
  const hasCap = capability ? (capabilities || []).includes(capability) : false;
  
  if (!hasRole && !hasCap) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TelemetryTracker />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/:id" element={<StudentProfilePage />} />
            <Route path="students/:id/assessments" element={<StudentAssessmentsPage />} />
            <Route path="faculties" element={<PrivateRoute roles={['super_admin', 'admin']}><FacultiesPage /></PrivateRoute>} />
            <Route path="faculties/:id" element={<PrivateRoute roles={['super_admin', 'admin']}><FacultyDetailPage /></PrivateRoute>} />
            <Route path="departments/:id" element={<PrivateRoute roles={['super_admin', 'admin']}><DepartmentDetailPage /></PrivateRoute>} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:id" element={<CourseDetailPage />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="admins" element={<PrivateRoute roles={['super_admin', 'admin']}><AdminsPage /></PrivateRoute>} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="instructors" element={<InstructorsPage />} />
            <Route path="instructors/:id" element={<InstructorProfilePage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="doctors/:id" element={<DoctorProfilePage />} />
            <Route path="chatbot" element={<ChatbotPage />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="assessments/:id/grading" element={<AssessmentGradingPage />} />
            <Route path="gradebook" element={<GradebookPage />} />
            <Route path="academic" element={<AcademicStandingPage />} />
            <Route path="archive" element={<AcademicArchivePage />} />
            <Route path="archive/student/:id" element={<StudentArchiveProfilePage />} />
            <Route path="upgrade-report" element={<UpgradeReportPage />} />
            <Route path="transition" element={<TransitionWorkspace />} />
            <Route path="registration-requests" element={<RegistrationRequestsPage />} />
            <Route path="registration-history" element={<RegistrationHistoryPage />} />
            <Route path="auto-approve-list" element={<AutoApproveListPage />} />
            <Route path="admin-profile" element={<AdminProfilePage />} />
            <Route path="monitoring" element={<PrivateRoute roles={['super_admin']} capability="SYSTEM_LOG_AUDIT"><MonitoringPage /></PrivateRoute>} />
            <Route path="monitoring/session/:id" element={<PrivateRoute roles={['super_admin']} capability="SYSTEM_LOG_AUDIT"><SessionDetailsPage /></PrivateRoute>} />
            <Route path="help" element={<PrivateRoute roles={['super_admin']}><HelpPage /></PrivateRoute>} />
            <Route path="system-preferences" element={<PrivateRoute roles={['super_admin']}><SystemPreferencesPage /></PrivateRoute>} />
          </Route>

          {/* Admin Center layout */}
          <Route path="/admin-center" element={<PrivateRoute roles={['super_admin']}><AdminCenterLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminCenterDashboard />} />
            <Route path="auth-tree" element={<AuthTreePage />} />
            <Route path="users" element={<AdminsUsersPage />} />
            <Route path="assistant" element={<AIAssistantPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
