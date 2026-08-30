import { useEffect, useState } from 'react';
import { adminApi, studentsApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, PageLoader, useToast, ConfirmModal, formatPhoneNumber, Tooltip, Input, Field, Select } from '../components/ui';

export default function RegistrationRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const { toast, ToastContainer } = useToast();

  // Edit modal state
  const [editModal, setEditModal] = useState(null); // null or student object being edited
  const [editForm, setEditForm] = useState({});
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); loadAcademicData(); }, []);

  async function loadAcademicData() {
    try {
      const [facRes, deptRes] = await Promise.all([
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      setFaculties(facRes.data);
      setDepartments(deptRes.data);
    } catch (err) {
      console.error('Failed to load academic data', err);
    }
  }

  async function load() {
    setLoading(true);
    try { 
      const res = await adminApi.listPendingStudents(); 
      setRequests(res.data); 
    } catch(err) {
      toast('Failed to load requests', 'error');
    }
    setLoading(false);
  }

  async function handleApprove(studentId) {
    setConfirmState({
      type: 'approve',
      id: studentId,
      title: 'Approve Student',
      message: 'Are you sure you want to approve this student? They will be instantly enrolled in their department courses.',
      variant: 'success'
    });
  }

  async function executeApprove(studentId) {
    setConfirmState(null);
    setProcessing(true);
    try {
      await adminApi.approveStudent(studentId);
      toast('Student Approved');
      load();
    } catch(err) {
      toast(err.response?.data?.detail || 'Error', 'error');
    } finally {
      setProcessing(false);
    }
  }

  function handleReject(studentId) {
    setRejectModal({ id: studentId, reason: '' });
  }

  async function executeReject() {
    if (!rejectModal.reason || rejectModal.reason.trim().length < 3) {
      toast('Please provide a valid reason (min 3 chars) for rejection.', 'error');
      return;
    }
    setProcessing(true);
    try {
      await adminApi.rejectStudent(rejectModal.id, rejectModal.reason.trim());
      toast('Registration Rejected with reason');
      setRejectModal(null);
      load();
    } catch(err) {
      toast(err.response?.data?.detail || 'Error', 'error');
    } finally {
      setProcessing(false);
    }
  }

  // ── Edit Modal Logic ──────────────────────────────────────────
  function handleOpenEdit(row) {
    const facultyId = departments.find(d => d.id === row.department_id)?.faculty_id || '';
    setEditForm({
      name: row.name || '',
      email: row.email || '',
      rfid_uid: row.rfid_uid || '',
      university_id: row.university_id || '',
      phone_number: row.phone_number || '',
      faculty_id: facultyId,
      department_id: row.department_id || '',
      academic_year: row.academic_year || 1,
      current_semester: row.current_semester || 1,
    });
    setEditModal(row);
  }

  function handleEditChange(field, value) {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      // If faculty changed, reset department
      if (field === 'faculty_id') {
        updated.department_id = '';
      }
      return updated;
    });
  }

  const filteredDepts = editForm.faculty_id
    ? departments.filter(d => d.faculty_id === Number(editForm.faculty_id))
    : departments;

  async function handleSaveEdit() {
    if (!editModal) return;
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        rfid_uid: editForm.rfid_uid,
        university_id: editForm.university_id || null,
        phone_number: editForm.phone_number?.replace(/\s/g, '') || null,
        department_id: editForm.department_id ? Number(editForm.department_id) : null,
        academic_year: editForm.academic_year ? Number(editForm.academic_year) : null,
        current_semester: editForm.current_semester ? Number(editForm.current_semester) : null,
      };
      await studentsApi.update(editModal.id, payload);
      toast('Student information updated successfully');
      setEditModal(null);
      load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast(typeof detail === 'string' ? detail : JSON.stringify(detail), 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Helper: resolve names from local data ─────────────────────
  function getDeptName(deptId) {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || null;
  }
  function getFacName(deptId) {
    const dept = departments.find(d => d.id === deptId);
    if (!dept) return null;
    const fac = faculties.find(f => f.id === dept.faculty_id);
    return fac?.name || null;
  }

  // ── Table columns ─────────────────────────────────────────────
  const columns = [
    { key: 'name', label: 'Name', render: (v, row) => (
      <div>
         <div style={{fontWeight: 600}}>{v}</div>
         <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{row.email}</div>
      </div>
    )},
    { key: 'university_id', label: 'University ID', render: v => <span className="mono">{v}</span> },
    { key: 'phone_number', label: 'Phone', render: v => v ? <span style={{ color: 'var(--green-light)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>📞 {formatPhoneNumber(v)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'department_id', label: 'Academic Details', render: (v, row) => {
      // Use server-provided names first, fall back to local lookup
      const facName = row.faculty_name || getFacName(v);
      const deptName = row.department_name || getDeptName(v);
      
      return (
        <Tooltip position="bottom" content={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
              🏛️ {facName || 'Unknown Faculty'}
            </div>
            <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>
              📚 {deptName || `Department #${v}`}
            </div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <Badge color="blue" style={{ fontSize: 9, padding: '2px 6px' }}>Level {row.academic_year || '?'}</Badge>
              <Badge color="purple" style={{ fontSize: 9, padding: '2px 6px' }}>Sem {row.current_semester || '?'}</Badge>
            </div>
          </div>
        }>
          <div style={{ cursor: 'help', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {deptName || `Dept #${v}`}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Year {row.academic_year || '?'} • Sem {row.current_semester || '?'}
            </div>
          </div>
        </Tooltip>
      );
    }},
    { key: 'id_card_image_url', label: 'ID Photo', render: v => v ? (
      <Btn size="sm" variant="ghost" onClick={() => setPhotoModal(v)}>View Photo</Btn>
    ) : <span style={{color: 'var(--text-muted)'}}>No Photo</span>},
    { key: 'approval_status', label: 'Status', render: v => <Badge color="amber">{v}</Badge> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div style={{display: 'flex', gap: 6}}>
        <Btn size="sm" variant="ghost" onClick={() => handleOpenEdit(row)} style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Edit</Btn>
        <Btn size="sm" onClick={() => handleApprove(v)} disabled={processing}>Approve</Btn>
        <Btn size="sm" variant="danger" onClick={() => handleReject(v)} disabled={processing}>Reject</Btn>
      </div>
    )}
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Registration Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Pending accounts waiting for admin review</p>
        </div>
      </div>
      
      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={requests} maxHeight="480px" emptyText="No pending registration requests" />
      </Card>

      {/* ── Photo Modal ────────────────────────────────────────── */}
      {photoModal && (
        <Modal title="ID Card Photo" onClose={() => setPhotoModal(null)}>
          <img src={`${photoModal}`} alt="ID Card" style={{width: '100%', borderRadius: 8, marginTop: 10}} />
          <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 15}}>
             <Btn variant="ghost" onClick={() => setPhotoModal(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* ── Confirm Modal ──────────────────────────────────────── */}
      {confirmState && (
        <ConfirmModal 
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          confirmText="Approve"
          onConfirm={() => executeApprove(confirmState.id)}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* ── Reject Modal ──────────────────────────────────────── */}
      {rejectModal && (
        <Modal title="Reject Registration Request" onClose={() => setRejectModal(null)} width={500}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Please provide a reason for rejecting this student's registration. This reason is required and will be logged.
            </div>
            <Field label="Rejection Reason">
              <textarea
                value={rejectModal.reason}
                onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="e.g., Invalid ID card photo, Incorrect department info..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </Field>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={executeReject} disabled={processing}>
                {processing ? 'Processing...' : 'Confirm Reject'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────── */}
      {editModal && (
        <Modal title="Edit Registration Details" onClose={() => setEditModal(null)} width={560}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Info Banner */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 8,
              padding: '12px 16px',
              fontSize: 12,
              color: 'var(--accent)',
              lineHeight: 1.5,
            }}>
              ✏️ Correct any information before approving. Changes are saved immediately.
            </div>

            {/* Name & Email (side by side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full Name">
                <Input value={editForm.name} onChange={e => handleEditChange('name', e.target.value)} placeholder="Student Name" />
              </Field>
              <Field label="Email (read-only)">
                <Input value={editForm.email} disabled style={{ opacity: 0.5 }} />
              </Field>
            </div>

            {/* University ID & RFID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="University ID">
                <Input value={editForm.university_id} onChange={e => handleEditChange('university_id', e.target.value)} placeholder="e.g. 121354" />
              </Field>
              <Field label="RFID UID">
                <Input value={editForm.rfid_uid} onChange={e => handleEditChange('rfid_uid', e.target.value)} placeholder="e.g. AB:CD:EF:12" />
              </Field>
            </div>

            {/* Phone */}
            <Field label="Phone Number">
              <Input value={editForm.phone_number} onChange={e => handleEditChange('phone_number', e.target.value)} placeholder="01X XXXX XXXX" />
            </Field>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            {/* Academic Section Header */}
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>🎓</span> Academic Placement
            </div>

            {/* Faculty & Department */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Faculty">
                <Select value={editForm.faculty_id} onChange={e => handleEditChange('faculty_id', e.target.value)}>
                  <option value="">Select Faculty</option>
                  {faculties.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Department">
                <Select value={editForm.department_id} onChange={e => handleEditChange('department_id', e.target.value)}>
                  <option value="">Select Department</option>
                  {filteredDepts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Year & Semester */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Academic Year (Level)">
                <Select value={editForm.academic_year} onChange={e => handleEditChange('academic_year', e.target.value)}>
                  {[1,2,3,4,5,6].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={editForm.current_semester} onChange={e => handleEditChange('current_semester', e.target.value)}>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </Select>
              </Field>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setEditModal(null)}>Cancel</Btn>
              <Btn onClick={handleSaveEdit} disabled={saving} style={{ minWidth: 120 }}>
                {saving ? 'Saving…' : '💾 Save Changes'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
