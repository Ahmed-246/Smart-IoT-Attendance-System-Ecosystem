import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorsApi, facultiesApi, departmentsApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, Field, Input, PageLoader, useToast, ConfirmModal, PhoneInput, formatPhoneNumber } from '../components/ui';
import { Plus, Trash2 } from 'lucide-react'; // Added icons for the new logic

// ✅ MOVE DoctorForm OUTSIDE to maintain focus stability
const DoctorForm = ({ onSubmit, onCancel, submitLabel, form, setForm, faculties, departments }) => {
  
  // Helper to add a new assignment row
  const addAssignment = () => {
    setForm(prev => ({
      ...prev,
      assignments: [...prev.assignments, { faculty_id: '', department_id: '' }]
    }));
  };

  // Helper to remove an assignment row
  const removeAssignment = (index) => {
    setForm(prev => ({
      ...prev,
      assignments: prev.assignments.filter((_, i) => i !== index)
    }));
  };

  // Helper to update a specific assignment field
  const updateAssignment = (index, field, value) => {
    const newAssignments = [...form.assignments];
    newAssignments[index][field] = value;
    
    // Bidirectional Auto-fill
    if (field === 'faculty_id') {
      newAssignments[index].department_id = '';
    } else if (field === 'department_id' && value) {
      const dept = departments.find(d => String(d.id) === String(value));
      if (dept) {
        newAssignments[index].faculty_id = String(dept.faculty_id);
      }
    }
    
    setForm(prev => ({ ...prev, assignments: newAssignments }));
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12 }}>
        <Field label="Title">
          <Input 
            value={form.title} 
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
            placeholder="Dr." 
          />
        </Field>
        <Field label="Full name">
          <Input 
            value={form.name} 
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
            placeholder="Mohamed Fathy" 
            required 
          />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Email (used for login)">
          <Input 
            type="email" 
            value={form.email} 
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
            placeholder="dr.fathy@school.edu" 
            required 
          />
        </Field>
        <Field label="Phone Number (Egypt)">
          <PhoneInput 
            value={form.phone_number} 
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} 
          />
        </Field>
      </div>

      <div style={{ height: 1, background: 'var(--border-light)', margin: '4px 0' }} />
      <h4 style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Profile Details</h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Specialization">
          <Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="Artificial Intelligence" />
        </Field>
        <Field label="Office Hours">
          <Input value={form.office_hours} onChange={e => setForm(f => ({ ...f, office_hours: e.target.value }))} placeholder="Sun 12-2, Tue 1-3" />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Appointment Link">
          <Input value={form.appointment_link} onChange={e => setForm(f => ({ ...f, appointment_link: e.target.value }))} placeholder="calendly.com/doctor" />
        </Field>
        <Field label="Doctor Bio">
          <Input value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Brief academic background..." />
        </Field>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Faculty & Department Assignments</h3>
          <Btn size="sm" variant="ghost" type="button" onClick={addAssignment} style={{ color: 'var(--green)', border: '1px solid var(--green-dim)' }}>
            <Plus size={16} /> Add Faculty
          </Btn>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form.assignments.map((row, index) => {
            const availableDepartments = departments.filter(d => String(d.faculty_id) === String(row.faculty_id));
            
            // Exclusion logic: faculties already selected in other rows
            const assignedFacultyIds = form.assignments
              .filter((_, i) => i !== index)
              .map(a => String(a.faculty_id))
              .filter(id => id !== '');
            
            const availableFaculties = faculties.filter(f => !assignedFacultyIds.includes(String(f.id)));

            return (
              <div key={index} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 40px', 
                gap: 12, 
                alignItems: 'end',
                padding: '16px',
                background: 'var(--bg-raised)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <Field label="Faculty">
                  <select 
                    value={row.faculty_id} 
                    onChange={(e) => updateAssignment(index, 'faculty_id', e.target.value)}
                    style={{ 
                      width: '100%', padding: '10px', borderRadius: 'var(--radius)', 
                      background: 'var(--bg-surface)', color: 'var(--text-primary)', 
                      border: '1px solid var(--border)', outline: 'none' 
                    }}
                    required
                  >
                    <option value="">Select Faculty</option>
                    {availableFaculties.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Department">
                  <select 
                    value={row.department_id} 
                    onChange={(e) => updateAssignment(index, 'department_id', e.target.value)}
                    style={{ 
                      width: '100%', padding: '10px', borderRadius: 'var(--radius)', 
                      background: 'var(--bg-surface)', color: 'var(--text-primary)', 
                      border: '1px solid var(--border)', outline: 'none' 
                    }}
                    required
                  >
                    <option value="">Select Department</option>
                    {/* If no faculty selected, show ALL departments for bidirectional mode */}
                    {(row.faculty_id ? availableDepartments : departments).map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>

                {form.assignments.length > 1 && (
                  <Btn variant="danger" size="sm" type="button" onClick={() => removeAssignment(index)} style={{ padding: '8px' }}>
                    <Trash2 size={16} />
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
        <Btn variant="ghost" type="button" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit">{submitLabel}</Btn>
      </div>
    </form>
  );
};

export default function DoctorsPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastContainer } = useToast();
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ✅ Updated emptyForm structure
  const emptyForm = { 
    name: '', 
    email: '', 
    title: 'Dr.', 
    phone_number: '',
    specialization: '',
    office_hours: '',
    bio: '',
    appointment_link: '',
    assignments: [{ faculty_id: '', department_id: '' }] 
  };
  
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { 
      const [dr, fac, dep] = await Promise.all([
        doctorsApi.list(),
        facultiesApi.list(),
        departmentsApi.list()
      ]);
      setDoctors(dr.data); 
      setFaculties(fac.data);
      setDepartments(dep.data);
    } catch (err) {
      toast('Failed to load data', 'error');
    }
    setLoading(false);
  }

  const validatePhone = (num) => {
    if (!num) return true;
    const clean = num.replace(/\s+/g, '');
    return clean.length === 11 && ['010', '011', '012', '015'].some(p => clean.startsWith(p));
  };

  async function handleAdd(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      if(!form.name || !form.email) return toast("Name and Email are required", "error");
      
      // Transform assignments into the flat ID lists the backend expects
      const payload = {
        ...form,
        faculty_ids: form.assignments.map(a => parseInt(a.faculty_id)).filter(id => id),
        department_ids: form.assignments.map(a => parseInt(a.department_id)).filter(id => id)
      };

      await doctorsApi.create(payload);
      toast('Doctor added. Default password: Doctor@1234');
      setModal(false); 
      setForm(emptyForm); 
      load();
    } catch (err) { 
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Server Error (500)';
      toast(msg, 'error'); 
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (form.phone_number && !validatePhone(form.phone_number)) {
      return toast('Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.', 'error');
    }
    try {
      const payload = {
        ...form,
        faculty_ids: form.assignments.map(a => parseInt(a.faculty_id)).filter(id => id),
        department_ids: form.assignments.map(a => parseInt(a.department_id)).filter(id => id)
      };

      await doctorsApi.update(editModal.id, payload);
      toast('Doctor updated'); 
      setEditModal(null); 
      load();
    } catch (err) { toast(err.response?.data?.detail || 'Error', 'error'); }
  }

  async function handleDelete() {
    try {
      await doctorsApi.delete(deleteConfirm.id);
      toast('Doctor deleted'); setDeleteConfirm(null); load();
    } catch (err) { toast(err.response?.data?.detail || 'Error', 'error'); }
  }

  function openEdit(doc) {
    // Map existing doctor data back into our "assignments" structure
    const existingAssignments = doc.faculties?.map((fac, i) => ({
      faculty_id: fac.id,
      department_id: doc.departments?.[i]?.id || ''
    })) || [{ faculty_id: '', department_id: '' }];

    setForm({ 
      name: doc.name, 
      email: doc.email, 
      title: doc.title || 'Dr.', 
      phone_number: doc.phone_number || '',
      specialization: doc.specialization || '',
      office_hours: doc.office_hours || '',
      bio: doc.bio || '',
      appointment_link: doc.appointment_link || '',
      assignments: existingAssignments
    });
    setEditModal(doc);
  }

  const columns = [
    { key: 'id', label: 'ID', render: (_, __, i) => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span> },
    { key: 'title', label: 'Title', render: v => <Badge color="green">{v || 'Dr.'}</Badge> },
    { key: 'name', label: 'Name', render: (v, row) => (
      <span 
        style={{ fontWeight: 600, color: 'var(--green)', cursor: 'pointer', textDecoration: 'underline' }}
        onClick={() => navigate(`/doctors/${row.id}`)}
      >
        {v}
      </span>
    )},
    { key: 'phone_number', label: 'Phone', render: v => v ? <span style={{ color: 'var(--green-light)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>📞 {formatPhoneNumber(v)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    { key: 'email', label: 'Email', render: v => <span style={{ color: 'var(--text-secondary)' }}>{v}</span> },
    { 
      key: 'departments', 
      label: 'Assignments', 
      render: (depts) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {depts && depts.length > 0 ? (
            depts.map(d => <Badge key={d.id} color="blue">{d.name}</Badge>)
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      )
    },
    { key: 'id', label: 'Actions', render: (v, row) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
        <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(row)}>Delete</Btn>
      </div>
    )},
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Doctors</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{doctors.length} registered</p>
        </div>
        <Btn onClick={() => { setForm(emptyForm); setModal(true); }}>+ Add Doctor</Btn>
      </div>

      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={doctors} maxHeight="480px" emptyText="No doctors yet" />
      </Card>

      {modal && (
        <Modal title="Add Doctor" onClose={() => setModal(false)}>
          <DoctorForm 
            form={form} 
            setForm={setForm} 
            faculties={faculties}
            departments={departments}
            onSubmit={handleAdd} 
            onCancel={() => setModal(false)} 
            submitLabel="Add Doctor" 
          />
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit Doctor" onClose={() => setEditModal(null)}>
          <DoctorForm 
            form={form} 
            setForm={setForm} 
            faculties={faculties}
            departments={departments}
            onSubmit={handleEdit} 
            onCancel={() => setEditModal(null)} 
            submitLabel="Save Changes" 
          />
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Doctor"
          message={`Are you sure you want to delete ${deleteConfirm.name}? This will also remove their associated user account.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
