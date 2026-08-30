import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentsApi, coursesApi, facultiesApi, departmentsApi, attendanceApi, monitoringApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, Field, Input, Select, FancySelect, PageLoader, useToast, ConfirmModal, PhoneInput, formatPhoneNumber } from '../components/ui';
import { Wifi, Loader2, CheckCircle2, ShieldCheck, Radio, Copy, Filter, Activity, Clock, AlertTriangle, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastContainer } = useToast();
  const { isAdmin, isSuperAdmin, assignedDeptIds, assignedFacIds } = useAuth();
  const navigate = useNavigate();
  const [auditModal, setAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const emptyForm = { name: '', email: '', phone_number: '', rfid_uid: '', university_id: '', faculty_id: '', department_id: '', academic_year: '', current_semester: 1, academic_status: 'ACTIVE', emergency_contact_phone: '', bio: '', personal_email: '' };
  const [form, setForm] = useState(emptyForm);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [search, setSearch] = useState('');
  
  // Page Filters
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // RFID Discovery State
  const [discoveryToken, setDiscoveryToken] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState('idle');
  const [scannedUid, setScannedUid] = useState(null);
  const [existingStudent, setExistingStudent] = useState(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false); 

  useEffect(() => { load(); }, []);

  async function loadAudit() {
    if (!isSuperAdmin) return;
    setAuditLoading(true);
    setAuditModal(true);
    try {
      const res = await monitoringApi.logs({ target: 'Student', limit: 30 });
      setAuditLogs(res.data.logs);
    } catch { toast('Failed to load student logs', 'error'); }
    setAuditLoading(false);
  }

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        studentsApi.list(),
        coursesApi.list(),
        facultiesApi.list(),
        departmentsApi.list()
      ]);

      const [s, c, f, d] = results;

      if (s.status === 'fulfilled') setStudents(s.value.data);
      else toast('Failed to load students list', 'error');

      if (c.status === 'fulfilled') setCourses(c.value.data);
      if (f.status === 'fulfilled') setFaculties(f.value.data);
      if (d.status === 'fulfilled') setDepartments(d.value.data);

    } catch (err) {
      toast('Critical error loading students data', 'error');
    } finally {
      setLoading(false);
    }
  }

  const validatePhone = (num) => {
    if (!num) return true; // Optional field in some contexts, but if provided must be valid
    const clean = num.replace(/\s+/g, '');
    return clean.length === 11 && ['010', '011', '012', '015'].some(p => clean.startsWith(p));
  };

  async function handleAdd(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      const data = { 
        ...form, 
        academic_year: form.academic_year ? Number(form.academic_year) : null,
        current_semester: Number(form.current_semester || 1)
      };
      await studentsApi.create(data);
      
      const successMsg = isSuperAdmin 
        ? 'Student added successfully' 
        : 'Student added successfully. Waiting for Admin approval.';
      
      toast(successMsg);
      setModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to add student', 'error');
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      const data = { 
        ...form, 
        academic_year: form.academic_year ? Number(form.academic_year) : null,
        current_semester: Number(form.current_semester || 1)
      };
      await studentsApi.update(editModal.id, data);
      toast('Student updated');
      setEditModal(null);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update student', 'error');
    }
  }

  async function handleDelete() {
    try {
      await studentsApi.delete(deleteConfirm.id);
      toast('Student deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to delete', 'error');
    }
  }

  async function handleStartDiscovery() {
    try {
      setIsDiscoveryOpen(true);
      setScannedUid(null);
      const res = await attendanceApi.discovery.start();
      setDiscoveryToken(res.data.token);
      setIsPolling(true);
    } catch (err) {
      console.error('[DISCOVERY_START_ERROR]', err);
      toast('Failed to start discovery mode', 'error');
      setIsDiscoveryOpen(false);
    }
  }

  useEffect(() => {
    let interval;
    if (isPolling && discoveryToken) {
      interval = setInterval(async () => {
        try {
          const res = await attendanceApi.discovery.check(discoveryToken);
          if (res.data.status === 'captured' || res.data.status === 'exists') {
            setScannedUid(res.data.uid);
            if (res.data.status === 'exists') {
              setExistingStudent(res.data.student);
              toast(`Card belongs to: ${res.data.student.name}`, 'info');
            } else {
              setExistingStudent(null);
              toast('RFID UID captured successfully!');
            }
            setIsPolling(false);
            setDiscoveryToken(null);
          }
        } catch (err) {
          console.error('[POLLING_ERROR]', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPolling, discoveryToken]);

  function copyUid(uid) {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    toast('UID copied to clipboard!', 'success');
    setTimeout(() => setCopiedUid(false), 2000);
  }

  function closeDiscoveryModal() {
    setIsDiscoveryOpen(false);
    setScannedUid(null);
    setExistingStudent(null);
    setDiscoveryToken(null);
    setIsPolling(false);
    setCopiedUid(false);
  }

  function openEdit(student) {
    const dept = departments.find(d => d.id === student.department_id);
    setForm({
      name: student.name, email: student.email, rfid_uid: student.rfid_uid,
      university_id: student.university_id || '',
      phone_number: student.phone_number || '',
      department_id: student.department_id || '',
      academic_year: student.academic_year || '',
      current_semester: student.current_semester || 1,
      academic_status: student.academic_status || 'ACTIVE',
      emergency_contact_phone: student.emergency_contact_phone || '',
      bio: student.bio || '',
      personal_email: student.personal_email || '',
    });
    setSelectedFacultyId(dept ? dept.faculty_id : '');
    setEditModal(student);
  }

  // Cascading filters logic for UI
  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));

  const sortedStudents = [...students].sort((a, b) => {
    if (a.academic_year !== b.academic_year) return (a.academic_year || 0) - (b.academic_year || 0);
    return (a.current_semester || 0) - (b.current_semester || 0);
  });

  const filtered = sortedStudents.filter(s => {
    // Search query check
    const matchesSearch = !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.rfid_uid.toLowerCase().includes(search.toLowerCase()) ||
      (s.university_id || '').toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    // Faculty Filter
    if (filterFaculty) {
      const dept = departments.find(d => d.id === s.department_id);
      if (!dept || String(dept.faculty_id) !== String(filterFaculty)) return false;
    }

    // Dept Filter
    if (filterDept && String(s.department_id) !== String(filterDept)) return false;

    // Year Filter
    if (filterYear && String(s.academic_year) !== String(filterYear)) return false;

    return true;
  });

  const columns = [
    { key: 'id', label: 'ID', render: (_, __, i) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>#{i + 1}</span> },
    {
      key: 'name', label: 'Name', render: (v, row) => (
        <span
          onClick={() => navigate(`/students/${row.id}`)}
          style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent)', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
          onMouseLeave={e => e.target.style.textDecoration = 'none'}
        >
          {v}
          {row.is_blacklisted && <span style={{ marginLeft: 8, color: 'var(--red)', fontSize: 11 }}>⛔ BLACKLISTED</span>}
        </span>
      )
    },
    { key: 'university_id', label: 'Univ ID', render: v => v ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'phone_number', label: 'Phone', render: v => v ? <span style={{ color: 'var(--green-light)', fontWeight: 500, fontSize: 13, fontFamily: 'var(--font-mono)' }}>📞 {formatPhoneNumber(v)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'email', label: 'Email', render: v => <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{v}</span> },
    
    {
      key: 'academic_path',
      label: 'Academic Path',
      render: (_, row) => {
        const dept = departments.find(d => d.id === row.department_id);
        const fac = dept ? faculties.find(f => f.id === dept.faculty_id) : null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fac?.name || '---'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dept?.name || 'No Dept'}</div>
          </div>
        );
      }
    },
    {
      key: 'academic_standing',
      label: 'Standing & Status',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ 
            padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)', 
            borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.2)' 
          }}>
            Year {row.academic_year || '?'}
          </div>
          <Badge color={row.academic_status === 'ACTIVE' ? 'green' : (row.academic_status === 'REPEATER' || row.academic_status === 'PROBATION') ? 'red' : 'yellow'}>
            {row.academic_status || 'ACTIVE'}
          </Badge>
        </div>
      )
    },

    { key: 'rfid_uid', label: 'RFID', render: v => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</span> },
    {
      key: 'actions', label: 'Actions', render: (v, row) => isAdmin ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row); }}>Delete</Btn>
        </div>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Students</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{students.length} enrolled students</p>
          </div>
          <div style={{ background: 'var(--bg-raised)', borderRadius: 20, padding: '4px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{filtered.length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Showing</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
           <Btn variant="ghost" onClick={() => {
              setFilterFaculty('');
              setFilterDept('');
              setFilterYear('');
              setSearch('');
           }}>⟳ Reset Filters</Btn>
           {isAdmin && isSuperAdmin && <Btn variant="ghost" onClick={loadAudit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={16} /> Audit Logs</Btn>}
           {isAdmin && <Btn onClick={handleStartDiscovery} variant="ghost" style={{ border: '1px solid var(--accent)', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}><Radio size={16} /> Scan Card</Btn>}
           {isAdmin && <Btn onClick={() => { setForm(emptyForm); setModal(true); }}>+ Add Student</Btn>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.5, minWidth: 250 }}>
          <Card style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, RFID, or university ID…"
              style={{ border: 'none', background: 'transparent', padding: 0 }}
              onFocus={e => e.target.parentElement.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.parentElement.style.borderColor = 'var(--border)'}
            />
          </Card>
        </div>

        {(isAdmin || assignedDeptIds.length > 1) && (
          <>
            <div style={{ flex: 1, minWidth: 150 }}>
              <FancySelect 
                value={filterFaculty} 
                onSelect={val => { setFilterFaculty(val); setFilterDept(''); }}
                options={faculties.map(f => ({ value: f.id, label: f.name }))}
                placeholder="All Faculties"
              />
            </div>

            <div style={{ flex: 1, minWidth: 150 }}>
              <FancySelect 
                value={filterDept} 
                onSelect={val => setFilterDept(val)}
                options={filteredDepartments.map(d => ({ value: d.id, label: d.name }))}
                placeholder="All Departments"
              />
            </div>
          </>
        )}

        <div style={{ width: 120 }}>
          <FancySelect 
            value={filterYear} 
            onSelect={val => setFilterYear(val)}
            options={(() => {
              const selFac = faculties.find(f => String(f.id) === String(filterFaculty));
              const max = selFac?.total_years || 6;
              return Array.from({ length: max }, (_, i) => i + 1).map(y => ({
                value: String(y),
                label: `Year ${y}`
              }));
            })()}
            placeholder="All Years"
          />
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={filtered} maxHeight="480px" emptyText="No students match the selected filters" />
      </Card>

      {/* RFID Discovery Modal */}
      {isDiscoveryOpen && (
        <Modal title="Scan RFID Card" onClose={closeDiscoveryModal} width={400}>
          <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {!scannedUid ? (
              <>
                <div className="pulse-animation" style={{ padding: 20, background: 'var(--accent-light)', borderRadius: '50%', color: 'var(--accent)' }}>
                  <Radio size={48} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ready to Scan</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Please tap the student's card on the RFID reader.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13 }}>
                  <Loader2 size={14} className="spin" />
                  <span>Waiting for hardware signal...</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: 20, background: existingStudent ? 'rgba(99, 102, 241, 0.1)' : 'var(--green-light)', borderRadius: '50%', color: existingStudent ? 'var(--accent)' : 'var(--green)' }}>
                  {existingStudent ? <ShieldCheck size={48} /> : <CheckCircle2 size={48} />}
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    {existingStudent ? 'Card Already Registered' : 'New Card Captured!'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                    {existingStudent 
                      ? `This card is assigned to ${existingStudent.name}.`
                      : 'This UID is not yet registered in the system.'}
                  </p>

                  {existingStudent && (
                    <div style={{ background: 'var(--bg-raised)', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid var(--border)', textAlign: 'left' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Student Info:</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{existingStudent.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {existingStudent.university_id || 'N/A'}</div>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    background: 'var(--bg-secondary)',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px dashed var(--border)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    {scannedUid}
                    <Btn size="sm" variant="ghost" onClick={() => copyUid(scannedUid)} style={{ padding: 4 }}>
                      {copiedUid ? <CheckCircle2 size={16} color="var(--green)" /> : <Copy size={16} />}
                    </Btn>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 10 }}>
                  <Btn onClick={closeDiscoveryModal} variant="ghost" style={{ flex: 1 }}>Close</Btn>
                  {!existingStudent ? (
                    <Btn onClick={() => {
                      setForm({ ...emptyForm, rfid_uid: scannedUid });
                      setIsDiscoveryOpen(false);
                      setModal(true);
                    }} style={{ flex: 2 }}>
                      Use to Register
                    </Btn>
                  ) : (
                    <Btn onClick={() => {
                      navigate(`/students/${existingStudent.id}`);
                      closeDiscoveryModal();
                    }} style={{ flex: 2 }}>
                      View Profile
                    </Btn>
                  )}
                </div>
              </>
            )}

            {!scannedUid && (
              <Btn variant="ghost" onClick={closeDiscoveryModal} style={{ marginTop: 10 }}>Cancel</Btn>
            )}
          </div>
        </Modal>
      )}

      {/* Add Modal */}
      {modal && (
        <Modal title="Add Student" onClose={() => setModal(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full name">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Omar Khaled" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="omar@student.edu" required />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="RFID UID">
                <Input
                  value={form.rfid_uid}
                  onChange={e => setForm(f => ({ ...f, rfid_uid: e.target.value }))}
                  placeholder="e.g. AABBCCDD"
                />
              </Field>
              <Field label="University ID">
                <Input value={form.university_id} onChange={e => setForm(f => ({ ...f, university_id: e.target.value }))} placeholder="e.g. 20210001" />
              </Field>
              <Field label="Phone Number (Egypt)">
                <Input type="tel" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Faculty">
                <Select value={selectedFacultyId} onChange={e => {
                  setSelectedFacultyId(e.target.value);
                  setForm(f => ({ ...f, department_id: '' }));
                }} required>
                  <option value="">Select Faculty</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="Department">
                <Select
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  disabled={!selectedFacultyId}
                  required
                >
                  <option value="">Select Department</option>
                  {departments
                    .filter(d => d.faculty_id === parseInt(selectedFacultyId))
                    .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                  }
                </Select>
              </Field>
              <Field label="Year">
                <Select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
              <Field label="Semester">
                <Select value={form.current_semester} onChange={e => setForm(f => ({ ...f, current_semester: e.target.value }))}>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.academic_status} onChange={e => setForm(f => ({ ...f, academic_status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="REPEATER">REPEATER</option>
                  <option value="DISMISSED">DISMISSED</option>
                  <option value="GRADUATED">GRADUATED</option>
                </Select>
              </Field>
            </div>
            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
            <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Profile Details</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Personal Email">
                <Input type="email" value={form.personal_email} onChange={e => setForm(f => ({ ...f, personal_email: e.target.value }))} placeholder="personal@gmail.com" />
              </Field>
              <Field label="Emergency Phone">
                <Input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />
              </Field>
            </div>

            <Field label="Student Bio / Notes">
              <Input 
                value={form.bio} 
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} 
                placeholder="Brief professional or academic background..." 
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
              <Btn variant="ghost" onClick={() => setModal(false)} type="button">Cancel</Btn>
              <Btn type="submit">Add Student</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Modal title="Edit Student" onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Full name">
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="RFID UID">
                <Input value={form.rfid_uid} onChange={e => setForm(f => ({ ...f, rfid_uid: e.target.value }))} required />
              </Field>
              <Field label="University ID">
                <Input value={form.university_id} onChange={e => setForm(f => ({ ...f, university_id: e.target.value }))} />
              </Field>
              <Field label="Phone Number (Egypt)">
                <Input type="tel" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Faculty">
                <Select value={selectedFacultyId} onChange={e => {
                  setSelectedFacultyId(e.target.value);
                  setForm(f => ({ ...f, department_id: '' }));
                }} required>
                  <option value="">Select Faculty</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </Select>
              </Field>
              <Field label="Department">
                <Select
                  value={form.department_id}
                  onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                  disabled={!selectedFacultyId}
                  required
                >
                  <option value="">Select Department</option>
                  {departments
                    .filter(d => d.faculty_id === parseInt(selectedFacultyId))
                    .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                  }
                </Select>
              </Field>
              <Field label="Year">
                <Select value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}>
                  <option value="">—</option>
                  {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
              <Field label="Semester">
                <Select value={form.current_semester} onChange={e => setForm(f => ({ ...f, current_semester: e.target.value }))}>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.academic_status} onChange={e => setForm(f => ({ ...f, academic_status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PROBATION">PROBATION</option>
                  <option value="REPEATER">REPEATER</option>
                  <option value="DISMISSED">DISMISSED</option>
                  <option value="GRADUATED">GRADUATED</option>
                </Select>
              </Field>
            </div>

            <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
            <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Profile Details</h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Personal Email">
                <Input type="email" value={form.personal_email} onChange={e => setForm(f => ({ ...f, personal_email: e.target.value }))} placeholder="personal@gmail.com" />
              </Field>
              <Field label="Emergency Phone">
                <Input type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value.replace(/\D/g, "") }))} placeholder="01XXXXXXXXX" maxLength={11} />
              </Field>
            </div>

            <Field label="Student Bio / Notes">
              <Input 
                value={form.bio} 
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} 
                placeholder="Brief professional or academic background..." 
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setEditModal(null)} type="button">Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Student"
          message={`Are you sure you want to delete ${deleteConfirm.name}? This will also remove their attendance records, enrollments, and grades.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}

      {auditModal && (
        <Modal title="Student Management Audit Logs" onClose={() => setAuditModal(false)} width={800}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', padding: '10px 4px' }}>
            {auditLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Loading logs...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No logs found for Student management.</div>
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
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {new Date(log.timestamp).toLocaleString()}</span>
                        {log.user_email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>By: {log.user_email}</span>}
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 20, textAlign: 'center' }}>
             <Btn variant="ghost" onClick={() => window.location.href='/monitoring'}>Open Full Monitoring Hub <ExternalLink size={14} style={{ marginLeft: 8 }} /></Btn>
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
