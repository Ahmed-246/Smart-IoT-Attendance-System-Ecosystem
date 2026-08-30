import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradebookDashboardApi, facultiesApi, departmentsApi, studentsApi } from '../api/client';
import { Card, Btn, Select, FancySelect, Input, Field, PageLoader, useToast } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Search, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Filter, TrendingUp } from 'lucide-react';

export default function GradebookView() {
  const { role, userId, studentId } = useAuth();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    if (role === 'student') {
      navigate(`/students/${studentId || userId}`);
    }
  }, [role, navigate, studentId, userId]);

  if (role === 'student') return <PageLoader />;

  // Term info
  const [termInfo, setTermInfo] = useState(null);

  // Filter state
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [students, setStudents] = useState([]);

  // Report data
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 500; 

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const [termRes, facRes, depRes, stRes] = await Promise.all([
        gradebookDashboardApi.termInfo(),
        facultiesApi.list(),
        departmentsApi.list(),
        studentsApi.list()
      ]);
      setTermInfo(termRes.data);
      setFaculties(facRes.data);
      setDepartments(depRes.data);
      setStudents(stRes.data);
    } catch (err) {
      toast('Failed to load term data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!filterFaculty && !filterDept && !filterYear && !filterStudent) {
      toast('Please select at least one filter', 'error');
      return;
    }
    setReportLoading(true);
    setPage(1);
    try {
      const params = { page: 1, page_size: pageSize };
      if (filterFaculty) params.faculty_id = filterFaculty;
      if (filterDept) params.department_id = filterDept;
      if (filterYear) params.year_level = filterYear;
      if (filterStudent) params.student_id = filterStudent;
      if (searchQuery) params.search = searchQuery;

      const res = await gradebookDashboardApi.report(params);
      setReport(res.data);
    } catch (err) {
      toast('Failed to generate report', 'error');
    } finally {
      setReportLoading(false);
    }
  }

  async function loadPage(newPage) {
    setReportLoading(true);
    setPage(newPage);
    try {
      const params = { page: newPage, page_size: pageSize };
      if (filterFaculty) params.faculty_id = filterFaculty;
      if (filterDept) params.department_id = filterDept;
      if (filterYear) params.year_level = filterYear;
      if (filterStudent) params.student_id = filterStudent;
      if (searchQuery) params.search = searchQuery;

      const res = await gradebookDashboardApi.report(params);
      setReport(res.data);
    } catch (err) {
      toast('Failed to load page', 'error');
    } finally {
      setReportLoading(false);
    }
  }

  // Cascading filters
  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));
  const filteredStudents = students.filter(s => {
      if (filterDept && String(s.department_id) !== String(filterDept)) return false;
      if (!filterDept && filterFaculty) {
          const dIds = filteredDepartments.map(d => d.id);
          if (!dIds.includes(s.department_id)) return false;
      }
      if (filterYear && String(s.academic_year) !== String(filterYear)) return false;
      return true;
  });

  // Local search filter on loaded data
  const displayStudents = report?.students?.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.university_id?.toLowerCase().includes(q) || s.student_name?.toLowerCase().includes(q);
  }) || [];

  // Summary stats from loaded report
  const totalStudents = report?.total || 0;
  const passedCount = displayStudents.filter(s => s.status === 'Passed').length;
  const failedCount = displayStudents.filter(s => s.status === 'Failed').length;
  const atRiskCount = displayStudents.filter(s => s.at_risk).length;
  const avgGrade = displayStudents.length > 0
    ? displayStudents.reduce((sum, s) => sum + s.final_grade_percentage, 0) / displayStudents.length
    : 0;

  const totalPages = Math.ceil(totalStudents / pageSize);

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileSpreadsheet size={28} style={{ color: 'var(--accent)' }} />
            Grade Book
          </h1>
          {termInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 14px', borderRadius: 20,
                fontSize: 13, fontWeight: 600, color: 'var(--accent)',
                letterSpacing: '0.02em'
              }}>
                Academic Year {termInfo.academic_year_label} — Term {termInfo.current_semester}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Real-time academic performance dashboard
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters Panel ─────────────────────────────────────── */}
      <Card style={{
        background: 'linear-gradient(135deg, #0f1520 0%, #161d2e 100%)',
        border: '1px solid rgba(245, 158, 11, 0.1)',
        padding: '24px 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filter size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Report Filters</span>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => {
            setFilterFaculty(''); setFilterDept(''); setFilterYear(''); setFilterStudent('');
            setReport(null); setSearchQuery('');
          }}>Reset All</Btn>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1.2 1 200px' }}>
            <Field label="FACULTY">
              <Select value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setFilterDept(''); }}>
                <option value="">All Faculties</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ flex: '1.2 1 200px' }}>
            <Field label="DEPARTMENT">
              <Select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ flex: '0 0 110px' }}>
            <Field label="ACADEMIC LEVEL">
              <Select value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterStudent(''); }}>
                <option value="">All Years</option>
                {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
              </Select>
            </Field>
          </div>

          <div style={{ flex: '1.2 1 180px' }}>
            <Field label="SELECT STUDENT">
               <Select value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
                  <option value="">-- {filteredStudents.length} Students --</option>
                  {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.university_id || s.id})</option>)}
               </Select>
            </Field>
          </div>

          <div style={{ flex: '0 0 auto' }}>
            <Btn onClick={generateReport} disabled={reportLoading} style={{
              background: 'linear-gradient(135deg, var(--accent), #d97706)',
              color: '#0b0f1a', fontWeight: 700, padding: '10px 24px',
              borderRadius: 8, height: 42, whiteSpace: 'nowrap'
            }}>
              {reportLoading ? 'Loading...' : '📊 Generate Report'}
            </Btn>
          </div>
        </div>
      </Card>

      {/* ── Results Panel ─────────────────────────────────────── */}
      {report ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Total Students', value: totalStudents, icon: <FileSpreadsheet size={20} />, color: 'var(--blue)', bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)' },
              { label: 'Class Average', value: `${avgGrade.toFixed(1)}%`, icon: <TrendingUp size={20} />, color: 'var(--accent)', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)' },
              { label: 'Passed', value: passedCount, icon: <CheckCircle size={20} />, color: 'var(--green)', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)' },
              { label: 'At Risk (>2 Fails)', value: atRiskCount, icon: <AlertTriangle size={20} />, color: 'var(--red)', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)' },
            ].map(card => (
              <div key={card.label} style={{
                background: card.bg, border: `1px solid ${card.border}`,
                borderRadius: 12, padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
                className="hover-scale"
              >
                <div style={{ color: card.color, opacity: 0.8 }}>{card.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color, fontFamily: 'var(--font-mono)' }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Data Table */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Search Bar inside results */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                Student Performance — Page {page} of {totalPages || 1}
              </div>
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <Input
                  placeholder="Search by Student ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') generateReport(); }}
                  style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
                />
              </div>
            </div>

            {/* Table */}
            <div style={{ maxHeight: 435, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {['Student ID', 'Student Name', 'Year', 'Final Grade %', 'Status', ''].map(h => (
                      <th key={h} title={h === 'Final Grade %' ? 'Weighted average of all enrolled courses based on course credits' : ''} style={{
                        padding: '12px 16px', textAlign: 'left', fontSize: 10,
                        fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                        position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1,
                        cursor: h === 'Final Grade %' ? 'help' : 'default'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportLoading ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : displayStudents.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No students found matching the criteria.</td></tr>
                  ) : (
                    displayStudents.map((s, idx) => (
                      <tr key={s.student_id} style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        transition: 'background 0.15s'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                      >
                        <td style={{ padding: '14px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {s.university_id}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{ fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => navigate(`/students/${s.student_id}`)}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.textDecoration = 'underline'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.textDecoration = 'none'; }}
                          >
                            {s.student_name}
                            <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                          Year {s.academic_year || '-'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Mini progress bar */}
                            <div style={{ width: 80, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, s.final_grade_percentage)}%`,
                                background: s.final_grade_percentage >= 60 ? 'var(--green)' : 'var(--red)',
                                borderRadius: 3,
                                transition: 'width 0.5s ease'
                              }} />
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
                              color: s.final_grade_percentage >= 60 ? 'var(--green)' : 'var(--red)'
                            }}>
                              {Number(s.final_grade_percentage).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: s.status === 'Passed' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: s.status === 'Passed' ? 'var(--green)' : 'var(--red)',
                              border: `1px solid ${s.status === 'Passed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                              {s.status === 'Passed' ? '✓' : '✗'} {s.status}
                            </span>
                            {s.at_risk && (
                              <span style={{
                                padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.15)', color: '#ff6b6b',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                display: 'flex', alignItems: 'center', gap: 4,
                                animation: 'pulse 2s infinite ease-in-out'
                              }}>
                                <AlertTriangle size={10} /> AT RISK
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <Btn variant="ghost" size="sm" onClick={() => navigate(`/students/${s.student_id}/assessments`)}
                            style={{ fontSize: 11, padding: '4px 10px' }}
                          >Details</Btn>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination removed as per request */}
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card style={{
          background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)',
          padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.03))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--accent)', opacity: 0.7 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No Report Generated</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
              Use the filters above to select a Faculty, Department, and/or Academic Level, then click <strong style={{ color: 'var(--accent)' }}>Generate Report</strong> to view student performance for the current term.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
