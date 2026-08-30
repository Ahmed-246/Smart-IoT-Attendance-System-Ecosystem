import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { academicApi, studentsApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, PageLoader, useToast, Select, Btn, Field } from '../components/ui';
import { ShieldCheck, Plus, Search, Users, GraduationCap, BarChart3, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AcademicStandingPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filter States
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Report data
  const [transcript, setTranscript] = useState(null);
  const [groupReport, setGroupReport] = useState(null);
  const [reportMode, setReportMode] = useState(null); // 'student', 'faculty', 'department'
  const [expandedGroupDept, setExpandedGroupDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const { isAdmin, isSuperAdmin } = useAuth();
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    loadBaseData();
  }, []);

  async function loadBaseData() {
    try {
      const [stRes, facRes, depRes] = await Promise.all([
        studentsApi.list(),
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      setStudents(stRes.data);
      setFaculties(facRes.data);
      setDepartments(depRes.data);
    } catch (err) {
      toast('Failed to load academic data', 'error');
    }
  }

  // ── Auto-fill Logic ──────────────────────────────────────────────────────

  function handleStudentChange(studentId) {
    setSelectedStudentId(studentId);
    if (!studentId) return;

    const student = students.find(s => String(s.id) === String(studentId));
    if (!student) return;

    // Auto-fill department and faculty from the selected student
    if (student.department_id) {
      setFilterDept(String(student.department_id));
      const dept = departments.find(d => d.id === student.department_id);
      if (dept && dept.faculty_id) {
        setFilterFaculty(String(dept.faculty_id));
      }
    }

    if (student.academic_year) {
      setFilterYear(String(student.academic_year));
    }
  }

  function handleDeptChange(deptId) {
    setFilterDept(deptId);
    setSelectedStudentId('');
    if (!deptId) return;

    // Auto-fill faculty from the selected department
    const dept = departments.find(d => String(d.id) === String(deptId));
    if (dept && dept.faculty_id) {
      setFilterFaculty(String(dept.faculty_id));
    }
  }

  function handleFacultyChange(facId) {
    setFilterFaculty(facId);
    setFilterDept('');
    setSelectedStudentId('');
  }

  // ── Report Generation ─────────────────────────────────────────────────

  async function generateReport() {
    setLoading(true);
    setTranscript(null);
    setGroupReport(null);
    setReportMode(null);

    try {
      if (selectedStudentId) {
        // Individual student transcript
        const res = await academicApi.transcript(selectedStudentId);
        setTranscript(res.data);
        setReportMode('student');
      } else if (filterDept) {
        // Department-level aggregate report
        const res = await academicApi.deptReport(filterDept);
        setGroupReport(res.data);
        setReportMode('department');
      } else if (filterFaculty) {
        // Faculty-level aggregate report
        const res = await academicApi.facultyReport(filterFaculty);
        setGroupReport(res.data);
        setReportMode('faculty');
      } else {
        toast('Please select at least a Faculty, Department, or Student to generate a report.', 'error');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast(typeof detail === 'string' ? detail : 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Cascaded filter helpers ────────────────────────────────────────────

  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));
  const filteredStudentsForList = students.filter(s => {
    if (filterDept && String(s.department_id) !== String(filterDept)) return false;
    if (!filterDept && filterFaculty) {
      const deptIds = filteredDepartments.map(d => d.id);
      if (!deptIds.includes(s.department_id)) return false;
    }
    if (filterYear && String(s.academic_year) !== String(filterYear)) return false;
    return true;
  });

  // ── Reset ─────────────────────────────────────────────────────────────

  function resetAll() {
    setFilterFaculty('');
    setFilterDept('');
    setFilterYear('');
    setSelectedStudentId('');
    setTranscript(null);
    setGroupReport(null);
    setReportMode(null);
  }

  // ── Render: Group Report Summary Card ──────────────────────────────────

  function renderGroupReport() {
    if (!groupReport) return null;

    const passRate = groupReport.total_students > 0
      ? ((groupReport.passed_count / groupReport.total_students) * 100).toFixed(1)
      : 0;

    // Filter students by year if selected AND sort by year level
    const displayStudents = [...(filterYear
      ? groupReport.students.filter(s => String(s.academic_year) === String(filterYear))
      : groupReport.students)].sort((a, b) => (a.academic_year - b.academic_year) || a.name.localeCompare(b.name));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Card style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(198, 168, 245, 0.15)', textAlign: 'center', padding: '24px 16px' }}>
            <Users size={28} style={{ color: 'var(--accent)', marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{groupReport.total_students}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Total Students</div>
          </Card>
          <Card style={{ background: 'linear-gradient(135deg, #0f2918 0%, #1a1a2e 100%)', border: '1px solid rgba(74, 222, 128, 0.15)', textAlign: 'center', padding: '24px 16px' }}>
            <CheckCircle2 size={28} style={{ color: '#4ade80', marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: '#4ade80' }}>{groupReport.passed_count}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>All Passed</div>
          </Card>
          <Card style={{ background: 'linear-gradient(135deg, #2a1215 0%, #1a1a2e 100%)', border: '1px solid rgba(248, 113, 113, 0.15)', textAlign: 'center', padding: '24px 16px' }}>
            <AlertTriangle size={28} style={{ color: '#f87171', marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171' }}>{groupReport.failed_count}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Has Failures</div>
          </Card>
          <Card style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', border: '1px solid rgba(198, 168, 245, 0.15)', textAlign: 'center', padding: '24px 16px' }}>
            <BarChart3 size={28} style={{ color: 'var(--accent)', marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{Number(groupReport.average_gpa).toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Average GPA</div>
          </Card>
        </div>

        {/* Pass Rate Bar */}
        <Card style={{ background: '#1c1b1f', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {reportMode === 'faculty' ? groupReport.faculty_name : groupReport.department_name} — Pass Rate
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{passRate}%</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${passRate}%`,
              background: `linear-gradient(90deg, #4ade80, var(--accent))`,
              borderRadius: 4,
              transition: 'width 1s ease-out',
              boxShadow: '0 0 12px rgba(74, 222, 128, 0.4)'
            }} />
          </div>
        </Card>

        {/* Student Performance Table or Department Accordions */}
        {reportMode === 'faculty' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '8px 0', color: '#fff' }}>Department Reports</h3>
            {Object.entries(
              displayStudents.reduce((acc, s) => {
                const dId = s.department_id || 'unassigned';
                if (!acc[dId]) acc[dId] = [];
                acc[dId].push(s);
                return acc;
              }, {})
            ).map(([deptId, sList]) => {
              const isExpanded = expandedGroupDept === deptId;
              const dName = deptId === 'unassigned' ? 'General Faculty Unit' : departments.find(d => String(d.id) === String(deptId))?.name || 'Unknown Department';
              const deptPassed = sList.filter(s => s.failed_courses === 0).length;
              const deptPassRate = sList.length > 0 ? ((deptPassed / sList.length) * 100).toFixed(1) : 0;
              const deptGpa = sList.length > 0 ? (sList.reduce((sum, curr) => sum + curr.gpa, 0) / sList.length).toFixed(1) : 0;

              return (
                <div key={deptId} style={{
                  background: 'var(--bg-surface)', border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  transition: 'all 0.2s ease', 
                  boxShadow: isExpanded ? '0 8px 32px rgba(198, 168, 245, 0.15)' : 'none'
                }}>
                  {/* Header */}
                  <div 
                    id={`dept-section-${deptId}`}
                    onClick={() => {
                      const newExpanded = isExpanded ? null : deptId;
                      setExpandedGroupDept(newExpanded);
                      if (newExpanded) {
                        setTimeout(() => {
                           document.getElementById(`dept-section-${deptId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 300);
                      }
                    }}
                    style={{
                      padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer', background: isExpanded ? 'rgba(198, 168, 245, 0.05)' : 'transparent'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>{dName}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        Enrolled Students: <strong style={{ color: '#fff' }}>{sList.length}</strong>
                        <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>
                        Avg GPA: <strong style={{ color: 'var(--accent)' }}>{deptGpa}%</strong>
                        <span style={{ margin: '0 8px', color: 'var(--border)' }}>|</span>
                        Pass Rate: <strong style={{ color: '#4ade80' }}>{Number(deptPassRate).toFixed(1)}%</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {sList.some(s => s.failed_courses > 0) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', animation: 'pulse 2s infinite' }}>
                           <AlertTriangle size={18} />
                           <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>Failures Detected</span>
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                  
                  {/* Accordion Content */}
                  <div style={{
                    display: 'grid', gridTemplateRows: isExpanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.3s ease-in-out',
                    background: 'var(--bg-raised)',
                    borderTop: isExpanded ? '1px solid var(--border)' : 'none'
                  }}>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ overflowY: 'auto', maxHeight: 420 }}>
                        {renderStudentTable(sList.sort((a,b) => (a.academic_year - b.academic_year) || a.name.localeCompare(b.name)))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card style={{ background: '#1c1b1f', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>
                Student Performance ({displayStudents.length})
              </h3>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 420 }}>
              {renderStudentTable(displayStudents)}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ── Helper: Render Student Performance Table ─────────────────────────────
  
  function renderStudentTable(studentsList) {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>University ID</th>
            <th style={thStyle}>Year</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>GPA</th>
            <th style={thStyle}>Attendance</th>
            <th style={thStyle}>Failed</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {studentsList.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={tdStyle}><span style={{ fontWeight: 500, color: '#fff' }}>{s.name}</span></td>
              <td style={tdStyle}><span className="mono" style={{ color: 'var(--text-muted)' }}>{s.university_id || '—'}</span></td>
              <td style={tdStyle}>Year {s.academic_year}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                  background: s.academic_status === 'ACTIVE' ? 'rgba(74, 222, 128, 0.1)' :
                             s.academic_status === 'PROBATION' ? 'rgba(250, 204, 21, 0.1)' :
                             s.academic_status === 'DISMISSED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(198, 168, 245, 0.1)',
                  color: s.academic_status === 'ACTIVE' ? '#4ade80' :
                         s.academic_status === 'PROBATION' ? '#facc15' :
                         s.academic_status === 'DISMISSED' ? '#ef4444' : 'var(--accent)',
                }}>{s.academic_status}</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 700, color: s.gpa >= 60 ? '#4ade80' : '#f87171' }}>{s.gpa}%</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 700, color: s.attendance_rate >= 75 ? 'var(--blue)' : '#f87171' }}>
                  {Number(s.attendance_rate).toFixed(1)}%
                </span>
              </td>
              <td style={tdStyle}>
                <span style={{ color: s.failed_courses > 0 ? '#f87171' : 'var(--text-muted)', fontWeight: s.failed_courses > 0 ? 700 : 400 }}>
                  {s.failed_courses}
                </span>
              </td>
              <td style={tdStyle}>
                <Btn size="sm" variant="ghost" onClick={() => {
                  setSelectedStudentId(String(s.id));
                  // Auto-trigger individual report
                  setTimeout(async () => {
                    setLoading(true);
                    try {
                      const res = await academicApi.transcript(s.id);
                      setTranscript(res.data);
                      setGroupReport(null);
                      setReportMode('student');
                    } catch { toast('Failed to load transcript', 'error'); }
                    finally { setLoading(false); }
                  }, 0);
                }}>View</Btn>
              </td>
            </tr>
          ))}
          {studentsList.length === 0 && (
            <tr>
              <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                No students found matching the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  // ── Render: Individual Transcript ──────────────────────────────────────

  function renderTranscript() {
    if (!transcript) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: 24, alignItems: 'start' }}>
        {/* Left Column: Profile & Standing Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #2b1d3d 0%, #1c1b1f 100%)',
            borderRadius: 12, padding: 24, border: '1px solid var(--border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                Current Standing
              </div>
              <Btn size="sm" variant="ghost" onClick={() => { setTranscript(null); setReportMode(null); }}
                style={{ fontSize: 11, padding: '4px 10px' }}>← Back</Btn>
            </div>
            <h2 style={{ fontSize: 24, color: '#fff', marginBottom: 4, fontWeight: 600 }}>{transcript.student.name}</h2>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>ID: {transcript.student.university_id || 'N/A'}</div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '20px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Level</div>
                <div style={{ fontSize: 18, color: '#fff', fontWeight: 600 }}>Year {transcript.student.academic_year}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Term</div>
                <div style={{ fontSize: 18, color: '#fff', fontWeight: 600 }}>Term {transcript.student.current_semester}</div>
              </div>
            </div>

            <div style={{ background: '#1c1b1f', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Academic Status</span>
              <span style={{
                fontSize: 13, fontWeight: 700, padding: '4px 10px', borderRadius: '4px',
                background: transcript.student.academic_status === 'ACTIVE' ? 'rgba(74, 222, 128, 0.1)' :
                             transcript.student.academic_status === 'PROBATION' ? 'rgba(250, 204, 21, 0.1)' :
                             transcript.student.academic_status === 'DISMISSED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(248, 113, 113, 0.1)',
                color: transcript.student.academic_status === 'ACTIVE' ? '#4ade80' :
                       transcript.student.academic_status === 'PROBATION' ? '#facc15' :
                       transcript.student.academic_status === 'DISMISSED' ? '#ef4444' : '#f87171',
                border: transcript.student.academic_status === 'DISMISSED' ? '1px solid rgba(239, 68, 68, 0.5)' : 'none',
              }}>
                {transcript.student.academic_status}
              </span>
            </div>
          </div>

          {/* Elective Progression Card with Achievements Popover */}
          {(() => {
            const earned = transcript.elective_credits_earned;
            const required = transcript.elective_credits_required;
            const achievements = [
              { credit: 1, title: 'First Step', desc: 'Complete and pass your first elective course to earn 1 credit.' },
              { credit: 2, title: 'Curious Explorer', desc: 'Earn 2 elective credits by passing elective courses beyond your core curriculum.' },
              { credit: 3, title: 'Knowledge Seeker', desc: 'Reach 3 elective credits — you\'re building breadth in your education.' },
              { credit: 4, title: 'Diversified Learner', desc: 'Earn 4 credits by exploring different elective disciplines.' },
              { credit: 5, title: 'Halfway Hero', desc: 'You\'ve reached the halfway mark — 5 out of 10 elective credits earned!' },
              { credit: 6, title: 'Dedicated Scholar', desc: 'With 6 credits, your commitment to a well-rounded education is clear.' },
              { credit: 7, title: 'Broadened Horizons', desc: 'Earn 7 credits — only 3 more to fulfill the graduation requirement.' },
              { credit: 8, title: 'Almost There', desc: 'At 8 credits, you\'re on the final stretch towards completion.' },
              { credit: 9, title: 'Final Push', desc: 'Just 1 more credit to go — earn 9 elective credits total.' },
              { credit: 10, title: 'Graduation Ready', desc: 'All 10 elective credits earned! You\'ve fulfilled the graduation requirement. 🎓' },
            ];

            return (
              <div style={{ position: 'relative' }}
                onMouseEnter={e => {
                  const popover = e.currentTarget.querySelector('.elective-popover');
                  if (popover) popover.style.display = 'block';
                }}
                onMouseLeave={e => {
                  const popover = e.currentTarget.querySelector('.elective-popover');
                  if (popover) popover.style.display = 'none';
                }}
              >
                <Card style={{ background: 'linear-gradient(135deg, #16213e 0%, #0f172a 100%)', border: '1px solid rgba(198, 168, 245, 0.1)', cursor: 'default' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                     <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                       Elective Credits
                     </div>
                     <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                       {earned} / {required}
                     </div>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (earned / required) * 100)}%`,
                      background: 'var(--accent)',
                      boxShadow: '0 0 10px rgba(198, 168, 245, 0.4)',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    Hover to view achievement milestones ({Math.round(earned)}/10 completed).
                  </p>
                </Card>

                {/* Achievements Popover */}
                <div className="elective-popover" style={{
                  display: 'none',
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  marginTop: 8,
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%)',
                  border: '1px solid rgba(198, 168, 245, 0.25)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 20px rgba(198, 168, 245, 0.1)',
                  maxHeight: 420,
                  overflowY: 'auto',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent)' }}>🏆</span> Elective Achievement Milestones
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {achievements.map((a, i) => {
                      const achieved = earned >= a.credit;
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '10px 12px', borderRadius: 8,
                          background: achieved ? 'rgba(74, 222, 128, 0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${achieved ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                          opacity: achieved ? 1 : 0.55,
                          transition: 'all 0.2s ease',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: achieved ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
                            border: `2px solid ${achieved ? '#4ade80' : 'var(--border)'}`,
                            fontSize: 13, fontWeight: 800,
                            color: achieved ? '#4ade80' : 'var(--text-muted)',
                          }}>
                            {achieved ? '✓' : a.credit}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: achieved ? '#4ade80' : '#fff' }}>
                                {a.title}
                              </span>
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                                background: achieved ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.05)',
                                color: achieved ? '#4ade80' : 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                              }}>
                                {achieved ? 'Achieved' : 'Locked'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {a.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          <Card style={{ background: '#1c1b1f' }}>
             <h3 style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600 }}>Historical Records</h3>
             {transcript.academic_records.length === 0 ? (
               <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>No historical data available.</div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {transcript.academic_records.map(rec => {
                    let failedList = [];
                    try { if (rec.failed_courses_json) failedList = JSON.parse(rec.failed_courses_json); } catch (e) {}
                    return (
                      <div key={rec.id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div>
                            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Year {rec.academic_year}</div>
                            <div style={{ fontSize: 11, color: rec.status_at_time === 'DISMISSED' ? '#ef4444' : 'var(--text-muted)', fontWeight: rec.status_at_time === 'DISMISSED' ? 700 : 400 }}>
                              Status: {rec.status_at_time}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{rec.weighted_average.toFixed(2)}%</div>
                            <div style={{ fontSize: 11, color: rec.failed_courses > 0 ? '#f87171' : 'var(--text-muted)' }}>Fails: {rec.failed_courses}</div>
                          </div>
                        </div>
                        {failedList && failedList.length > 0 && (
                          <div style={{ fontSize: 10, color: '#f87171', background: 'rgba(248, 113, 113, 0.05)', padding: '4px 8px', borderRadius: 4, marginTop: 4 }}>
                            <strong>Courses: </strong> {failedList.join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
               </div>
             )}
          </Card>
        </div>

        {/* Right Column: Roadmap & Current Courses */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Roadmap to Graduation */}
          <Card style={{ background: 'linear-gradient(to right, #1c1b1f, #222026)', border: '1px solid rgba(198, 168, 245, 0.2)' }}>
            <h3 style={{ fontSize: 16, color: '#fff', marginBottom: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--accent)' }}>✦</span> Degree Progression Roadmap
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginTop: 10, padding: '0 10px' }}>
               <div style={{ position: 'absolute', top: 17, left: 30, right: 30, height: 2, background: 'var(--border)', zIndex: 0 }} />
               <div style={{
                 position: 'absolute', top: 17, left: 30,
                 width: `${((transcript.student.academic_year - 1) / 5) * 100}%`, maxWidth: 'calc(100% - 60px)',
                 height: 2, background: 'var(--accent)', zIndex: 0, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
               }} />

               {[1, 2, 3, 4, 5, 6].map(year => {
                 const isPast = year < transcript.student.academic_year;
                 const isCurrent = year === transcript.student.academic_year;
                 const isFuture = year > transcript.student.academic_year;
                 return (
                   <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 1, position: 'relative' }}>
                     <div style={{
                       width: 36, height: 36, borderRadius: '50%',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       background: isPast ? 'var(--accent)' : isCurrent ? '#222026' : '#1c1b1f',
                       border: isCurrent ? '2px solid var(--accent)' : isFuture ? '2px solid var(--border)' : 'none',
                       color: isPast ? '#000' : isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                       fontWeight: 800, fontSize: 14,
                       boxShadow: isCurrent ? '0 0 20px rgba(198, 168, 245, 0.5)' : 'none',
                       transition: 'all 0.3s'
                     }}>
                       {isPast ? '✓' : year}
                     </div>
                     <div style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? '#fff' : 'var(--text-muted)' }}>
                       Year {year}
                     </div>
                   </div>
                 );
               })}
            </div>
          </Card>

          {/* Current Enrolled Courses Analysis */}
          <Card style={{ background: '#1c1b1f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, color: '#fff', fontWeight: 600 }}>Active Semester Performance</h3>
              <div style={{ background: 'rgba(198, 168, 245, 0.1)', padding: '8px 16px', borderRadius: 20, border: '1px solid rgba(198, 168, 245, 0.2)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Weighted GPA: </span>
                <strong style={{ color: 'var(--accent)', fontSize: 16 }}>{Number(transcript.current_weighted_average).toFixed(2)}%</strong>
              </div>
            </div>

            {transcript.courses.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--border)' }}>
                No active enrollments found for the current term.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                  {transcript.courses.map(c => (
                    <div 
                      key={c.course_id} 
                      onClick={() => navigate(`/students/${transcript.student.id}/assessments?course_id=${c.course_id}`)}
                      style={{
                        padding: 18, borderRadius: 10, background: '#252427',
                        borderLeft: c.is_passed ? '4px solid #4ade80' : '4px solid #f87171',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.background = '#2c2b2f';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = '#252427';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.02em' }}>
                          Term {c.semester} • {c.credits} Credits • Passing: {c.passing_score}%
                        </div>
                        <div style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>{c.course_name}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Attendance</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: c.attendance_percentage >= 75 ? '#4ade80' : '#f87171' }}>
                            {Number(c.attendance_percentage).toFixed(1)}%
                          </div>
                        </div>

                        <div style={{ width: 1, height: 32, background: 'var(--border)' }} />

                        <div style={{ textAlign: 'right', minWidth: 60 }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Total Score</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: c.final_score >= c.passing_score ? '#fff' : '#f87171' }}>
                            {Number(c.final_score).toFixed(1)}%
                          </div>
                        </div>

                        <div style={{
                          padding: '6px 12px', borderRadius: 6, width: 70, textAlign: 'center',
                          background: c.is_passed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                          border: `1px solid ${c.is_passed ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: c.is_passed ? '#4ade80' : '#f87171' }}>
                            {c.is_passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Academic Standing & Transcripts</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Monitor student progression and manage global term transitions.</p>
      </div>

      {/* Global Term Transition Panel */}
      {isSuperAdmin && (
        <Card style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(198, 168, 245, 0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 28px', borderRadius: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, background: 'rgba(198, 168, 245, 0.1)', borderRadius: 10 }}>
              <ShieldCheck size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Global Academic Transition Protocol</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 500 }}>
                The Intelligent Readiness Protocol is active. Manage promotional math, attendance exceptions, and irreversible state transitions here.
              </div>
            </div>
          </div>
          <Btn onClick={() => navigate('/transition')} style={{
            background: 'linear-gradient(135deg, #c6a8f5, #8b5cf6)', color: '#000', fontWeight: 700,
            padding: '12px 28px', borderRadius: 8, gap: 10, fontSize: 14
          }}>
            <ShieldCheck size={20} /> Enter Transition Workspace
          </Btn>
        </Card>
      )}

      {/* Selector */}
      <Card style={{ padding: '24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Academic Record Explorer</h2>
          <Btn variant="ghost" size="sm" onClick={resetAll}>Reset All</Btn>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 110px 1.5fr', gap: 16, marginBottom: 20 }}>
          <Field label="FACULTY">
             <Select value={filterFaculty} onChange={e => handleFacultyChange(e.target.value)}>
               <option value="">All Faculties</option>
               {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
             </Select>
          </Field>

          <Field label="DEPARTMENT">
             <Select value={filterDept} onChange={e => handleDeptChange(e.target.value)}>
               <option value="">All Departments</option>
               {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
             </Select>
          </Field>

          <Field label="ACADEMIC YEAR">
             <Select value={filterYear} onChange={e => { setFilterYear(e.target.value); setSelectedStudentId(''); }}>
               <option value="">All</option>
               {[1,2,3,4,5,6].map(y => <option key={y} value={y}>Year {y}</option>)}
             </Select>
          </Field>

          <Field label="SELECT STUDENT">
            <Select value={selectedStudentId} onChange={e => handleStudentChange(e.target.value)} disabled={filteredStudentsForList.length === 0}>
               <option value="">-- {filteredStudentsForList.length} Students --</option>
               {filteredStudentsForList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.university_id || s.id})</option>)}
            </Select>
          </Field>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Btn onClick={generateReport} disabled={loading || (!filterFaculty && !filterDept && !selectedStudentId)}
            style={{
              background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
              color: '#000', fontWeight: 700, padding: '10px 28px', borderRadius: 8, gap: 8,
              opacity: (!filterFaculty && !filterDept && !selectedStudentId) ? 0.4 : 1,
            }}>
            <Search size={16} />
            {loading ? 'Generating...' : 'Generate Report'}
          </Btn>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <PageLoader />
      ) : reportMode === 'student' && transcript ? (
        renderTranscript()
      ) : (reportMode === 'faculty' || reportMode === 'department') && groupReport ? (
        renderGroupReport()
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <div style={{ opacity: 0.3, marginBottom: 16 }}><GraduationCap size={48} /></div>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Select filters above and click "Generate Report" to explore academic records.</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Choose a Faculty for a group overview, or a specific Student for their full transcript.</p>
        </div>
      )}
    </div>
  );
}

// ── Table Styles ──────────────────────────────────────────────────────────
const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '14px 16px',
  color: 'var(--text-secondary)',
  fontSize: 13,
};
