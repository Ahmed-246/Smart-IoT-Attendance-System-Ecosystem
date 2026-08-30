import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doctorsApi } from '../api/client';
import { Card, Badge, Btn, PageLoader, useToast } from '../components/ui';
import { formatPhoneNumber } from '../utils/formatters';
import { 
  Stethoscope, 
  Mail, 
  Phone, 
  Clock, 
  ExternalLink, 
  BookOpen, 
  UserCircle2,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Building2,
  School,
  Users,
  Award,
  Key,
  ShieldCheck
} from 'lucide-react';

export default function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const { isAdmin } = useAuth();
  
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [res, deptRes, coursesRes] = await Promise.all([
        doctorsApi.profile(id),
        require('../api/client').departmentsApi.list(),
        require('../api/client').coursesApi.list()
      ]);
      setData(res.data);
      setDepartments(deptRes.data);
      setAllCourses(coursesRes.data);
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to load doctor profile', 'error');
    } finally {
      setLoading(false);
    }
  }

  const enrichedCourses = (data?.assigned_courses || []).map(c => {
    const fullCourse = allCourses.find(ac => String(ac.id) === String(c.id));
    const deptId = fullCourse?.department_id || 'unassigned';
    const deptInfo = departments.find(d => String(d.id) === String(deptId));
    return { ...c, department_id: deptId, department_name: deptInfo ? deptInfo.name : 'Other / Unassigned' };
  }).filter(c => c.department_id !== 'unassigned');

  const uniqueDepts = [...new Set(enrichedCourses.map(c => c.department_id))];
  const shouldGroup = uniqueDepts.length >= 1;


  if (loading) return <PageLoader />;
  if (!data) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Doctor not found</div>;

  const { doctor, assigned_courses } = data;

  // Derive stats
  const totalCourses = assigned_courses.length;
  const totalDepartments = uniqueDepts.length;
  const activeFaculties = doctor.faculties?.length || 0;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 60 }}>
      <ToastContainer />

      <div>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/doctors')} icon={<ChevronLeft size={16} />}>
          Back to Doctors
        </Btn>
      </div>

      {/* ── Premium Hero Header ── */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)',
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Decorative background flare */}
        <div style={{
          position: 'absolute', top: '-50%', left: '-20%', width: '140%', height: '200%',
          background: 'radial-gradient(circle at top right, rgba(16,185,129,0.08) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        <div style={{ padding: '40px 48px', display: 'flex', gap: 40, alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Avatar Area */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 140, height: 140, borderRadius: '24%',
              background: doctor.profile_image_url ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.05) 100%)',
              padding: 4, 
              transform: doctor.profile_image_url ? 'none' : 'rotate(-4deg)', 
              transition: 'transform 0.4s ease',
              border: doctor.profile_image_url ? '1px solid rgba(16,185,129,0.2)' : 'none'
               }} className="hover-rotate">
               <div style={{
                 width: '100%', height: '100%', borderRadius: '22%',
                 background: doctor.profile_image_url ? 'transparent' : 'linear-gradient(135deg, #10b981, #059669)',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 fontSize: 48, fontWeight: 800, color: '#fff',
                 boxShadow: doctor.profile_image_url ? 'none' : 'inset 0 0 20px rgba(255,255,255,0.4)',
                 overflow: 'hidden',
                 position: 'relative'
               }}>
                 {doctor.profile_image_url ? (
                   <img 
                    src={doctor.profile_image_url.startsWith('http') ? doctor.profile_image_url : `${doctor.profile_image_url}`} 
                    alt={doctor.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                   />
                 ) : (
                   doctor.name.charAt(0).toUpperCase()
                 )}
               </div>
            </div>
            
            <Badge color="green" style={{ 
              position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', 
              padding: '6px 16px', fontSize: 13, fontWeight: 800, 
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)', 
              border: '1px solid rgba(16,185,129,0.5)',
              background: '#065f46', // Solid deep green for contrast
              color: '#fff',
              zIndex: 2
            }}>
              DOCTOR
            </Badge>
          </div>

          {/* Details Area */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 8px 0', color: '#fff', letterSpacing: '-0.02em' }}>
              {doctor.title && <span style={{ color: 'var(--green)', marginRight: 12 }}>{doctor.title}</span>}
              {doctor.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 20 }}>
              <Award size={20} />
              {doctor.specialization || 'Academic Specialty'}
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} className="text-muted" />
                </div>
                {doctor.email}
              </div>
              
              {doctor.phone_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-secondary)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={16} className="text-muted" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{formatPhoneNumber(doctor.phone_number)}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Button */}
           {doctor.appointment_link && (
            <div style={{ alignSelf: 'center', minWidth: 200 }}>
              <Btn 
                variant="accent" 
                style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, borderRadius: 12, boxShadow: '0 8px 24px rgba(16,185,129,0.25)', background: '#10b981', borderColor: '#10b981', color: '#fff' }} 
                icon={<Calendar size={18} />}
                onClick={() => window.open(doctor.appointment_link, '_blank')}
              >
                Book Clinic Hour
              </Btn>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* ── Left Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Dynamic Stats Overview */}
          <Card style={{ padding: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>Overview</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                  <BookOpen size={16} style={{ color: '#10b981' }} /> Clinical Modules
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{totalCourses}</div>
              </div>
              {isAdmin && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                      <Building2 size={16} style={{ color: '#10b981' }} /> Departments
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{totalDepartments}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
                      <School size={16} style={{ color: '#10b981' }} /> Faculties
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{activeFaculties}</div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card style={{ padding: 24, background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
              <Clock size={18} style={{ color: '#10b981' }} /> Clinic / Office Hours
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: 12, border: '1px solid var(--border)' }}>
              {doctor.office_hours || 'No standard contact hours specified for this term.'}
            </div>
          </Card>

          {/* Elevated Overrides for Doctor */}
          {doctor.capabilities && doctor.capabilities.length > 0 && (
            <Card style={{ padding: 24, background: 'linear-gradient(180deg, rgba(74, 142, 255, 0.05) 0%, rgba(74, 142, 255, 0.01) 100%)', border: '1px solid rgba(74, 142, 255, 0.2)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                <ShieldCheck size={18} style={{ color: '#4a8eff' }} /> Elevated Overrides
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {doctor.capabilities.map((cap, i) => {
                  const isForever = !cap.expires_at;
                  const timeLeft = isForever ? 'Permanent' : (() => {
                    const diff = new Date(cap.expires_at) - new Date();
                    if (diff <= 0) return 'Expired';
                    const hrs = Math.floor(diff / (1000 * 60 * 60));
                    const days = Math.floor(hrs / 24);
                    const months = Math.floor(days / 30);
                    if (months > 0) return `${months}m left`;
                    if (days > 0) return `${days}d left`;
                    return `${hrs}h left`;
                  })();

                  return (
                    <div key={i} style={{
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(74, 142, 255, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Award size={14} style={{ color: '#4a8eff' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#dae2fd' }}>{cap.capability_name}</span>
                      </div>
                      <div style={{ 
                        fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4,
                        background: isForever ? 'rgba(16, 185, 129, 0.1)' : 'rgba(74, 142, 255, 0.1)',
                        color: isForever ? '#10b981' : '#4a8eff',
                        textTransform: 'uppercase'
                      }}>
                        {timeLeft}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* ── Main Content Area ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Biography */}
          <Card style={{ padding: 28, background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
              <UserCircle2 size={20} style={{ color: '#10b981' }} /> Professional Biography
            </h3>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              {doctor.bio || `${doctor.name} is an expert medical faculty member at the university, dedicated to advancing academic excellence and student care.`}
            </div>
          </Card>

          {/* Faculty & Department Associations (Admin only) */}
          {isAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
               <Card style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                  <h4 style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Faculty Associations</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
                    {doctor.faculties?.length > 0 ? doctor.faculties.map(f => (
                      <Badge key={f.id} color="blue" size="md" style={{ padding: '6px 12px', fontSize: 13 }}>{f.name}</Badge>
                    )) : <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>No designated faculty</span>}
                  </div>
                  <School size={80} style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.05, color: '#fff' }} />
               </Card>
               <Card style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                  <h4 style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>Department Alignment</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, position: 'relative', zIndex: 1 }}>
                    {doctor.departments?.length > 0 ? doctor.departments.map(d => (
                      <Badge key={d.id} color="purple" size="md" style={{ padding: '6px 12px', fontSize: 13 }}>{d.name}</Badge>
                    )) : <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Unassigned</span>}
                  </div>
                  <Building2 size={80} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.05, color: '#fff' }} />
               </Card>
            </div>
          )}

          {/* Course Modules List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 8px' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                <BookOpen size={22} style={{ color: '#10b981' }} /> Clinical Modules
              </h3>
              <Badge color="green" style={{ padding: '4px 12px', fontSize: 13 }}>{assigned_courses.length} Active</Badge>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {assigned_courses.length === 0 ? (
                <Card style={{ padding: '60px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderStyle: 'dashed' }}>
                  <Stethoscope size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: 16 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No assigned modules</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>This doctor does not currently lead any courses.</div>
                </Card>
              ) : shouldGroup ? (
                uniqueDepts.map((deptId) => {
                  const deptCourses = enrichedCourses.filter(c => c.department_id === deptId);
                  const deptName = deptCourses[0].department_name;
                  const isExpanded = expandedDept === deptId;

                  return (
                    <Card key={deptId} style={{
                      padding: 0, overflow: 'hidden', transition: 'all 0.3s ease',
                      border: isExpanded ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                      boxShadow: isExpanded ? '0 10px 30px rgba(0,0,0,0.3)' : 'none'
                    }}>
                      <div 
                        onClick={() => setExpandedDept(isExpanded ? null : deptId)}
                        style={{ 
                          padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          cursor: 'pointer', background: isExpanded ? 'rgba(16,185,129,0.05)' : 'transparent' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{deptName}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                              <strong style={{ color: '#10b981', fontWeight: 700 }}>{deptCourses.length}</strong> modules supervised
                            </div>
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', padding: 8 }}>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                      
                      <div 
                        style={{ 
                          maxHeight: isExpanded ? '2000px' : '0px',
                          overflow: 'hidden',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: 'rgba(0,0,0,0.2)', 
                          borderTop: isExpanded ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent' 
                        }}
                      >
                        <div style={{ padding: '4px 0' }}>
                          {deptCourses.map((c, i) => (
                            <div 
                              key={c.id} 
                              onClick={() => navigate(`/courses/${c.id}`)}
                              style={{
                                padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', cursor: 'pointer',
                                borderBottom: i === deptCourses.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.2s',
                              }}
                              className="hover-scale"
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{c.name}</div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  <Badge color="default" style={{ fontSize: 11, padding: '2px 8px' }}>{c.course_code}</Badge>
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Year {c.academic_year} • Semester {c.semester}</span>
                                </div>
                              </div>
                              <Btn size="sm" variant="ghost" style={{ backgroundColor: 'transparent' }} icon={<ExternalLink size={14} />}>View Details</Btn>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card style={{ padding: 0 }}>
                  {assigned_courses.map((c, i) => (
                    <div 
                      key={c.id} 
                      onClick={() => navigate(`/courses/${c.id}`)}
                      style={{
                        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', cursor: 'pointer',
                        borderBottom: i === assigned_courses.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s',
                      }}
                      className="hover-scale"
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>{c.name}</div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <Badge color="default" style={{ fontSize: 11, padding: '2px 8px' }}>{c.course_code}</Badge>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Year {c.academic_year} • Semester {c.semester}</span>
                        </div>
                      </div>
                      <Btn size="sm" variant="ghost" style={{ backgroundColor: 'transparent' }} icon={<ExternalLink size={14} />}>View Details</Btn>
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
