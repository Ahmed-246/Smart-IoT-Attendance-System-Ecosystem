import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import ImageCropModal from '../ImageCropModal';
import LogoManagementModal from '../LogoManagementModal';
import api from '../../api/client';
import {
  LayoutDashboard,
  School,
  Radio,
  Users,
  BookOpen,
  BarChart3,
  Cpu,
  Shield,
  GraduationCap,
  Stethoscope,
  Bot,
  ClipboardList,
  FileSpreadsheet,
  Award,
  Archive,
  LogOut,
  ChevronRight,
  UserPlus,
  History,
  ShieldCheck,
  Activity,
  Settings,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard,  label: 'Dashboard', roles: ['super_admin', 'admin', 'doctor', 'engineer', 'student'] },
  { to: '/admin-profile',icon: Shield,          label: 'My Profile', roles: ['super_admin', 'admin'] },
  { to: '/my-profile',  icon: Users,            label: 'My Profile', roles: ['student'] },
  { to: '/doctor-profile', icon: Stethoscope,   label: 'My Profile', roles: ['doctor'] },
  { to: '/engineer-profile', icon: GraduationCap, label: 'My Profile', roles: ['engineer'] },
  { to: '/faculties',   icon: School,           label: 'Faculties', roles: ['super_admin', 'admin'] },
  { to: '/sessions',    icon: Radio,            label: 'Sessions', roles: ['super_admin', 'admin', 'doctor', 'engineer'] },
  { to: '/students',    icon: Users,            label: 'Students', roles: ['super_admin', 'admin', 'doctor', 'engineer'] },
  { to: '/courses',     icon: BookOpen,         label: 'Courses', roles: ['super_admin', 'admin', 'doctor', 'engineer'] },
  { to: '/reports',     icon: BarChart3,        label: 'Reports', roles: ['super_admin', 'admin', 'doctor', 'engineer'] },
  { to: '/devices',     icon: Cpu,              label: 'Devices', roles: ['super_admin', 'admin'] },
  { to: '/users',       icon: Shield,           label: 'Users', roles: ['super_admin', 'admin'] },
  { to: '/admins',      icon: ShieldCheck,      label: 'Admins', roles: ['super_admin', 'admin'] },
  { to: '/instructors', icon: GraduationCap,    label: 'Engineers', roles: ['super_admin', 'admin'] },
  { to: '/doctors',     icon: Stethoscope,      label: 'Doctors', roles: ['super_admin', 'admin'] },
  { to: '/chatbot',     icon: Bot,              label: 'AI Chat', roles: ['super_admin', 'admin', 'doctor', 'engineer', 'student'] },
  { to: '/assessments', icon: ClipboardList,    label: 'Assessments', roles: ['super_admin', 'admin', 'doctor', 'engineer'] },
  { to: '/gradebook',   icon: FileSpreadsheet,  label: 'Grade Book', roles: ['super_admin', 'admin'] },
  { to: '/archive',     icon: Archive,          label: 'Academic Archive', roles: ['super_admin', 'admin'] },
  { to: '/academic',    icon: Award,            label: 'Academic Standing', roles: ['super_admin', 'admin'] },
  { to: '/monitoring',  icon: Activity,         label: 'System Monitoring', roles: ['super_admin'], capability: 'SYSTEM_LOG_AUDIT' },
  { to: '/admin-center', icon: ShieldCheck,     label: 'Admins Center', roles: ['super_admin'] },
];

const PREFERENCES_NAV = [
  { to: '/system-preferences', icon: Settings, label: 'System Preferences', roles: ['super_admin'] },
  { to: '/help', icon: HelpCircle, label: 'Help Center', roles: ['super_admin'] },
];

export default function Layout() {
  const { email, role, userId, studentId, instructorId, doctorId, profileImage, systemLogo, updateProfileImage, isSuperAdmin, logout, capabilities } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const [cropFile, setCropFile] = useState(null);
  const [showLogoAdmin, setShowLogoAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  function handleLogout() { logout(); navigate('/login'); }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  }

  async function handleCropConfirm(croppedFile) {
    setCropFile(null);
    const formData = new FormData();
    formData.append('file', croppedFile);
    try {
      const res = await api.post('/auth/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateProfileImage(res.data.profile_image_url);
    } catch (err) {
      console.error('Failed to upload profile image:', err);
    }
  }

  return (
    <div className="app-layout" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── Mobile Overlay ────────────────────────────────────── */}
      <div 
        className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{
        width: 'var(--sidebar-w)', flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div 
              onClick={() => isSuperAdmin && setShowLogoAdmin(true)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)',
                cursor: isSuperAdmin ? 'pointer' : 'default',
                transition: 'transform 0.2s',
              }}
              className={isSuperAdmin ? 'hover-scale' : ''}
              title={isSuperAdmin ? "Manage System Logo" : ""}
            >
               <img 
                src={systemLogo.startsWith('http') ? systemLogo : `${systemLogo}`} 
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.src = '/logo.jpg'; }}
              />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Attendance</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>Smart System</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.filter(item => {
            const hasRole = item.roles.includes(role);
            const hasCap = item.capability ? (capabilities || []).includes(item.capability) : false;
            return hasRole || hasCap;
          }).map(({ to, icon: Icon, label }) => {
            let actualTo = to;
            if (to === '/my-profile') {
              actualTo = `/students/${studentId || userId}`;
            } else if (to === '/doctor-profile') {
              actualTo = `/doctors/${doctorId || userId}`;
            } else if (to === '/engineer-profile') {
              actualTo = `/instructors/${instructorId || userId}`;
            }
            
            return (
              <NavLink
                key={to}
                to={actualTo}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={18} className="nav-icon" />
                <span>{label}</span>
              </NavLink>
            );
          })}
          
          {isAdmin && (
            <>
              <div style={{ padding: '24px 10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Onboarding
              </div>
              <NavLink to="/registration-requests" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <UserPlus size={18} className="nav-icon" />
                <span>Requests</span>
              </NavLink>
              <NavLink to="/registration-history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <History size={18} className="nav-icon" />
                <span>History</span>
              </NavLink>
              <NavLink to="/auto-approve-list" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <ShieldCheck size={18} className="nav-icon" />
                <span>Auto-Approve</span>
              </NavLink>
            </>
          )}

          {(() => {
            const filteredPrefNav = PREFERENCES_NAV.filter(item => item.roles.includes(role));
            if (filteredPrefNav.length === 0) return null;
            return (
              <>
                <div style={{ padding: '24px 10px 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Governance
                </div>
                {filteredPrefNav.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <Icon size={18} className="nav-icon" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </>
            );
          })()}
        </nav>

        {/* User section */}
        <div style={{
          padding: '16px 16px 20px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.15)',
        }}>
      {/* Image Crop Modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Hidden file input for crop modal */}
      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--bg-surface)', border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                position: 'relative', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              title="Click to change profile picture"
            >
              {profileImage ? (
                <img src={`${profileImage}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  {email ? email.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>
            <div style={{ padding: '0 4px', overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                marginBottom: 2,
              }}>{email}</div>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.08em', fontWeight: 700,
              }}>
                {role === 'super_admin' ? (
                  <span className="role-badge-gold">Super Admin</span>
                ) : (
                  <span style={{ color: 'var(--accent)', textTransform: 'uppercase' }}>{role}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px 0', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'var(--red-dim)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <img 
              src={systemLogo.startsWith('http') ? systemLogo : `${systemLogo}`} 
              alt="Logo"
              style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
              onError={(e) => { e.target.src = '/logo.jpg'; }}
            />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Attendance</div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ color: 'var(--text-primary)' }}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className="main-content-wrap" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <Outlet />
        </div>
      </main>

      {showLogoAdmin && <LogoManagementModal onClose={() => setShowLogoAdmin(false)} />}
    </div>
  );
}
