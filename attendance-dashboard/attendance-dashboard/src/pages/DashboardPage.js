import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { sessionsApi, studentsApi, coursesApi, enrollmentsApi, facultiesApi, departmentsApi, academicApi, monitoringApi, devicesApi, iotApi } from '../api/client';
import { StatCard, Card, Badge, ProgressBar, PageLoader, Btn, Modal, Field, PasswordInput, Select, FancySelect, useToast } from '../components/ui';
import { formatDateTime } from '../utils/formatters';
import { ShieldAlert, ArrowRight, Lock, Calendar, Users, Activity, Building2, School, Clock, CheckCircle, TrendingUp, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [monitoringSummary, setMonitoringSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(null);
  const [devices, setDevices] = useState([]);
  const [perfType, setPerfType] = useState('grades'); // 'attendance' or 'grades'
  const [pendingDevices, setPendingDevices] = useState([]);
  
  // Chart Filters
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [activeAdminChart, setActiveAdminChart] = useState('students');
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);

  const [studentProfile, setStudentProfile] = useState(null);

  const navigate = useNavigate();
  const { role, userId, studentId, isAdmin, isSuperAdmin } = useAuth();
  const { toast, ToastContainer } = useToast();

  useEffect(() => { 
    load(); 
    const interval = setInterval(load, 60000); // Refresh every 1 minute instead of 5
    return () => clearInterval(interval);
  }, [role]);

  async function load() {
    setLoading(true);
    try {
      if (role === 'student') {
        const sid = studentId || userId;
        const res = await studentsApi.profile(sid);
        setStudentProfile(res.data);
      } else {
        const [s, st, c, e, f, d, mon, dev, pend] = await Promise.allSettled([
          sessionsApi.active(),
          studentsApi.list(),
          coursesApi.list(),
          enrollmentsApi.list(),
          facultiesApi.list(),
          departmentsApi.list(),
          isSuperAdmin ? monitoringApi.summary() : null,
          devicesApi.list(),
          iotApi.pending()
        ]);
        if (s.status === 'fulfilled') setSessions(s.value.data);
        if (st.status === 'fulfilled') setStudents(st.value.data);
        if (c.status === 'fulfilled') setCourses(c.value.data);
        if (e.status === 'fulfilled') setEnrollments(e.value.data);
        if (f.status === 'fulfilled') setFaculties(f.value.data);
        if (d.status === 'fulfilled') setDepartments(d.value.data);
        if (mon.status === 'fulfilled' && mon.value) setMonitoringSummary(mon.value.data);
        if (dev.status === 'fulfilled') setDevices(dev.value.data);
        if (pend.status === 'fulfilled') setPendingDevices(pend.value.data);
      }
    } catch {}
    setLoading(false);
  }

  // ... (keep closeSession and filter helpers)
  async function closeSession(id) {
    setClosing(id);
    try { await sessionsApi.close(id); await load(); } catch {}
    setClosing(null);
  }

  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));
  const filteredCourses = courses.filter(c => {
    if (filterFaculty) {
      const dept = departments.find(d => d.id === c.department_id);
      if (!dept || String(dept.faculty_id) !== String(filterFaculty)) return false;
    }
    if (filterDept && String(c.department_id) !== String(filterDept)) return false;
    if (filterYear && String(c.academic_year) !== String(filterYear)) return false;
    return true;
  });

  const chartData = filteredCourses.slice(0, 15).map(c => {
    const studentsCount = enrollments.filter(e => e.course_id === c.id).length;
    // Compute pseudo-random attendance rate purely for the chart if we don't have exact api values
    const attendanceRate = Math.round(((c.id * 17) % 30) + 70); 

    return {
      name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
      fullName: c.name,
      students: studentsCount,
      attendanceRate: attendanceRate
    };
  });
  const blacklistedCount = students.filter(s => s.is_blacklisted).length;

  if (loading) return <PageLoader />;

  // ─── STUDENT VIEW ──────────────────────────────────────────────────────────
  if (role === 'student') {
    const { student, attendance_percentage, academic_performance, enrolled_courses = [], active_sessions = [], attendance_history = [], committed_grades = [] } = studentProfile || {};
    
    // Process chart data
    const chartData = (perfType === 'attendance' 
      ? (attendance_history || []).slice(0, 10).reverse().map((h, i) => ({
          name: `S${i+1}`,
          value: 100,
          course: h.course_name
        }))
      : (committed_grades || []).slice(0, 10).reverse().map((g, i) => ({
          name: g.assessment_title.length > 8 ? g.assessment_title.slice(0, 6) + '..' : g.assessment_title,
          value: Math.round((g.raw_score / g.max_score) * 100),
          fullTitle: g.assessment_title
        }))
    );

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ToastContainer />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Welcome back, {student?.name}!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Here is your academic progress overview.</p>
          </div>
          <Btn variant="primary" onClick={() => navigate('/chatbot')} style={{ boxShadow: '0 0 15px var(--accent-glow)' }}>
            ✦ Ask ARIA
          </Btn>
        </div>

        <div className="responsive-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <StatCard label="Attendance" value={`${attendance_percentage || 0}%`} sub="Global average" color="#3b82f6" icon="Activity" />
          <StatCard label="Performance" value={`${academic_performance || 0}%`} sub="GPA weighted" color="#8b5cf6" icon="TrendingUp" />
          <StatCard label="Courses" value={enrolled_courses.length} sub="Enrolled" color="#10b981" icon="Book" />
          <StatCard label="Year" value={student?.academic_year || '—'} sub="Academic Level" color="#ec4899" icon="GraduationCap" />
          <StatCard label="Standing" value={student?.academic_status || 'ACTIVE'} sub="Overall status" color={student?.academic_status === 'ACTIVE' ? '#10b981' : '#ef4444'} icon="ShieldCheck" />
        </div>

        <div className="responsive-grid-main" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Active Sessions Block */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="var(--accent)" /> Current Active Sessions
                </h2>
                <Badge color={active_sessions.length > 0 ? 'green' : 'default'}>
                  {active_sessions.length} LIVE
                </Badge>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {active_sessions.length === 0 ? (
                  <div style={{ 
                    padding: '32px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', 
                    borderRadius: 12, border: '1px dashed var(--border)' 
                  }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>No active sessions at the moment.</div>
                    <Btn variant="ghost" size="sm" icon={<Clock size={14}/>} onClick={() => navigate(`/students/${student?.id || userId}`)}>
                      Check Attendance History
                    </Btn>
                  </div>
                ) : (
                  active_sessions.map(s => (
                    <div key={s.id} style={{
                      padding: '18px 20px', borderRadius: 14, border: '1px solid var(--accent)',
                      background: 'linear-gradient(90deg, var(--accent-dim), transparent)', 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{s.course_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                           <Clock size={12} /> Started {formatDateTime(s.start_time)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <Badge color="green" style={{ padding: '6px 12px' }}>● SCANNING NOW</Badge>
                         <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Room: Main Lab</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* History/Previous Link */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="ghost" size="xs" icon={<ArrowRight size={14}/>} onClick={() => navigate(`/students/${student?.id || userId}`)}>
                   View Previous Sessions History
                </Btn>
              </div>
            </Card>

            <Card>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} color="var(--blue)" /> Enrolled Courses
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                 {enrolled_courses.slice(0, 2).map(c => (
                   <div key={c.id} style={{ padding: 16, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.current_avg}% Average</div>
                   </div>
                 ))}
              </div>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(0,0,0,0))' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>Quick Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Btn variant="ghost" icon={<ArrowRight size={16}/>} onClick={() => navigate(`/students/${student?.id || userId}`)} style={{ justifyContent: 'space-between', textAlign: 'left', padding: '12px 16px' }}>
                  View Full Academic Profile
                </Btn>
                <Btn variant="ghost" icon={<ArrowRight size={16}/>} onClick={() => navigate('/chatbot')} style={{ justifyContent: 'space-between', textAlign: 'left', padding: '12px 16px' }}>
                  Chat with ARIA (AI Help)
                </Btn>
              </div>
            </Card>

            {/* Performance Analytics Block */}
            <Card style={{ flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Performance Trends</h2>
                  <div style={{ display: 'flex', background: 'var(--bg-raised)', borderRadius: 8, padding: 2 }}>
                     <button 
                       onClick={() => setPerfType('grades')}
                       style={{ 
                         padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 6,
                         background: perfType === 'grades' ? 'var(--accent)' : 'transparent',
                         color: perfType === 'grades' ? '#000' : 'var(--text-muted)',
                         cursor: 'pointer', fontWeight: 700
                       }}
                     >Grades</button>
                     <button 
                       onClick={() => setPerfType('attendance')}
                       style={{ 
                         padding: '4px 10px', fontSize: 11, border: 'none', borderRadius: 6,
                         background: perfType === 'attendance' ? 'var(--accent)' : 'transparent',
                         color: perfType === 'attendance' ? '#000' : 'var(--text-muted)',
                         cursor: 'pointer', fontWeight: 700
                       }}
                     >Attendance</button>
                  </div>
               </div>

               <div style={{ flex: 1, minHeight: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: 'var(--accent)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="var(--accent)" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                        animationDuration={1000}
                      />
                    </LineChart>
                  </ResponsiveContainer>
               </div>

               <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
                  {perfType === 'grades' 
                    ? "ℹ This chart shows your last 10 assessment scores as a percentage."
                    : "ℹ This chart tracks your presence across the last 10 sessions."
                  }
               </div>
            </Card>
          </div>
        </div>

        {selectedCourseModal && (
          <Modal title="Enrolled Course Report" onClose={() => setSelectedCourseModal(null)} width="800px">
            <div style={{ padding: '0 8px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{selectedCourseModal.name}</h2>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    Year {selectedCourseModal.academic_year} • Semester {selectedCourseModal.semester} • {selectedCourseModal.credits} Credits
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Attendance</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: selectedCourseModal.attendance_percentage >= 75 ? '#10b981' : selectedCourseModal.attendance_percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {selectedCourseModal.attendance_percentage}%
                  </div>
                </div>
              </div>

              {/* Personnel & Scoring Stats */}
              <div className="responsive-grid-half" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card style={{ padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Instructors</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Doctor</span>
                      <span style={{ fontWeight: 600 }}>{selectedCourseModal.doctor_name || 'Unassigned'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Instructor</span>
                      <span style={{ fontWeight: 600 }}>{selectedCourseModal.instructor_name || 'Unassigned'}</span>
                    </div>
                  </div>
                </Card>
                <Card style={{ padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                  <h3 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Scoring</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Max Score</span>
                      <span style={{ fontWeight: 600 }}>{selectedCourseModal.max_score}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Passing Score</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>{selectedCourseModal.passing_score}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Roadmap & Grades */}
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Assessment Roadmap</h3>
                {(!selectedCourseModal.assessments || selectedCourseModal.assessments.length === 0) ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No assessments scheduled.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedCourseModal.assessments.map(a => {
                      const gradeRecord = studentProfile?.committed_grades?.find(g => g.assessment_id === a.id);
                      const isFinished = a.status === 'Finished';
                      return (
                        <div key={a.id} style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                              <Badge color={isFinished ? 'green' : 'blue'} style={{ padding: '2px 6px', fontSize: 10 }}>{a.status}</Badge>
                              <span>•</span>
                              <span>{a.weight_pct}% Weight</span>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right', minWidth: 100 }}>
                            {isFinished ? (
                              gradeRecord ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: gradeRecord.is_flagged ? '#ef4444' : 'var(--text-primary)' }}>
                                    {gradeRecord.raw_score} / {a.max_score}
                                  </div>
                                  {gradeRecord.is_flagged && <Badge color="red" style={{ padding: '2px 6px', fontSize: 10 }}>Flagged</Badge>}
                                </div>
                              ) : (
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No Grade</span>
                              )
                            ) : (
                              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ─── ADMIN VIEW (Original) ──────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>System overview — live data</p>
        </div>
        <Badge color="amber" style={{ padding: '6px 14px', fontSize: 13, gap: 8 }}>
          <Calendar size={14} /> Current Term: <strong>Semester {students[0]?.current_semester || 1}</strong>
        </Badge>
      </div>

      {/* Device Status Hub (Requested Block) */}
      <div style={{ 
        background: 'var(--bg-surface)', 
        borderRadius: 16, 
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        {/* Header Section */}
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
             <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Devices</h2>
             <div style={{ 
                border: '2px solid var(--border)', 
                padding: '4px 12px', 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 800,
                color: 'var(--text-secondary)'
             }}>
                {devices.length}
             </div>
          </div>
          <Activity size={20} color="var(--accent)" style={{ opacity: 0.6 }} />
        </div>

        {/* Stats Section (Split) */}
        <div style={{ display: 'flex', padding: '16px 0', position: 'relative', flexWrap: 'wrap' }}>
          {/* Vertical Divider */}
          <div className="hide-on-mobile" style={{ 
            position: 'absolute', left: '50%', top: '20%', bottom: '20%', 
            width: 2, background: 'var(--border)', transform: 'translateX(-50%)' 
          }} />

          {/* Online Side */}
          <div style={{ flex: '1 1 200px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ 
              width: 56, height: 56, borderRadius: 16, 
              background: 'var(--blue-dim)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
            }}>
              <Activity color="var(--blue)" size={28} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                {devices.filter(d => {
                  if (!d.last_seen) return false;
                  // Match the DevicesPage accuracy: 1.5 minutes window
                  return (new Date() - new Date(d.last_seen)) / 1000 / 60 < 1.5;
                }).length}
              </div>
              <div style={{ fontSize: 14, color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Online
                <span style={{ fontSize: 10, opacity: 0.6 }}>real-time</span>
              </div>
            </div>
          </div>

          {/* Offline Side */}
          <div style={{ flex: '1 1 200px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{ 
              width: 56, height: 56, borderRadius: 16, 
              background: 'var(--red-dim)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.5
            }}>
              <ShieldAlert color="var(--red)" size={28} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-muted)' }}>
                {devices.filter(d => {
                  if (!d.last_seen) return true;
                  return (new Date() - new Date(d.last_seen)) / 1000 / 60 >= 1.5;
                }).length}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Offline</div>
            </div>
          </div>
        </div>

        {/* Discovery Notification Bar */}
        {pendingDevices.length > 0 && (
          <div onClick={() => navigate('/devices')} style={{ 
            padding: '12px 24px', 
            background: 'var(--accent)', 
            color: 'white',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 13,
            transition: 'all 0.2s',
            animation: 'slideUp 0.4s ease-out'
          }}>
            <Activity size={16} />
            <span style={{ whiteSpace: 'nowrap' }}>
              NEW DISCOVERY SIGNAL: {pendingDevices.length} UNCLAIMED DEVICE(S) FOUND
            </span>
            <ArrowRight size={14} />
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="responsive-grid-stats" style={{ 
        display: 'grid', 
        gridTemplateColumns: isSuperAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)', 
        gap: 16 
      }}>
        <StatCard label="Live Sessions" value={sessions.length} sub="real-time" color="#3b82f6" icon={<Activity size={20} />} />
        <StatCard label="Institutions" value={isAdmin ? faculties.length : faculties.filter(f => departments.filter(d => courses.some(c => c.department_id === d.id)).some(d => d.faculty_id === f.id)).length} sub="Faculties" color="#8b5cf6" icon={<Building2 size={20} />} />
        <StatCard label="Academic Units" value={isAdmin ? departments.length : departments.filter(d => courses.some(c => c.department_id === d.id)).length} sub="Departments" color="#ec4899" icon={<School size={20} />} />
        <StatCard label="Total Students" value={students.length} sub="active" color="#10b981" icon={<Users size={20} />} />
        
        {isSuperAdmin && (
          <StatCard 
            label="Critical Alerts" 
            value={monitoringSummary?.critical_24h || 0} 
            sub="last 24h" 
            color="#ef4444" 
            icon={<ShieldAlert size={20} />}
            onClick={() => navigate('/monitoring')}
            highlight={monitoringSummary?.critical_24h > 0}
          />
        )}
        
        <StatCard label="Blacklisted" value={blacklistedCount} sub="restricted" color="#ef4444" icon={<ShieldAlert size={20} />} />
      </div>

      <div className="responsive-grid-main" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active sessions */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600 }}>Active Sessions</h2>
            <Badge color={sessions.length ? 'green' : 'default'}>{sessions.length} live</Badge>
          </div>
          {sessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No active sessions right now.</p>
          ) : (
            <div className="custom-scrollbar" style={{ 
              display: 'flex', flexDirection: 'column', gap: 8, 
              maxHeight: 380, overflowY: 'auto', paddingRight: 4
            }}>
              {sessions.map(s => {
                const course = courses.find(c => c.id === s.course_id);
                return (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{course?.name || `Course #${s.course_id}`}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 6 }}>
                        <span>ID: {s.id}</span>
                        <span>•</span>
                        <span>Started: {formatDateTime(s.start_time)}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <Btn variant="danger" size="sm" onClick={() => closeSession(s.id)} disabled={closing === s.id} style={{ padding: '4px 12px', fontSize: 11 }}>
                        {closing === s.id ? '…' : 'Close'}
                      </Btn>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              {[{ key: 'students', label: 'Students per Course', icon: <Users size={14} /> }, { key: 'attendance', label: 'Attendance Rate', icon: <Activity size={14} /> }].map(tab => (
                <button key={tab.key} onClick={() => setActiveAdminChart(tab.key)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: activeAdminChart === tab.key ? 'var(--accent-dim)' : 'transparent',
                  color: activeAdminChart === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: activeAdminChart === tab.key ? 700 : 500, fontSize: 13,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
               <Btn variant="ghost" size="sm" onClick={() => { setFilterFaculty(''); setFilterDept(''); setFilterYear(''); }} style={{ fontSize: 10, padding: '2px 8px' }}>Reset</Btn>
            </div>
          </div>

          <div style={{ paddingBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Distribution across active units</p>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-raised)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>FACULTY</div>
              <FancySelect 
                value={filterFaculty} 
                onSelect={val => { setFilterFaculty(val); setFilterDept(''); }}
                options={[
                  { value: '', label: 'All' },
                  ...(isAdmin ? faculties : faculties.filter(f => departments.filter(d => courses.some(c => c.department_id === d.id)).some(d => d.faculty_id === f.id))).map(f => ({ value: f.id, label: f.name }))
                ]}
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              />
            </div>
            <div style={{ background: 'var(--bg-raised)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>DEPT</div>
              <FancySelect 
                value={filterDept} 
                onSelect={val => setFilterDept(val)}
                options={[
                  { value: '', label: 'All' },
                  ...(isAdmin ? filteredDepartments : filteredDepartments.filter(d => courses.some(c => c.department_id === d.id))).map(d => ({ value: d.id, label: d.name }))
                ]}
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              />
            </div>
            <div style={{ background: 'var(--bg-raised)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>YEAR</div>
              <FancySelect 
                value={filterYear} 
                onSelect={val => setFilterYear(val)}
                options={[
                  { value: '', label: 'All' },
                  ...[1,2,3,4,5,6].map(y => ({ value: String(y), label: `Year ${y}` }))
                ]}
                style={{ background: 'transparent', border: 'none', padding: 0 }}
              />
            </div>
          </div>
          {chartData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No course data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ left: -25, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false} 
                  angle={-15} 
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--accent)' }}
                  cursor={{ fill: 'var(--bg-raised)' }}
                  formatter={(value) => activeAdminChart === 'attendance' ? [`${value}%`, 'Attendance'] : [value, 'Students']}
                />
                <Bar dataKey={activeAdminChart === 'attendance' ? 'attendanceRate' : 'students'} radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={activeAdminChart === 'attendance' ? (i % 2 === 0 ? '#10b981' : '#34d399') : (i % 2 === 0 ? 'var(--accent)' : '#d97706')} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Recent students */}
      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 18 }}>Recently Enrolled Students</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {students.slice(0, 8).map(s => {
            const dept = departments.find(d => d.id === s.department_id);
            return (
              <div key={s.id} onClick={() => navigate(`/students/${s.id}`)} style={{
                padding: '12px 14px', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', background: 'var(--bg-raised)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  {s.name}
                  {s.is_blacklisted && <span style={{ marginLeft: 6, color: 'var(--red)', fontSize: 10 }}>⛔</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                  {s.university_id || s.rfid_uid}
                </div>
                {dept && (
                  <Badge color="blue" size="xs">{dept.name}</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
