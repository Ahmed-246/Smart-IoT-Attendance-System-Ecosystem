import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Btn, Badge, Modal, Input } from '../components/ui';
import { 
  ShieldCheck, 
  ShieldAlert, 
  ChevronRight, 
  Lock, 
  RefreshCcw, 
  Search, 
  AlertTriangle,
  ClipboardCheck,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  Heart,
  LayoutList
} from 'lucide-react';
import { academicApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function TransitionWorkspace() {
  const navigate = useNavigate();
  const { role, name, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [readinessScore, setReadinessScore] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(null); // { title, description }
  const [error, setError] = useState(null);

  const requirementDescriptions = {
    math: "Ensures every course in the term has a mathematically valid grading sheet. All assessment weights (Quizzes, Midterm, Final, etc.) must sum to exactly 100.0%. This prevents graduation blocks caused by misconfigured max scores.",
    rules: "Validates that every active course follows the university's mandatory roadmap sequence: Quiz 1, Midterm Exam, Quiz 2, Practical (optional), and Final Exam. All items must be linked to these blueprint slots.",
    hygiene: "Guarantees administrative data integrity. Every attendance session started during the term must be 'Closed' or 'Finished' to prevent data loss. Active sessions will block the term transition as they imply ongoing academic activity.",
    health: "Monitors student performance and risk. Identifies students who have falling attendance or missing mandatory grades. This tier ensures that enough data exists to accurately process pass/fail results for the term."
  };

  const processAudit = (report) => {
    if (!report) {
      setReadinessScore(0);
      return;
    }
    setAuditReport(report);
    
    // Multi-Tier Readiness Score Logic (User Requested: 25% per requirement)
    // 1. Get all courses being audited
    const coursesToAudit = [];
    Object.values(report).forEach(faculty => {
      Object.values(faculty).forEach(dept => {
        Object.values(dept).forEach(year => {
          Object.keys(year).forEach(courseName => {
            coursesToAudit.push({ name: courseName, errors: year[courseName] });
          });
        });
      });
    });

    if (coursesToAudit.length === 0) {
      setReadinessScore(100);
      return;
    }

    const tierStats = {
      math: { passed: 0, keywords: ['weight', 'logic error'] },
      rules: { passed: 0, keywords: ['blueprint', 'quiz 1', 'quiz 2', 'midterm', 'final', 'practical', 'missing'] },
      hygiene: { passed: 0, keywords: ['finished', 'closed', 'active'] },
      health: { passed: 0, keywords: ['grade', 'attendance', 'threshold'] }
    };

    coursesToAudit.forEach(course => {
      Object.keys(tierStats).forEach(key => {
        const stats = tierStats[key];
        const hasTierError = course.errors.some(err => {
          const str = typeof err === 'string' ? err.toLowerCase() : err.message.toLowerCase();
          return stats.keywords.some(k => str.includes(k.toLowerCase()));
        });
        if (!hasTierError) stats.passed++;
      });
    });

    const totalCourses = coursesToAudit.length;
    const mathScore = (tierStats.math.passed / totalCourses) * 25;
    const rulesScore = (tierStats.rules.passed / totalCourses) * 25;
    const hygieneScore = (tierStats.hygiene.passed / totalCourses) * 25;
    const healthScore = (tierStats.health.passed / totalCourses) * 25;

    setReadinessScore(Math.round(mathScore + rulesScore + hygieneScore + healthScore));
  };

  const fetchAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Transition] Fetching audit...");
      const res = await academicApi.getReadiness();
      console.log("[Transition] Audit Result:", res.data);
      if (res.data.audit_report) {
        processAudit(res.data.audit_report);
      } else {
        processAudit({}); // Treat as empty but successful
      }
    } catch (err) {
      console.error("[Transition] Audit Error:", err);
      setError(err.response?.data?.detail || "System audit connection failed. Ensure backend is running and you have Super Admin privileges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const handleStartTransition = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await academicApi.transition({ academic_password: password });
      setIsModalOpen(false);
      navigate('/academic', { state: { success: res.data.message } });
    } catch (err) {
      setError(err.response?.data?.detail || "Transition failed. Verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleException = async (enrollmentId) => {
    try {
      await academicApi.toggleAttendanceException(enrollmentId);
      fetchAudit(); // Refresh to clear the error
    } catch (err) {
      setError("Failed to override attendance");
    }
  };

  // Helper to check tier status from report
  const checkTier = (keywords) => {
    if (!auditReport) return 'pending';
    if (Object.keys(auditReport).length === 0) return 'pass';
    
    let failed = false;
    Object.values(auditReport).forEach(fac => {
      Object.values(fac).forEach(dept => {
        Object.values(dept).forEach(year => {
          Object.values(year).forEach(errors => {
            if (errors.some(err => {
              const str = typeof err === 'string' ? err.toLowerCase() : err.message.toLowerCase();
              return keywords.some(k => str.includes(k.toLowerCase()));
            })) failed = true;
          });
        });
      });
    });
    return failed ? 'fail' : 'pass';
  };

  const tiers = [
    { key: 'math', label: 'Mathematical Integrity', sub: 'Weights sum to 100%', keywords: ['weight', 'logic error'], icon: <LayoutList size={16} /> },
    { key: 'rules', label: 'Academic Rules', sub: 'Required Blueprints', keywords: ['blueprint', 'quiz', 'midterm', 'final'], icon: <ShieldAlert size={16} /> },
    { key: 'hygiene', label: 'Administrative Hygiene', sub: 'Closed Sessions', keywords: ['finished', 'closed', 'active'], icon: <History size={16} /> },
    { key: 'health', label: 'Student Health', sub: 'Grades & Attendance', keywords: ['grade', 'attendance', 'threshold'], icon: <Heart size={16} /> },
  ];

  const canView = isSuperAdmin || role === 'admin';

  if (!canView) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <ShieldAlert size={80} className="text-red" style={{ marginBottom: 20, opacity: 0.2 }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
          Transition Protocol View is reserved for University Administration.
        </p>
        <Btn style={{ marginTop: 24 }} onClick={() => navigate('/dashboard')}>Return to Safety</Btn>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: '0 0 40px 0' }}>
      {/* Header Section */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Badge color="amber">Protocol Active</Badge>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Global Academic Transition Protocol</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            Authorized personnel only. Irreversible state-wide promotion and archival system.
          </p>
        </div>
        <Btn variant="ghost" size="sm" onClick={fetchAudit} loading={loading}>
          <RefreshCcw size={14} style={{ marginRight: 8 }} /> Re-Run System Audit
        </Btn>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Checklist Area */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Academic Requirements Checklist
            </div>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: 'var(--border)' }}>
                {tiers.map(t => {
                  const status = checkTier(t.keywords);
                  return (
                    <div 
                      key={t.key} 
                      onClick={() => setShowInfo({ title: t.label, description: requirementDescriptions[t.key] })}
                      className="audit-tier-card"
                      style={{ 
                        background: 'var(--bg-surface)', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ 
                          width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--bg-raised)', color: status === 'pass' ? 'var(--green)' : status === 'fail' ? 'var(--red)' : 'var(--text-muted)',
                          border: status === 'pass' ? '1px solid var(--green-dim)' : status === 'fail' ? '1px solid var(--red-dim)' : '1px solid transparent'
                        }}>
                          {t.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.sub}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {status === 'pass' ? (
                          <>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--green)', letterSpacing: '0.05em' }}>DONE</span>
                            <CheckCircle2 size={18} className="text-success" />
                          </>
                        ) : status === 'fail' ? (
                          <>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--red)', letterSpacing: '0.05em' }}>FAILED</span>
                            <XCircle size={18} className="text-red" />
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PENDING</span>
                            <RefreshCcw size={18} className="spin" style={{ color: 'var(--text-muted)' }} />
                          </>
                        )}
                      </div>
                      <style>{`
                        .audit-tier-card:hover {
                          background: var(--bg-raised) !important;
                          filter: brightness(1.1);
                        }
                      `}</style>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                Audit Deep-Scan Explorer
              </div>
            </div>
          <div style={{ minHeight: 400, padding: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <RefreshCcw size={48} className="text-accent spin" style={{ marginBottom: 16, opacity: 0.5 }} />
                <p>Initializing Deep-Scan Academic Audit...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--red)' }}>
                <ShieldAlert size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>{error}</p>
                <Btn variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={fetchAudit}>Try Again</Btn>
              </div>
            ) : auditReport && Object.keys(auditReport).length > 0 ? (
              <AuditTree report={auditReport} query={searchQuery} onOverride={handleToggleException} />
            ) : auditReport ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={48} className="text-success" style={{ marginBottom: 16, opacity: 0.5 }} />
                <p>All integrity checks passed. University Readiness is 100%.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                <ShieldAlert size={48} className="text-red" style={{ marginBottom: 16, opacity: 0.5 }} />
                <p>Waiting for System Audit. Ensure you are logged in as Super Admin.</p>
              </div>
            )}
          </div>
        </div> 
      </div> {/* END OF MAIN COLUMN (204) */}

      {/* Action Sidebar */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ 
            background: 'linear-gradient(165deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
              Readiness Score
            </h3>
            <div style={{ 
              fontSize: 72, fontWeight: 900, 
              color: readinessScore < 50 ? 'var(--red)' : readinessScore < 100 ? 'var(--accent)' : 'var(--green)', 
              lineHeight: 1, 
              textShadow: readinessScore < 100 ? '0 0 20px var(--accent-dim)' : '0 0 20px var(--green-dim)'
            }}>
              {readinessScore}%
            </div>
            
            <div style={{ margin: '32px 0' }}>
              <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ 
                    width: `${readinessScore}%`, height: '100%', 
                    background: readinessScore < 50 ? 'var(--red)' : readinessScore < 100 ? 'var(--accent)' : 'var(--green)', 
                    boxShadow: readinessScore < 100 ? '0 0 10px var(--accent-glow)' : '0 0 20px var(--green-dim)', 
                    transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    borderRadius: 10
                  }} 
                />
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
              {readinessScore < 100 
                ? "The transition protocol is locked. Please address the outstanding academic and administrative requirements to proceed."
                : "The Upgrade Guard is clear. The university is officially ready for the new term transition."}
            </p>

            <div style={{ marginBottom: 12 }}>
              <Btn 
                variant={readinessScore < 100 ? 'ghost' : 'primary'} 
                style={{ 
                  width: '100%', height: 56, fontSize: 17, fontWeight: 800,
                  background: readinessScore === 100 && isSuperAdmin ? 'var(--green)' : 'transparent',
                  color: readinessScore === 100 && isSuperAdmin ? 'black' : 'var(--text-muted)',
                  borderColor: readinessScore === 100 && isSuperAdmin ? 'var(--green)' : 'var(--border)'
                }}
                disabled={readinessScore < 100 || !isSuperAdmin}
                onClick={() => setIsModalOpen(true)}
              >
                {readinessScore < 100 || !isSuperAdmin ? <Lock size={20} style={{ marginRight: 10 }} /> : <ShieldCheck size={20} style={{ marginRight: 10 }} />}
                {!isSuperAdmin ? 'Super Admin Only' : readinessScore < 100 ? 'Super Admin Locked' : 'Finalize Transition'}
              </Btn>

              {isSuperAdmin && (
                <div style={{ 
                  marginTop: 20, padding: 16, borderRadius: 12, 
                  background: 'rgba(16, 185, 129, 0.05)', 
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                  fontSize: 12, color: 'var(--green)', 
                  textAlign: 'left', lineHeight: 1.5 
                }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                     <ShieldCheck size={14} /> Authorization Active
                  </div>
                  You are authorized to execute the Global Transition Protocol. This will permanently archive current records.
                </div>
              )}
            </div>
          </div>

          <Card style={{ marginTop: 20, padding: 16, border: '1px dashed var(--border-light)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={14} className="text-accent" /> System Intelligence
            </h4>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              The system is currently scanning all active enrollments. <b>{name || "the administrator"}</b> has authorized the term promotion protocol. 
            </div>
          </Card>
        </div>
      </div> {/* END OF GRID (203) */}

      {/* Requirement Info Modal */}
      {showInfo && (
        <Modal title={showInfo.title} onClose={() => setShowInfo(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ 
              padding: 20, background: 'var(--bg-raised)', borderRadius: 12, 
              borderLeft: '4px solid var(--accent)', color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6
            }}>
              {showInfo.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setShowInfo(null)}>Got it</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Execution Modal */}
      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)} title="System Transition Authorization">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8 }}>
              <h4 style={{ color: 'var(--red)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} /> CRITICAL ACTION
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                This will move all students to the next semester, archive current grades, and update the global Academic Year status. This cannot be undone.
              </p>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Academic Transition Password
              </label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Btn variant="ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</Btn>
              <Btn variant="accent" style={{ flex: 1 }} onClick={handleStartTransition} loading={loading}>Confirm Execution</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FacultyAuditRow({ name, departments, query, onOverride }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  // Calculate total courses with issues in this faculty
  let totalIssueCourses = 0;
  Object.values(departments).forEach(dept => {
    Object.values(dept).forEach(year => {
      totalIssueCourses += Object.keys(year).length;
    });
  });

  if (totalIssueCourses === 0) return null;

  return (
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 12, 
      overflow: 'hidden', 
      background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: 12
    }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          background: isOpen ? 'var(--bg-raised)' : 'transparent'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', color: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Infrastructure & Academic Scope</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Badge color="red" style={{ padding: '4px 10px' }}>
            {totalIssueCourses} Courses require attention
          </Badge>
          <ChevronRight 
            size={18} 
            className="text-muted" 
            style={{ 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              transform: isOpen ? 'rotate(90deg)' : 'none' 
            }} 
          />
        </div>
      </div>

      {isOpen && (
        <div className="fade-in" style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(departments).map(([deptName, years]) => (
              <div key={deptName}>
                <div style={{ 
                  fontSize: 12, fontWeight: 800, color: 'var(--accent)', 
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                   <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
                   {deptName}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginLeft: 12, borderLeft: '1px solid var(--border-light)', paddingLeft: 16 }}>
                  {Object.entries(years).map(([yearName, courses]) => (
                    <div key={yearName}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{yearName}</div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {Object.entries(courses).map(([courseName, errors]) => (
                          <div key={courseName} style={{ 
                            background: 'var(--bg-raised)', 
                            borderRadius: 10, 
                            padding: 16, 
                            border: '1px solid var(--border-light)',
                            boxShadow: 'var(--shadow-sm)'
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 650, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <AlertTriangle size={15} className="text-red" />
                              {courseName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {errors.map((err, i) => {
                                const isObj = typeof err === 'object';
                                const type = isObj ? err.type : 'error';
                                const msg = isObj ? err.message : err;
                                const isActionable = isObj && (err.assessment_id || err.course_id);

                                return (
                                  <div 
                                    key={i} 
                                    onClick={() => {
                                      if (err.assessment_id) navigate(`/assessments?course_id=${err.course_id}`);
                                      else if (err.course_id) navigate(`/courses?id=${err.course_id}`);
                                      else if (err.type === 'attendance') onOverride(err.id);
                                    }}
                                    className="audit-error-row"
                                    style={{ 
                                      fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)',
                                      padding: '8px 12px', borderRadius: 6,
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                                      cursor: isActionable || type === 'attendance' ? 'pointer' : 'default',
                                      border: '1px solid transparent',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => {
                                      if (isActionable || type === 'attendance') {
                                        e.currentTarget.style.borderColor = 'var(--accent-dim)';
                                        e.currentTarget.style.background = 'rgba(255,165,0,0.05)';
                                      }
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.borderColor = 'transparent';
                                      e.currentTarget.style.background = 'rgba(0,0,0,0.15)';
                                    }}
                                  >
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                      <div style={{ 
                                        height: 6, width: 6, borderRadius: '50%', 
                                        background: type === 'blueprint' ? 'var(--amber)' : 'var(--red)', 
                                        flexShrink: 0 
                                      }} />
                                      {msg}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {type === 'attendance' && (
                                        <Btn 
                                          size="sm" 
                                          variant="accent" 
                                          style={{ fontSize: 10, height: 24, padding: '0 10px' }}
                                        >
                                          Override
                                        </Btn>
                                      )}
                                      {isActionable && (
                                        <ChevronRight size={14} className="text-muted" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTree({ report, query, onOverride }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {Object.entries(report).map(([facultyName, depts]) => (
        <FacultyAuditRow 
          key={facultyName} 
          name={facultyName} 
          departments={depts} 
          query={query} 
          onOverride={onOverride} 
        />
      ))}
    </div>
  );
}
