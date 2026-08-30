import React, { useState, useEffect } from 'react';
import { facultiesApi } from '../api/client';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  ChevronRight,
  School,
  Trash2,
  Edit
} from 'lucide-react';
import { Card, Btn, Modal, Field, Input, PageLoader, useToast, ConfirmModal, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const FacultiesPage = () => {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', total_years: 4, semesters_per_year: 2 });
  const { toast, ToastContainer } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const res = await facultiesApi.list();
      setFaculties(res.data);
    } catch (err) {
      toast('Failed to fetch faculties', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editModal) {
        await facultiesApi.update(editModal.id, formData);
        toast('Faculty updated successfully');
      } else {
        await facultiesApi.create(formData);
        toast('Faculty created successfully');
      }
      setIsModalOpen(false);
      setEditModal(null);
      setFormData({ name: '', description: '', total_years: 4, semesters_per_year: 2 });
      fetchFaculties();
    } catch (err) {
      toast(`Failed to ${editModal ? 'update' : 'create'} faculty`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await facultiesApi.delete(deleteConfirm.id);
      toast('Faculty deleted');
      setDeleteConfirm(null);
      fetchFaculties();
    } catch (err) {
      toast('Failed to delete faculty', 'error');
    }
  };

  const openEdit = (f) => {
    setEditModal(f);
    setFormData({ 
      name: f.name, 
      description: f.description || '', 
      total_years: f.total_years || 4,
      semesters_per_year: f.semesters_per_year || 2
    });
    setIsModalOpen(true);
  };

  const filteredFaculties = faculties.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      
      {/* Header section */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        padding: '24px 32px', borderRadius: 'var(--radius-lg)'
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>University Faculties</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Manage the core academic pillars of your institution.</p>
        </div>
        {isAdmin && (
          <Btn onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Faculty
          </Btn>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', maxWidth: 500 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
        <input
          type="text"
          placeholder="Search faculties by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '12px 12px 12px 40px',
            background: 'var(--bg-raised)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none'
          }}
        />
      </div>

      {/* Grid */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 
      }}>
        {filteredFaculties.map((faculty) => (
          <Card key={faculty.id} style={{ display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.2s', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ 
                width: 48, height: 48, background: 'var(--accent-dim)', 
                borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', color: 'var(--accent)' 
              }}>
                <School size={24} />
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <Btn size="sm" variant="ghost" style={{ padding: 6 }} onClick={() => openEdit(faculty)}><Edit size={16} /></Btn>
                  <Btn size="sm" variant="danger" style={{ padding: 6 }} onClick={() => setDeleteConfirm(faculty)}><Trash2 size={16} /></Btn>
                </div>
              )}
            </div>
            
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px 0' }}>{faculty.name}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: 0, height: 40, overflow: 'hidden', marginBottom: 12 }}>
                {faculty.description || 'No description available for this faculty.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge color="blue" variant="soft" style={{ fontSize: 10 }}>{faculty.total_years}-Year Program</Badge>
                <Badge color="purple" variant="soft" style={{ fontSize: 10 }}>{faculty.semesters_per_year} Semesters/yr</Badge>
              </div>
            </div>

            <div style={{ 
              marginTop: 8, pt: 16, borderTop: '1px solid var(--border)', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Academic Pillar</span>
              <Link to={`/faculties/${faculty.id}`} style={{ textDecoration: 'none' }}>
                <Btn variant="ghost" size="sm">
                  Details <ChevronRight size={14} />
                </Btn>
              </Link>
            </div>
          </Card>
        ))}

        {filteredFaculties.length === 0 && (
          <div style={{ 
            gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <School size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
            <p>No faculties found matching your search.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Modal title={editModal ? "Edit Faculty" : "Create New Faculty"} onClose={() => { setIsModalOpen(false); setEditModal(null); setFormData({ name: '', description: '', total_years: 4, semesters_per_year: 2 }); }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Faculty Name">
              <Input
                required
                placeholder="e.g. Faculty of Computer Science"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </Field>
            <Field label="Description (Optional)">
              <textarea
                style={{
                  width: '100%', padding: '12px', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)', outline: 'none', minHeight: 100, fontSize: 14
                }}
                placeholder="Briefly describe the faculty's focus..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Program Duration (Years)">
                <Input
                  type="number"
                  min="1"
                  max="8"
                  required
                  value={formData.total_years}
                  onChange={(e) => setFormData({...formData, total_years: Number(e.target.value)})}
                />
              </Field>
              <Field label="Semesters per Year">
                <Input
                  type="number"
                  min="1"
                  max="3"
                  required
                  value={formData.semesters_per_year}
                  onChange={(e) => setFormData({...formData, semesters_per_year: Number(e.target.value)})}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => { setIsModalOpen(false); setEditModal(null); setFormData({ name: '', description: '', total_years: 4, semesters_per_year: 2 }); }}>Cancel</Btn>
              <Btn type="submit">{editModal ? "Save Changes" : "Create Faculty"}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Faculty"
          message={`Are you sure you want to delete the ${deleteConfirm.name}? This will affect all associated departments and courses.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
};

export default FacultiesPage;
