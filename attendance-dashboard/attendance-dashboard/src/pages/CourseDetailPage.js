import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesApi, enrollmentsApi, studentsApi } from '../api/client';
import { Card, Badge, Btn, Modal, Field, Select, Table, ProgressBar, PageLoader, useToast } from '../components/ui';
import { Download, Activity, TrendingUp, Target, Cpu, Award, FileText, CheckCircle2, BookOpen } from 'lucide-react';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollModal, setEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const { toast, ToastContainer } = useToast();

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    const [d, s] = await Promise.allSettled([coursesApi.detail(id), studentsApi.list()]);
    if (d.status === 'fulfilled') setDetail(d.value.data);
    if (s.status === 'fulfilled') setAllStudents(s.value.data);
    setLoading(false);
  }

  async function handleEnroll(e) {
    e.preventDefault();
    try {
      await enrollmentsApi.create({ student_id: Number(selectedStudent), course_id: Number(id) });
      toast('Student enrolled');
      setEnrollModal(false);
      setSelectedStudent('');
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to enroll', 'error');
    }
  }

  if (loading) return <PageLoader />;
  if (!detail) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Course not found</div>;

  const { course, instructor_name, doctor_name, enrolled_students, attendance_rate, total_sessions, blacklisted_students, faculty_name, department_name, prerequisite_course, sub_courses, assessments = [] } = detail;

  const handleExportCSV = () => {
    let csvContent = "Faculty,Department,Academic Year,Semester,Course ID,Course Name,Student ID,Student Name,Email,Academic Status,Blacklisted\n";
    enrolled_students.forEach(s => {
      const isBlacklisted = blacklisted_students.some(bs => bs.id === s.id) ? 'Yes' : 'No';
      csvContent += `"${faculty_name || ''}","${department_name || ''}","${course.academic_year || ''}","${course.semester || ''}","${course.id}","${course.name}","${s.university_id || ''}","${s.name}","${s.email}","${s.academic_status || ''}","${isBlacklisted}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Course_${course.name}_Students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse schedule
  let schedule = null;
  try { schedule = JSON.parse(course.weekly_schedule); } catch {}

  // Students already enrolled (for filtering the enroll dropdown)
  const enrolledIds = new Set(enrolled_students.map(s => s.id));
  const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));

  const studentColumns = [
    { key: 'id', label: 'ID', render: v => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{v}</span> },
    {
      key: 'name', label: 'Name', render: (v, row) => (
        <span onClick={() => navigate(`/students/${row.id}`)}
          style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent)' }}
          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
          onMouseLeave={e => e.target.style.textDecoration = 'none'}
        >
          {v}
          {row.is_blacklisted && <span style={{ marginLeft: 8, color: 'var(--red)', fontSize: 11 }}>⛔</span>}
        </span>
      )
    },
    { key: 'university_id', label: 'Univ ID', render: v => v ? <span className="mono" style={{ fontSize: 12 }}>{v}</span> : '—' },
    { key: 'email', label: 'Email', render: v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span> },
    { key: 'academic_year', label: 'Year', render: v => v ? <Badge color="default">Year {v}</Badge> : '—' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      <Btn variant="ghost" size="sm" onClick={() => navigate('/courses')} style={{ alignSelf: 'flex-start' }}>← Back to Courses</Btn>

      {/* Header */}
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            <span>{faculty_name || 'N/A'}</span>
            <span>•</span>
            <span>{department_name || 'N/A'}</span>
            <span>•</span>
            <span style={{ color: 'var(--accent)' }}>Year {course.academic_year || '?'}</span>
            <span>•</span>
            <span style={{ color: 'var(--accent)' }}>Term {course.semester || '?'}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>
            {course.course_code && <span style={{ color: 'var(--accent)', marginRight: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }}>[{course.course_code}]</span>}
            {course.name}
            {course.is_elective && <Badge color="yellow" style={{ marginLeft: 10, fontSize: 10 }}>ELECTIVE</Badge>}
          </h1>
          {course.description && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 8px', maxWidth: 600 }}>{course.description}</p>
          )}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
            {doctor_name && <span>👨‍🏫 Doctor: <strong style={{ color: 'var(--green)' }}>{doctor_name}</strong></span>}
            {instructor_name && <span>👤 Instructor: <strong style={{ color: 'var(--blue)' }}>{instructor_name}</strong></span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {course.drive_link && (
            <a href={course.drive_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <Btn variant="ghost" size="sm">📁 Drive Materials</Btn>
            </a>
          )}
          <Btn variant="ghost" size="sm" onClick={() => navigate(`/assessments?course_id=${course.id}`)}>
            📊 Assessment Report
          </Btn>
          <Btn size="sm" onClick={() => setEnrollModal(true)}>+ Enroll Student</Btn>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          ['Enrolled', enrolled_students.length, 'var(--accent)'],
          ['Sessions', total_sessions, 'var(--blue)'],
          ['Attendance Rate', `${attendance_rate}%`, attendance_rate >= 75 ? 'var(--green)' : 'var(--red)'],
          ['Blacklisted', blacklisted_students.length, blacklisted_students.length > 0 ? 'var(--red)' : 'var(--text-muted)'],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Attendance Rate Bar */}
      <Card>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Overall Attendance Rate</div>
        <ProgressBar value={attendance_rate} />
      </Card>

      {/* Visual Roadmap */}
      <Card style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: 20, opacity: 0.05, pointerEvents: 'none' }}>
           <TrendingUp size={120} />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={18} style={{ color: 'var(--accent)' }} /> 
              Academic Journey Roadmap
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Visual progression of course assessments and their current status</p>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => navigate(`/assessments?course_id=${course.id}`)}>
            Manage Slots →
          </Btn>
        </div>
        
        {(() => {
          // Parse Blueprint if available
          let blueprint = [];
          if (course.assessment_blueprint) {
            try { blueprint = JSON.parse(course.assessment_blueprint); } catch(e) { console.error(e); }
          }

          // If no blueprint, just show existing assessments
          if (blueprint.length === 0) {
            if (!assessments || assessments.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border)', borderRadius: 12 }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No academic blueprint configured for this course.</p>
                  <Btn variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => navigate('/assessments')}>Configure Now</Btn>
                </div>
              );
            }
            
            // Legacy display if no blueprint but assessments exist
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                {assessments.map((ass, idx) => (
                  <div key={ass.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      padding: '12px 16px', borderRadius: '8px', background: 'var(--bg-raised)', color: '#fff',
                      border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{ass.assessment_type}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ass.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // TYPE THEMES for high-end visual distinction
          const TYPE_THEMES = {
            'Quiz': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', icon: <BookOpen size={14} /> },
            'Midterm': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <Target size={14} /> },
            'Practical': { color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)', icon: <Cpu size={14} /> },
            'Final': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: <Award size={14} /> },
            'Other': { color: '#94a7c6', bg: 'rgba(148, 167, 198, 0.1)', icon: <FileText size={14} /> }
          };

          // Merge Blueprint with Actual Assessments (Enhanced Matching)
          const roadmap = blueprint
            .filter(b => b.enabled !== false) // Resilient to legacy data missing 'enabled' field
            .map(b => {
              // 1. Match by template_key (Priority)
              let actual = assessments.find(a => a.template_key === b.template_key);
              
              // 2. Fallback: Match by exact title if template_key is missing
              if (!actual) {
                actual = assessments.find(a => !a.template_key && a.title.toLowerCase() === b.title.toLowerCase());
              }
              
              // 3. Fallback: Match by type if it's the only one of its type and title is similar
              if (!actual) {
                const sameType = assessments.filter(a => !a.template_key && a.assessment_type === b.assessment_type);
                if (sameType.length === 1) {
                   actual = sameType[0];
                }
              }

              return { blueprint: b, actual: actual };
            });

          const getComputedStatus = (a) => {
            if (!a) return 'Locked';
            
            // 1. Explicit Status Matches (Priority)
            if (a.status === 'Finished') return 'Finished';
            if (a.status === 'Waiting for Grade' || a.status === 'Waiting for Grades') return 'Waiting for Grade';
            if (a.status === 'Pending') return 'Pending';
            
            // 2. Temporal Logic (Based on scheduled_date)
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
              // Past date but not explicitly finished -> Active (or should it be Finished?)
              return 'Active';
            }
            return 'Pending';
          };

          return (
            <div style={{ 
              display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', padding: '10px 5px 20px',
              scrollbarWidth: 'none', msOverflowStyle: 'none'
            }}>
              {roadmap.map((item, idx) => {
                const ass = item.actual;
                const bp = item.blueprint;
                const status = getComputedStatus(ass);
                const isLocked = status === 'Locked';
                const isLast = idx === roadmap.length - 1;

                const theme = TYPE_THEMES[bp.assessment_type] || TYPE_THEMES['Other'];
                
                const isFinished = status === "Finished";
                const isActive = status === "Active" || status === "Today";
                const isWaiting = status === "Waiting for Grade";
                
                // Card Color Profile
                let accentColor = theme.color;
                let cardBg = 'var(--bg-surface)';
                let borderColor = 'var(--border)';
                let icon = theme.icon;
                let statusLabel = status;
                let statusColor = 'var(--text-muted)';
                
                if (isFinished) {
                  accentColor = 'var(--green)';
                  statusColor = 'var(--green)';
                  icon = <CheckCircle2 size={14} />;
                } else if (isActive) {
                  accentColor = 'var(--accent)';
                  cardBg = 'var(--accent-dim)';
                  borderColor = 'var(--accent)';
                  statusColor = 'var(--accent)';
                  if (status === 'Today') statusLabel = "TODAY";
                  else statusLabel = "ACTIVE";
                } else if (isWaiting) {
                  accentColor = 'var(--yellow)';
                  statusColor = 'var(--yellow)';
                } else if (isLocked) {
                  accentColor = 'var(--text-muted)';
                  statusLabel = "NOT EXIST";
                }

                return (
                  <React.Fragment key={bp.template_key}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 160 }}>
                      <div 
                        className={isActive ? 'pulse-animation' : ''}
                        style={{
                          width: '100%',
                          padding: '20px 15px',
                          borderRadius: '16px',
                          background: cardBg,
                          border: isLocked ? '1px dashed var(--border)' : `1px solid ${borderColor}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: ass ? 'pointer' : 'default',
                          opacity: isLocked ? 0.3 : 1,
                          boxShadow: isActive ? '0 0 25px var(--accent-dim)' : 'none',
                          zIndex: 2
                        }}
                        onClick={() => ass && navigate(`/assessments/${ass.id}/grading`)}
                        onMouseEnter={e => {
                          if (!isLocked) {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.borderColor = accentColor;
                            e.currentTarget.style.boxShadow = `0 10px 20px -10px ${accentColor}44`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isLocked) {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.borderColor = borderColor;
                            e.currentTarget.style.boxShadow = isActive ? '0 0 25px var(--accent-dim)' : 'none';
                          }
                        }}
                      >
                        {/* Type Indicator */}
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '10px', background: isLocked ? 'var(--bg-raised)' : theme.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: isLocked ? 'var(--text-muted)' : theme.color,
                          marginBottom: 12, border: `1px solid ${isLocked ? 'var(--border)' : theme.color + '22'}`
                        }}>
                          {icon}
                        </div>

                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: accentColor, letterSpacing: '0.05em', marginBottom: 4 }}>
                          {bp.assessment_type}
                        </span>
                        
                        <span style={{ fontSize: 13, fontWeight: 700, color: isLocked ? 'var(--text-muted)' : '#fff', lineHeight: 1.2, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {ass ? ass.title : bp.title}
                        </span>

                        <div style={{ height: 1, width: '40%', background: 'var(--border)', margin: '12px 0' }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                           <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, textTransform: 'uppercase' }}>{statusLabel}</span>
                           {!isLocked && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>• {ass ? ass.weight_pct : bp.weight_pct}%</span>}
                        </div>

                        {/* Progress Marker */}
                        <div style={{ 
                           position: 'absolute', bottom: -30, width: 12, height: 12, borderRadius: '50%',
                           background: isFinished ? 'var(--green)' : isActive ? 'var(--accent)' : 'var(--bg-surface)',
                           border: `3px solid ${isFinished ? 'var(--green-dim)' : isActive ? 'var(--accent-dim)' : 'var(--border)'}`,
                           zIndex: 5
                        }} />
                      </div>
                    </div>
                    
                    {!isLast && (
                      <div style={{ 
                        flex: 1, height: 2, alignSelf: 'center', marginTop: 45,
                        background: `linear-gradient(to right, ${isFinished ? 'var(--green)' : 'var(--border)'}, ${getComputedStatus(roadmap[idx+1].actual) === 'Finished' ? 'var(--green)' : 'var(--border)'})`,
                        opacity: 0.6,
                        minWidth: 40,
                        zIndex: 1
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })()}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Enrolled Students */}
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Enrolled Students ({enrolled_students.length})</h2>
            <Btn variant="ghost" size="sm" onClick={handleExportCSV} style={{ color: 'var(--accent)' }}>
              <Download size={14} style={{ marginRight: 6 }} /> Export CSV
            </Btn>
          </div>
          <Table columns={studentColumns} rows={enrolled_students} emptyText="No students enrolled" />
        </Card>

        {/* Schedule + Blacklisted */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Weekly Schedule */}
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Weekly Schedule</h2>
            {schedule ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(schedule).map(([day, time]) => (
                  <div key={day} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 'var(--radius)',
                    background: 'var(--bg-raised)',
                  }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{day}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>{time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No schedule set</p>
            )}
          </Card>

          {/* Blacklisted Students */}
          {blacklisted_students.length > 0 && (
            <Card style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)', marginBottom: 12 }}>⛔ Blacklisted Students</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blacklisted_students.map(s => (
                  <div key={s.id} style={{
                    padding: '8px 12px', borderRadius: 'var(--radius)',
                    background: 'var(--red-dim)', fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({s.university_id || s.email})</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Course Series / Prerequisite Chain */}
      {(prerequisite_course || (sub_courses && sub_courses.length > 0)) && (
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)' }}>⛓</span> Course Series
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Prerequisite */}
            {prerequisite_course && (
              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius)', background: 'var(--bg-raised)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>Prerequisite Required</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {prerequisite_course.course_code && <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginRight: 6 }}>[{prerequisite_course.course_code}]</span>}
                    {prerequisite_course.name}
                  </div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => navigate(`/courses/${prerequisite_course.id}`)}>View →</Btn>
              </div>
            )}

            {/* Sub-courses (next in series) */}
            {sub_courses && sub_courses.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>Next in Series ({sub_courses.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sub_courses.map(sc => (
                    <div key={sc.id} onClick={() => navigate(`/courses/${sc.id}`)} style={{
                      padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--bg-raised)',
                      border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Badge color="blue">Tier {sc.tier_level}</Badge>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {sc.course_code && <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginRight: 6 }}>[{sc.course_code}]</span>}
                          {sc.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Year {sc.academic_year} • Term {sc.semester}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Enroll Modal */}
      {enrollModal && (
        <Modal title="Enroll Student" onClose={() => setEnrollModal(false)} width={400}>
          <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Select student">
              <Select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">— Choose student —</option>
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.university_id || s.email})</option>
                ))}
              </Select>
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setEnrollModal(false)}>Cancel</Btn>
              <Btn type="submit" disabled={!selectedStudent}>Enroll</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
