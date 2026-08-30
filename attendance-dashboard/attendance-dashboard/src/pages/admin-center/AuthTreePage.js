import React, { useState, useEffect } from 'react';
import { adminCenterApi } from '../../api/adminCenterApi';
import { Shield, Lock, ShieldCheck, Stethoscope, GraduationCap, Copy } from 'lucide-react';

export default function AuthTreePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverNode, setHoverNode] = useState(null);

  useEffect(() => {
    adminCenterApi.getUsers()
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const tiers = {
    tier1: users.filter(u => u.role === 'super_admin'),
    tier2: users.filter(u => u.role === 'admin'),
    tier3: users.filter(u => u.role === 'doctor' || u.role === 'engineer')
  };

  const NodeCard = ({ user, color, icon: Icon }) => {
    const hasCap = user.capabilities && user.capabilities.length > 0;
    
    return (
      <div 
        onMouseEnter={() => setHoverNode(user)}
        onMouseLeave={() => setHoverNode(null)}
        style={{
          position: 'relative', width: 220, padding: 16,
          background: hoverNode?.id === user.id ? '#171f33' : '#131b2e',
          borderRadius: 12, border: `1px solid ${hasCap ? color : 'rgba(255,255,255,0.05)'}`,
          boxShadow: hasCap ? `0 0 20px ${color}20, inset 0 1px 0 rgba(255,255,255,0.1)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          cursor: 'pointer', transition: 'all 0.3s ease',
          display: 'flex', flexDirection: 'column', gap: 12, zIndex: hoverNode?.id === user.id ? 1000 : 2
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color
          }}>
            <Icon size={16} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user.name || user.email}
            </div>
            <div style={{ fontSize: 10, color: color, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
              {user.role} {hasCap && ' (Elevated)'}
            </div>
          </div>
        </div>

        {/* Floating Tooltip via Hover State */}
        {hoverNode?.id === user.id && (
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: 12, background: 'rgba(11, 19, 38, 0.95)', backdropFilter: 'blur(10px)',
            padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 16px 32px rgba(0,0,0,0.5)', zIndex: 100, width: 260
          }}>
            <div style={{ fontSize: 11, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
              Active Constraints & Capabilities
            </div>
            {hasCap ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {user.capabilities.map(c => (
                  <div key={c.capability_name} style={{ fontSize: 12, color: '#adc7ff', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Copy size={12} opacity={0.5} /> {c.capability_name}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#414754' }}>Standard Base Role Active.<br/>No granular overrides detected.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TierRow = ({ title, users, color, icon }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ fontSize: 10, color: color, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800, marginBottom: 24, padding: '4px 12px', borderRadius: 4, background: `${color}10`, border: `1px solid ${color}30` }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
        {users.map(u => <NodeCard key={u.id} user={u} color={color} icon={icon} />)}
        {users.length === 0 && <div style={{ color: '#414754', fontSize: 12, fontStyle: 'italic' }}>No Nodes Provisioned</div>}
      </div>
    </div>
  );

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#fff' }}>Authorization Tree</h1>
        <p style={{ margin: 0, color: '#889bc3', fontSize: 15 }}>Topological abstraction of all active structural and systemic permissions.</p>
      </div>

      <div style={{
        background: '#0b1326', borderRadius: 16, padding: '60px 40px',
        border: '1px solid rgba(255,255,255,0.02)', position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 60, alignItems: 'center', overflowX: 'auto'
      }}>
        {/* Subtle grid background to simulate analyst topology */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0
        }} />

        {loading ? (
          <div style={{ color: '#889bc3', zIndex: 1 }}>Parsing Graph Data...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 60, zIndex: 1, position: 'relative' }}>
            {/* Visual connecting lines between tiers */}
            <div style={{ position: 'absolute', top: 60, bottom: 60, left: '50%', width: 1, background: 'rgba(74, 142, 255, 0.2)', zIndex: 0, transform: 'translateX(-50%)' }} />

            <TierRow title="Tier 1: Global Overseers" users={tiers.tier1} color="#c0c1ff" icon={Lock} />
            <TierRow title="Tier 2: System Administrators" users={tiers.tier2} color="#4fdbc8" icon={ShieldCheck} />
            <TierRow title="Tier 3: Operational Vectors (Doctors/Engineers)" users={tiers.tier3} color="#889bc3" icon={Shield} />
          </div>
        )}
      </div>
    </div>
  );
}
