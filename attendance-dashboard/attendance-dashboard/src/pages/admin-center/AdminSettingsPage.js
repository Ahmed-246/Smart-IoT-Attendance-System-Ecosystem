import React from 'react';
import { Settings, Shield, AlertTriangle } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: 800 }}>
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #adc7ff, #4a8eff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(74, 142, 255, 0.2)'
        }}>
          <Settings size={24} color="#0b1326" />
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em', color: '#fff' }}>Admins Preferences</h1>
          <p style={{ margin: 0, color: '#889bc3', fontSize: 15 }}>Manage global Tier structures and base capability templates.</p>
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 180, 171, 0.1)', border: '1px solid rgba(255, 180, 171, 0.3)',
        padding: 24, borderRadius: 12, display: 'flex', gap: 16, alignItems: 'flex-start',
        marginBottom: 32
      }}>
        <AlertTriangle size={24} color="#ffb4ab" style={{ flexShrink: 0 }} />
        <div>
          <h3 style={{ margin: '0 0 8px 0', color: '#ffb4ab', fontSize: 16, fontWeight: 700 }}>Global Template Lockdown Active</h3>
          <p style={{ margin: 0, color: '#dae2fd', fontSize: 14, lineHeight: 1.5 }}>
            Core Base Roles (Tiers 1-4) are currently hardcoded into the architectural baseline for compliance reasons. To modify base role attributes, an environment variable override is required. You may only assign Granular Capabilities dynamically via the Admins Directory.
          </p>
        </div>
      </div>

      <div style={{
        background: '#131b2e', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.02)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={20} color="#adc7ff" />
          <h2 style={{ fontSize: 16, color: '#fff', margin: 0, fontWeight: 700 }}>Active Architectural Tiers</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { tag: 'T1', name: 'Super Admin', color: '#c0c1ff', desc: 'Absolute authority. Capable of dropping databases, provisioning T2s, and bypassing all physical restrictions.' },
            { tag: 'T2', name: 'System Admin', color: '#4fdbc8', desc: 'Management oversight. Capable of onboarding students, altering session states, and generating reports.' },
            { tag: 'T3', name: 'Doctor', color: '#889bc3', desc: 'Operational faculty. Capable of initiating scheduled sessions, assigning grades, and verifying attendance.' },
            { tag: 'T4', name: 'Engineer', color: '#414754', desc: 'Assistive faculty. Capable of viewing sessions and aiding in attendance verification, but cannot commit final grades.' },
          ].map((tier, i) => (
            <div key={tier.tag} style={{ 
              padding: '24px 32px', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.02)' : 'none',
              display: 'flex', gap: 24, alignItems: 'flex-start'
            }}>
              <div style={{
                background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}30`,
                padding: '6px 12px', borderRadius: 8, fontWeight: 800, fontSize: 14, letterSpacing: '0.05em'
              }}>
                {tier.tag}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#dae2fd', fontSize: 16, fontWeight: 700 }}>{tier.name}</h3>
                <p style={{ margin: 0, color: '#889bc3', fontSize: 14, lineHeight: 1.5 }}>{tier.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
