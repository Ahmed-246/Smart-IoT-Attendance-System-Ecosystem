import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { archiveApi } from '../api/client';
import { Card, Btn, PageLoader, useToast } from '../components/ui';
import { Archive, ChevronLeft, CheckCircle, AlertTriangle, XCircle, Clock, BookOpen, GraduationCap, Award } from 'lucide-react';

export default function StudentArchiveProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await archiveApi.studentTimeline(id);
        setData(res.data);
      } catch (err) {
        toast('Failed to load student archival records.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, toast]);

  const getStatusStyle = (result) => {
    const r = (result || '').toUpperCase();
    if (r === 'PASSED' || r === 'PROMOTED' || r === 'COMPLETED' || r === 'RESIT_PASSED' || r === 'GRADUATED') {
      return { bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)', icon: <CheckCircle size={14} /> };
    }
    if (r === 'CARRY_OVER' || r === 'PROBATION') {
      return { bg: 'rgba(250, 204, 21, 0.12)', color: '#facc15', border: 'rgba(250, 204, 21, 0.3)', icon: <AlertTriangle size={14} /> };
    }
    if (r === 'FAILED' || r === 'REPEATER' || r === 'DISMISSED') {
      return { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)', icon: <XCircle size={14} /> };
    }
    return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--border)', icon: <Clock size={14} /> };
  };

  if (loading) return <PageLoader />;

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Failed to find archival data for this student.
        <br/><br/>
        <Btn onClick={() => navigate('/archive')}>Return to Archive</Btn>
      </div>
    );
  }

  const { student, summary, timeline } = data;
  const courseRecords = timeline.filter(t => t.type === 'course_record');
  const academicRecords = timeline.filter(t => t.type === 'academic_record');

  // Group courses by Year then Semester
  const coursesByYear = courseRecords.reduce((acc, c) => {
    const y = c.academic_year || 'Unknown';
    if (!acc[y]) acc[y] = {};
    const s = c.semester || 'Unknown';
    if (!acc[y][s]) acc[y][s] = [];
    acc[y][s].push(c);
    return acc;
  }, {});

  const sortedYears = Object.keys(coursesByYear).sort((a,b) => b - a);

  const studentStatusUpper = (student.academic_status || '').toUpperCase();
  const isGraduated = studentStatusUpper === 'GRADUATED';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      <ToastContainer />
      
      {/* Header and Back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
        <Btn variant="ghost" onClick={() => navigate(-1)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={18} /> Back to Archive
        </Btn>
      </div>

      {/* Profile Header Dashboard */}
      <Card style={{
        background: 'linear-gradient(135deg, #12101f 0%, #1a1530 100%)',
        border: '1px solid rgba(192, 132, 252, 0.15)',
        padding: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background visual element */}
        <Archive size={200} style={{ position: 'absolute', right: -40, top: -40, opacity: 0.03, color: '#c084fc', transform: 'rotate(-15deg)' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, 
                background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(192, 132, 252, 0.05))',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#c084fc', fontWeight: 800, fontSize: 18
              }}>
                {student.name.charAt(0)}
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>{student.name}</h1>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>ID: {student.university_id}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: isGraduated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                color: isGraduated ? '#10b981' : '#38bdf8', border: `1px solid ${isGraduated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
              }}>
                {isGraduated ? <GraduationCap size={14} /> : <BookOpen size={14}/>} {student.academic_status || 'CURRENT'}
              </span>
              <span style={{ 
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)'
              }}>
                <Archive size={14} /> {sortedYears.length} Archived Years
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px 24px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>{summary.total_archived_courses}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Total Courses</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px 24px', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.1)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>{summary.promotions}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Promotions</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px 24px', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>{summary.repeats}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>Repeats</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Area - Full Course Ledger */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Award size={20} style={{ color: '#c084fc' }} />
          Full Course Ledger
        </h2>

        {sortedYears.length === 0 ? (
          <Card style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No archived course records found for this student.
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {sortedYears.map(year => {
              // Calculate Year summary if available from academic_records
              const yearSummary = academicRecords.filter(r => String(r.academic_year) === String(year) && r.semester === 2)[0] 
                               || academicRecords.filter(r => String(r.academic_year) === String(year))[0] 
                               || null;
              
              const yStyle = yearSummary ? getStatusStyle(yearSummary.status) : null;

              return (
                <Card key={year} style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* Year Group Header */}
                  <div style={{ 
                    padding: '16px 24px', background: 'rgba(192, 132, 252, 0.05)', 
                    borderBottom: '1px solid rgba(192, 132, 252, 0.15)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', margin: 0 }}>Academic Year {year} / {parseInt(year)+1}</h3>
                    {yearSummary && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Final Year Outcome:</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: yearSummary.weighted_average >= 60 ? 'var(--green)' : 'var(--red)' }}>
                          {yearSummary.weighted_average.toFixed(1)}%
                        </span>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: yStyle.bg, color: yStyle.color, border: `1px solid ${yStyle.border}` 
                        }}>
                          {yStyle.icon} {yearSummary.status}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0 16px' }}>
                    {Object.keys(coursesByYear[year]).sort().map(sem => {
                      const courses = coursesByYear[year][sem];
                      return (
                        <div key={sem} style={{ margin: '16px 0' }}>
                          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, paddingLeft: 8 }}>
                            Semester {sem}
                          </h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {['Course Record', 'Code', 'Credits', 'Final Grade', 'Result'].map(h => (
                                  <th key={h} style={{
                                    padding: '10px 16px', textAlign: 'left', fontSize: 11,
                                    fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                                    letterSpacing: '0.05em', borderBottom: '1px solid var(--border)'
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {courses.map((c, idx) => {
                                const cStyle = getStatusStyle(c.result);
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#fff' }}>{c.course_name}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{c.course_code}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{c.credits}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: (c.final_percentage || 0) >= 60 ? 'var(--green)' : 'var(--red)' }}>
                                        {c.final_percentage != null ? `${c.final_percentage.toFixed(1)}%` : '—'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                      <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                        background: cStyle.bg, color: cStyle.color, border: `1px solid ${cStyle.border}`
                                      }}>
                                        {cStyle.icon} {c.result}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
