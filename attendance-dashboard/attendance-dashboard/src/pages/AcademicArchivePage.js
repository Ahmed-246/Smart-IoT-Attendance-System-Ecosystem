import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveApi, facultiesApi, departmentsApi, gradebookDashboardApi } from '../api/client';
import { Card, Btn, Select, Field, Input, PageLoader, useToast } from '../components/ui';
import { Archive, Search, ChevronDown, ChevronRight, ChevronLeft, Clock, CheckCircle, XCircle, RotateCcw, AlertTriangle, Filter, Calendar } from 'lucide-react';

export default function AcademicArchivePage() {
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();

  // Term info (to determine current year)
  const [termInfo, setTermInfo] = useState(null);

  // Filters
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Data
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [studentTimeline, setStudentTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pageSize = 1000;

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    setLoading(true);
    try {
      const [termRes, facRes, depRes] = await Promise.all([
        gradebookDashboardApi.termInfo(),
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      setTermInfo(termRes.data);
      setFaculties(facRes.data);
      setDepartments(depRes.data);
    } catch (err) {
      toast('Failed to load metadata', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function searchArchive() {
    setSearchLoading(true);
    setExpandedStudent(null);
    setStudentTimeline(null);
    try {
      const params = { page_size: pageSize };
      if (filterFaculty) params.faculty_id = filterFaculty;
      if (filterDept) params.department_id = filterDept;
      if (filterAcademicYear) params.academic_year = filterAcademicYear;
      if (filterTerm) params.term = filterTerm;
      if (filterStatus) params.academic_status = filterStatus;
      if (searchQuery) params.search = searchQuery;

      const res = await archiveApi.records(params);
      setRecords(res.data);
    } catch (err) {
      toast('Failed to search archive', 'error');
    } finally {
      setSearchLoading(false);
    }
  }

  async function loadStudentTimeline(studentId) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      setStudentTimeline(null);
      return;
    }
    setExpandedStudent(studentId);
    setTimelineLoading(true);
    try {
      const res = await archiveApi.studentTimeline(studentId);
      setStudentTimeline(res.data);
    } catch (err) {
      toast('Failed to load student timeline', 'error');
    } finally {
      setTimelineLoading(false);
    }
  }

  // Cascading filters
  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));

  // Generate academic year options: 2000 to current year - 1
  const currentYearStart = termInfo?.current_year_start || 2025;
  const yearOptions = [];
  for (let y = currentYearStart - 1; y >= 2000; y--) {
    yearOptions.push(y);
  }

  // Helper: get status badge styles
  const getStatusStyle = (result) => {
    const r = (result || '').toUpperCase();
    if (r === 'PASSED' || r === 'PROMOTED' || r === 'COMPLETED' || r === 'RESIT_PASSED' || r === 'GRADUATED') {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: <CheckCircle size={12} /> };
    }
    if (r === 'CARRY_OVER' || r === 'PROBATION') {
      return { bg: 'rgba(250, 204, 21, 0.12)', color: '#facc15', border: 'rgba(250, 204, 21, 0.3)', icon: <AlertTriangle size={12} /> };
    }
    if (r === 'FAILED' || r === 'REPEATER' || r === 'DISMISSED') {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', icon: <XCircle size={12} /> };
    }
    return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--border)', icon: <Clock size={12} /> };
  };

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Archive size={28} style={{ color: '#c084fc' }} />
          Academic Archive
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 600 }}>
          Comprehensive historical record of all previous assessments and student performances from closed terms. Data appears here after a Term or Year Progression is triggered.
        </p>
      </div>

      {/* ── Filters Panel ─────────────────────────────────────── */}
      <Card style={{
        background: 'linear-gradient(135deg, #12101f 0%, #1a1530 100%)',
        border: '1px solid rgba(192, 132, 252, 0.1)',
        padding: '24px 28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Filter size={16} style={{ color: '#c084fc' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Archive Filters</span>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => {
            setFilterFaculty(''); setFilterDept(''); setFilterAcademicYear(''); setFilterTerm(''); setFilterStatus('');
            setRecords(null); setSearchQuery(''); setExpandedStudent(null); setStudentTimeline(null);
          }}>Reset All</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 16, alignItems: 'end' }}>
          <Field label="FACULTY">
            <Select value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setFilterDept(''); }}>
              <option value="">All Faculties</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>

          <Field label="DEPT">
            <Select value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All Depts</option>
              {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>

          <Field label="YEAR">
            <Select value={filterAcademicYear} onChange={e => setFilterAcademicYear(e.target.value)}>
              <option value="">All Years</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}/{y + 1}</option>)}
            </Select>
          </Field>

          <Field label="TERM">
            <Select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
              <option value="">All Terms</option>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="full">Full Year</option>
            </Select>
          </Field>

          <Field label="STATUS">
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Any Status</option>
              <option value="current">Current</option>
              <option value="graduated">Graduated</option>
            </Select>
          </Field>

          <Btn onClick={searchArchive} disabled={searchLoading} style={{
            background: 'linear-gradient(135deg, #c084fc, #8b5cf6)',
            color: '#fff', fontWeight: 700, padding: '10px 24px',
            borderRadius: 8, height: 42, whiteSpace: 'nowrap'
          }}>
            {searchLoading ? 'Searching...' : '🔍 Search Archive'}
          </Btn>
        </div>
      </Card>

      {/* ── Results ───────────────────────────────────────────── */}
      {records ? (
        records.records.length === 0 ? (
          <Card style={{
            background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)',
            padding: '50px', textAlign: 'center'
          }}>
            <Archive size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No Archived Records Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              No historical data matches your filters. Records appear here after a Term or Year Progression is triggered from the Academic Standing page.
            </p>
          </Card>
        ) : (
          <>
            {/* Search within results */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-surface)', padding: '12px 20px', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {records.total} archived student record{records.total !== 1 ? 's' : ''} found
              </span>
              <div style={{ position: 'relative', width: 240 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <Input
                  placeholder="Filter by ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchArchive(); }}
                  style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
                />
              </div>
            </div>

            {/* Student Records Container with Fixed Height & Internal Scrolling */}
            <div style={{
              display: 'grid', 
              gridTemplateColumns: '1fr', 
              gap: 20,
              maxHeight: '740px',
              overflowY: 'auto',
              paddingRight: '6px',
              paddingBottom: '20px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(192, 132, 252, 0.3) transparent'
            }} className="custom-scrollbar">
              {records.records.map(studentRec => {
                const isExpanded = expandedStudent === studentRec.student_id;
                
                // Grouping Logic for proper academic representation
                const uniqueYears = [...new Set(studentRec.courses.map(c => c.year_snapshot || c.course_academic_year))].filter(Boolean);
                const yearsCount = uniqueYears.length;

                const groupedByYear = studentRec.courses.reduce((acc, c) => {
                  const y = c.year_snapshot || c.course_academic_year || 'Unknown';
                  if (!acc[y]) acc[y] = [];
                  acc[y].push(c);
                  return acc;
                }, {});

                // Sort years descending
                const sortedYears = Object.keys(groupedByYear).sort((a, b) => b - a);

                return (
                  <div
                    key={studentRec.student_id}
                    style={{
                      background: isExpanded ? 'rgba(192, 132, 252, 0.03)' : 'var(--bg-surface)',
                      border: isExpanded ? '1px solid rgba(192, 132, 252, 0.3)' : '1px solid var(--border)',
                      borderRadius: 16,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Spacious Header Row */}
                    <div
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedStudent(null);
                        } else {
                          setExpandedStudent(studentRec.student_id);
                          loadStudentTimeline(studentRec.student_id);
                        }
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '24px 30px', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: isExpanded ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255,255,255,0.05)',
                          width: 40, height: 40, borderRadius: '50%', transition: 'all 0.2s'
                        }}>
                          {isExpanded
                            ? <ChevronDown size={20} style={{ color: '#c084fc' }} />
                            : <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                          }
                        </div>
                        
                        {/* Avatar */}
                        <div style={{ 
                          width: 50, height: 50, borderRadius: 12, 
                          background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(192, 132, 252, 0.05))',
                          border: '1px solid rgba(192, 132, 252, 0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#c084fc', fontWeight: 800, fontSize: 20
                        }}>
                          {studentRec.student_name ? studentRec.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>

                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{studentRec.student_name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UNIVERSITY ID: {studentRec.university_id}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            display: 'inline-block',
                            fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, 
                            background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: 8,
                            marginBottom: 8
                          }}>
                            {yearsCount} Archived Year{yearsCount !== 1 ? 's' : ''}
                          </span>
                          <br />
                          <span style={{ 
                            display: 'inline-block',
                            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
                            background: (studentRec.status || '').toUpperCase() === 'GRADUATED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: (studentRec.status || '').toUpperCase() === 'GRADUATED' ? '#10b981' : '#38bdf8',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            {studentRec.status || 'CURRENT'}
                          </span>
                        </div>

                        <Btn 
                          onClick={e => { e.stopPropagation(); navigate(`/archive/student/${studentRec.student_id}`); }}
                          style={{ 
                            background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc',
                            border: '1px solid rgba(192, 132, 252, 0.3)',
                            padding: '12px 20px', fontSize: 13, fontWeight: 700, borderRadius: 8,
                            transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192, 132, 252, 0.25)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(192, 132, 252, 0.15)'; }}
                        >
                          View Full Details ↗
                        </Btn>
                      </div>
                    </div>

                    {/* Expandable Year Summaries */}
                    <div style={{
                      maxHeight: isExpanded ? '2000px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                      <div style={{ padding: '0 20px 20px 20px' }}>
                        {timelineLoading ? (
                           <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}><PageLoader /></div>
                        ) : studentTimeline ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                             {(() => {
                               // Group academic records by year
                               const academicRecords = studentTimeline.timeline.filter(e => e.type === 'academic_record');
                               if (academicRecords.length === 0) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No progression records available.</div>;

                               const recordsByYear = academicRecords.reduce((acc, rec) => {
                                 if (!acc[rec.academic_year]) acc[rec.academic_year] = { sem1: null, sem2: null, summary: null };
                                 if (rec.semester === 1) acc[rec.academic_year].sem1 = rec;
                                 if (rec.semester === 2) acc[rec.academic_year].sem2 = rec;
                                 // For total performance, we usually take sem 2 as the year's final outcome, or if sem2 doesn't exist, sem1.
                                 acc[rec.academic_year].summary = rec.semester === 2 ? rec : acc[rec.academic_year].summary || rec;
                                 return acc;
                               }, {});

                               const years = Object.keys(recordsByYear).sort((a,b) => b - a);

                               return years.map(y => {
                                 const yearData = recordsByYear[y];
                                 const sem1Style = yearData.sem1 ? getStatusStyle(yearData.sem1.status) : null;
                                 const sem2Style = yearData.sem2 ? getStatusStyle(yearData.sem2.status) : null;
                                 const sumStyle = getStatusStyle(yearData.summary.status);

                                 return (
                                   <div key={y} style={{
                                     background: 'rgba(255,255,255,0.02)',
                                     border: '1px solid rgba(255,255,255,0.05)',
                                     borderRadius: 8,
                                     overflow: 'hidden'
                                   }}>
                                      {/* Year Header */}
                                      <div style={{ padding: '12px 16px', background: 'rgba(192, 132, 252, 0.08)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 600, color: '#c084fc', fontSize: 14 }}>Academic Year {y}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Year Total Performance:</span>
                                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: yearData.summary.weighted_average >= 60 ? 'var(--green)' : 'var(--red)' }}>
                                            {yearData.summary.weighted_average.toFixed(1)}%
                                          </span>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                                            background: sumStyle.bg, color: sumStyle.color, border: `1px solid ${sumStyle.border}`
                                          }}>
                                            {sumStyle.icon} {yearData.summary.status}
                                          </span>
                                        </div>
                                      </div>
                                      {/* Semesters */}
                                      <div style={{ display: 'flex', divide: 'x', borderRight: '1px solid transparent' }}>
                                        {/* Sem 1 */}
                                        <div style={{ flex: 1, padding: '16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semester 1</div>
                                          {yearData.sem1 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#fff' }}>{yearData.sem1.weighted_average.toFixed(1)}%</div>
                                              <span style={{ fontSize: 11, color: sem1Style.color, background: sem1Style.bg, padding: '2px 6px', borderRadius: 4 }}>{yearData.sem1.status}</span>
                                            </div>
                                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No Data</span>}
                                        </div>
                                        {/* Sem 2 */}
                                        <div style={{ flex: 1, padding: '16px' }}>
                                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Semester 2</div>
                                          {yearData.sem2 ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: '#fff' }}>{yearData.sem2.weighted_average.toFixed(1)}%</div>
                                              <span style={{ fontSize: 11, color: sem2Style.color, background: sem2Style.bg, padding: '2px 6px', borderRadius: 4 }}>{yearData.sem2.status}</span>
                                            </div>
                                          ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No Data</span>}
                                        </div>
                                      </div>
                                   </div>
                                 );
                               });
                             })()}
                           </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )
      ) : (
        /* Empty State */
        <Card style={{
          background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)',
          padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.1), rgba(192, 132, 252, 0.03))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(192, 132, 252, 0.2)'
          }}>
            <Archive size={32} style={{ color: '#c084fc', opacity: 0.7 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Historical Records Vault</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
              Select an Academic Year, Faculty, and Term from the filters above, then click <strong style={{ color: '#c084fc' }}>Search Archive</strong> to browse historical student performance data. Data migrates here after Term or Year Progression.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
