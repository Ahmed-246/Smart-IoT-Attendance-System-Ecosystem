import { useEffect, useState, useMemo } from 'react';
import { adminApi, facultiesApi, departmentsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Table, Badge, Btn, Modal, PageLoader, useToast, Input, Select, Field, Tooltip } from '../components/ui';

export default function RegistrationHistoryPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, capabilities } = useAuth();
  const canPurge = isSuperAdmin || capabilities.includes('SYSTEM_DATA_PURGE');
  const [reasonModal, setReasonModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('APPROVED'); // Default to Approved as requested
  const { toast, ToastContainer } = useToast();

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  useEffect(() => { loadAcademicData(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  async function loadAcademicData() {
    try {
      const results = await Promise.allSettled([
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      const [facRes, deptRes] = results;
      
      if (facRes.status === 'fulfilled') setFaculties(facRes.value.data);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data);
      
    } catch (err) {
      console.error('Failed to load academic data', err);
    }
  }

  async function load() {
    setLoading(true);
    try { 
      const res = await adminApi.listRegistrationHistory(statusFilter); 
      setRequests(res.data); 
    } catch(err) {
      toast('Failed to load registration history', 'error');
    }
    setLoading(false);
  }

  async function handleExport() {
    try {
      const res = await adminApi.exportRegistrationHistory(statusFilter);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `registration_${statusFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast('Failed to export history', 'error');
    }
  }

  async function handleClear() {
    if (!window.confirm(`Are you sure you want to permanently clear all ${statusFilter.toLowerCase()} registration history? This action cannot be undone.`)) return;
    
    try {
      setLoading(true);
      await adminApi.clearRegistrationHistory(statusFilter);
      toast(`Successfully cleared ${statusFilter.toLowerCase()} history`);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to clear history', 'error');
    } finally {
      setLoading(false);
    }
  }

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

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const queryMatch = !searchQuery || 
        req.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.university_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const facMatch = !filterFaculty || (departments.find(d => d.id === req.department_id)?.faculty_id === Number(filterFaculty));
      const deptMatch = !filterDept || (req.department_id === Number(filterDept));
      const yearMatch = !filterYear || (req.academic_year === Number(filterYear));
      const semMatch = !filterSemester || (req.current_semester === Number(filterSemester));

      return queryMatch && facMatch && deptMatch && yearMatch && semMatch;
    });
  }, [requests, searchQuery, filterFaculty, filterDept, filterYear, filterSemester, departments]);

  const columns = [
    { key: 'name', label: 'Student', render: (v, row) => (
      <div>
         <div style={{fontWeight: 600}}>{v}</div>
         <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{row.email}</div>
      </div>
    )},
    { key: 'university_id', label: 'University ID', render: v => <span className="mono">{v || '—'}</span> },
    { key: 'department_id', label: 'Academic Details', render: (v, row) => {
      const facName = row.faculty_name || getFacName(v);
      const deptName = row.department_name || getDeptName(v);
      return (
        <Tooltip position="bottom" content={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>🏛️ {facName || 'Unknown Faculty'}</div>
            <div style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-primary)' }}>📚 {deptName || `Department #${v}`}</div>
            <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
              <Badge color="blue" style={{ fontSize: 9, padding: '2px 6px' }}>Level {row.academic_year || '?'}</Badge>
              <Badge color="purple" style={{ fontSize: 9, padding: '2px 6px' }}>Sem {row.current_semester || '?'}</Badge>
            </div>
          </div>
        }>
          <div style={{ cursor: 'help', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{deptName || `Dept #${v}`}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              Year {row.academic_year || '?'} • Sem {row.current_semester || '?'}
            </div>
          </div>
        </Tooltip>
      );
    }},
    { 
      key: statusFilter === 'REJECTED' ? 'rejected_at' : 'approved_at', 
      label: 'Date/Time', 
      render: v => v ? (
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <span style={{fontSize: 13, fontWeight: 500}}>{new Date(v).toLocaleDateString()}</span>
          <span style={{fontSize: 11, color: 'var(--text-muted)'}}>{new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ) : '—'
    },
    { 
      key: statusFilter === 'REJECTED' ? 'rejected_by_name' : 'approved_by_name', 
      label: 'Processed By', 
      render: (v, row) => {
        const adminId = statusFilter === 'REJECTED' ? row.rejected_by_id : row.approved_by_id;
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{v || 'System'}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>ID: #{adminId || '0'}</span>
          </div>
        );
      }
    },
    ...(statusFilter === 'REJECTED' ? [{ 
      key: 'rejection_reason', 
      label: 'Reason', 
      render: (v, row) => (
        <Btn size="sm" variant="ghost" onClick={() => setReasonModal(row)} style={{ color: 'var(--error)' }}>View Reason</Btn>
      ) 
    }] : [])
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>Registration History</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Audit trail for all student admission decisions</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Btn 
            variant="ghost" 
            onClick={() => {
              setSearchQuery('');
              setFilterFaculty('');
              setFilterDept('');
              setFilterYear('');
              setFilterSemester('');
            }}
            style={{ fontSize: 13, height: 38 }}
          >
            ⟳ Reset Filters
          </Btn>

          {statusFilter === 'REJECTED' && canPurge && (
             <Btn 
                variant="ghost" 
                onClick={handleClear}
                style={{ fontSize: 13, height: 38, color: 'var(--red)', borderColor: 'var(--red-dim)' }}
             >
                🗑 Clear Rejected
             </Btn>
          )}

          <button 
            className="btn-export-power"
            onClick={handleExport}
            style={{ height: 38 }}
          >
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export {statusFilter === 'APPROVED' ? 'Approved' : 'Rejected'}
          </button>

          {/* ── Status Toggle Switch ────────────────────────────────────────── */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-section)', 
            padding: 4, 
            borderRadius: 8, 
            border: '1px solid var(--border)',
            gap: 4
          }}>
            <button 
              onClick={() => setStatusFilter('APPROVED')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: statusFilter === 'APPROVED' ? 'var(--accent)' : 'transparent',
                color: statusFilter === 'APPROVED' ? '#fff' : 'var(--text-muted)',
                boxShadow: statusFilter === 'APPROVED' ? '0 2px 8px rgba(var(--accent-rgb), 0.3)' : 'none'
              }}
            >
              Approved
            </button>
            <button 
              onClick={() => setStatusFilter('REJECTED')}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: statusFilter === 'REJECTED' ? 'var(--error)' : 'transparent',
                color: statusFilter === 'REJECTED' ? '#fff' : 'var(--text-muted)',
                boxShadow: statusFilter === 'REJECTED' ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
              }}
            >
              Rejected
            </button>
          </div>
        </div>
      </div>

      <Card style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Field label="Search">
            <Input 
              placeholder="Search Name, Email, or ID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </Field>
          <Field label="Faculty">
            <Select value={filterFaculty} onChange={e => {
              setFilterFaculty(e.target.value);
              setFilterDept('');
            }}>
              <option value="">All Faculties</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
          <Field label="Department">
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} disabled={!filterFaculty}>
              <option value="">All Departments</option>
              {departments.filter(d => !filterFaculty || d.faculty_id === Number(filterFaculty)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Academic Year">
            <Select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {(() => {
                const selFac = faculties.find(f => String(f.id) === String(filterFaculty));
                const max = selFac?.total_years || 6;
                return Array.from({ length: max }, (_, i) => i + 1).map(y => (
                  <option key={y} value={y}>Level {y}</option>
                ));
              })()}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
              <option value="">All Semesters</option>
              {(() => {
                const selFac = faculties.find(f => String(f.id) === String(filterFaculty));
                const maxSem = selFac?.semesters_per_year || 2;
                return Array.from({ length: maxSem }, (_, i) => i + 1).map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ));
              })()}
            </Select>
          </Field>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0' }}><PageLoader inset /></div>
        ) : (
          <>
            <Table 
              columns={columns} 
              rows={filteredRequests} 
              maxHeight="480px"
              emptyText={`No ${statusFilter.toLowerCase()} requests found matching filters`} 
            />
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right', fontWeight: 500 }}>
              Found {filteredRequests.length} decision(s) in {statusFilter.toLowerCase()} archive
            </div>
          </>
        )}
      </Card>

      {/* ── Rejection Reason Modal ──────────────────────────────────────── */}
      {reasonModal && (
        <Modal title="Rejection Context" onClose={() => setReasonModal(null)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px', background: 'var(--bg-section)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{reasonModal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>Email: <span style={{ color: 'var(--text-primary)' }}>{reasonModal.email}</span></div>
                <div>Univ ID: <span style={{ color: 'var(--text-primary)' }}>{reasonModal.university_id || 'N/A'}</span></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Processed By:</div>
                <div style={{ padding: '8px 12px', background: 'var(--bg-section)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                   <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{reasonModal.rejected_by_name || 'System'}</div>
                   <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID: #{reasonModal.rejected_by_id || '0'}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Official Rejection Reason:</div>
                <div style={{ 
                  padding: '12px', 
                  background: 'rgba(239, 68, 68, 0.08)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  fontStyle: 'italic'
                }}>
                  "{reasonModal.rejection_reason || 'No specific reason provided.'}"
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="primary" onClick={() => setReasonModal(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
