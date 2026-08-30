import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentsApi, coursesApi, doctorsApi, archiveApi } from '../api/client';
import { Card, Badge, Btn, Modal, Field, Input, Table, ProgressBar, PageLoader, useToast, Select } from '../components/ui';
import { formatDate, formatDateTime, formatPhoneNumber } from '../utils/formatters';
import { Filter, Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp, BarChart2, GraduationCap } from 'lucide-react';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, email, isAdmin } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blacklistModal, setBlacklistModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isDoctor, setIsDoctor] = useState(false);
  const { toast, ToastContainer } = useToast();

  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [activeTab, setActiveTab] = useState('records');
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedCourseModal, setSelectedCourseModal] = useState(null);

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (activeTab === 'timeline' && !timeline) loadTimeline(); }, [activeTab]);

  async function load() {
    setLoading(true);
    const [p, d] = await Promise.allSettled([
      studentsApi.profile(id),
      doctorsApi.list()
    ]);
    
    if (p.status === 'fulfilled') {
      setProfile(p.value.data);
      if (p.value.data.student?.academic_year) {
        setFilterYear(p.value.data.student.academic_year.toString());
      }
    }
    
    // Check if current user is in the doctors list
    if (d.status === 'fulfilled' && role === 'instructor') {
      const doctors = d.value.data;
      setIsDoctor(doctors.some(doc => doc.email === email));
    }
    
    setLoading(false);
  }

  async function loadTimeline() {
    setTimelineLoading(true);
    try {
      const res = await archiveApi.studentTimeline(id);
      setTimeline(res.data);
    } catch (err) {
      // Timeline may be empty for new students
      setTimeline({ timeline: [], summary: { promotions: 0, carry_overs: 0, repeats: 0 } });
    } finally {
      setTimelineLoading(false);
    }
  }
  const canBlacklist = useMemo(() => {
    return isAdmin || isDoctor;
  }, [isAdmin, isDoctor]);

  async function handleBlacklist(e) {
    e.preventDefault();
    if (!reason.trim() || reason.length < 3) {
      toast('Please provide a valid reason (min 3 chars)', 'error');
      return;
    }
    try {
      await studentsApi.blacklist(id, reason);
      toast('Student blacklisted');
      setBlacklistModal(false);
      setReason('');
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to blacklist', 'error');
    }
  }

  async function handleUnblacklist() {
    try {
      await studentsApi.unblacklist(id);
      toast('Student removed from blacklist');
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed', 'error');
    }
  }

  if (loading) return <PageLoader />;
  if (!profile) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Student not found</div>;

  const { student, attendance_percentage, academic_performance, total_sessions, attended_sessions, faculty_name, department_name, enrolled_courses = [], grades, committed_grades = [], attendance_history = [] } = profile;

  // Filter courses and grades based on year and semester
  const filteredCourses = enrolled_courses.filter(c => {
    if (filterYear !== 'All' && c.academic_year != filterYear) return false;
    if (filterSemester !== 'All' && c.semester != filterSemester) return false;
    return true;
  });

  const filteredGrades = committed_grades.filter(g => {
    if (filterYear !== 'All' && g.academic_year != filterYear) return false;
    if (filterSemester !== 'All' && g.semester != filterSemester) return false;
    return true;
  });

  const committedGradeColumns = [
    { key: 'course_name',       label: 'Course',      render: v => <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v}</span> },
    { key: 'assessment_title',  label: 'Assessment',  render: v => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'assessment_type',   label: 'Type',        render: v => <Badge color={v === 'Quiz' ? 'blue' : v === 'Midterm' ? 'amber' : v === 'Final' ? 'green' : 'default'}>{v}</Badge> },
    { key: 'raw_score',         label: 'Score',       render: (v, row) => (
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
        {typeof v === 'number' ? v.toFixed(2) : v} <span style={{ color: 'var(--text-muted)' }}>/ {row.max_score}</span>
      </span>
    )},
    { key: 'weighted_score',    label: 'Weighted',    render: (v, row) => {
      const color = v >= row.weight_pct * 0.8 ? 'var(--green)' : v >= row.weight_pct * 0.6 ? 'var(--accent)' : 'var(--red)';
      return <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{v?.toFixed(2)}</span>;
    }},
    { key: 'instructor_remarks', label: 'Instructor',  render: v => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v || '—'}</span> },
    { key: 'is_flagged',         label: 'Flag',        render: v => v ? <Badge color="red">⚠ Flagged</Badge> : <Badge color="green">✓ OK</Badge> },
    { key: 'status',             label: 'Status',      render: v => <Badge color="purple">✓ {v}</Badge> },
  ];

  const historyColumns = [
    { key: 'session_id', label: 'Session', render: v => <span className="mono">#{v}</span> },
    { key: 'status', label: 'Status', render: v => <Badge color={v === 'present' ? 'green' : v === 'late' ? 'amber' : 'red'}>{v}</Badge> },
    { key: 'timestamp', label: 'Time', render: v => <span className="mono" style={{ fontSize: 12 }}>{formatDateTime(v)}</span> },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />

      <div>
        <Btn variant="ghost" size="sm" onClick={() => role === 'student' ? navigate('/dashboard') : navigate('/students')}>
          ← {role === 'student' ? 'Back to Dashboard' : 'Back to Students'}
        </Btn>
      </div>

      {student.is_blacklisted && (
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>⛔ This student is blacklisted</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Reason: {student.blacklist_reason || 'No reason provided'}</div>
          </div>
          {canBlacklist && <Btn size="sm" onClick={handleUnblacklist}>Remove from Blacklist</Btn>}
        </div>
      )}

      {selectedCourseModal && (
        <Modal title="Detailed Academic Report" onClose={() => setSelectedCourseModal(null)} width="850px">
          <div style={{ padding: '0 8px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{selectedCourseModal.name}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>Academic Year {selectedCourseModal.academic_year}</span>
                  <span>•</span>
                  <span>Semester {selectedCourseModal.semester}</span>
                  <span>•</span>
                  <span>{selectedCourseModal.credits} Credits</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Grade Progress</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: selectedCourseModal.current_avg >= 60 ? 'var(--green)' : 'var(--red)' }}>
                    {selectedCourseModal.current_avg}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Attendance</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: selectedCourseModal.attendance_percentage >= 75 ? 'var(--green)' : 'var(--red)' }}>
                    {selectedCourseModal.attendance_percentage}%
                  </div>
                </div>
              </div>
            </div>
            <div className="responsive-grid-half" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Course Staff</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Doctor in Charge</span>
                    <span style={{ fontWeight: 600 }}>{selectedCourseModal.doctor_name || 'Not assigned'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>T.A. / Instructor</span>
                    <span style={{ fontWeight: 600 }}>{selectedCourseModal.instructor_name || 'Not assigned'}</span>
                  </div>
                </div>
              </Card>
              <Card style={{ padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Grading Policy</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Maximum Score</span>
                    <span style={{ fontWeight: 600 }}>{selectedCourseModal.max_score} pts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Passing Threshold</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{selectedCourseModal.passing_score} pts</span>
                  </div>
                </div>
              </Card>
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                 Assessment Roadmap
                 <Badge size="xs" color="blue">{selectedCourseModal.assessments?.length || 0} items</Badge>
              </h3>
              {(!selectedCourseModal.assessments || selectedCourseModal.assessments.length === 0) ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-raised)', borderRadius: 8, border: '1px dashed var(--border)' }}>No assessments recorded for this term.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCourseModal.assessments.map(a => {
                    const gradeRecord = committed_grades?.find(g => g.assessment_id === a.id);
                    const isFinished = a.status === 'Finished';
                    return (
                      <div key={a.id} style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 10
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{a.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                            <Badge color={isFinished ? 'green' : 'blue'} style={{ padding: '2px 6px', fontSize: 9 }}>{a.status}</Badge>
                            <span>•</span>
                            <span>{a.weight_pct}% contribution</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 100 }}>
                          {isFinished ? (
                            gradeRecord ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: gradeRecord.is_flagged ? 'var(--red)' : 'var(--text-primary)' }}>
                                  {gradeRecord.raw_score} / {a.max_score}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  Score: {((gradeRecord.raw_score / a.max_score) * 100).toFixed(1)}%
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending Grade</span>
                            )
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>Scheduled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Recent Sessions */}
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                 Recent Attendance Scans
                 <Badge size="xs" color="green">Last 5 Sessions</Badge>
              </h3>
              {attendance_history.filter(h => h.course_id === selectedCourseModal.id).length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px', background: 'var(--bg-raised)', borderRadius: 8, border: '1px dashed var(--border)' }}>No attendance records found for this course.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attendance_history.filter(h => h.course_id === selectedCourseModal.id).slice(0, 5).map(h => (
                    <div key={h.id} style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                         <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Present</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(h.timestamp)}</div>
                         </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                         Session #{h.session_id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: 12, color: 'var(--blue)', lineHeight: 1.5 }}>
               <strong>Pro-tip:</strong> Your attendance affects your participation score. Maintain at least 75% to stay above the risk threshold.
            </div>
          </div>
        </Modal>
      )}

      <Card style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: student.is_blacklisted ? 'var(--red-dim)' : 'linear-gradient(135deg, var(--accent), #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: student.is_blacklisted ? 'var(--red)' : '#0b0f1a',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {student.profile_image_url ? (
            <img src={`${student.profile_image_url}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            student.name.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{student.name}</h1>
            {student.academic_status === 'GRADUATED' ? (
              <Badge 
                style={{ 
                  background: 'linear-gradient(135deg, #c084fc, #8b5cf6)', 
                  color: '#fff', 
                  border: 'none',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
              >
                <GraduationCap size={14} /> GRADUATED
              </Badge>
            ) : (
              <Badge color={student.academic_status === 'ACTIVE' ? 'green' : student.academic_status === 'PROBATION' ? 'amber' : 'red'}>
                {student.academic_status === 'ACTIVE' ? 'Passes All' : student.academic_status}
              </Badge>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            <span>✉ {student.email}</span>
            {student.university_id && <span>🆔 {student.university_id}</span>}
            {student.approval_status === 'APPROVED' && student.id_card_image_url && (
                <span onClick={() => window.open(`${student.id_card_image_url}`, '_blank')} 
                      style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'underline', fontWeight: 500 }}>
                   🖼 View ID Card
                </span>
            )}
            {student.phone_number && <span style={{ color: 'var(--green-light)', fontFamily: 'var(--font-mono)' }}>📞 {formatPhoneNumber(student.phone_number)}</span>}
            <span style={{ fontFamily: 'var(--font-mono)' }}>RFID: {student.rfid_uid}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {student.academic_year && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, width: 90 }}>Academic Path</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge color="blue">Year {student.academic_year}</Badge>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18, fontWeight: 300 }}>/</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{faculty_name || 'No Faculty'}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>•</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{department_name || 'No Department'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `4px solid ${attendance_percentage >= 75 ? 'var(--green)' : attendance_percentage >= 50 ? 'var(--accent)' : 'var(--red)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{Number(attendance_percentage).toFixed(1)}%</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Attendance</div>
          </div>

          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `4px solid ${academic_performance >= 60 ? '#8b5cf6' : '#ef4444'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{Number(academic_performance || 0).toFixed(1)}%</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Performance</div>
          </div>
        </div>

        {!student.is_blacklisted && canBlacklist && (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Btn 
              variant="primary" 
              size="sm" 
              icon={<TrendingUp size={16} />}
              onClick={() => navigate(`/students/${id}/assessments`)}
              style={{
                paddingLeft: 20,
                paddingRight: 20,
                boxShadow: '0 0 15px var(--accent-glow)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px var(--accent-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px var(--accent-glow)';
              }}
            >
              Assessments
            </Btn>
            <Btn variant="danger" size="sm" onClick={() => setBlacklistModal(true)}>
              ⛔ Blacklist
            </Btn>
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          ['Attended', attended_sessions, 'var(--green)'],
          ['Total Sessions', total_sessions, 'var(--blue)'],
          ['Courses', filteredCourses.length, 'var(--accent)'],
          ['Graded', filteredGrades.length, filteredGrades.length > 0 ? '#c084fc' : 'var(--text-secondary)'],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ key: 'records', label: 'Academic Records', icon: <Filter size={14} /> }, { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeTab === tab.key ? 'var(--accent-dim)' : 'transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.key ? 700 : 500, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}>{tab.icon} {tab.label}</button>
          ))}
        </div>
        {activeTab === 'records' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Filter size={14} /> Filter by:
            </span>
            <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: 120 }}>
              <option value="All">All Years</option>
              {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>Year {y}</option>)}
            </Select>
            <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={{ width: 130 }}>
              <option value="All">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </Select>
          </div>
        )}
      </div>

      {activeTab === 'records' ? (
        <>
          <Card>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Enrolled Courses ({filteredCourses.length})</h2>
            {filteredCourses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not enrolled in any course yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {filteredCourses.map(c => (
                  <div key={c.id} 
                    onClick={() => setSelectedCourseModal(c)}
                    style={{
                      padding: '24px', borderRadius: 16, border: '1px solid var(--border)',
                      background: 'var(--bg-raised)', display: 'flex', flexDirection: 'column', gap: 20,
                      cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative', overflow: 'hidden'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{c.name}</h3>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <span>Semester {c.semester}</span>
                          <span>•</span>
                          <span>{c.credits || 3} Credits</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Current Avg</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: c.current_avg >= 60 ? 'var(--green)' : 'var(--red)' }}>
                          {c.current_avg}%
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                         <span style={{ color: 'var(--text-muted)' }}>Attendance Progress</span>
                         <span style={{ color: c.attendance_percentage >= 75 ? 'var(--green)' : 'var(--amber)' }}>{c.attendance_percentage}%</span>
                       </div>
                       <ProgressBar value={c.attendance_percentage} color={c.attendance_percentage >= 75 ? 'green' : 'amber'} />
                    </div>

                    <div style={{ 
                      marginTop: 4, padding: '12px 14px', borderRadius: 10, 
                      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
                         <span style={{ fontSize: 12, fontWeight: 600 }}>{c.assessments?.length || 0} Assessments</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>VIEW REPORT →</span>
                    </div>

                    {/* Decorative background accent */}
                    <div style={{
                      position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                      background: c.current_avg >= 60 ? 'var(--green)' : 'var(--red)',
                      opacity: 0.03, borderRadius: '50%', filter: 'blur(30px)'
                    }} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Grades</h2>
              {filteredGrades.length > 0 && (
                <Badge color="purple">✓ {filteredGrades.length} Finished</Badge>
              )}
            </div>
            {filteredGrades.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No grades recorded
              </div>
            ) : (
              <Table columns={committedGradeColumns} rows={filteredGrades} emptyText="No grades recorded" />
            )}
          </Card>

          <Card style={{ padding: 0 }}>
            <div style={{ padding: '20px 20px 0' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Attendance History</h2>
            </div>
            <Table columns={historyColumns} rows={attendance_history} emptyText="No attendance records" />
          </Card>
        </>
      ) : (
        <Card style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} style={{ color: 'var(--accent)' }} /> Academic Journey
          </h2>

          {timelineLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading timeline...</div>
          ) : timeline && timeline.timeline.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: 32 }}>
              <div style={{ position: 'absolute', left: 11, top: 4, bottom: 4, width: 2, background: 'linear-gradient(to bottom, var(--accent), rgba(245, 158, 11, 0.1))' }} />

              {timeline.timeline.filter(e => e.type === 'academic_record').map((entry, idx) => {
                const isProm = (entry.status || '').includes('PROMOTED') || (entry.status || '').includes('GRADUATED');
                const isCarry = (entry.status || '').includes('CARRY_OVER');
                const isRepeat = (entry.status || '').includes('REPEATER');
                const dotColor = isProm ? 'var(--green)' : isCarry ? '#facc15' : 'var(--red)';
                const dotBg = isProm ? 'rgba(16, 185, 129, 0.15)' : isCarry ? 'rgba(250, 204, 21, 0.15)' : 'rgba(239, 68, 68, 0.15)';

                return (
                  <div key={idx} style={{ position: 'relative', marginBottom: 24, paddingLeft: 24 }}>
                    <div style={{
                      position: 'absolute', left: -24, top: 6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: dotBg, border: `2.5px solid ${dotColor}`,
                      zIndex: 1, boxShadow: `0 0 12px ${dotColor}40`
                    }} />

                    <div style={{
                      padding: '16px 20px', borderRadius: 10,
                      background: 'linear-gradient(135deg, var(--bg-raised), rgba(255,255,255,0.02))',
                      border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'border-color 0.2s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = dotColor}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                          {entry.academic_year_label || `Academic Year ${entry.academic_year}`}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                          <span>Year Level {entry.year_level || entry.academic_year}</span>
                          <span>•</span>
                          <span>Semester {entry.semester}</span>
                          <span>•</span>
                          <span>{entry.failed_courses} failed</span>
                          <span>•</span>
                          <span>{entry.total_credits} credits</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)',
                            color: entry.weighted_average >= 60 ? 'var(--green)' : 'var(--red)'
                          }}>
                            {entry.weighted_average.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weighted Avg</div>
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: dotBg, color: dotColor,
                          border: `1px solid ${dotColor}40`
                        }}>
                          {isProm ? <CheckCircle size={12} /> : isCarry ? <AlertTriangle size={12} /> : <XCircle size={12} />}
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Summary footer */}
              {timeline.summary && (
                <div style={{
                  marginTop: 8, padding: '14px 20px', borderRadius: 8,
                  background: 'var(--accent-dim)', border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex', gap: 28, fontSize: 13, fontWeight: 600
                }}>
                  <span style={{ color: 'var(--green)' }}>✓ {timeline.summary.promotions} Promotion{timeline.summary.promotions !== 1 ? 's' : ''}</span>
                  <span style={{ color: '#facc15' }}>⚠ {timeline.summary.carry_overs} Carry-Over{timeline.summary.carry_overs !== 1 ? 's' : ''}</span>
                  <span style={{ color: 'var(--red)' }}>✗ {timeline.summary.repeats} Repeat{timeline.summary.repeats !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px dashed var(--border)'
            }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>No historical progression records yet.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Records appear here after Term or Year transitions are triggered from the Academic Standing page.</p>
            </div>
          )}
        </Card>
      )}

      {blacklistModal && (
        <Modal title="Blacklist Student" onClose={() => setBlacklistModal(false)} width={440}>
          <form onSubmit={handleBlacklist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius)',
              background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)',
              fontSize: 13, color: 'var(--red)',
            }}>
              ⚠ Blacklisting <strong>{student.name}</strong> will block their RFID access.
            </div>
            <Field label="Reason for blacklisting (Required)">
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Academic dishonesty, disciplinary action..."
                required
                minLength={3}
                autoFocus
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setBlacklistModal(false)}>Cancel</Btn>
              <Btn variant="danger" type="submit" disabled={reason.trim().length < 3}>Confirm Blacklist</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
