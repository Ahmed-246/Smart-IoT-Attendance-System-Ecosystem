import React, { useState, useEffect } from 'react';
import { 
  Globe, Terminal, ChevronRight, CheckCircle2, ChevronDown
} from 'lucide-react';
import { Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { systemApi } from '../api/systemApi';

export default function SystemPreferencesPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [config, setConfig] = useState({
    academic_year_start: 2025,
    academic_year_end: 2026,
    current_semester: 2
  });
  const [metrics, setMetrics] = useState({ ram_percent: 0, ram_used_gb: 0, ram_total_gb: 0, cpu_percent: 0 });
  const [downloading, setDownloading] = useState(false);
  const [backupExpanded, setBackupExpanded] = useState(false);
  
  const { isSuperAdmin } = useAuth();
  
  useEffect(() => {
    // Initial fetch
    systemApi.getConfig().then(res => {
      if (res.data) {
        setConfig(res.data);
        setMaintenance(res.data.is_locked);
      }
    }).catch(console.error);

    // Metrics polling
    const fetchMetrics = () => {
      systemApi.getMetrics().then(res => setMetrics(res.data)).catch(console.error);
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const handleUpdateConfig = async (key, value) => {
    try {
      const res = await systemApi.updateConfig({ [key]: value });
      setConfig(res.data);
    } catch (err) {
      alert(`Failed to update ${key}`);
    }
  };

  const handleMaintenanceToggle = async () => {
    try {
      const res = await systemApi.toggleLockdown();
      setMaintenance(res.data.is_locked);
    } catch (err) {
      alert("Failed to toggle lockdown");
    }
  };

  const handleDownloadBackup = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await systemApi.downloadBackup();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Sovereign_Database_Backup.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setTimeout(() => setBackupExpanded(false), 1000);
    } catch (error) {
      console.error(error);
      alert("Failed to generate backup");
    } finally {
      setDownloading(false);
    }
  };

  const selectStyle = {
    background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', 
    padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
  };

  const inputStyle = {
    background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', 
    padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '80px', fontFamily: 'inherit'
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>System Preferences</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>Global configuration and environment orchestration.</p>
        </div>
        {isSuperAdmin && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: maintenance ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            padding: '12px 20px', borderRadius: 16, border: `1px solid ${maintenance ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: maintenance ? '#ef4444' : '#10b981', textTransform: 'uppercase' }}>
                {maintenance ? 'Maintenance Level' : 'System Status'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{maintenance ? 'Emergency Lockdown' : 'Operational'}</div>
            </div>
            <button 
              onClick={handleMaintenanceToggle}
              title="Toggle System State"
              style={{ 
                width: 48, height: 26, borderRadius: 13, background: maintenance ? '#ef4444' : 'rgba(255,255,255,0.1)',
                position: 'relative', border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                display: 'flex', alignItems: 'center'
              }}
            >
              <div style={{ 
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3, left: maintenance ? 25 : 3, transition: 'all 0.3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32 }}>
        
        {/* Left Column: Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Startup Configuration */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '32px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ padding: 10, borderRadius: 10, background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                  <Globe size={22} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>System Startup Configuration</h2>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                Configure the fundamental timeline boundaries for the current deployment. This impacts archiving and active attendance tracking.
              </p>
            </div>
            
            <div style={{ padding: '8px 0' }}>
              <div style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Academic Calendar
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" value={config.academic_year_start} onChange={e => handleUpdateConfig('academic_year_start', parseInt(e.target.value))} style={inputStyle} title="Start Year" />
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                  <input type="number" value={config.academic_year_end} onChange={e => handleUpdateConfig('academic_year_end', parseInt(e.target.value))} style={inputStyle} title="End Year" />
                  <select value={config.current_semester} onChange={e => handleUpdateConfig('current_semester', parseInt(e.target.value))} style={selectStyle}>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                    <option value={3}>Summer Term</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
          
          <div style={{ padding: '0 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <CheckCircle2 size={16} color="#10b981" style={{ marginTop: 2 }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              The system is highly optimized. Redundant theming and legacy locale settings have been removed to ensure maximum performance and strict enterprise compliance.
            </p>
          </div>
        </div>

        {/* Right Column: Mini Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <Card style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', border: '1px solid rgba(74, 142, 255, 0.2)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={18} color="#4a8eff" /> System Engine Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#adc7ff' }}>Backend Core</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>STABLE (v2.0.0)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#adc7ff' }}>Database Cluster</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: metrics.db_connected ? '#10b981' : '#ef4444' }}>
                  {metrics.db_connected ? 'OPTIMIZED (LIVE)' : 'DISCONNECTED'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#adc7ff' }}>IoT Gateway</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>READY</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#adc7ff' }}>Process Sentinel (PM2)</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: metrics.pm2?.status === 'ACTIVE' ? '#10b981' : '#f59e0b' }}>
                  {metrics.pm2?.status === 'ACTIVE' 
                    ? `ACTIVE (${metrics.pm2.restarts} Emergency Restarts)` 
                    : 'NOT INITIALIZED'}
                </span>
              </div>
              <div style={{ 
                marginTop: 8, padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ fontSize: 11, color: '#889bc3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Memory Footprint (RAM)</span>
                  <span style={{ color: metrics.cpu_percent > 80 ? '#ef4444' : '#10b981' }}>CPU: {metrics.cpu_percent}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                   <div style={{ 
                     width: `${metrics.ram_percent}%`, height: '100%', 
                     background: metrics.ram_percent > 85 ? '#ef4444' : '#4a8eff',
                     transition: 'all 0.5s ease-in-out'
                   }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span>RAM Used: {metrics.ram_used_gb} GB</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>App Usage: {metrics.app_ram_mb || 0} MB</span>
                  </div>
                  <span>Total: {metrics.ram_total_gb} GB</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Advanced Operations</h3>
            
            <div style={{ 
              borderRadius: 12, background: 'rgba(74, 142, 255, 0.05)',
              border: '1px solid rgba(74, 142, 255, 0.1)', overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <button 
                onClick={() => setBackupExpanded(!backupExpanded)}
                style={{ 
                  width: '100%', padding: '16px', color: '#adc7ff', fontSize: 13, fontWeight: 700,
                  textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                Trigger Database Backup
                <div style={{ transition: 'transform 0.3s', transform: backupExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <ChevronDown size={16} />
                </div>
              </button>
              
              <div style={{ 
                height: backupExpanded ? 180 : 0, opacity: backupExpanded ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: backupExpanded ? '0 16px 16px 16px' : '0 16px'
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  This operation will instantly aggregate the active PostgreSQL cluster data into an in-memory ZIP package.
                  <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
                    <li>Both <strong>JSON</strong> and <strong>CSV</strong> formats provided.</li>
                    <li>Includes entire Academic History & Attendance.</li>
                    <li>Includes System Audits & Telemetry Logs.</li>
                  </ul>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  disabled={downloading}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 8,
                    background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
                    opacity: downloading ? 0.7 : 1, cursor: downloading ? 'wait' : 'pointer'
                  }}
                >
                  {downloading ? 'Extracting Data...' : 'Generate & Download ZIP'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
