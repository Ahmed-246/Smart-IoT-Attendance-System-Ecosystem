import { useEffect, useState } from 'react';
import { sessionsApi, coursesApi, attendanceApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, Table, Badge, Btn, Field, FancySelect, Input, PageLoader, ProgressBar, StatCard, useToast } from '../components/ui';
import { formatDate, formatDateTime } from '../utils/formatters';
import { Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const [sessions, setSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Form state
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState(null);
  
  // Filters state
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [repLoad, setRepLoad] = useState(false);
  const { toast, ToastContainer } = useToast();
  const { isAdmin, assignedDeptIds, assignedFacIds } = useAuth();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [s, all, c, f, d] = await Promise.allSettled([
      sessionsApi.active(), 
      sessionsApi.all(), 
      coursesApi.list(),
      facultiesApi.list(),
      departmentsApi.list()
    ]);
    if (s.status === 'fulfilled') setSessions(s.value.data);
    if (all.status === 'fulfilled') setAllSessions(all.value.data);
    if (c.status === 'fulfilled') setCourses(c.value.data);
    if (f.status === 'fulfilled') setFaculties(f.value.data);
    if (d.status === 'fulfilled') setDepartments(d.value.data);
    setLoading(false);
  }

  async function fetchReport() {
    if (!selected) return;
    setRepLoad(true); setReport(null);
    try {
      const r = await attendanceApi.report(Number(selected));
      setReport(r.data);
    } catch { toast('Failed to load report', 'error'); }
    setRepLoad(false);
  }

  function exportCSV() {
    if (!report) return;

    // Resolve context names for the filename and header
    const fac = faculties.find(f => String(f.id) === String(filterFaculty))?.name || 'All-Faculties';
    const dept = departments.find(d => String(d.id) === String(filterDept))?.name || 'All-Departments';
    const year = filterYear ? `Year-${filterYear}` : 'All-Years';
    const course = report.course_name;
    const dateStr = report.records.find(r => r.timestamp)?.timestamp?.slice(0, 10).replace(/-/g, '/') || 'Unknown-Date';
    
    // 1. Build Metadata Header
    const header = [
      ['ATTENDANCE REPORT'],
      ['Faculty', fac],
      ['Department', dept],
      ['Academic Year', year],
      ['Course', course],
      ['Session ID', `#${report.session_id}`],
      ['Date', dateStr],
      ['Attendance Rate', `${report.attendance_rate}%`],
      ['Total', report.total_students],
      ['Present', report.present],
      ['Absent', report.absent],
      [''], // empty line
      ['Student Name', 'University ID', 'Department', 'Time', 'Status']
    ];

    // 2. Build Records
    const rows = [
      ...header,
      ...report.records.map(r => [
        r.student_name, 
        r.university_id || 'N/A', 
        r.department_name || 'N/A', 
        r.timestamp ? formatDateTime(r.timestamp) : '—', 
        r.status.toUpperCase()
      ]),
    ];

    // 3. Generate CSV
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 4. Custom Filename: [faculty - department - year - session - date]
    const safeFac = fac.slice(0, 15).trim();
    const safeDept = dept.slice(0, 15).trim();
    const safeCourse = course.slice(0, 20).trim();
    const filename = `[${safeFac} - ${safeDept} - ${year} - ${safeCourse} - ${dateStr.replace(/\//g, '-')}].csv`;
    
    const a = document.createElement('a'); 
    a.href = url;
    a.download = filename; 
    a.click();
    URL.revokeObjectURL(url);
    toast(`Report exported: ${filename}`);
  }

  const columns = [
    { key: 'student_name', label: 'Student', render: v => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span> },
    { key: 'university_id', label: 'ID', render: v => <span className="mono" style={{ fontSize: 12 }}>{v || '—'}</span> },
    { key: 'timestamp', label: 'Time', render: v => <span className="mono" style={{ fontSize: 12 }}>{v ? formatDateTime(v) : '—'}</span> },
    { key: 'status', label: 'Status', render: v => (
      <Badge color={v === 'present' ? 'green' : v === 'late' ? 'amber' : 'red'}>{v}</Badge>
    )},
  ];

  if (loading) return <PageLoader />;

  // Cascading Filters Logic
  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));
  
  const displayFaculties = isAdmin ? faculties : faculties.filter(f => assignedFacIds.includes(f.id));
  const displayDepts = isAdmin ? filteredDepartments : filteredDepartments.filter(d => assignedDeptIds.includes(d.id));

  const filteredCourses = courses.filter(c => {
    if (!isAdmin && !assignedDeptIds.includes(c.department_id)) return false;
    if (filterDept && String(c.department_id) !== String(filterDept)) return false;
    if (!filterDept && filterFaculty) {
      const deptIds = filteredDepartments.map(d => d.id);
      if (!deptIds.includes(c.department_id)) return false;
    }
    if (filterYear && String(c.academic_year) !== String(filterYear)) return false;
    return true;
  });

  const baseSessions = allSessions.length > 0 ? allSessions : sessions;
  const availableSessions = baseSessions.filter(s => {
    const course = courses.find(c => c.id === s.course_id);
    if (!course) return false;
    if (!isAdmin && !assignedDeptIds.includes(course.department_id)) return false;

    if (filterCourse && String(s.course_id) !== String(filterCourse)) return false;
    
    if (filterFaculty) {
      const dept = departments.find(d => d.id === course.department_id);
      if (!dept || String(dept.faculty_id) !== String(filterFaculty)) return false;
    }
    if (filterDept && String(course.department_id) !== String(filterDept)) return false;
    if (filterYear && String(course.academic_year) !== String(filterYear)) return false;
    
    if (filterDate) {
      if (!s.start_time || !s.start_time.startsWith(filterDate)) return false;
    }
    
    return true;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Search and export attendance sessions</p>
        </div>
        <Btn variant="ghost" onClick={() => {
          setFilterFaculty('');
          setFilterDept('');
          setFilterYear('');
          setFilterCourse('');
          setFilterDate('');
          setSelected('');
          setReport(null);
        }}>⟳ Reset Filters</Btn>
      </div>

      <Card style={{ padding: '24px 28px', background: 'var(--bg-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
           <Filter size={14} style={{ color: 'var(--accent)' }} /> 
           <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Sessions</h3>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Field label="FACULTY">
              <FancySelect 
                value={filterFaculty} 
                onSelect={val => { setFilterFaculty(val); setFilterDept(''); setFilterCourse(''); setSelected(''); }}
                options={displayFaculties.map(f => ({ value: f.id, label: f.name }))}
                placeholder="All Faculties"
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Field label="DEPARTMENT">
              <FancySelect 
                value={filterDept} 
                onSelect={val => { setFilterDept(val); setFilterCourse(''); setSelected(''); }}
                options={displayDepts.map(d => ({ value: d.id, label: d.name }))}
                placeholder="All Departments"
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <Field label="ACADEMIC YEAR">
              <FancySelect 
                value={filterYear} 
                onSelect={val => { setFilterYear(val); setFilterCourse(''); setSelected(''); }}
                options={[1,2,3,4,5,6].map(y => ({ value: String(y), label: `Year ${y}` }))}
                placeholder="All Years"
              />
            </Field>
          </div>
          <div style={{ flex: 1.5, minWidth: 180 }}>
            <Field label="COURSE">
              <FancySelect 
                value={filterCourse} 
                onSelect={val => { 
                  setFilterCourse(val); 
                  setSelected(''); 
                  if (val) {
                    const c = courses.find(course => String(course.id) === String(val));
                    if (c) {
                      const d = departments.find(dept => dept.id === c.department_id);
                      if (d) setFilterFaculty(String(d.faculty_id));
                      setFilterDept(String(c.department_id));
                      setFilterYear(String(c.academic_year));
                    }
                  }
                }}
                options={filteredCourses.map(c => ({ value: c.id, label: `${c.course_code ? `[${c.course_code}] ` : ''}${c.name}` }))}
                placeholder="All Courses"
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
             <Field label="SPECIFIC DATE">
                <Input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => { setFilterDate(e.target.value); setSelected(''); }} 
                  style={{ background: 'var(--bg-card)' }}
                />
             </Field>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 -28px 20px' }}></div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Field label="SELECT SESSION">
              <FancySelect 
                value={selected} 
                onSelect={val => setSelected(val)}
                options={availableSessions.map(s => {
                  const course = courses.find(c => c.id === s.course_id);
                  const courseName = course?.name || 'Course #' + s.course_id;
                  return {
                    value: String(s.id),
                    label: `#${s.id} — ${courseName} (${formatDate(s.start_time)}) ${s.is_active ? '● Active' : '○ Ended'}`
                  };
                })}
                placeholder={availableSessions.length === 0 ? "No sessions match filters" : "— Choose a session to report on —"}
              />
            </Field>
          </div>
          <Btn onClick={fetchReport} disabled={!selected || repLoad} style={{ height: 42 }}>
            {repLoad ? 'Loading…' : 'Load Report'}
          </Btn>
        </div>
      </Card>

      {report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <StatCard label="Total Students" value={report.total_students} color="var(--text-primary)" />
            <StatCard label="Present" value={report.present} color="var(--green)" />
            <StatCard label="Absent" value={report.absent} color="var(--red)" />
            <StatCard label="Attendance Rate" value={`${report.attendance_rate}%`} color="var(--accent)" />
          </div>

          <Card>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Attendance rate / Overview</div>
              <ProgressBar value={report.attendance_rate} />
            </div>
          </Card>

          <Card style={{ padding: 0, maxHeight: 400, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Attendance Records — {report.course_name}</h2>
              <Btn variant="ghost" size="sm" onClick={exportCSV}>↓ Export CSV</Btn>
            </div>
            <Table columns={columns} rows={report.records} emptyText="No records for this session" />
          </Card>
        </>
      )}
    </div>
  );
}
