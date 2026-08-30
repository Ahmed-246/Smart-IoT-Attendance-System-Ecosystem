import React, { useState, useEffect } from 'react';
import { adminCenterApi } from '../../api/adminCenterApi';
import { ShieldCheck, Users, Stethoscope, HardHat, ChevronRight, Activity, Clock } from 'lucide-react';

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admins', icon: ShieldCheck, color: '#4a8eff' },
  admin: { label: 'Admins', icon: Users, color: '#10b981' },
  doctor: { label: 'Doctors', icon: Stethoscope, color: '#f59e0b' },
  engineer: { label: 'Engineers', icon: HardHat, color: '#8b5cf6' }
};

export default function AdminCenterDashboard() {
  const [activeUsers, setActiveUsers] = useState({
    super_admin: [],
    admin: [],
    doctor: [],
    engineer: []
  });
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState(null);

  const fetchActiveSessions = () => {
    adminCenterApi.getActiveUsers()
      .then(res => {
        setActiveUsers(res.data);
        setLoading(false);
      })
      .catch(err => console.error('Failed to fetch active users:', err));
  };

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const RoleRecord = ({ role, users }) => {
    const config = ROLE_CONFIG[role];
    const isExpanded = expandedRole === role;
    const isActive = users.length > 0;

    return (
      <div style={{
        background: '#131b2e',
        borderRadius: 16,
        marginBottom: 16,
        border: `1px solid ${isActive ? 'rgba(74, 142, 255, 0.2)' : 'rgba(255, 255, 255, 0.02)'}`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isActive ? '0 8px 32px rgba(0, 0, 0, 0.2)' : 'none'
      }}>
        {/* Header */}
        <div 
          onClick={() => setExpandedRole(isExpanded ? null : role)}
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            gap: 16,
            background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
          }}
        >
          <div style={{ 
            width: 48, height: 48, borderRadius: 12, 
            background: `${config.color}15`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <config.icon size={24} color={config.color} />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
              {config.label}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ 
                width: 6, height: 6, borderRadius: '50%', 
                background: isActive ? '#10b981' : '#4b5563',
                boxShadow: isActive ? '0 0 8px #10b981' : 'none'
              }} />
              <span style={{ fontSize: 12, color: '#889bc3', fontWeight: 600 }}>
                {users.length} Active {users.length === 1 ? 'Account' : 'Accounts'}
              </span>
            </div>
          </div>

          <ChevronRight 
            size={20} 
            color="#889bc3" 
            style={{ 
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }} 
          />
        </div>

        {/* Expanded Content */}
        <div style={{
          maxHeight: isExpanded ? 500 : 0,
          opacity: isExpanded ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          borderTop: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none'
        }}>
          <div style={{ padding: '8px 24px 24px 24px' }}>
            {users.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                No active sessions for this role.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                {users.map(user => (
                  <div key={user.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.02)'
                  }}>
                    <div style={{ 
                      width: 36, height: 36, borderRadius: 18, 
                      background: 'linear-gradient(135deg, #4a8eff 0%, #3b82f6 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      overflow: 'hidden'
                    }}>
                      {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{user.name}</div>
                      <div style={{ fontSize: 11, color: '#889bc3' }}>{user.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                        <Activity size={10} /> ONLINE
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', color: '#889bc3', fontSize: 10, marginTop: 2 }}>
                        <Clock size={10} /> {new Date(user.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: 800 }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>Sovereign Overview</h1>
        <p style={{ margin: 0, color: '#889bc3', fontSize: 15 }}>Real-time synchronization of active administrative sessions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <RoleRecord role="super_admin" users={activeUsers.super_admin} />
        <RoleRecord role="admin" users={activeUsers.admin} />
        <RoleRecord role="doctor" users={activeUsers.doctor} />
        <RoleRecord role="engineer" users={activeUsers.engineer} />
      </div>

      <div style={{ 
        marginTop: 32,
        padding: 24, borderRadius: 16, background: 'rgba(74, 142, 255, 0.05)',
        border: '1px solid rgba(74, 142, 255, 0.1)',
        display: 'flex', alignItems: 'center', gap: 16
      }}>
        <div style={{ 
          width: 8, height: 8, borderRadius: 4, background: '#10b981',
          boxShadow: '0 0 12px #10b981',
          animation: 'pulse 2s infinite'
        }} />
        <span style={{ fontSize: 13, color: '#adc7ff', fontWeight: 500 }}>
          System is actively monitoring all protocol entry points. Session activity is refreshed every 30 seconds.
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

