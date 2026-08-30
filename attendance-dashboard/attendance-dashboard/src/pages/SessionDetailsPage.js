import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { monitoringApi } from '../api/client';
import { PageLoader, Btn, Card } from '../components/ui';
import { Activity, ChevronLeft, User, LogIn, LogOut, Clock, Link as LinkIcon, Eye, Filter, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SessionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    async function load() {
      if (!isSuperAdmin) return;
      try {
        const res = await monitoringApi.sessionDetails(id);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isSuperAdmin]);

  // Countdown Timer Logic
  useEffect(() => {
    if (!data || !data.login || data.logout) return;

    const expiryTime = new Date(new Date(data.login.timestamp).getTime() + 30 * 60000);
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = expiryTime - now;
      if (diff <= 0) {
        setTimeLeft(0);
        clearInterval(timer);
      } else {
        setTimeLeft(diff);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data]);

  if (!isSuperAdmin) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Access Restricted to Administrators.</div>;
  }

  if (loading) return <PageLoader />;

  if (!data || !data.login) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        No session details found. <br/><br/>
        <Btn onClick={() => navigate('/monitoring')}>Back to Hub</Btn>
      </div>
    );
  }

  const { user_info, login, logout, telemetry } = data;

  const expiryTimestamp = new Date(new Date(login.timestamp).getTime() + 30 * 60000);
  const now = new Date();
  const isExpired = !logout && now > expiryTimestamp;
  const isActive = !logout && !isExpired;

  const formatTime = (ts) => {
    if (!ts) return "--:--:--";
    return new Date(ts).toLocaleTimeString('en-EG', { 
      timeZone: 'Africa/Cairo',
      hour: 'numeric', 
      minute: 'numeric', 
      second: 'numeric', 
      hour12: true 
    });
  };

  const formatCountdown = (ms) => {
    if (ms === null || ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'NAVIGATE': return <LinkIcon size={14} color="#3b82f6" />;
      case 'VIEW': return <Eye size={14} color="#8b5cf6" />;
      case 'FILTER': return <Filter size={14} color="#f59e0b" />;
      default: return <Activity size={14} color="var(--text-muted)" />;
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: 60, maxWidth: 900, margin: '0 auto' }}>
      
      {/* Back Button */}
      <div style={{ marginBottom: 20 }}>
        <Btn variant="ghost" onClick={() => navigate('/monitoring')} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={18} /> Back to Monitoring Hub
        </Btn>
      </div>

      {/* Header Card */}
      <Card style={{
        background: 'linear-gradient(135deg, #12101f 0%, #1a1530 100%)',
        border: '1px solid var(--border)',
        padding: '30px',
        marginBottom: 30,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ 
              width: 70, height: 70, borderRadius: 16, 
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {user_info.avatar ? <img src={user_info.avatar} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User size={30} color="#c084fc" />}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>{user_info.name || 'System User'}</h1>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>{user_info.email}</div>
              <div style={{ 
                marginTop: 10, display: 'inline-flex', padding: '4px 10px', borderRadius: 6,
                background: 'rgba(255,255,255,0.1)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                ROLE: {user_info.role}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Session Status</div>
            {isActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                  Live / Token Active
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  Expires in: {formatCountdown(timeLeft)}
                </div>
              </div>
            ) : logout ? (
              <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                Logged Out
              </span>
            ) : (
              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
                Token Expired (30m)
              </span>
            )}
          </div>
        </div>
      </Card>

      <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Clock size={20} color="var(--accent)" /> Session Audit Timeline
      </h2>

      {/* Vertical Timeline */}
      <div style={{ position: 'relative', paddingLeft: 30 }}>
        {/* Timeline Line */}
        <div style={{ position: 'absolute', left: 14, top: 20, bottom: 20, width: 2, background: 'var(--border)', zIndex: 0 }} />

        {/* Start Point */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 24, display: 'flex', gap: 20 }}>
          <div style={{ 
            width: 30, height: 30, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', 
            border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: -15, flexShrink: 0
          }}>
            <LogIn size={14} color="#10b981" />
          </div>
          <Card style={{ flex: 1, padding: 16, background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#10b981', fontSize: 14 }}>Session Initiated (Login)</strong>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{formatTime(login.timestamp)}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{login.description}</div>
          </Card>
        </div>

        {/* Telemetry Nodes */}
        {telemetry.map((t, i) => (
          <div key={t.id} style={{ position: 'relative', zIndex: 1, marginBottom: 16, display: 'flex', gap: 20 }}>
            <div style={{ 
              width: 14, height: 14, borderRadius: '50%', background: 'var(--bg-surface)', 
              border: '2px solid var(--border)', marginLeft: -7, marginTop: 10, flexShrink: 0
            }} />
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getActionIcon(t.action_type)}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{t.action_type}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{formatTime(t.timestamp)}</span>
              </div>
              <div style={{ fontSize: 13, color: '#fff' }}>{t.description}</div>
              {t.path && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Path: {t.path}</div>}
            </div>
          </div>
        ))}

        {/* No telemetry message */}
        {telemetry.length === 0 && (
          <div style={{ padding: '20px 0', paddingLeft: 40, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
            No additional actions recorded during this session.
          </div>
        )}

        {/* End Point */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 24, display: 'flex', gap: 20 }}>
          <div style={{ 
            width: 30, height: 30, borderRadius: '50%', 
            background: logout ? 'rgba(234, 179, 8, 0.2)' : isActive ? 'transparent' : 'rgba(239, 68, 68, 0.2)', 
            border: `2px solid ${logout ? '#eab308' : isActive ? 'transparent' : '#ef4444'}`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: -15, flexShrink: 0
          }}>
            {logout ? <LogOut size={14} color="#eab308" /> : !isActive ? <XCircle size={14} color="#ef4444" /> : null}
          </div>
          <Card style={{ flex: 1, padding: 16, background: logout ? 'rgba(234, 179, 8, 0.03)' : isActive ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.03)', border: `1px solid ${logout ? 'rgba(234, 179, 8, 0.2)' : isActive ? 'var(--border)' : 'rgba(239, 68, 68, 0.2)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: logout ? '#eab308' : isActive ? 'var(--text-muted)' : '#ef4444', fontSize: 14 }}>
                {logout ? 'Session Terminated (Logout)' : isActive ? 'Session Currently Active' : 'Session Expired (30m)'}
              </strong>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {logout ? formatTime(logout.timestamp) : !isActive ? formatTime(expiryTimestamp) : '--:--:--'}
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
