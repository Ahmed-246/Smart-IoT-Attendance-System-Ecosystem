import { useEffect, useState } from 'react';
import { sessionsApi, coursesApi, attendanceApi, instructorsApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, Field, Input, FancySelect, PageLoader, ProgressBar, useToast } from '../components/ui';
import { formatDateTime } from '../utils/formatters';
import { Filter, PlayCircle } from 'lucide-react';

export function SessionsPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [modal, setModal] = useState(false);
  
  // Create Modal State
  const [form, setForm] = useState({ course_id: '', instructor_id: '' });
  const [createFaculty, setCreateFaculty] = useState('');
  const [createDept, setCreateDept] = useState('');
  const [createYear, setCreateYear] = useState('');

  const [searchQ, setSearchQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { toast, ToastContainer } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, c, i, f, d] = await Promise.all([
        sessionsApi.active(), 
        coursesApi.list(), 
        instructorsApi.list(),
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      setSessions(s.data);
      setCourses(c.data);
      setInstructors(i.data);
      setFaculties(f.data || []);
      setDepartments(d.data || []);
    } catch (err) {
      toast('Failed to load initial data', 'error');
    }
    setLoading(false);
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = {};
      if (searchQ) params.q = searchQ;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await sessionsApi.history(params);
      setHistory(r.data);
    } catch { toast('Failed to load history', 'error'); }
    setHistoryLoading(false);
  }

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  async function createSession(e) {
    if (e) e.preventDefault();
    try {
      await sessionsApi.create({ 
        course_id: Number(form.course_id), 
        instructor_id: form.instructor_id ? Number(form.instructor_id) : null 
      });
      toast('Session started successfully');
      setModal(false); 
      setForm({ course_id: '', instructor_id: '' });
      setCreateFaculty(''); setCreateDept(''); setCreateYear('');
      load();
    } catch (err) { toast(err.response?.data?.detail || 'Failed to create session', 'error'); }
  }

  async function closeSession(id) {
    try { await sessionsApi.close(id); toast('Session closed'); load(); }
    catch { toast('Failed to close session', 'error'); }
  }

  async function viewReport(sessionId) {
    setReportLoading(true);
    try { const r = await attendanceApi.report(sessionId); setReport(r.data); }
    catch { toast('Failed to load report', 'error'); }
    setReportLoading(false);
  }

  async function exportCSV() {
    try {
      const r = await sessionsApi.exportCSV();
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'session_history.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('CSV exported');
    } catch { toast('Failed to export', 'error'); }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadHistory();
  }

  // Filtered Options for Create Modal
  const filteredDepartments = departments.filter(d => !createFaculty || String(d.faculty_id) === String(createFaculty));
  const filteredCourses = courses.filter(c => {
    if (createDept && String(c.department_id) !== String(createDept)) return false;
    if (!createDept && createFaculty) {
      const deptIds = filteredDepartments.map(d => d.id);
      if (!deptIds.includes(c.department_id)) return false;
    }
    if (createYear && String(c.academic_year) !== String(createYear)) return false;
    return true;
  });

  const activeColumns = [
    { key: 'id', label: 'ID', render: v => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{v}</span> },
    { key: 'course_id', label: 'Course', render: v => <span style={{ fontWeight: 500 }}>{courses.find(c => c.id === v)?.name || `Course #${v}`}</span> },
    { key: 'instructor_id', label: 'Instructor', render: v => { const i = instructors.find(x => x.id === v); return i ? <Badge color="blue">{i.name}</Badge> : '—'; }},
    { key: 'start_time', label: 'Started', render: v => <span className="mono" style={{ fontSize: 12 }}>{formatDateTime(v)}</span> },
    { key: 'is_active', label: 'Status', render: v => <Badge color={v ? 'green' : 'default'}>{v ? 'Active' : 'Closed'}</Badge> },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" variant="ghost" onClick={() => viewReport(v)} disabled={reportLoading}>Report</Btn>
        {row.is_active && <Btn size="sm" variant="danger" onClick={() => closeSession(v)}>Close</Btn>}
      </div>
    )},
  ];

  const historyColumns = [
    { key: 'id', label: 'ID', render: v => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{v}</span> },
    { key: 'course_id', label: 'Course', render: v => <span style={{ fontWeight: 500 }}>{courses.find(c => c.id === v)?.name || `Course #${v}`}</span> },
    { key: 'start_time', label: 'Started', render: v => <span className="mono" style={{ fontSize: 12 }}>{formatDateTime(v)}</span> },
    { key: 'end_time', label: 'Ended', render: v => <span className="mono" style={{ fontSize: 12 }}>{v ? formatDateTime(v) : '—'}</span> },
    { key: 'is_active', label: 'Status', render: v => <Badge color={v ? 'green' : 'default'}>{v ? 'Active' : 'Ended'}</Badge> },
    { key: 'id', label: '', render: (v) => <Btn size="sm" variant="ghost" onClick={() => viewReport(v)}>View Report</Btn> },
  ];

  if (loading) return <PageLoader />;

  const tabStyle = (active) => ({
    padding: '8px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent-glow)' : 'transparent'}`,
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Sessions</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{sessions.length} active sessions globally</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'history' && <Btn variant="ghost" onClick={exportCSV}>↓ Export CSV</Btn>}
          <Btn onClick={() => setModal(true)}>+ New Session</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={tabStyle(activeTab === 'active')} onClick={() => setActiveTab('active')}>
          Active Sessions ({sessions.length})
        </div>
        <div style={tabStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          Session History
        </div>
      </div>

      {/* Active Tab */}
      {activeTab === 'active' && (
        <Card style={{ padding: 0 }}>
          <Table columns={activeColumns} rows={sessions} maxHeight="480px" emptyText="No active sessions" />
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          <Card>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Field label="Search">
                  <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by course name or session #ID..." />
                </Field>
              </div>
              <Field label="From">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </Field>
              <Btn type="submit" disabled={historyLoading}>{historyLoading ? '...' : 'Search'}</Btn>
            </form>
          </Card>
          <Card style={{ padding: 0 }}>
            <Table columns={historyColumns} rows={history} maxHeight="480px" emptyText="No ended sessions found" />
          </Card>
        </>
      )}

      {/* Improved Create Modal with Cascading Filters */}
      {modal && (
        <Modal title="Start New Session" onClose={() => setModal(false)} width={500}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
              <Filter size={14} /> FILTER BY DEPARTMENT
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="FACULTY">
                <FancySelect 
                  value={createFaculty} 
                  onSelect={val => { setCreateFaculty(val); setCreateDept(''); setForm(f => ({ ...f, course_id: '' })); }}
                  options={faculties.map(f => ({ value: f.id, label: f.name }))}
                  placeholder="All Faculties"
                />
              </Field>
              <Field label="DEPARTMENT">
                <FancySelect 
                  value={createDept} 
                  onSelect={val => { setCreateDept(val); setForm(f => ({ ...f, course_id: '' })); }}
                  options={filteredDepartments.map(d => ({ value: d.id, label: d.name }))}
                  placeholder="All Departments"
                  disabled={!createFaculty}
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <Field label="YEAR">
                <FancySelect 
                  value={createYear} 
                  onSelect={val => { setCreateYear(val); setForm(f => ({ ...f, course_id: '' })); }}
                  options={(() => {
                    const selFac = faculties.find(f => String(f.id) === String(createFaculty));
                    const max = selFac?.total_years || 6;
                    return Array.from({ length: max }, (_, i) => i + 1).map(y => ({
                      value: String(y),
                      label: `Year ${y}`
                    }));
                  })()}
                  placeholder="All"
                />
              </Field>
              <Field label="COURSE">
                <FancySelect 
                  value={form.course_id} 
                  onSelect={val => setForm(f => ({ ...f, course_id: val }))}
                  options={filteredCourses.map(c => ({ value: c.id, label: c.name }))}
                  placeholder={filteredCourses.length === 0 ? "No courses found" : "Select a Course"}
                />
              </Field>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            <Field label="INSTRUCTOR (OPTIONAL)">
              <FancySelect 
                value={form.instructor_id} 
                onSelect={val => setForm(f => ({ ...f, instructor_id: val }))}
                options={instructors.map(i => ({ value: i.id, label: i.name }))}
                placeholder="— None selected —"
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn onClick={createSession} disabled={!form.course_id} style={{ gap: 8 }}>
                <PlayCircle size={16} /> Start Session
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Report Modal */}
      {report && (
        <Modal title={`Report — ${report.course_name}`} onClose={() => setReport(null)} width={520}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                ['Total', report.total_students, 'var(--text-primary)'],
                ['Present', report.present, 'var(--green)'],
                ['Absent', report.absent, 'var(--red)'],
                ['Rate', `${report.attendance_rate}%`, 'var(--accent)'],
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-mono)', fontWeight: 500, color: c }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <ProgressBar value={report.attendance_rate} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {report.present} of {report.total_students} students attended this session.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SessionsPage;
