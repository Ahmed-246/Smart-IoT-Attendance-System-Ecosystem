import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { facultiesApi, departmentsApi, coursesApi, studentsApi } from '../api/client';
import { 
  Plus, 
  ArrowLeft, 
  Building2, 
  ChevronRight,
  School,
  BookOpen,
  LayoutDashboard,
  Edit
} from 'lucide-react';
import { Card, Btn, Modal, Field, Input, PageLoader, useToast, StatCard, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const FacultyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [facFormData, setFacFormData] = useState({ name: '', description: '', total_years: 4 });
  const { toast, ToastContainer } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Load Faculty list first to avoid common failure
      const facRes = await facultiesApi.get(id);
      setFaculty(facRes.data);

      // Load other metadata in parallel with individual error handling
      const [deptRes, couRes, stuRes] = await Promise.allSettled([
        departmentsApi.list(id),
        coursesApi.list(),
        studentsApi.list()
      ]);

      if (deptRes.status === 'fulfilled') {
        const depts = deptRes.value.data;
        setDepartments(depts);
        
        const deptIds = depts.map(d => d.id);
        
        if (couRes.status === 'fulfilled') {
          setCoursesCount(couRes.value.data.filter(c => deptIds.includes(c.department_id)).length);
        }
        
        if (stuRes.status === 'fulfilled') {
          setStudentsCount(stuRes.value.data.filter(s => deptIds.includes(s.department_id)).length);
        }
      }

    } catch (err) {
      toast('Failed to fetch faculty details', 'error');
      console.error('[FACULTY_DETAIL_FETCH_ERR]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await departmentsApi.create({ ...formData, faculty_id: parseInt(id) });
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      toast('Department created');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create department';
      toast(msg, 'error');
      console.error('[DEPT_CREATE_ERROR]', err);
    }
  };

  const handleUpdateFaculty = async (e) => {
    e.preventDefault();
    try {
      await facultiesApi.update(id, facFormData);
      setIsEditModalOpen(false);
      toast('Faculty updated successfully');
      fetchData();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to update faculty', 'error');
    }
  };

  const openEditModal = () => {
    setFacFormData({
      name: faculty.name,
      description: faculty.description || '',
      total_years: faculty.total_years || 4
    });
    setIsEditModalOpen(true);
  };

  if (loading) return <PageLoader />;
  if (!faculty) return <div style={{ padding: 40, textAlign: 'center' }}>Faculty not found.</div>;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/faculties">
          <Btn variant="ghost" style={{ padding: 10, borderRadius: 'var(--radius)' }}>
            <ArrowLeft size={18} />
          </Btn>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <Link to="/faculties" style={{ textDecoration: 'none', color: 'inherit' }}>Faculties</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--accent)' }}>{faculty.name}</span>
        </div>
      </div>

      {/* Hero Card */}
      <Card style={{ 
        background: 'linear-gradient(135deg, #1c1b1f 0%, #2b1d3d 100%)', 
        border: '1px solid rgba(198, 168, 245, 0.2)',
        borderLeft: '4px solid var(--accent)',
        padding: '32px 40px', borderRadius: 'var(--radius-lg)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 12px 48px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(198, 168, 245, 0.1)', borderRadius: 10 }}>
              <School size={22} style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Faculty Profile</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: '#fff' }}>{faculty.name}</h1>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ 
                padding: '6px 14px', borderRadius: 20, background: 'rgba(198, 168, 245, 0.1)',
                border: '1px solid rgba(198, 168, 245, 0.2)', color: 'var(--accent)',
                fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6
              }}>
                <BookOpen size={14} /> {faculty.total_years || 4}-Year Program
              </div>
              {isAdmin && (
                <Btn variant="ghost" onClick={openEditModal} style={{ 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#fff', fontSize: 13, padding: '4px 12px', borderRadius: 8
                }}>
                  <Edit size={14} />
                </Btn>
              )}
            </div>
          </div>
          <p style={{ fontSize: 15, margin: 0, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6 }}>
            {faculty.description || 'Manage the core architecture of this academic pillar. Organize nested departments and research units.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard label="Courses" value={coursesCount} />
          <StatCard label="Students" value={studentsCount} />
        </div>
      </Card>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 32 }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <StatCard label="Total Units" value={departments.length} sub="Nested Departments" />
          {isAdmin && (
            <Btn style={{ width: '100%', padding: '16px' }} onClick={() => setIsModalOpen(true)}>
              <Plus size={20} /> Add Dept
            </Btn>
          )}
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Nested Departments</h2>
            <Badge color="blue">{departments.length} Units</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {departments.map((dept) => (
              <Link to={`/departments/${dept.id}`} key={dept.id} style={{ textDecoration: 'none' }}>
                <Card style={{ 
                  height: '100%', transition: 'transform 0.2s', 
                  display: 'flex', flexDirection: 'column', gap: 12 
                }} className="hover-scale">
                  <div style={{ 
                    width: 40, height: 40, background: 'var(--bg-raised)', 
                    borderRadius: 'var(--radius)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                  }}>
                    <LayoutDashboard size={20} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{dept.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineClamp: 2 }}>
                    {dept.description || 'Academic research and instruction unit.'}
                  </p>
                  <div style={{ 
                    marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)',
                    fontSize: 12, fontWeight: 600, color: 'var(--accent)', display: 'flex',
                    alignItems: 'center', gap: 4
                  }}>
                    Enter Dashboard <ChevronRight size={14} />
                  </div>
                </Card>
              </Link>
            ))}

            {departments.length === 0 && (
              <div style={{ 
                gridColumn: '1 / -1', padding: '40px', textAlign: 'center', 
                background: 'var(--bg-raised)', border: '2px dashed var(--border)',
                borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)'
              }}>
                <Building2 size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                <p>No departments added yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Create Dept Modal */}
      {isModalOpen && (
        <Modal title="Create New Department" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleCreateDept} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Department Name">
              <Input
                required
                placeholder="e.g. Computer Engineering"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Field>
            <Field label="Description">
              <textarea
                style={{
                  width: '100%', padding: '12px', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)', outline: 'none', minHeight: 100, fontSize: 14
                }}
                placeholder="Primary focus area..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Field>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Create</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Faculty Modal */}
      {isEditModalOpen && (
        <Modal title="Edit Faculty Settings" onClose={() => setIsEditModalOpen(false)}>
          <form onSubmit={handleUpdateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Faculty Name">
              <Input
                required
                value={facFormData.name}
                onChange={(e) => setFacFormData({...facFormData, name: e.target.value})}
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <Field label="Program Duration (Years)">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={facFormData.total_years}
                  onChange={(e) => setFacFormData({...facFormData, total_years: parseInt(e.target.value)})}
                />
              </Field>
              <Field label="Max Sems/Year">
                <Input type="number" value={2} disabled />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                style={{
                  width: '100%', padding: '12px', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)', outline: 'none', minHeight: 100, fontSize: 14
                }}
                value={facFormData.description}
                onChange={(e) => setFacFormData({...facFormData, description: e.target.value})}
              />
            </Field>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}
      <style>{`.hover-scale:hover { transform: translateY(-4px); }`}</style>
    </div>
  );
};

export default FacultyDetailPage;
