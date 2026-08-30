import { useEffect, useState } from 'react';
import { adminApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, Table, Btn, Modal, PageLoader, useToast, Field, Input, Select, PhoneInput, ConfirmModal, Badge } from '../components/ui';
import { formatDateTime } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function AutoApproveListPage() {
  const { isSuperAdmin, capabilities } = useAuth();
  const canPurge = isSuperAdmin || capabilities?.includes('SYSTEM_DATA_PURGE');
  const [activeTab, setActiveTab] = useState('allowlist');
  const [records, setRecords] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  const initialForm = { 
    university_id: '', 
    name: '', 
    phone_number: '', 
    faculty_id: '', 
    department_id: '', 
    academic_year: '1' 
  };
  const [form, setForm] = useState(initialForm);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const { toast, ToastContainer } = useToast();

  useEffect(() => { 
    load(); 
    loadMetadata();
  }, []);

  useEffect(() => {
    if (form.faculty_id) {
               departmentsApi.list(form.faculty_id)
         .then(res => {
            setDepartments(res.data);
            if (res.data.length > 0) setForm(f => ({ ...f, department_id: res.data[0].id }));
         });
    } else {
      setDepartments([]);
    }
  }, [form.faculty_id]);

  async function loadMetadata() {
    try {
      const res = await facultiesApi.list();
      setFaculties(res.data);
      if (res.data.length > 0) setForm(f => ({ ...f, faculty_id: res.data[0].id }));
    } catch (err) {
      console.error('Failed to load faculties', err);
    }
  }

  async function load() {
    setLoading(true);
    try { 
      const [allowlistRes, historyRes] = await Promise.all([
        adminApi.listPreVerified(),
        adminApi.getAutoApproveHistory()
      ]);
      setRecords(allowlistRes.data); 
      setHistoryRecords(historyRes.data.history);
      setUnseenCount(historyRes.data.unseen_count);
    } catch(err) {
      toast('Failed to load data', 'error');
    }
    setLoading(false);
  }

  async function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'history' && unseenCount > 0) {
      try {
        await adminApi.markAutoApproveHistorySeen();
        setUnseenCount(0);
        // Optimistically update local history records
        setHistoryRecords(prev => prev.map(r => ({...r, admin_seen_auto_approve: true})));
      } catch (err) {
        console.error('Failed to mark seen', err);
      }
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const cleanPhone = form.phone_number.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length !== 11) {
       return toast('Please enter a valid 11-digit phone number', 'error');
    }

    try {
      await adminApi.addPreVerified(form);
      toast('Added to Allowlist');
      setModal(false);
      setForm(initialForm);
      load();
    } catch(err) {
      toast(err.response?.data?.detail || 'Error', 'error');
    }
  }

  async function handleDelete(id) {
    setDeleteId(id);
  }

  async function executeDelete() {
    try {
      await adminApi.deletePreVerified(deleteId);
      toast('Removed from Allowlist');
      setDeleteId(null);
      load();
    } catch(err) {
      toast(err.response?.data?.detail || 'Error', 'error');
    }
  }

  async function handleExport() {
    try {
      const res = await adminApi.exportPreVerified();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `allowlist_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast('Failed to export CSV', 'error');
    }
  }

  async function handleExportHistory() {
    try {
      const res = await adminApi.exportAutoApproveHistory();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `auto_approve_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast('Failed to export History CSV', 'error');
    }
  }

  async function handleClearHistory() {
    if (!window.confirm("Are you sure you want to permanently clear the auto-approve history?")) return;
    try {
      setLoading(true);
      await adminApi.clearAutoApproveHistory();
      toast('History Cleared');
      load();
    } catch (err) {
      toast('Failed to clear history', 'error');
      setLoading(false);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setLoading(true);
      const res = await adminApi.importPreVerified(file);
      toast(res.data.message);
      if (res.data.errors?.length > 0) {
        console.warn('Import warnings:', res.data.errors);
        toast(`Imported with ${res.data.errors.length} warnings (check console)`, 'info');
      }
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Import failed', 'error');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  }

  const allowlistColumns = [
    { key: 'university_id', label: 'ID', render: v => <span className="mono" style={{fontWeight: 700, color: 'var(--accent)'}}>{v}</span> },
    { key: 'name', label: 'Name', render: v => <span style={{fontWeight: 600, color: '#fff'}}>{v}</span> },
    { key: 'phone_number', label: 'Phone', render: v => <span className="mono" style={{fontSize: 12}}>{v || '-'}</span> },
    { key: 'faculty_name', label: 'Faculty', render: v => <span style={{fontSize: 13, color: 'var(--text-secondary)'}}>{v || '-'}</span> },
    { key: 'department_name', label: 'Dept', render: v => <span style={{fontSize: 13, color: 'var(--text-secondary)'}}>{v || '-'}</span> },
    { key: 'academic_year', label: 'Year', render: v => <span style={{fontSize: 12}}>Y{v}</span> },
    { key: 'id', label: 'Actions', render: (v) => (
      <Btn size="sm" variant="ghost" onClick={() => handleDelete(v)} style={{color: 'var(--red)'}}>Remove</Btn>
    )}
  ];

  const historyColumns = [
    { key: 'university_id', label: 'ID', render: v => <span className="mono" style={{fontWeight: 700, color: 'var(--accent)'}}>{v}</span> },
    { key: 'name', label: 'Name', render: v => <span style={{fontWeight: 600, color: '#fff'}}>{v}</span> },
    { key: 'email', label: 'Email', render: v => <span style={{fontSize: 12, color: 'var(--text-secondary)'}}>{v}</span> },
    { key: 'admin_name', label: 'Added By', render: v => <span style={{fontSize: 13, fontWeight: 500}}>{v}</span> },
    { key: 'id_card_image_url', label: 'ID Card', render: v => v ? (
      <button onClick={() => setImageModalUrl(`${v}`)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13, textDecoration: 'underline'}}>View Image</button>
    ) : <span style={{color: 'var(--text-muted)'}}>No Image</span> },
    { key: 'approved_at', label: 'Approved At', render: v => <span className="mono" style={{fontSize: 12}}>{v ? formatDateTime(v) : '-'}</span> },
    { key: 'admin_seen_auto_approve', label: 'Status', render: v => v ? <Badge color="green">Seen</Badge> : <Badge color="blue">New</Badge> }
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.01em' }}>Auto-Approve System</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Manage pre-verified credentials and track automatic sign-ups.</p>
        </div>
        {activeTab === 'allowlist' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              className="btn-export-power"
              onClick={handleExport}
            >
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            <label style={{ cursor: 'pointer' }}>
              <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
              <div className="btn-import-power">
                <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import CSV
              </div>
            </label>
            <Btn onClick={() => setModal(true)} style={{ boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)' }}>+ Add Record</Btn>
          </div>
        )}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button 
              className="btn-export-power"
              onClick={handleExportHistory}
            >
              <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
            {canPurge && (
              <Btn onClick={handleClearHistory} variant="ghost" style={{ color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                Clear History
              </Btn>
            )}
          </div>
        )}
      </div>
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', width: 'fit-content' }}>
        <button 
          onClick={() => handleTabChange('allowlist')} 
          style={{
            padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: activeTab === 'allowlist' ? 'var(--accent-dim)' : 'transparent',
            color: activeTab === 'allowlist' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: activeTab === 'allowlist' ? 700 : 500, fontSize: 13,
            transition: 'all 0.2s'
          }}
        >
          Allowlist ({records.length})
        </button>
        <button 
          onClick={() => handleTabChange('history')} 
          style={{
            padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: activeTab === 'history' ? 'var(--accent-dim)' : 'transparent',
            color: activeTab === 'history' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: activeTab === 'history' ? 700 : 500, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
            transition: 'all 0.2s'
          }}
        >
          History
          {unseenCount > 0 && (
            <span style={{
              background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '2px 6px', borderRadius: 10, lineHeight: 1
            }}>
              +{unseenCount}
            </span>
          )}
        </button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'allowlist' ? (
          <Table columns={allowlistColumns} rows={records} emptyText="Allowlist is empty" />
        ) : (
          <Table columns={historyColumns} rows={historyRecords} emptyText="No auto-approved records yet" />
        )}
      </Card>

      {modal && (
        <Modal title="Add Pre-Verified Student" onClose={() => setModal(false)}>
          <form onSubmit={handleAdd} style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="University ID">
                    <Input value={form.university_id} onChange={e => setForm({...form, university_id: e.target.value})} required placeholder="e.g. 2025001" />
                </Field>
                <Field label="Phone Number (11 digits)">
                    <PhoneInput value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} required />
                </Field>
            </div>

            <Field label="Full Name (for reference)">
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Mona El-Said" />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Faculty">
                    <Select value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value})} required>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </Select>
                </Field>
                <Field label="Department">
                    <Select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} required>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </Select>
                </Field>
            </div>

            <Field label="Academic Year (Level)">
                <Select value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} required>
                    {[1,2,3,4,5,6,7].map(y => <option key={y} value={y}>Year {y}</option>)}
                </Select>
            </Field>

            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12}}>
                <Btn variant="ghost" onClick={() => setModal(false)} type="button">Cancel</Btn>
                <Btn type="submit" style={{ minWidth: 120 }}>Add to List</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmModal 
          title="Remove from Allowlist"
          message="Are you sure you want to remove this record? Match-based auto-approval will no longer work for this profile."
          onConfirm={executeDelete}
          onCancel={() => setDeleteId(null)}
          confirmText="Remove"
          variant="danger"
        />
      )}

      {imageModalUrl && (
        <Modal title="ID Card Image" onClose={() => setImageModalUrl(null)}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <img src={imageModalUrl} alt="ID Card" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Btn onClick={() => setImageModalUrl(null)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
