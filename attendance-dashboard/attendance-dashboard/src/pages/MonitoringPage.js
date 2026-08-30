import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  Search, 
  User,
  Clock,
  ExternalLink,
  RefreshCw,
  Database,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  School,
  Trash2,
  Download,
  Lock,
  EyeOff,
  FileText,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { monitoringApi } from '../api/client';
import { systemApi } from '../api/systemApi';
import { useAuth } from '../context/AuthContext';
import { StatCard, Badge, Btn, Card } from '../components/ui';

const PRIORITY_COLORS = {
  NORMAL: { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.2)', icon: <Info size={14} />, desc: "Routine syncs, student profile views, and metadata updates." },
  CAUTION: { bg: 'rgba(234, 179, 8, 0.1)', text: 'rgb(234, 179, 8)', border: 'rgba(234, 179, 8, 0.2)', icon: <AlertTriangle size={14} />, desc: "Pending registrations and IoT heartbeat delays." },
  WARNING: { bg: 'rgba(249, 115, 22, 0.1)', text: 'rgb(249, 115, 22)', border: 'rgba(249, 115, 22, 0.2)', icon: <AlertTriangle size={14} />, desc: "Significant user data edits, role promotions, and course deletions." },
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.2)', icon: <ShieldAlert size={14} />, desc: "Failed Security Checks (e.g., bypass attempts) and Global Term Transition resets." },
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  doctor: 'Doctor',
  engineer: 'Engineer',
  student: 'Student'
};

export default function MonitoringPage() {
  const { isSuperAdmin, capabilities } = useAuth();
  const navigate = useNavigate();
  
  // New granular access check
  const hasAuditCapability = capabilities.includes('SYSTEM_LOG_AUDIT');
  const canPurge = isSuperAdmin || capabilities.includes('SYSTEM_DATA_PURGE');
  const canAccess = isSuperAdmin || hasAuditCapability;

  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const limit = 50;

  // Filters
  const [filters, setFilters] = useState({
    role: '',
    priority: '',
    search: '',
    start_date: '',
    end_date: ''
  });

  // Clear Logs Cache state
  const [clearModal, setClearModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [clearError, setClearError] = useState('');
  const [fetchError, setFetchError] = useState(null);

  const [logRetention, setLogRetention] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [sumRes, logRes] = await Promise.all([
        monitoringApi.summary(),
        monitoringApi.logs({ ...filters, limit, offset })
      ]);
      setSummary(sumRes.data);
      setLogs(logRes.data.logs);
      setTotal(logRes.data.total);
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      const errMsg = err.response?.data?.detail 
        || "Backend connection failed. Please ensure the backend server is running and accessible.";
      setFetchError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    if (canAccess) {
      fetchData();
      systemApi.getConfig().then(res => {
        if(res.data) setLogRetention(res.data.log_retention_days);
      }).catch(console.error);
    }
  }, [fetchData, canAccess]);

  const handleUpdateRetention = async (days) => {
    try {
      await systemApi.updateConfig({ log_retention_days: parseInt(days) });
      setLogRetention(parseInt(days));
    } catch (err) {
      alert("Failed to update log retention policy");
    }
  };

  // Live auto-refresh every 30 seconds
  useEffect(() => {
    if (!canAccess) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, canAccess]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setOffset(0); // Reset to first page on filter change
  };

  const resetFilters = () => {
    setFilters({
      role: '',
      priority: '',
      search: '',
      start_date: '',
      end_date: ''
    });
    setOffset(0);
  };

  const formatDate = (ts) => {
    if (!ts) return "---";
    const date = new Date(ts);
    return date.toLocaleDateString('en-EG', { 
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (ts) => {
    if (!ts) return "---";
    const date = new Date(ts);
    return date.toLocaleString('en-EG', { 
      timeZone: 'Africa/Cairo',
      hour12: true,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const res = await monitoringApi.exportCSV();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const cairoTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const filename = `Logs_Cache_${cairoTime.toISOString().slice(0,10)}_${cairoTime.toISOString().slice(11,19).replace(/:/g, '-')}.csv`;
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!clearPassword) {
      setClearError('Password is required.');
      return;
    }
    setClearLoading(true);
    setClearError('');
    try {
      const res = await monitoringApi.clearLogs(clearPassword);
      setClearModal(false);
      setClearPassword('');
      fetchData(); // Refresh
    } catch (err) {
      setClearError(err.response?.data?.detail || 'Failed to clear logs. Check your password.');
    } finally {
      setClearLoading(false);
    }
  };

  if (!canAccess) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--red)" style={{ marginBottom: 16 }} />
        <h2>Access Restricted</h2>
        <p>This module is only accessible to Tier 1 Super Admins or authorized System Auditors.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity color="var(--accent)" />
            System Monitoring Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Real-time administrative audit logs and security telemetry.</p>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
            padding: '4px 12px', borderRadius: 6, background: 'rgba(198, 168, 245, 0.1)',
            border: '1px solid rgba(198, 168, 245, 0.2)', color: 'var(--accent)',
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <Shield size={12} /> {isSuperAdmin ? 'Tier 1 — Exclusive Administrative Capability' : 'Tier 2 — System Audit Capability'}
          </div>
        </div>

        {logRetention > 0 && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: 12, margin: '0 24px',
            background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '10px 20px', borderRadius: 14, animation: 'fadeIn 0.5s ease-out'
          }}>
            <Clock size={20} color="#38bdf8" />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: 2 }}>
                Time Until Next Purge
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>
                {logRetention} Days Left
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {canPurge && (
            <>
              <select
                value={logRetention}
                onChange={(e) => handleUpdateRetention(e.target.value)}
                style={{
                  padding: '9px 12px', borderRadius: 12, border: '1px solid var(--border)',
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', cursor: 'pointer', fontWeight: 600,
                  height: 40
                }}
              >
                <option value={7}>Auto-Clear: 7 Days</option>
                <option value={30}>Auto-Clear: 30 Days (Default)</option>
                <option value={90}>Auto-Clear: 3 Months</option>
                <option value={365}>Auto-Clear: 1 Year</option>
                <option value={0}>Auto-Clear: Forever</option>
              </select>
              <button 
                onClick={() => { setClearError(''); setClearPassword(''); setClearModal(true); }}
                style={{
                  padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  transition: 'all 0.2s', fontWeight: 600, fontSize: 14, height: 40
                }}
                className="hover-lift"
              >
                <Trash2 size={16} />
                Clear Logs Cache
              </button>
            </>
          )}
          <button 
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              transition: 'all 0.2s', fontWeight: 600, fontSize: 14, height: 40
            }}
            className="hover-lift"
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────── */}
      {fetchError && (
        <div style={{
          padding: '16px 20px', borderRadius: 12, marginBottom: 32,
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex', alignItems: 'flex-start', gap: 12, animation: 'fadeIn 0.3s ease-out'
        }}>
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', margin: '0 0 6px 0' }}>Data Loading Failed</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {fetchError} Try checking your terminal if the backend was stopped, and automatically or manually restart it.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary Stats ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <StatCard 
          label="Total Activity Logs" 
          value={summary?.total_logs || 0} 
          icon={<Database size={24} />} 
          sub="Stored in database"
          color="#3b82f6"
        />
        <StatCard 
          label="Critical Alerts (24h)" 
          value={summary?.critical_24h || 0} 
          icon={<ShieldAlert size={24} />} 
          sub="Requires immediate review"
          color="#ef4444"
          highlight={summary?.critical_24h > 0}
        />
        <StatCard 
          label="Security Warnings (24h)" 
          value={summary?.warnings_24h || 0} 
          icon={<AlertTriangle size={24} />} 
          sub="Caution/Warning events"
          color="#f59e0b"
          highlight={summary?.warnings_24h > 0}
        />
        <StatCard 
          label="Active Sessions" 
          value={summary?.active_sessions || 0} 
          icon={<Clock size={24} />} 
          sub="Last 15 minutes"
          color="#10b981"
        />
      </div>

      {/* ── Main Logs Table (Full Width) ────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)',
        marginBottom: 32
      }}>
        {/* Table Filters */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
            <input 
              type="text" 
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by user, email, or description..."
              style={{
                width: '100%', padding: '10px 12px 10px 40px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: 13
              }}
            />
          </div>

          <button
            onClick={resetFilters}
            title="Reset Filters"
            style={{
              padding: '10px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0
            }}
            className="hover-highlight"
          >
            <RotateCcw size={16} />
          </button>

          <div style={{ width: 170 }}>
            <input 
              type="datetime-local" 
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
              title="Start Date & Time"
              style={{
                width: '100%', padding: '9px 10px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box'
              }}
            />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <div style={{ width: 170 }}>
            <input 
              type="datetime-local" 
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
              title="End Date & Time"
              style={{
                width: '100%', padding: '9px 10px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box'
              }}
            />
          </div>
          
          <select 
            name="role" 
            value={filters.role}
            onChange={handleFilterChange}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, minWidth: 140
            }}
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admins</option>
            <option value="admin">Admins</option>
            <option value="doctor">Doctors</option>
            <option value="engineer">Engineers</option>
            <option value="student">Students</option>
          </select>

          <select 
            name="priority" 
            value={filters.priority}
            onChange={handleFilterChange}
            style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, minWidth: 140
            }}
          >
            <option value="">All Priorities</option>
            <option value="NORMAL">Normal</option>
            <option value="CAUTION">Caution</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          
          <div style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
            {total} Total Records
          </div>
        </div>

        {/* Table Content - Fixed height for ~7 rows with vertical scrolling */}
        <div style={{ 
          height: 520, 
          overflowY: 'auto', 
          position: 'relative',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--accent) transparent'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)' }}>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ ...thStyle, width: '120px' }}>DATE</th>
                <th style={{ ...thStyle, width: '130px' }}>TIMESTAMP</th>
                <th style={{ ...thStyle, width: '220px' }}>USER</th>
                <th style={{ ...thStyle, width: '120px' }}>ACTION</th>
                <th style={thStyle}>DESCRIPTION</th>
                <th style={{ ...thStyle, width: '140px', textAlign: 'center' }}>TOTAL ACTIONS</th>
                <th style={{ ...thStyle, width: '140px' }}>PRIORITY</th>
                <th style={{ ...thStyle, width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <React.Fragment key={log.id}>
                  <tr 
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: expandedLogId === log.id ? 'rgba(198, 168, 245, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'),
                      cursor: 'pointer'
                    }} 
                    className="hover-highlight"
                  >
                    <td style={tdStyle}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} color="var(--accent)" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{formatTime(log.timestamp)}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: 'rgba(255,255,255,0.05)', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--border)', overflow: 'hidden'
                        }}>
                          {log.user_avatar ? (
                            <img src={log.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={14} color="var(--text-muted)" />
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.user_name || 'System'}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ROLE_LABELS[log.user_role]}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 4, 
                        background: `${PRIORITY_COLORS[log.priority].bg}33`, 
                        color: PRIORITY_COLORS[log.priority].text, 
                        border: `1px solid ${PRIORITY_COLORS[log.priority].bg}66`,
                        textTransform: 'uppercase'
                      }}>
                        {log.action_type}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.description}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.target_model} {log.target_id ? `#${log.target_id}` : ''}</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {log.action_type === 'LOGIN' && log.session_id ? (
                        <div
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/monitoring/session/${log.session_id}`); 
                          }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: log.session_status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: log.session_status === 'ACTIVE' ? '#10b981' : '#eab308',
                            border: log.session_status === 'ACTIVE' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800,
                            cursor: 'pointer', transition: 'all 0.2s',
                          }}
                          title={log.session_status === 'ACTIVE' ? "Session is active." : "Session expired or logged out."}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {log.telemetry_count}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <PriorityBadge level={log.priority} />
                    </td>
                    <td style={tdStyle}>
                      <button 
                        style={{ 
                          background: 'transparent', border: 'none', 
                          color: expandedLogId === log.id ? 'var(--accent)' : 'var(--text-muted)', 
                          cursor: 'pointer', transition: 'all 0.2s' 
                        }}
                      >
                        {expandedLogId === log.id ? <ChevronUp size={16} /> : <ExternalLink size={16} />}
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Detail View (Diff Visualization) */}
                  {expandedLogId === log.id && (
                    <tr>
                      <td colSpan="8" style={{ padding: '0 20px 20px 20px', background: 'rgba(198, 168, 245, 0.03)' }}>
                        <div style={{ 
                          padding: 20, background: 'rgba(0,0,0,0.2)', borderRadius: 12, 
                          border: '1px solid rgba(198, 168, 245, 0.1)', animation: 'slideDown 0.3s ease-out'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Database size={14} color="var(--accent)" />
                              Audit Trail Details
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {log.id}</span>
                              <div style={{ 
                                padding: '4px 10px', borderRadius: 20, background: 'rgba(34, 197, 94, 0.1)', 
                                color: 'rgb(34, 197, 94)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
                              }}>
                                <CheckCircle2 size={12} /> ACTION_SUCCESS
                              </div>
                            </div>
                          </div>

                          {log.details_json?.diff ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                              {Object.entries(log.details_json.diff).map(([key, value]) => (
                                <div key={key} style={{ 
                                  display: 'grid', gridTemplateColumns: '150px 1fr 1fr', gap: 16, alignItems: 'center',
                                  padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)'
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'capitalize' }}>
                                    {key.replace(/_/g, ' ')}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', padding: '4px 8px', borderRadius: 4, textDecoration: 'line-through' }}>
                                    {String(value.old || 'None')}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--green)', background: 'rgba(34, 197, 94, 0.05)', padding: '4px 8px', borderRadius: 4 }}>
                                    {String(value.new || 'None')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                              {log.action_type === 'DELETE' ? 'Object was permanently removed from system records.' : 'No granular state changes recorded for this action.'}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {(logs.length === 0 && !loading) && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No logs found matching filters.
            </div>
          )}
        </div>

        {/* Removed Pagination Arrows based on user request - Using vertical scroll instead */}
      </div>

      {/* ── Sub Sections Grid (Legend & Recent Alerts) ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 450px', gap: 24, marginBottom: 40 }}>
        
        {/* Priority Legend */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)',
          padding: 24, boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} color="var(--accent)" />
            Priority Status Guide
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {Object.entries(PRIORITY_COLORS).map(([level, config]) => (
              <LegendItem 
                key={level}
                level={level} 
                title={`${level.charAt(0) + level.slice(1).toLowerCase()} Alerts`}
                desc={config.desc}
              />
            ))}
          </div>
        </div>

        {/* Recent Critical Alerts */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)',
          padding: 20, boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={18} color="var(--red)" />
            Recent High Priority
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {summary?.recent_alerts?.map(alert => (
              <div key={alert.id} style={{
                padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.2)',
                borderLeft: `3px solid ${PRIORITY_COLORS[alert.priority].text}`
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{alert.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ROLE_LABELS[alert.user_role]}</span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {(!summary?.recent_alerts || summary.recent_alerts.length === 0) && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 20 }}>
                No high priority alerts.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Clear Logs Cache Modal ────────────────────────────── */}
      {clearModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => setClearModal(false)}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 20,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            width: 520, maxWidth: '90vw', overflow: 'hidden',
            animation: 'slideDown 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '24px 28px 20px', borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'rgba(239, 68, 68, 0.04)'
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#ef4444' }}>Clear Logs Cache</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Destructive action — requires Super Admin verification</p>
              </div>
            </div>

            {/* Warning */}
            <div style={{ padding: '20px 28px' }}>
              <div style={{
                padding: '16px 20px', borderRadius: 14,
                background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>Warning: Irreversible Action</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                      This will <strong>permanently delete</strong> all {total} activity logs and all session telemetry data. 
                      This cannot be undone. If you want to keep a backup of the logs, please export them as CSV first.
                    </p>
                  </div>
                </div>
              </div>

              {/* Export CSV Section */}
              <div style={{
                padding: '14px 18px', borderRadius: 12,
                background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} color="#22c55e" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Export Backup (Recommended)</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Download all logs as a sorted CSV file</div>
                  </div>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={exportLoading}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s'
                  }}
                >
                  <Download size={14} />
                  {exportLoading ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Lock size={12} /> Super Admin Password
                </label>
                <div style={{ position: 'relative', marginTop: 8 }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={clearPassword}
                    onChange={e => { setClearPassword(e.target.value); setClearError(''); }}
                    placeholder="Enter your Super Admin password to confirm..."
                    style={{
                      width: '100%', padding: '12px 44px 12px 16px', borderRadius: 12,
                      border: clearError ? '1px solid #ef4444' : '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-primary)',
                      fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleClearLogs()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', padding: 4
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {clearError && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={14} /> {clearError}
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Logs do <strong>not</strong> auto-clear. They persist indefinitely until manually purged. Regular exports are recommended for compliance.</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              padding: '16px 28px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                onClick={() => setClearModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10,
                  border: '1px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >Cancel</button>
              <button
                onClick={handleClearLogs}
                disabled={clearLoading || !clearPassword}
                style={{
                  padding: '10px 24px', borderRadius: 10,
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  background: clearPassword ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)',
                  color: clearPassword ? '#ef4444' : 'rgba(239, 68, 68, 0.4)',
                  fontSize: 14, fontWeight: 700, cursor: clearPassword ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                }}
              >
                <Trash2 size={16} />
                {clearLoading ? 'Clearing...' : 'Clear All Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ level, title, desc }) {
  const config = PRIORITY_COLORS[level];
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      style={{ display: 'flex', gap: 12, position: 'relative' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{ 
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: config.bg, color: config.text, border: `1px solid ${config.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: showTooltip ? `0 0 10px ${config.bg}` : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {config.icon}
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc.split('.')[0]}.</div>
      </div>

      {/* Glassmorphism Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 15,
          width: 240, padding: '14px 18px', borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
          color: 'var(--text-primary)', zIndex: 100,
          animation: 'tooltipIn 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: config.text, fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>
            {config.icon} {level} PRIORITY
          </div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)' }}>{desc}</p>
          <div style={{
            position: 'absolute', top: '100%', left: 20, width: 0, height: 0,
            borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
            borderTop: '8px solid rgba(255, 255, 255, 0.03)'
          }} />
        </div>
      )}
    </div>
  );
}


function PriorityBadge({ level }) {
  const config = PRIORITY_COLORS[level] || PRIORITY_COLORS.NORMAL;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20, 
      background: config.bg, color: config.text, border: `1px solid ${config.border}`,
      fontSize: 11, fontWeight: 700, textTransform: 'capitalize'
    }}>
      {config.icon}
      {level.toLowerCase()}
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em'
};

const tdStyle = {
  padding: '16px 20px', verticalAlign: 'middle'
};

const pageBtnStyle = {
  width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg-surface)', color: 'var(--text-primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  transition: 'all 0.2s'
};
