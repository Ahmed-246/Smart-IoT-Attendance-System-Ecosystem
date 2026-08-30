import { useEffect, useState } from 'react';
import { usersApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, Field, Input, Select, PageLoader, useToast, PasswordInput, ConfirmModal, PhoneInput, formatPhoneNumber } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldCheck, Stethoscope, Cpu, GraduationCap, Search, User, UserPlus, Activity, Clock, AlertTriangle, ShieldAlert, ExternalLink } from 'lucide-react';
import { monitoringApi } from '../api/client';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ name: '', phone_number: '', email: '', password: '', role: 'student', academic_password: '' });
  const [search, setSearch] = useState('');
  const { toast, ToastContainer } = useToast();

  // Get the current user's role from localStorage (set during login)
  // Get the current user's role and helpers from AuthContext
  const { role: currentUserRole, isAdmin, isSuperAdmin } = useAuth();
  const [auditModal, setAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function loadAudit() {
    if (!isSuperAdmin) return;
    setAuditLoading(true);
    setAuditModal(true);
    try {
      const res = await monitoringApi.logs({ target: 'User', limit: 30 });
      setAuditLogs(res.data.logs);
    } catch { toast('Failed to load logs', 'error'); }
    setAuditLoading(false);
  }

  async function load() {
    setLoading(true);
    try {
      const r = await usersApi.list();
      const sorted = [...r.data].sort((a, b) => {
        // Sort by Name
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;

        // Then by Phone
        const phoneA = (a.phone_number || '');
        const phoneB = (b.phone_number || '');
        if (phoneA < phoneB) return -1;
        if (phoneA > phoneB) return 1;

        // Then by Email
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        if (emailA < emailB) return -1;
        if (emailA > emailB) return 1;

        return 0;
      });
      setUsers(sorted);
    } catch { }
    setLoading(false);
  }

  const validatePhone = (num) => {
    if (!num) return true;
    const clean = num.replace(/\s+/g, '');
    return clean.length === 11 && ['010', '011', '012', '015'].some(p => clean.startsWith(p));
  };

  async function handleAdd(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      const data = { name: form.name, phone_number: form.phone_number, email: form.email, password: form.password, role: form.role };
      if (form.academic_password) data.academic_password = form.academic_password;
      await usersApi.create(data);
      toast('User created'); setModal(false); setForm({ name: '', phone_number: '', email: '', password: '', role: 'student', academic_password: '' }); load();
    } catch (err) { toast(err.response?.data?.detail || 'Error', 'error'); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      const data = { name: form.name, phone_number: form.phone_number, email: form.email, role: form.role };
      if (form.password) data.password = form.password;
      if (form.academic_password) data.academic_password = form.academic_password;
      await usersApi.update(editModal.id, data);
      toast('User updated'); setEditModal(null); load();
    } catch (err) { toast(err.response?.data?.detail || 'Error', 'error'); }
  }

  async function handleDelete() {
    try {
      await usersApi.delete(deleteConfirm.id);
      toast('User deleted'); setDeleteConfirm(null); load();
    } catch (err) { toast(err.response?.data?.detail || 'Error', 'error'); }
  }

  function openEdit(user) {
    setForm({ name: user.name || '', phone_number: user.phone_number || '', email: user.email, password: '', role: user.role, academic_password: '' });
    setEditModal(user);
  }

  const roleConfig = {
    super_admin: { color: 'gold', icon: Shield, label: 'Super Admin', className: 'role-badge-gold' },
    admin: { color: 'amber', icon: ShieldCheck, label: 'Admin', className: 'role-badge-admin' },
    doctor: { color: '#3b82f6', icon: Stethoscope, label: 'Doctor' },
    engineer: { color: '#8b5cf6', icon: Cpu, label: 'Engineer' },
    student: { color: '#10b981', icon: GraduationCap, label: 'Student' }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v, row, i) => <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>#{i + 1}</span> <span style={{ fontWeight: 600 }}>{v || '—'}</span></div> },
    { key: 'phone_number', label: 'Phone', render: v => v ? <span style={{ color: 'var(--green-light)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>📞 {formatPhoneNumber(v)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'email', label: 'Email', render: v => <span style={{ color: 'var(--text-secondary)' }}>{v}</span> },
    {
      key: 'role', label: 'Role', render: v => {
        const config = roleConfig[v] || { color: 'default', icon: User, label: v };
        const Icon = config.icon;

        // Premium badges for super_admin and admin
        if (config.className) {
          return (
            <span className={config.className} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon size={12} /> {config.label}
            </span>
          );
        }

        // Simple colored label for doctor, engineer, student
        const c = config.color;
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: c, background: `${c}18`, border: `1px solid ${c}40`,
            padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.03em'
          }}>
            <Icon size={12} /> {config.label}
          </span>
        );
      }
    },
    {
      key: 'id', label: 'Actions', render: (v, row) => {
        const isTargetSuperAdmin = row.role === 'super_admin';
        const canManage = isSuperAdmin || !isTargetSuperAdmin;
        return (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="ghost" onClick={() => openEdit(row)} disabled={!canManage}
              style={!canManage ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>Edit</Btn>
            <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(row)} disabled={!canManage}
              style={!canManage ? { opacity: 0.4, cursor: 'not-allowed' } : {}}>Delete</Btn>
          </div>
        );
      }
    },
  ];

  // Role options for dropdowns - super_admin only visible to super_admin users
  const roleOptions = [
    { value: 'student', label: 'Student' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'engineer', label: 'Engineer' },
    { value: 'admin', label: 'Admin' },
    ...(isSuperAdmin ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
  ];

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone_number || '').includes(q)
    );
  });

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Users</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filteredUsers.length} of {users.length} accounts</p>
        </div>

        <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <Search size={16} />
          </div>
          <Input
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>

        {isSuperAdmin && (
          <Btn variant="ghost" onClick={loadAudit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} /> Audit Logs
          </Btn>
        )}
        <Btn onClick={() => { setForm({ name: '', phone_number: '', email: '', password: '', role: 'student', academic_password: '' }); setModal(true); }}>+ Add User</Btn>
      </div>
      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={filteredUsers} emptyText={search ? "No users match your search" : "No users found"} />
      </Card>

      {modal && (
        <Modal title="Create User" onClose={() => setModal(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name"><Input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Phone"><PhoneInput value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></Field>
            <Field label="Password"><PasswordInput value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required /></Field>
            <Field label="Role">
              <Select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
            </Field>
            {(form.role === 'super_admin') && (
              <Field label="Academic Transition Password (for term changes)">
                <PasswordInput value={form.academic_password} onChange={e => setForm(f => ({ ...f, academic_password: e.target.value }))} placeholder="Min 6 characters" />
              </Field>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn type="submit">Create User</Btn>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit User" onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Name"><Input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
            <Field label="Phone"><PhoneInput value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></Field>
            <Field label="New Password (leave blank to keep current)"><PasswordInput value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep unchanged" /></Field>
            <Field label="Role">
              <Select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                disabled={editModal.role === 'student' || (!isSuperAdmin && (editModal.role === 'admin' || editModal.role === 'doctor' || editModal.role === 'super_admin'))}
              >
                {roleOptions.filter(opt => {
                  if (editModal.role === 'student') return opt.value === 'student';
                  if (editModal.role === 'engineer') return opt.value === 'engineer' || opt.value === 'doctor';
                  if (editModal.role === 'doctor') {
                    if (isSuperAdmin) return opt.value === 'doctor' || opt.value === 'super_admin';
                    return opt.value === 'doctor';
                  }
                  if (editModal.role === 'admin') {
                    if (isSuperAdmin) return opt.value === 'admin' || opt.value === 'super_admin';
                    return opt.value === 'admin';
                  }
                  if (editModal.role === 'super_admin') return opt.value === 'super_admin';
                  return true;
                }).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
              {(editModal.role === 'student') && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>🎓 Student roles are permanent to maintain academic record integrity.</p>}
              {(!isSuperAdmin && (editModal.role === 'admin' || editModal.role === 'doctor')) && <p style={{ fontSize: 11, color: 'var(--orange)', marginTop: 4 }}>⚠️ Only a Super Admin can promote Admins or Doctors.</p>}
            </Field>
            {(form.role === 'super_admin') && (
              <Field label="Academic Transition Password">
                <PasswordInput value={form.academic_password} onChange={e => setForm(f => ({ ...f, academic_password: e.target.value }))} placeholder="Leave blank to keep unchanged" />
              </Field>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setEditModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete user ${deleteConfirm.email}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}

      {auditModal && (
        <Modal title="User Management Audit Logs" onClose={() => setAuditModal(false)} width={800}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', padding: '10px 4px' }}>
            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Loading logs...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No logs found for User management.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} style={{
                  padding: 14, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)',
                  display: 'flex', gap: 16, alignItems: 'center'
                }}>
                  <div style={getPriorityStyle(log.priority)}>
                    {getPriorityIcon(log.priority)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{log.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} /> {log.user_email}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Btn variant="ghost" onClick={() => window.location.href = '/monitoring'}>Open Full Monitoring Hub <ExternalLink size={14} style={{ marginLeft: 8 }} /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function getPriorityStyle(p) {
  if (p === 'CRITICAL') return { color: 'var(--red)', background: 'var(--red-dim)', padding: 8, borderRadius: 10 };
  if (p === 'WARNING') return { color: 'var(--orange)', background: 'rgba(249, 115, 22, 0.1)', padding: 8, borderRadius: 10 };
  if (p === 'CAUTION') return { color: 'var(--yellow)', background: 'rgba(234, 179, 8, 0.1)', padding: 8, borderRadius: 10 };
  return { color: 'var(--green)', background: 'rgba(34, 197, 94, 0.1)', padding: 8, borderRadius: 10 };
}

function getPriorityIcon(p) {
  if (p === 'CRITICAL') return <ShieldAlert size={18} />;
  if (p === 'WARNING' || p === 'CAUTION') return <AlertTriangle size={18} />;
  return <Activity size={18} />;
}
