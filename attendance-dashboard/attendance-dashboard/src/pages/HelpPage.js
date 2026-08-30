import React from 'react';
import { 
  Key, Shield, BarChart3, Lock, Edit3, UserCheck, 
  AlertOctagon, ExternalLink, HelpCircle, CheckCircle2,
  Info, Zap, Eye, Database
} from 'lucide-react';
import { Card } from '../components/ui';

export default function HelpPage() {
  const CAPABILITIES = [
    {
      name: "SYSTEM_LOG_AUDIT",
      label: "System Log Audit",
      icon: BarChart3,
      color: "#10b981",
      difficulty: "Intermediate",
      description: "Enables read-only oversight of system activities, session telemetry, and security logs.",
      grants: [
        "View-only access to the System Monitoring Hub",
        "Observe real-time session telemetry",
        "Export administrative audit logs to CSV",
        "Inspect database change logs and entity diffs"
      ],
      safety: "CAUTION: This capability exposes sensitive administrative event logs. Use responsibly for system auditing and troubleshooting.",
      simulation: {
        view: "Audit Dashboard",
        stats: ["Total Logs", "Active Sessions", "System Health"]
      }
    },
    {
      name: "SYSTEM_DATA_PURGE",
      label: "System Data Purge",
      icon: Database,
      color: "#ef4444",
      difficulty: "Advanced",
      description: "Grants destructive authority to permanently prune system records and registration history.",
      grants: [
        "Wipe rejected student registration history",
        "Clear system activity logs and telemetry cache",
        "Perform bulk data maintenance operations",
        "Access to security-protected 'Clear' buttons"
      ],
      safety: "CRITICAL: Actions taken with this capability are IRREVERSIBLE. Data loss cannot be recovered. Strictly reserved for senior governance roles.",
      simulation: {
        view: "Data Maintenance",
        stats: ["Purge Count", "Cleared Cache", "Registry Pruning"]
      }
    }
  ];

  return (
    <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <HelpCircle size={32} color="var(--accent)" /> Sovereign Help Center
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
          Deep-dive documentation for Target Capabilities and Governance Protocols.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: 24 }}>
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <Card key={cap.name} style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: `1px solid ${cap.color}20`,
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Decorative side accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: cap.color }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: `${cap.color}15`, color: cap.color }}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{cap.label}</h2>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cap.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tier: {cap.difficulty} Signature
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
                  {cap.name}
                </div>
              </div>

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                {cap.description}
              </p>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                   Functionality Unlocked:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {cap.grants.map((g, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      {g}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)',
                display: 'flex', gap: 12
              }}>
                <AlertOctagon size={20} color={cap.name === 'SECURITY_OVERRIDE' ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fff', display: 'block', marginBottom: 4 }}>Security Advisory:</strong>
                  {cap.safety}
                </div>
              </div>

              {cap.simulation && (
                <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>
                    <Eye size={14} /> Capability Simulation
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {cap.simulation.stats.map((s, i) => (
                      <div key={i} style={{ flex: 1, padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Unlocks</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Governance Section */}
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '64px 0 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={28} color="#4a8eff" />
        Administrative Governance
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
        <Card style={{ padding: 24, background: 'rgba(74, 142, 255, 0.05)', border: '1px solid rgba(74, 142, 255, 0.1)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 12 }}>IoT Security Protocol Guide</h3>
          <p style={{ color: '#889bc3', fontSize: 14, lineHeight: 1.6 }}>
            By default, <strong>Admin</strong> roles possess native CRUD access to IoT devices to ensure operational continuity. For catastrophic events, the <strong>Emergency Lockdown</strong> is restricted to Super Admin preference control:
          </p>
          <ul style={{ color: '#889bc3', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Manual force-closure of active scanning sessions.</li>
            <li>System-wide lockdown of administrative mutations.</li>
            <li>Remote hard-reset of IoT scanning nodes via terminal.</li>
          </ul>
          <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, fontSize: 12, color: '#ef4444' }}>
            <strong>Security Notice:</strong> Emergency lockdown protocols are strictly reserved for Super Admin authorization.
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 60, padding: 40, borderRadius: 24, background: 'var(--bg-surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
        <Zap size={48} color="var(--accent)" style={{ margin: '0 auto 20px', opacity: 0.5 }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Governance Protocol #204</h2>
        <p style={{ maxWidth: 600, margin: '0 auto 20px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          "Access is a privilege, not a right. Granular elevation should be requested via the AI recommendation engine and authorized only for target operational windows."
        </p>
        <button 
          onClick={() => window.location.href = '/admin-center'}
          style={{ 
            padding: '12px 24px', borderRadius: 12, background: 'transparent', 
            border: '1px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' 
          }}
        >
          Explore Sovereign Architecture
        </button>
      </div>
    </div>
  );
}
