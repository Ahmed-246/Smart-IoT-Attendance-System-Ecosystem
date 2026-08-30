import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { studentsApi, assessmentsApi, coursesApi } from '../api/client';
import { Card, Table, Badge, Btn, PageLoader, useToast } from '../components/ui';
import { formatDateTime } from '../utils/formatters';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { ChevronDown, ChevronUp, AlertTriangle, AlertCircle } from 'lucide-react';

// Reusing status logic for visualization
const getComputedStatus = (a) => {
  if (a.status === 'Finished') return 'Finished';
  if (a.status === 'Waiting for Grades') return 'Waiting for Grades';
  
  if (a.scheduled_date) {
    const scheduledTime = new Date(a.scheduled_date);
    const nowTime = new Date();
    const schedDateOnly = new Date(scheduledTime).setHours(0,0,0,0);
    const nowDateOnly = new Date(nowTime).setHours(0,0,0,0);
    
    if (schedDateOnly > nowDateOnly) return 'Incoming';
    if (schedDateOnly === nowDateOnly) {
       if (scheduledTime <= nowTime) return 'Active';
       return 'Today';
    }
    return 'Active';
  }
  
  if (a.status === 'Pending' || a.status === 'Waiting' || !a.status) return 'Pending';
  return a.status;
};

export default function StudentAssessmentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastContainer } = useToast();

  // Filters
  const [filterCourse, setFilterCourse] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [pRes, aRes, cRes] = await Promise.all([
        studentsApi.profile(id),
        assessmentsApi.list(),
        coursesApi.list()
      ]);
      setProfile(pRes.data);
      setAssessments(aRes.data);
      setCourses(cRes.data);

      // Handle auto-expansion from query param
      const targetCourseId = searchParams.get('course_id');
      if (targetCourseId) {
        setExpandedCourse(Number(targetCourseId));
        setTimeout(() => {
          const el = document.getElementById(`course-section-${targetCourseId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.boxShadow = '0 0 20px var(--accent)';
            setTimeout(() => { el.style.boxShadow = 'none'; }, 2000);
          }
        }, 800);
      }
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Student not found</div>;

  const { student, grades, committed_grades = [], enrolled_courses } = profile;

  // 1. Map Committed Graded Assessments from gradebook
  const gradedHistory = committed_grades.map(g => {
    const parentAss = assessments.find(a => a.id === g.assessment_id);
    const dateStr = parentAss?.scheduled_date || g.created_at || new Date().toISOString();
    const d = new Date(dateStr);
    const monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    return {
      ...g,
      assessmentTitle: g.assessment_title,
      assessmentType: g.assessment_type,
      courseName: g.course_name,
      maxScore: g.max_score,
      percentage: g.max_score > 0 ? Number(((g.raw_score / g.max_score) * 100).toFixed(2)) : 0,
      remarks: g.instructor_remarks || '—',
      instructorName: g.instructor_name,
      dateStr,
      monthKey,
      sortDate: d.getTime(),
    };
  }).sort((a, b) => b.sortDate - a.sortDate);

  // Calculate Statistics
  const totalGraded = gradedHistory.length;
  const averagePercentage = totalGraded > 0 
    ? (gradedHistory.reduce((sum, g) => sum + g.percentage, 0) / totalGraded).toFixed(1)
    : 0;

  // 2. Map Upcoming/Active Assessments for enrolled courses
  const enrolledCourseIds = enrolled_courses.map(c => c.id || c.course?.id);
  const gradedAssessmentIds = new Set(committed_grades.map(g => g.assessment_id));
  const upcomingAssessments = assessments
    .filter(a => {
        if (!enrolledCourseIds.includes(a.course_code)) return false;
        if (a.status === 'Finished') return false;
        if (gradedAssessmentIds.has(a.id)) return false;
        return true;
    })
    .map(a => {
      const course = courses.find(c => c.id === a.course_code);
      return {
        ...a,
        courseName: course ? course.name : 'Unknown',
        instructorName: a.instructor_name,
        computedStatus: getComputedStatus(a)
      };
    });

  // --- Filtered Data ---
  const filteredGradedHistory = gradedHistory.filter(g => {
    if (filterCourse && g.courseName !== filterCourse) return false;
    if (filterType && g.assessmentType !== filterType) return false;
    if (filterStatus && g.status !== filterStatus) return false;
    if (searchText && !g.assessmentTitle?.toLowerCase().includes(searchText.toLowerCase()) && !g.courseName?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const historyByMonth = filteredGradedHistory.reduce((acc, curr) => {
    if (!acc[curr.monthKey]) acc[curr.monthKey] = [];
    acc[curr.monthKey].push(curr);
    return acc;
  }, {});

  const filteredUpcoming = upcomingAssessments.filter(a => {
    if (filterCourse && a.courseName !== filterCourse) return false;
    if (filterType && a.assessment_type !== filterType) return false;
    if (searchText && !a.title?.toLowerCase().includes(searchText.toLowerCase()) && !a.courseName?.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const uniqueCourses = [...new Set([
    ...gradedHistory.map(g => g.courseName),
    ...upcomingAssessments.map(a => a.courseName)
  ].filter(Boolean))];

  const uniqueTypes = [...new Set([
    ...gradedHistory.map(g => g.assessmentType),
    ...upcomingAssessments.map(a => a.assessment_type)
  ].filter(Boolean))];

  const hasActiveFilters = filterCourse || filterType || filterStatus || searchText;

  // --- Course Summaries ---
  // --- Course Summaries (Accordion view) ---
  const courseSummaries = enrolledCourseIds.map(cId => {
    const enrolledCourseObj = enrolled_courses.find(c => (c.course?.id === cId || c.id === cId));
    const matchedCourse = courses.find(c => c.id === cId) || enrolledCourseObj?.course;
    const name = matchedCourse?.name || 'Unknown Course';
    
    const gradesForCourse = gradedHistory.filter(g => g.courseName === name);
    const upcomingForCourse = upcomingAssessments.filter(a => a.courseName === name);
    
    // Performance logic
    const totalMax = gradesForCourse.reduce((acc, g) => acc + g.maxScore, 0);
    const totalScore = gradesForCourse.reduce((acc, g) => acc + g.raw_score, 0);
    const currentAvg = enrolledCourseObj?.current_avg ?? (totalMax > 0 ? Number(((totalScore / totalMax) * 100).toFixed(1)) : 0);
    const globalProgress = enrolledCourseObj?.global_weight ?? 0;
    
    // Attendance logic
    const attendancePct = enrolledCourseObj?.attendance_percentage || 0;
    const passesAttendance = attendancePct >= 75;
    
    // THE INTELLIGENT LEARNING PHASE LOGIC
    // Status is 'Learning Phase' if less than 10% of curriculum has been finished globally.
    // This ignores 0% grades and 0% attendance to avoid deceptive failures.
    let status = 'Pass';
    let statusLabel = 'On Track';
    
    if (globalProgress < 10) {
      status = 'Learning';
      statusLabel = 'Learning Phase';
    } else {
      if (currentAvg < 60 || !passesAttendance || enrolledCourseObj?.failed_final_rule) {
        status = 'Failed';
        statusLabel = 'Failed';
      } else if (currentAvg < 70) {
        status = 'At Risk';
        statusLabel = 'At Risk';
      }
    }

    const hasFlags = gradesForCourse.some(g => g.is_flagged);
    
    const relatedAssessments = [...gradesForCourse.map(g => ({...g, _type: 'graded'})), ...upcomingForCourse.map(a => ({...a, _type: 'upcoming'}))].sort((a,b) => {
        const d1 = new Date(a.dateStr || a.scheduled_date || 0).getTime();
        const d2 = new Date(b.dateStr || b.scheduled_date || 0).getTime();
        return d1 - d2; 
    });

    return { 
      id: cId, 
      name, 
      currentAvg, 
      attendancePct,
      passesAttendance,
      status, 
      statusLabel,
      globalProgress,
      hasFlags, 
      relatedAssessments 
    };
  });

  // --- Tables Setup ---
  
  const gradedColumns = [
    { key: 'courseName',      label: 'Course',       render: v => <strong style={{color: 'var(--text-primary)'}}>{v}</strong> },
    { key: 'assessmentTitle', label: 'Assessment',   render: (v, row) => (
      <span
        onClick={() => navigate(`/gradebook?assessment_id=${row.assessment_id}`)}
        style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}
        title="Open in Gradebook"
      >{v} ↗</span>
    )},
    { key: 'assessmentType',  label: 'Type',         render: v => <Badge color={v === 'Quiz' ? 'blue' : v === 'Midterm' ? 'amber' : v === 'Final' ? 'green' : 'default'}>{v}</Badge> },
    { key: 'raw_score',       label: 'Score',        render: (v, row) => <span style={{fontWeight: 500}}>{Number(v).toFixed(2)} / {row.maxScore}</span> },
    { key: 'percentage',      label: 'Percentage',   render: v => <strong style={{ color: v >= 80 ? 'var(--green)' : v >= 65 ? 'var(--accent)' : 'var(--red)'}}>{v}%</strong> },
    { key: 'instructorName',  label: 'Instructor',   render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)'}}>{v}</span> },
    { key: 'dateStr',         label: 'Date',         render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)'}}>{v ? formatDateTime(v) : '—'}</span> },
    { key: 'status',          label: 'Status',       render: (_, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {row.is_absent ? (
          <Badge color="red" style={{ fontWeight: 800 }}>DNA</Badge>
        ) : (
          <Badge color="purple">✓ Finished</Badge>
        )}
      </div>
    )},
  ];

  const upcomingColumns = [
    { key: 'courseName', label: 'Course', render: v => <strong style={{color: 'var(--text-primary)'}}>{v}</strong> },
    { key: 'title', label: 'Assessment' },
    { key: 'assessment_type', label: 'Type', render: v => <Badge color="blue">{v}</Badge> },
    { key: 'scheduled_date', label: 'Schedule', render: (v, row) => (
       <div style={{ fontSize: 13 }}>
         <div style={{ color: 'var(--text-primary)' }}>{v ? formatDateTime(v) : 'TBD'}</div>
         <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Hall: {row.hall || 'TBD'}</div>
       </div>
    )},
    { key: 'instructorName', label: 'Lead', render: v => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v}</span> },
    { key: 'max_score', label: 'Max Points', render: v => <span style={{ color: 'var(--text-muted)' }}>{v}</span> },
    { key: 'computedStatus', label: 'Status', render: v => {
        let c = 'default';
        if (v === 'Active') c = 'green';
        if (v === 'Incoming') c = 'blue';
        if (v === 'Today') c = 'amber';
        if (v === 'Pending') c = 'red';
        if (v === 'Waiting for Grades') c = 'yellow';
        return <Badge color={c}>{v}</Badge>;
    }},
  ];

  const renderExpandedAssessments = (assessments) => {
    if (!assessments.length) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>No associated data found.</div>;
    return (
      <div style={{ padding: '0 20px 20px 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {assessments.map((a, i) => (
              <tr key={i} style={{ borderBottom: i === assessments.length - 1 ? 'none' : '1px solid var(--border)' }}>
                <td style={{ padding: '12px 10px', width: '30%' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.assessmentTitle || a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.assessmentType || a.assessment_type}</div>
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--text-muted)', width: '25%' }}>
                   {a.dateStr || a.scheduled_date ? formatDateTime(a.dateStr || a.scheduled_date) : 'TBD'}
                </td>
                <td style={{ padding: '12px 10px', width: '20%' }}>
                  {a._type === 'graded' ? (
                    <span style={{ color: a.percentage >= 65 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {a.raw_score} / {a.maxScore || a.max_score}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Up to {a.max_score} pts</span>
                  )}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                   {a._type === 'graded' ? (
                     a.is_absent ? <Badge color="red">DNA</Badge> : <Badge color="purple">Finished</Badge>
                   ) : (
                     <Badge color="blue">{a.computedStatus || 'Pending'}</Badge>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      
      <div>
        <Btn variant="ghost" size="sm" onClick={() => navigate(`/students/${id}`)}>← Back to Profile</Btn>
      </div>

      <div style={{ 
        display: 'flex', gap: 24, alignItems: 'center', background: 'linear-gradient(135deg, #1c1b1f 0%, #121214 100%)', 
        padding: '24px 28px', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div style={{ 
          width: 70, height: 70, borderRadius: 16, background: 'var(--accent)', color: '#000', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800
        }}>
          {student.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{student.name}</h1>
            <Badge color="blue">Year {student.academic_year || '?'}</Badge>
          </div>
          <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>
            <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>ID: {student.university_id || student.id}</span>
            <span>•</span>
            <span>{profile.faculty_name}</span>
            <span>•</span>
            <span>{profile.department_name}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>Report Type</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>ACADEMIC PERFORMANCE</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, background: '#1c1b1f', padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', alignItems: 'center' }}>
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="🔍  Search assessment or course..."
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', minWidth: 220, flex: 1 }}
        />
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
          <option value="">All Courses</option>
          {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
          <option value="">All Types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}>
          <option value="">All Statuses</option>
          <option value="Finished">Finished</option>
          <option value="Waiting for Grades">Waiting for Grades</option>
          <option value="Active">Active</option>
          <option value="Incoming">Incoming</option>
          <option value="Pending">Pending</option>
        </select>
        {hasActiveFilters && (
          <button onClick={() => { setFilterCourse(''); setFilterType(''); setFilterStatus(''); setSearchText(''); }}
            style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid transparent', borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            ✕ Reset
          </button>
        )}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {filteredGradedHistory.length} graded · {filteredUpcoming.length} upcoming
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <Card style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
           <div title="Unweighted average of all individual completed assessments across all courses" style={{ cursor: 'help', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Overall Average</div>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
             <div style={{ fontSize: 32, fontWeight: 800, color: averagePercentage >= 80 ? 'var(--green)' : averagePercentage >= 60 ? 'var(--accent)' : 'var(--red)' }}>{averagePercentage}%</div>
           </div>
           <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12 }}>
             <div style={{ height: '100%', width: `${averagePercentage}%`, background: averagePercentage >= 60 ? 'var(--green)' : 'var(--red)', borderRadius: 2 }} />
           </div>
        </Card>

        <Card style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Attendance Rate</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>Min 75% Req.</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: profile.attendance_percentage >= 75 ? 'var(--blue)' : 'var(--red)' }}>{profile.attendance_percentage}%</div>
            <div style={{ height: 4, width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 12 }}>
              <div style={{ height: '100%', width: `${profile.attendance_percentage}%`, background: profile.attendance_percentage >= 75 ? 'var(--blue)' : 'var(--red)', borderRadius: 2 }} />
            </div>
         </Card>

        <Card style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
           <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Graded Assessments</div>
           <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{totalGraded}</div>
           <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Across all courses</div>
        </Card>

        <Card style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
           <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Upcoming Exams</div>
           <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{upcomingAssessments.length}</div>
           <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Active or Incoming</div>
        </Card>
      </div>

      {/* ── Course Summaries (Accordion view) ── */}
      {courseSummaries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Enrolled Courses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courseSummaries.map(c => {
              const isExpanded = expandedCourse === c.id;
              let statusBadgeColor = 'green';
              if (c.status === 'Learning') statusBadgeColor = 'blue';
              if (c.status === 'At Risk') statusBadgeColor = 'amber';
              if (c.status === 'Failed') statusBadgeColor = 'red';
              
              return (
                <div key={c.id} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: isExpanded ? '0 8px 30px rgba(0,0,0,0.2)' : 'none'
                }}>
                  {/* Row Header */}
                  <div 
                    id={`course-section-${c.id}`}
                    onClick={() => setExpandedCourse(isExpanded ? null : c.id)}
                    style={{ 
                      padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                      transition: 'box-shadow 0.8s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {c.status === 'Failed' && <AlertTriangle size={18} style={{ color: 'var(--red)' }} />}
                      {c.status === 'At Risk' && <AlertCircle size={18} style={{ color: 'var(--amber)' }} />}
                      {c.status === 'Pass' && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--green)', opacity: 0.8 }} />}
                      
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {c.name}
                          {c.status === 'Learning' && (
                            <span className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          Curriculum Progress:
                          <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${c.globalProgress}%`, height: '100%', background: 'var(--blue)' }} />
                          </div>
                          <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{Number(c.globalProgress).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                      {/* Attendance Insight */}
                      <div style={{ textAlign: 'center', width: 95 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.status === 'Learning' ? 'var(--blue)' : c.passesAttendance ? 'var(--blue)' : 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          {c.status !== 'Learning' && !c.passesAttendance && <AlertCircle size={12} />}
                          {`${Number(c.attendancePct).toFixed(1)}%`}
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance</div>
                        <div style={{ fontSize: 8, color: 'var(--text-muted)', opacity: 0.6, marginTop: 1 }}>Req. 75%</div>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div title="Weighted average of all completed assessments for this specific course based on assessment weights" style={{ cursor: 'help', fontSize: 14, fontWeight: 700, color: `var(--${statusBadgeColor})` }}>
                           {c.status === 'Learning' ? '—' : `${Number(c.currentAvg).toFixed(1)}%`}
                        </div>
                        <Badge color={statusBadgeColor}>{c.statusLabel}</Badge>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                      {renderExpandedAssessments(c.relatedAssessments)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming Schedule (Constrained height with Sticky Header) ── */}
      {filteredUpcoming.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#fff' }}>Upcoming Schedule</h2>
          <Card style={{ padding: 0, border: '1px solid var(--blue)', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.1)', overflow: 'hidden' }}>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <Table columns={upcomingColumns} rows={filteredUpcoming} />
            </div>
          </Card>
        </div>
      )}

      {/* ── Monthly Grading History ── */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>Grading History</h2>
          {filteredGradedHistory.length !== gradedHistory.length && (
            <span style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-dim)', padding: '3px 10px', borderRadius: 20 }}>
              Showing {filteredGradedHistory.length} of {gradedHistory.length}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.keys(historyByMonth).length === 0 ? (
            <Card style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No grades match your filters.
            </Card>
          ) : (
            Object.keys(historyByMonth).map(month => (
              <div key={month}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>{month}</h3>
                <Card style={{ padding: 0, overflowX: 'auto' }}>
                  <Table columns={gradedColumns} rows={historyByMonth[month]} emptyText="No data" />
                </Card>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Performance Snapshot ── */}
      {filteredGradedHistory.length > 0 && (
        <div style={{ marginTop: 20 }}>
            <Card>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Performance Snapshot</h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredGradedHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="courseName" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      cursor={{fill: 'var(--accent-dim)'}}
                      contentStyle={{ background: 'var(--surface-low)', border: '1px solid var(--border)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-primary)', marginBottom: 4 }}
                      itemStyle={{ color: 'var(--primary)', fontWeight: 600 }}
                    />
                    <ReferenceLine y={80} stroke="var(--green)" strokeDasharray="3 3" opacity={0.5} />
                    <ReferenceLine y={60} stroke="var(--red)" strokeDasharray="3 3" opacity={0.5} />
                    
                    <Bar dataKey="percentage" radius={[4,4,0,0]}>
                      {filteredGradedHistory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= 80 ? 'var(--green)' : entry.percentage >= 60 ? 'var(--accent)' : 'var(--red)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
        </div>
      )}

    </div>
  );
}
