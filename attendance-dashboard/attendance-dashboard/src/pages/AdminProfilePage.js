import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/client';
import api from '../api/client';
import { Card, Btn, PageLoader, useToast, PasswordInput, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import ImageCropModal from '../components/ImageCropModal';
import {
  Shield, ShieldCheck, Users, BookOpen, School, Building2,
  Cpu, Radio, ClipboardList, Stethoscope, GraduationCap,
  Link2, Camera, Mail, Phone, Clock, Hash, Lock, Unlock,
  ArrowRight, BarChart3, Award, Bot, UserCog, Settings,
  ChevronRight, Fingerprint, Eye, EyeOff, Activity, Key
} from 'lucide-react';

export default function AdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cropFile, setCropFile] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new_password: '', confirm: '' });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { role, email, userId, isSuperAdmin, updateProfileImage } = useAuth();
  const { toast, ToastContainer } = useToast();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await usersApi.myProfile();
      setProfile(res.data);
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to load profile', 'error');
    }
    setLoading(false);
  }

  // Handle file selection -> open crop modal
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCropFile(file);
    e.target.value = '';
  }

  // Handle cropped image upload
  async function handleCropConfirm(croppedFile) {
    setCropFile(null);
    const formData = new FormData();
    formData.append('file', croppedFile);
    try {
      const res = await api.post('/auth/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateProfileImage(res.data.profile_image_url);
      toast('Profile image updated!');
      loadProfile();
    } catch (err) {
      toast('Failed to upload image', 'error');
    }
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Profile not found</div>;

  const { user, stats } = profile;
  const isSuper = user.role === 'super_admin';

  const superNav = [
    { label: 'Users Management', icon: UserCog, path: '/users', color: '#f59e0b', desc: 'Manage all system accounts' },
    { label: 'System Monitoring', icon: Activity, path: '/monitoring', color: '#10b981', desc: 'Real-time audit & telemetry' },
    { label: 'Academic Standing', icon: Award, path: '/academic', color: '#8b5cf6', desc: 'Student grades & transcripts' },
    { label: 'Reports', icon: BarChart3, path: '/reports', color: '#3b82f6', desc: 'Attendance & performance reports' },
    { label: 'Devices', icon: Cpu, path: '/devices', color: '#10b981', desc: 'IoT device management' },
    { label: 'AI Assistant', icon: Bot, path: '/chatbot', color: '#ec4899', desc: 'Query system with AI' },
  ];

  const adminNav = [
    { label: 'Users Management', icon: UserCog, path: '/users', color: '#f59e0b', desc: 'Manage all system accounts' },
    { label: 'Academic Standing', icon: Award, path: '/academic', color: '#8b5cf6', desc: 'Student grades & transcripts' },
    { label: 'Reports', icon: BarChart3, path: '/reports', color: '#3b82f6', desc: 'Attendance & performance reports' },
    { label: 'Devices', icon: Cpu, path: '/devices', color: '#10b981', desc: 'IoT device management' },
    { label: 'AI Assistant', icon: Bot, path: '/chatbot', color: '#ec4899', desc: 'Query system with AI' },
    { label: 'Settings', icon: Settings, path: '/users', color: '#6366f1', desc: 'System configuration' },
  ];

  const quickNav = isSuper ? superNav : adminNav;

  // Stats config
  const statCards = [
    { label: 'Students', value: stats.total_students, icon: Users, color: '#10b981', gradient: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)' },
    { label: 'Courses', value: stats.total_courses, icon: BookOpen, color: '#3b82f6', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' },
    { label: 'Faculties', value: stats.total_faculties, icon: Building2, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #2e1065 0%, #0f172a 100%)' },
    { label: 'Departments', value: stats.total_departments, icon: School, color: '#ec4899', gradient: 'linear-gradient(135deg, #500724 0%, #0f172a 100%)' },
    { label: 'Users', value: stats.total_users, icon: Shield, color: '#f59e0b', gradient: 'linear-gradient(135deg, #451a03 0%, #0f172a 100%)' },
    { label: 'Devices', value: stats.total_devices, icon: Cpu, color: '#06b6d4', gradient: 'linear-gradient(135deg, #083344 0%, #0f172a 100%)' },
    { label: 'Sessions', value: stats.total_sessions, icon: Radio, color: '#ef4444', gradient: 'linear-gradient(135deg, #450a0a 0%, #0f172a 100%)' },
    { label: 'Assessments', value: stats.total_assessments, icon: ClipboardList, color: '#a855f7', gradient: 'linear-gradient(135deg, #3b0764 0%, #0f172a 100%)' },
    { label: 'Engineers', value: stats.total_instructors, icon: GraduationCap, color: '#14b8a6', gradient: 'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)' },
    { label: 'Doctors', value: stats.total_doctors, icon: Stethoscope, color: '#6366f1', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' },
    { label: 'Enrollments', value: stats.total_enrollments, icon: Link2, color: '#84cc16', gradient: 'linear-gradient(135deg, #1a2e05 0%, #0f172a 100%)' },
  ];

  // Permissions for role
  const permissions = isSuper ? [
    'Full system administration',
    'Create & manage all users',
    'Global academic transitions',
    'Device management',
    'Transition workspace access',
    'Academic password authority',
    'Bulk data operations',
  ] : [
    'User management (non-super-admin)',
    'Student enrollment & grades',
    'Session management',
    'Report generation',
    'Device monitoring',
    'Assessment oversight',
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Image Crop Modal */}
      {cropFile && (
        <ImageCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* ═══ HERO IDENTITY CARD ═══ */}
      <div style={{
        background: isSuper
          ? 'linear-gradient(135deg, #1a1a2e 0%, #2b1d3d 40%, #16213e 100%)'
          : 'linear-gradient(135deg, #1a1a2e 0%, #2a1f0f 40%, #16213e 100%)',
        borderRadius: 20, padding: '40px 48px',
        border: `1px solid ${isSuper ? 'rgba(198, 168, 245, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        boxShadow: isSuper
          ? '0 16px 60px rgba(139, 92, 246, 0.15), 0 0 30px rgba(198, 168, 245, 0.05)'
          : '0 16px 60px rgba(245, 158, 11, 0.1), 0 0 30px rgba(245, 158, 11, 0.03)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decorative elements */}
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: isSuper
            ? 'radial-gradient(circle, rgba(198, 168, 245, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40, width: 160, height: 160,
          borderRadius: '50%', background: isSuper
            ? 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(217, 119, 6, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 36, position: 'relative', zIndex: 1 }}>
          {/* Profile Image */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 120, height: 120, borderRadius: '50%', flexShrink: 0,
              border: isSuper ? '4px solid rgba(198, 168, 245, 0.4)' : '4px solid rgba(245, 158, 11, 0.3)',
              boxShadow: isSuper
                ? '0 0 40px rgba(198, 168, 245, 0.2), inset 0 0 20px rgba(0,0,0,0.3)'
                : '0 0 40px rgba(245, 158, 11, 0.15), inset 0 0 20px rgba(0,0,0,0.3)',
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-surface)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = isSuper ? '0 0 60px rgba(198, 168, 245, 0.35)' : '0 0 60px rgba(245, 158, 11, 0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = isSuper ? '0 0 40px rgba(198, 168, 245, 0.2), inset 0 0 20px rgba(0,0,0,0.3)' : '0 0 40px rgba(245, 158, 11, 0.15), inset 0 0 20px rgba(0,0,0,0.3)'; }}
            title="Click to change profile photo"
          >
            {user.profile_image_url ? (
              <img src={`${user.profile_image_url}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 48, fontWeight: 800, color: isSuper ? 'var(--accent)' : '#f59e0b' }}>
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            )}
            {/* Camera overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              padding: '12px 0 8px', display: 'flex', justifyContent: 'center',
            }}>
              <Camera size={16} style={{ color: 'rgba(255,255,255,0.8)' }} />
            </div>
          </div>

          {/* Identity Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>
                {user.name || 'Unnamed Administrator'}
              </h1>
              <span className={isSuper ? 'role-badge-gold' : 'role-badge-admin'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {isSuper ? <Shield size={12} /> : <ShieldCheck size={12} />}
                {isSuper ? 'Super Admin' : 'Admin'}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                <Mail size={15} style={{ color: 'var(--text-muted)' }} />
                {user.email}
              </div>
              {user.phone_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                  <Phone size={15} style={{ color: 'var(--text-muted)' }} />
                  {user.phone_number}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                <Hash size={15} style={{ color: 'var(--text-muted)' }} />
                Account #{user.id}
              </div>
              {user.last_login && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
                  <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                  Last login: {new Date(user.last_login).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SYSTEM OVERVIEW STATS ═══ */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
          System Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{
                background: s.gradient,
                borderRadius: 14, padding: '20px 18px',
                border: `1px solid ${s.color}20`,
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${s.color}25`; e.currentTarget.style.borderColor = `${s.color}40`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${s.color}20`; }}
              >
                <Icon size={20} style={{ color: s.color, marginBottom: 10, opacity: 0.8 }} />
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ BOTTOM ROW: QUICK NAV + SECURITY + PERMISSIONS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>

        {/* Quick Navigation */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowRight size={18} style={{ color: 'var(--accent)' }} />
            Quick Navigation
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickNav.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  onClick={() => navigate(item.path)}
                  style={{
                    background: 'var(--bg-surface)', borderRadius: 12,
                    padding: '18px 20px', border: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = item.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${item.color}20`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${item.color}15`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={20} style={{ color: item.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Security + Permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Security Panel */}
          <Card style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%)',
            border: '1px solid rgba(198, 168, 245, 0.1)',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Fingerprint size={16} style={{ color: 'var(--accent)' }} />
              Security & Access
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Login Password */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Lock size={16} style={{ color: '#10b981' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Login Password</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last changed: {user.password_changed_at ? new Date(user.password_changed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Never'}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                  background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', textTransform: 'uppercase',
                }}>Active</span>
              </div>

              {/* Academic Transition Password - Super Admin only */}
              {isSuper && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ShieldCheck size={16} style={{ color: user.has_academic_password ? '#f59e0b' : '#ef4444' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Academic Transition Key</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Required for global transitions</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: user.has_academic_password ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: user.has_academic_password ? '#f59e0b' : '#ef4444',
                    textTransform: 'uppercase',
                  }}>{user.has_academic_password ? 'Set' : 'Not Set'}</span>
                </div>
              )}

              {/* Role Authority */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Shield size={16} style={{ color: isSuper ? '#c6a8f5' : '#f59e0b' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Authority Level</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isSuper ? 'Maximum — unrestricted system access' : 'Standard admin — restricted from super-admin actions'}</div>
                  </div>
                </div>
                <span className={isSuper ? 'role-badge-gold' : 'role-badge-admin'} style={{ fontSize: 9, padding: '3px 8px' }}>
                  {isSuper ? 'Tier 1' : 'Tier 2'}
                </span>
              </div>
            </div>
          </Card>

          {/* Permissions & Elevated Capabilities */}
          <Card style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Unlock size={16} style={{ color: '#10b981' }} />
              Role Authority ({permissions.length}) {user.capabilities && user.capabilities.length > 0 && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>+{user.capabilities.length}</span>}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {permissions.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.04)',
                  fontSize: 12, color: 'var(--text-secondary)',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: '#10b981',
                  }} />
                  {p}
                </div>
              ))}
            </div>

            {/* Elevated capabilities from ABAC */}
            {user.capabilities && user.capabilities.length > 0 && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={16} style={{ color: '#4a8eff' }} />
                  Elevated Overrides ({user.capabilities.length})
                </h3>
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: 10,
                  background: 'rgba(74, 142, 255, 0.05)',
                  padding: '16px',
                  borderRadius: 14,
                  border: '1px solid rgba(74, 142, 255, 0.15)',
                  boxShadow: 'inset 0 0 20px rgba(74, 142, 255, 0.05)'
                }}>
                  {user.capabilities.map((cap, i) => {
                    const isForever = !cap.expires_at;
                    const timeLeft = isForever ? 'Permanent' : (() => {
                      const diff = new Date(cap.expires_at) - new Date();
                      if (diff <= 0) return 'Expired';
                      const hrs = Math.floor(diff / (1000 * 60 * 60));
                      const days = Math.floor(hrs / 24);
                      const months = Math.floor(days / 30);
                      if (months > 0) return `${months}m left`;
                      if (days > 0) return `${days}d left`;
                      return `${hrs}h left`;
                    })();

                    return (
                      <div key={i} style={{
                        padding: '12px 14px', borderRadius: 12,
                        border: '1px solid rgba(74, 142, 255, 0.2)',
                        background: 'rgba(74, 142, 255, 0.05)',
                        transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: isForever ? '#10b981' : '#4a8eff' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Key size={14} style={{ color: '#4a8eff' }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{cap.capability_name}</span>
                          </div>
                          <div style={{ 
                            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                            background: isForever ? 'rgba(16, 185, 129, 0.1)' : 'rgba(74, 142, 255, 0.1)',
                            color: isForever ? '#10b981' : '#4a8eff',
                            textTransform: 'uppercase'
                          }}>
                            {timeLeft}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
