import React, { useState, useEffect } from 'react';
import { adminCenterApi } from '../../api/adminCenterApi';
import { Shield, Key, Plus, Trash2, X, AlertTriangle, Clock, Info, CheckCircle2 } from 'lucide-react';

export default function AdminsUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null); // for granting
  const [revokeTarget, setRevokeTarget] = useState(null); // { userId, capabilityName, userName }
  const [capName, setCapName] = useState('');
  const [duration, setDuration] = useState('forever');
  
  const AVAIL_CAPABILITIES = [
    { 
      name: "SYSTEM_LOG_AUDIT", 
      label: "System Log Audit", 
      desc: "Read-only oversight of the Monitoring Hub and telemetry.", 
      icon: "📊",
      features: ["View-only access to Monitoring Hub", "Observe real-time session telemetry", "Export audit logs to CSV", "Inspect database change diffs"]
    },
    { 
      name: "SYSTEM_DATA_PURGE", 
      label: "System Data Purge", 
      desc: "High-privilege permission to permanently delete system logs and registration history.", 
      icon: "🔥",
      features: ["Clear system activity logs cache", "Wipe rejected student registration logs", "Perform bulk data pruning actions", "Requires additional security verification"]
    }
  ];

  const NATIVE_CAPS = {
    super_admin: ["SYSTEM_LOG_AUDIT", "SYSTEM_DATA_PURGE"],
    admin: [],
    doctor: []
  };

  const DURATIONS = [
    { value: '2h', label: '2 Hours', delta: 2 * 60 * 60 * 1000 },
    { value: '1d', label: '1 Day', delta: 24 * 60 * 60 * 1000 },
    { value: '3d', label: '3 Days', delta: 3 * 24 * 60 * 60 * 1000 },
    { value: '2w', label: '2 Weeks', delta: 14 * 24 * 60 * 60 * 1000 },
    { value: '3m', label: '3 Months', delta: 90 * 24 * 60 * 60 * 1000 },
    { value: 'forever', label: 'Forever', delta: null }
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminCenterApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!capName) return;
    
    let expiresAt = null;
    const durObj = DURATIONS.find(d => d.value === duration);
    if (durObj && durObj.delta) {
      expiresAt = new Date(Date.now() + durObj.delta).toISOString();
    }

    try {
      await adminCenterApi.assignCapability(activeUser.id, { 
        capability_name: capName,
        expires_at: expiresAt
      });
      setActiveUser(null);
      setCapName('');
      setDuration('forever');
      fetchUsers();
    } catch (err) {
      console.error("Failed to grant", err);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    try {
      await adminCenterApi.revokeCapability(revokeTarget.userId, revokeTarget.capabilityName);
      setRevokeTarget(null);
      fetchUsers();
    } catch (err) {
      console.error("Failed to revoke", err);
    }
  };
  const getTimeLeft = (expiresAt) => {
    if (!expiresAt) return 'Forever';
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = exp - now;
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months}m left`;
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  // Theming Helpers
  const RoleBadge = ({ role }) => {
    const rMap = {
      super_admin: { label: 'T1 SUPER', bg: 'linear-gradient(135deg, #c0c1ff 0%, #889bc3 100%)', txt: '#0b1326' },
      admin: { label: 'T2 ADMIN', bg: 'linear-gradient(135deg, #4fdbc8 0%, #3ba698 100%)', txt: '#0b1326' },
      doctor: { label: 'T3 DOCTOR', bg: 'linear-gradient(135deg, #889bc3 0%, #5b6a8a 100%)', txt: '#ffffff' },
      engineer: { label: 'T4 ENGINEER', bg: 'linear-gradient(135deg, #414754 0%, #2a2f3a 100%)', txt: '#dae2fd' }
    };
    const map = rMap[role] || rMap.engineer;
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 8,
        background: map.bg, color: map.txt, fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.08em', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {map.label}
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', position: 'relative', paddingBottom: 100 }}>
      <div style={{ marginBottom: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.03em', color: '#fff', background: 'linear-gradient(to right, #fff, #889bc3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admins Directory</h1>
          <p style={{ margin: 0, color: '#889bc3', fontSize: 16, fontWeight: 500 }}>Global Governance: Orchestrating modular access tiers across the executive layer.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
           <div style={{ background: 'rgba(74, 142, 255, 0.1)', border: '1px solid rgba(74, 142, 255, 0.2)', padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} color="#adc7ff" />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#adc7ff' }}>Super Admin Protocol Active</div>
           </div>
        </div>
      </div>

      <div style={{
        background: '#131b2e', borderRadius: 24, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.03)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
              <th style={{ padding: '24px 32px', fontSize: 12, fontWeight: 800, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Administrative Entity</th>
              <th style={{ padding: '24px 32px', fontSize: 12, fontWeight: 800, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Base Tier</th>
              <th style={{ padding: '24px 32px', fontSize: 12, fontWeight: 800, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Elevated Capabilities</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: 60, textAlign: 'center', color: '#889bc3' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div className="spinner" />
                  <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.1em' }}>SYNCHRONIZING DIRECTORY...</span>
                </div>
              </td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} style={{ 
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                transition: 'all 0.3s ease',
              }} className="row-hover">
                <td style={{ padding: '20px 32px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{u.name || 'Anonymous User'}</div>
                  <div style={{ fontSize: 13, color: '#414754', fontWeight: 500 }}>{u.email} <span style={{ opacity: 0.5 }}>•</span> ID:{u.id}</div>
                </td>
                <td style={{ padding: '20px 32px' }}>
                  <RoleBadge role={u.role} />
                </td>
                <td style={{ padding: '20px 32px' }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {u.capabilities.map(c => {
                      const timeLeft = getTimeLeft(c.expires_at);
                      return (
                        <div key={c.capability_name} 
                          className="cap-badge"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'rgba(74, 142, 255, 0.05)', padding: '6px 14px',
                            borderRadius: 10, border: '1px solid rgba(74, 142, 255, 0.15)',
                            color: '#adc7ff', fontSize: 12, fontWeight: 700,
                            transition: 'all 0.2s',
                            position: 'relative',
                            boxShadow: '0 2px 10px rgba(74, 142, 255, 0.05)'
                          }}
                        >
                          <Key size={14} style={{ color: '#4a8eff' }} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{c.capability_name}</span>
                            <span style={{ fontSize: 9, opacity: 0.6, color: timeLeft === 'Forever' ? '#10b981' : '#f59e0b' }}>
                              {timeLeft}
                            </span>
                          </div>
                          <button 
                            onClick={() => setRevokeTarget({ userId: u.id, capabilityName: c.capability_name, userName: u.name })}
                            style={{ background: 'none', border: 'none', padding: 0, marginLeft: 6, cursor: 'pointer', color: '#ffb4ab', opacity: 0.5, display: 'flex' }}
                          ><X size={14}/></button>
                        </div>
                      );
                    })}
                    <button 
                      onClick={() => setActiveUser(u)}
                      style={{
                        padding: '6px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px dashed #414754',
                        color: '#889bc3', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#adc7ff'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#414754'; e.currentTarget.style.color = '#889bc3'; }}
                    >
                      <Plus size={14} /> Grant Override
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══ GRANT MODAL ═══ */}
      {activeUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 10, 18, 0.95)', backdropFilter: 'blur(12px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{
            background: '#131b2e', borderRadius: 24, width: 480,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)', overflow: 'hidden',
            animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{ padding: '32px', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={24} color="#4a8eff" /> Capability Deployment
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#889bc3' }}>Elevating {activeUser.name || activeUser.email}</p>
              </div>
              <button 
                onClick={() => {setActiveUser(null); setCapName('');}}
                style={{ background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#414754' }}
              ><X size={20} /></button>
            </div>
            
            <form onSubmit={handleGrant} style={{ padding: '32px' }}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#889bc3', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Select Privilege Signature</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {AVAIL_CAPABILITIES.filter(c => {
                    const isNative = (NATIVE_CAPS[activeUser.role] || []).includes(c.name);
                    const isGranted = activeUser.capabilities.some(uc => uc.capability_name === c.name);
                    return !isNative && !isGranted;
                  }).map(c => (
                    <div 
                      key={c.name}
                      onClick={() => setCapName(c.name)}
                      style={{
                        padding: '12px', borderRadius: 12, cursor: 'pointer',
                        background: capName === c.name ? 'rgba(74, 142, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${capName === c.name ? 'rgba(74, 142, 255, 0.3)' : 'rgba(255,255,255,0.03)'}`,
                        transition: 'all 0.2s',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{c.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: capName === c.name ? '#fff' : '#dae2fd', lineHeight: 1.2 }}>{c.label}</span>
                        </div>
                        {capName === c.name && <CheckCircle2 size={14} color="#4a8eff" />}
                      </div>
                      <div style={{ fontSize: 10, color: '#889bc3', lineHeight: 1.3, opacity: 0.8 }}>{c.desc}</div>
                      
                      {capName === c.name && (
                        <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(74, 142, 255, 0.1)' }}>
                          <div style={{ fontSize: 9, fontWeight: 800, color: '#4a8eff', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Properties:</div>
                          {c.features.map((f, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#adc7ff', marginBottom: 3 }}>
                              <CheckCircle2 size={10} color="#10b981" />
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {AVAIL_CAPABILITIES.filter(c => !activeUser.capabilities.some(uc => uc.capability_name === c.name)).length === 0 && (
                    <div style={{ gridColumn: 'span 2', padding: 20, textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 12, border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                      <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Protocol Maxed</div>
                      <div style={{ fontSize: 11, color: '#889bc3' }}>All modular overrides are active.</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#889bc3', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Temporal Duration</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDuration(d.value)}
                      style={{
                        padding: '12px 10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        background: duration === d.value ? '#4a8eff' : 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        color: duration === d.value ? '#0b1326' : '#889bc3',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                      }}
                    >
                      <Clock size={14} opacity={0.6} />
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255,180,171,0.05)', padding: '16px', borderRadius: 16, border: '1px solid rgba(255,180,171,0.1)', display: 'flex', gap: 14, marginBottom: 32 }}>
                <AlertTriangle size={20} color="#ffb4ab" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#ffb4ab', lineHeight: 1.5 }}>
                  <strong>Security Protocol:</strong> This action will be logged in the immutable audit chain. 
                  {duration !== 'forever' ? ` Access will automatically terminate after ${DURATIONS.find(d => d.value === duration).label}.` : ' This access is semi-permanent and requires manual revocation.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  type="button" 
                  onClick={() => {setActiveUser(null); setCapName('');}}
                  style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#dae2fd', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}
                >Cancel</button>
                <button 
                  type="submit" 
                  disabled={!capName}
                  style={{ 
                    flex: 2, padding: '14px', background: 'linear-gradient(135deg, #adc7ff, #4a8eff)', border: 'none', color: '#0b1326', 
                    borderRadius: 14, fontWeight: 800, cursor: 'pointer', opacity: capName ? 1 : 0.5,
                    boxShadow: '0 8px 24px rgba(74, 142, 255, 0.3)'
                  }}
                >Authorize Deployment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ REVOKE CONFIRMATION MODAL ═══ */}
      {revokeTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(7, 10, 18, 0.95)', backdropFilter: 'blur(12px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s'
        }}>
          <div style={{
            background: '#131b2e', borderRadius: 24, width: 400,
            border: '1px solid rgba(255,180,171,0.1)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.6)', overflow: 'hidden',
            padding: '32px', textAlign: 'center'
          }}>
            <div style={{ 
              width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,180,171,0.1)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
            }}>
              <Trash2 size={32} color="#ffb4ab" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 12px 0' }}>Revoke Access?</h3>
            <p style={{ fontSize: 14, color: '#889bc3', lineHeight: 1.6, margin: '0 0 32px 0' }}>
              You are about to strip <strong style={{ color: '#fff' }}>{revokeTarget.capabilityName}</strong> from <strong style={{ color: '#fff' }}>{revokeTarget.userName}</strong>. This will take effect immediately.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => setRevokeTarget(null)}
                style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#dae2fd', borderRadius: 14, fontWeight: 700, cursor: 'pointer' }}
              >Keep Access</button>
              <button 
                onClick={handleRevokeConfirm}
                style={{ flex: 1, padding: '14px', background: '#ffb4ab', border: 'none', color: '#561e18', borderRadius: 14, fontWeight: 800, cursor: 'pointer' }}
              >Confirm Revoke</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .row-hover:hover { background: rgba(74, 142, 255, 0.04) !important; transform: scale(1.002); }
        .cap-badge { z-index: 1; }
        .cap-badge:hover { 
          background: rgba(74, 142, 255, 0.15) !important; 
          border-color: rgba(74, 142, 255, 0.4) !important;
          z-index: 10;
        }
        .spinner {
          width: 24px; height: 24px; border: 3px solid rgba(74, 142, 255, 0.1);
          border-top-color: #4a8eff; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
