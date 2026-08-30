import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Network, 
  ShieldAlert, 
  Users, 
  Bot, 
  Settings, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';

const ADMIN_NAV = [
  { to: '/admin-center/dashboard', icon: ShieldCheck, label: 'Control Overview' },
  { to: '/admin-center/auth-tree', icon: Network, label: 'Authorization Tree' },
  { to: '/admin-center/users', icon: Users, label: 'Admins Directory' },
  { to: '/admin-center/assistant', icon: Bot, label: 'Aegis Assistant (AI)' },
  { to: '/admin-center/settings', icon: Settings, label: 'Admins Preferences' },
];

export default function AdminCenterLayout() {
  const { isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!isSuperAdmin) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0b1326', color: '#adc7ff', fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{ textAlign: 'center', background: '#131b2e', padding: 40, borderRadius: 16 }}>
          <Lock size={48} color="#ffb4ab" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#ffb4ab', fontWeight: 800 }}>Tier 1 Authorization Required</h2>
          <p style={{ marginTop: 8, color: '#dae2fd', opacity: 0.7 }}>Aegis Protocol Violation. Access Denied.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              marginTop: 24, padding: '12px 24px', background: 'linear-gradient(135deg, #adc7ff, #4a8eff)',
              color: '#0b1326', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
            }}
          >
            Return to Standard Network
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', height: '100vh', overflow: 'hidden', 
      background: '#0b1326', color: '#dae2fd', fontFamily: "'Inter', sans-serif"
    }}>
      
      {/* ── Sovereign Left Sidebar ───────────────────────────────────── */}
      <aside style={{
        width: 280, flexShrink: 0,
        background: '#131b2e',
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
        zIndex: 10
      }}>
        {/* Header / Logo */}
        <div style={{
          padding: '32px 24px 24px',
          background: 'linear-gradient(to bottom, #171f33, #131b2e)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #adc7ff, #4a8eff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(74, 142, 255, 0.2)'
            }}>
              <ShieldAlert size={20} color="#0b1326" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Admins Center</div>
              <div style={{ fontSize: 11, color: '#adc7ff', letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>Aegis Protocol Active</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#414754', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, paddingLeft: 12, marginBottom: 8 }}>Tier 1 Operations</div>
          
          {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px', borderRadius: 8,
                color: isActive ? '#adc7ff' : '#889bc3',
                background: isActive ? '#171f33' : 'transparent',
                textDecoration: 'none', fontWeight: isActive ? 700 : 500,
                fontSize: 14, transition: 'all 0.2s ease',
                position: 'relative'
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, background: '#4a8eff', borderRadius: '0 4px 4px 0' }} />}
                  <Icon size={18} opacity={isActive ? 1 : 0.6} strokeWidth={isActive ? 2.5 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* University Center Button */}
        <div style={{ padding: '20px 16px', background: '#0f172a' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%', padding: '14px', borderRadius: 8,
              background: '#222a3d', color: '#c0c1ff',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#2d3449'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#222a3d'; }}
          >
            <Building2 size={16} />
            Back to University Center
          </button>
        </div>
      </aside>

      {/* ── Main Work Area ───────────────────────────────────── */}
      <main style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', 
        background: '#0b1326', position: 'relative', overflow: 'hidden' 
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(74,142,255,0.05) 0%, rgba(11,19,38,0) 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
