import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  coursesApi, instructorsApi, doctorsApi, facultiesApi, departmentsApi
} from '../api/client';
import { Plus } from 'lucide-react';
import {
  Card, Table, Badge, Btn, Modal, Select, Input,
  PageLoader, useToast, ConfirmModal
} from '../components/ui';
import CourseForm from '../components/Academic/CourseForm';
import { useAuth } from '../context/AuthContext';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const EMPTY_FORM = { 
    name: '', course_code: '', description: '', department_id: '', instructor_id: '', doctor_id: '', drive_link: '', weekly_schedule: '', 
    max_score: 100.0, semester: 1, credits: 3.0, passing_score: 60.0, academic_year: '',
    parent_course_id: null, tier_level: 1, is_elective: false 
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [filterFaculty, setFilterFaculty] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [searchText, setSearchText] = useState('');

  const { isAdmin, assignedDeptIds, assignedFacIds } = useAuth();
  const { toast, ToastContainer } = useToast();
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        coursesApi.list(), 
        instructorsApi.list(), 
        doctorsApi.list(),
        facultiesApi.list(), 
        departmentsApi.list()
      ]);

      const [c, i, d, f, de] = results;

      if (c.status === 'fulfilled') {
        const sortedCourses = c.value.data.sort((a, b) => {
          if (a.academic_year !== b.academic_year) return (a.academic_year || 0) - (b.academic_year || 0);
          return (a.semester || 1) - (b.semester || 1);
        });
        setCourses(sortedCourses);
      } else {
        toast('Failed to load courses', 'error');
      }

      if (i.status === 'fulfilled') setInstructors(i.value.data);
      if (d.status === 'fulfilled') setDoctors(d.value.data);
      if (f.status === 'fulfilled') setFaculties(f.value.data);
      if (de.status === 'fulfilled') setDepartments(de.value.data);

      if (results.some(r => r.status === 'rejected')) {
        console.warn('Some metadata failed to load');
      }
    } catch (err) { 
      toast('Critical error loading data', 'error'); 
    } finally { 
      setLoading(false); 
    }
  }

  const validateForm = () => {
    if (!selectedFacultyId || !form.department_id || !form.doctor_id || !form.instructor_id) {
      toast('Please fill Faculty, Department, Doctor, and Instructor', 'error');
      return false;
    }
    return true;
  };

  async function handleAdd(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    try {
      await coursesApi.create({
        ...form,
        department_id: Number(form.department_id),
        instructor_id: Number(form.instructor_id),
        doctor_id: Number(form.doctor_id),
        max_score: Number(form.max_score),
        semester: Number(form.semester),
        credits: Number(form.credits),
        passing_score: Number(form.passing_score),
        academic_year: form.academic_year ? Number(form.academic_year) : null,
        parent_course_id: form.parent_course_id ? Number(form.parent_course_id) : null,
        tier_level: Number(form.tier_level) || 1,
        is_elective: !!form.is_elective,
        has_practical: !!form.has_practical,
        assessment_blueprint: form.assessment_blueprint,
        course_code: form.course_code || null,
        description: form.description || null,
      });
      toast('Course created successfully');
      setModal(false); setForm(EMPTY_FORM); setSelectedFacultyId(''); load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(e => `${e.loc?.[e.loc.length-1]}: ${e.msg}`).join(', ') : JSON.stringify(detail) || err.message || 'Failed to create course');
      toast(msg, 'error');
      console.error('[COURSE_CREATE]', err.response?.data || err);
    }
  }

  async function handleEdit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateForm()) return;

    try {
      await coursesApi.update(editModal.id, {
        ...form,
        department_id: Number(form.department_id),
        instructor_id: Number(form.instructor_id),
        doctor_id: Number(form.doctor_id),
        max_score: Number(form.max_score),
        semester: Number(form.semester),
        credits: Number(form.credits),
        passing_score: Number(form.passing_score),
        academic_year: form.academic_year ? Number(form.academic_year) : null,
        parent_course_id: form.parent_course_id ? Number(form.parent_course_id) : null,
        tier_level: Number(form.tier_level) || 1,
        is_elective: !!form.is_elective,
        has_practical: !!form.has_practical,
        assessment_blueprint: form.assessment_blueprint,
        course_code: form.course_code || null,
        description: form.description || null,
      });
      toast('Course updated successfully'); setEditModal(null); load();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(e => `${e.loc?.[e.loc.length-1]}: ${e.msg}`).join(', ') : JSON.stringify(detail) || err.message || 'Failed to update course');
      toast(msg, 'error');
    }
  }

  async function handleDelete() {
    try {
      await coursesApi.delete(deleteConfirm.id);
      toast('Course deleted'); setDeleteConfirm(null); load();
    } catch (err) { toast(err.response?.data?.detail || err.message || 'Failed to delete course', 'error'); }
  }

  function openEdit(course) {
    const dept = departments.find(d => d.id === course.department_id);
    setForm({
      name: course.name,
      course_code: course.course_code || '',
      description: course.description || '',
      department_id: course.department_id || '',
      instructor_id: course.instructor_id || '',
      doctor_id: course.doctor_id || '',
      drive_link: course.drive_link || '',
      weekly_schedule: course.weekly_schedule || '',
      max_score: course.max_score || 100.0,
      semester: course.semester || 1,
      credits: course.credits || 3.0,
      passing_score: course.passing_score || 60.0,
      academic_year: course.academic_year || '',
      parent_course_id: course.parent_course_id || null,
      tier_level: course.tier_level || 1,
      is_elective: course.is_elective || false,
      has_practical: course.has_practical !== undefined ? course.has_practical : true,
      assessment_blueprint: course.assessment_blueprint || null,
      id: course.id,
    });
    setSelectedFacultyId(dept ? dept.faculty_id : '');
    setEditModal(course);
  }

  const columns = [
    { key: 'course_code', label: 'Code', render: v => v ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'rgba(198,168,245,0.1)', padding: '2px 8px', borderRadius: 4 }}>{v}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span> },
    {
      key: 'name', label: 'Course Name', render: (v, row) => {
        const dept = departments.find(d => d.id === row.department_id);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 20 }}>
              <span onClick={() => navigate(`/courses/${row.id}`)}
                style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent)' }}
                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                onMouseLeave={e => e.target.style.textDecoration = 'none'}
              >
                {v}
              </span>
              {row.is_elective && (
                <div style={{ marginRight: 20 }}>
                  <Badge 
                    color="blue" 
                    style={{ 
                      fontSize: 8, 
                      fontWeight: 800, 
                      padding: '1px 7px', 
                      letterSpacing: '0.05em',
                      pointerEvents: 'none',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(129, 140, 248, 0.3)'
                    }}
                  >
                    ELECTIVE
                  </Badge>
                </div>
              )}
            </div>
            {dept && <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{dept.name}</span>}
          </div>
        );
      }
    },
    {
      key: 'academic_year', label: 'Year', render: v => v ? <Badge color="default">Y{v}</Badge> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      key: 'details', label: 'Details', render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Badge color="yellow">Term {row.semester || 1}</Badge>
          <Badge color="purple">{row.credits || 3.0} cr</Badge>
        </div>
      )
    },
    {
      key: 'doctor_id', label: 'Doctor', render: v => {
        const d = doctors.find(x => x.id === v);
        return d ? <Badge color="green">{d.title} {d.name}</Badge> : <span style={{ color: 'var(--text-muted)' }}>—</span>;
      }
    },
    {
      key: 'id', label: 'Actions', render: (v, row) => isAdmin ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/assessments?course_id=${row.id}`); }}>Assessments</Btn>
          <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row); }}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); setDeleteConfirm(row); }}>Delete</Btn>
        </div>
      ) : (
        <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/assessments?course_id=${row.id}`); }}>Assessments</Btn>
      )
    },
  ];

  if (loading) return <PageLoader />;

  const formProps = {
    form, setForm, faculties, departments, doctors, instructors,
    selectedFacultyId, setSelectedFacultyId
  };

  // Filter courses
  const filteredCourses = courses.filter(c => {
    if (filterYear !== 'All' && c.academic_year != filterYear) return false;
    if (filterSemester !== 'All' && c.semester != filterSemester) return false;
    
    if (filterFaculty !== 'All') {
      const dept = departments.find(d => d.id === c.department_id);
      if (!dept || dept.faculty_id != filterFaculty) return false;
    }
    
    if (filterDept !== 'All' && c.department_id != filterDept) return false;
    
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      const nameMatch = c.name?.toLowerCase().includes(lowerSearch);
      const codeMatch = c.course_code?.toLowerCase().includes(lowerSearch);
      if (!nameMatch && !codeMatch) return false;
    }
    
    return true;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'var(--bg-surface)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
          <Input 
            placeholder="Search code/name..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ width: '100%', maxWidth: 240 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {(isAdmin || assignedDeptIds.length > 1) && (
            <>
              <Select value={filterFaculty} onChange={e => { setFilterFaculty(e.target.value); setFilterDept('All'); }} style={{ width: 160 }}>
                <option value="All">All Faculties</option>
                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
              <Select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: 160 }}>
                <option value="All">All Departments</option>
                {departments
                  .filter(d => filterFaculty === 'All' || d.faculty_id == filterFaculty)
                  .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                }
              </Select>
            </>
          )}
          <Select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ width: 110 }}>
            <option value="All">All Years</option>
            {(() => {
              const selFac = faculties.find(f => String(f.id) === String(filterFaculty));
              const max = selFac?.total_years || 6;
              return Array.from({ length: max }, (_, i) => i + 1).map(y => (
                <option key={y} value={y}>Year {y}</option>
              ));
            })()}
          </Select>
          <Select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={{ width: 110 }}>
            <option value="All">All Terms</option>
            {(() => {
              const selFac = faculties.find(f => String(f.id) === String(filterFaculty));
              const maxSem = selFac?.semesters_per_year || 2;
              return Array.from({ length: maxSem }, (_, i) => i + 1).map(s => (
                <option key={s} value={s}>Term {s}</option>
              ));
            })()}
          </Select>
          
          <div style={{ borderLeft: '1px solid var(--border)', height: 24, margin: '0 4px' }} />
          
          {isAdmin && (
            <Btn onClick={() => { setForm(EMPTY_FORM); setSelectedFacultyId(''); setModal(true); }}>
              <Plus size={18} /> Add Course
            </Btn>
          )}
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={filteredCourses} maxHeight="480px" emptyText="No courses match your filters" />
      </Card>

      {modal && (
        <Modal title="Add Course" onClose={() => setModal(false)}>
          <CourseForm {...formProps} onSubmit={handleAdd} onCancel={() => setModal(false)} submitLabel="Create" allCourses={courses} />
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit Course" onClose={() => setEditModal(null)}>
          <CourseForm {...formProps} onSubmit={handleEdit} onCancel={() => setEditModal(null)} submitLabel="Save Changes" isEdit={true} allCourses={courses} />
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Course"
          message={`Are you sure you want to delete ${deleteConfirm.name}? All associated enrollments and session logs will be lost.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
