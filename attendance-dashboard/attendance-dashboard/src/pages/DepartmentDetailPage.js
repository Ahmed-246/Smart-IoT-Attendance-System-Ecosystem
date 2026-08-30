import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { departmentsApi, coursesApi, studentsApi, instructorsApi, doctorsApi, facultiesApi } from '../api/client';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  Plus, 
  ChevronRight,
  Building2,
  Trash2,
  Edit,
  Download,
  Filter
} from 'lucide-react';
import { Card, Btn, PageLoader, useToast, StatCard, Badge, Table, Modal, Field, Input, Select } from '../components/ui';
import CourseForm from '../components/Academic/CourseForm';
import { useAuth } from '../context/AuthContext';

const DepartmentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');
  const [filterYear, setFilterYear] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  
  // Modals & Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const EMPTY_COURSE_FORM = { 
    name: '', course_code: '', description: '', department_id: id, instructor_id: '', doctor_id: '', drive_link: '', weekly_schedule: '', 
    max_score: 100.0, semester: 1, credits: 3.0, passing_score: 60.0, academic_year: '', 
    parent_course_id: null, tier_level: 1, is_elective: false 
  };
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');

  const { isAdmin } = useAuth();
  const { toast, ToastContainer } = useToast();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, coursesRes, studentsRes, instRes, docRes, facRes, allDeptsRes, curRes] = await Promise.all([
        departmentsApi.get(id),
        coursesApi.list(),
        studentsApi.list(),
        instructorsApi.list(),
        doctorsApi.list(),
        facultiesApi.list(),
        departmentsApi.list(),
        departmentsApi.curriculum(id).catch(() => ({ data: null }))
      ]);
      
      setDepartment(deptRes.data);
      setEditForm({ name: deptRes.data.name, description: deptRes.data.description || '' });
      setCourses(coursesRes.data.filter(c => c.department_id === parseInt(id)));
      setStudents(studentsRes.data.filter(s => s.department_id === parseInt(id)));
      setInstructors(instRes.data);
      setDoctors(docRes.data);
      setFaculties(facRes.data);
      setDepartments(allDeptsRes.data);
      if (curRes.data) setCurriculum(curRes.data);
      
      // Pre-set faculty for the course form
      setSelectedFacultyId(String(deptRes.data.faculty_id));
      setCourseForm(f => ({ ...f, department_id: String(id) }));
    } catch (err) {
      toast('Failed to fetch department data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDept = async (e) => {
    e.preventDefault();
    try {
      await departmentsApi.update(id, editForm);
      toast('Department updated');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      toast('Failed to update department', 'error');
    }
  };

  const handleDeleteDept = async () => {
    try {
      await departmentsApi.delete(id);
      toast('Department deleted');
      navigate(`/faculties/${department.faculty_id}`);
    } catch (err) {
      toast('Failed to delete department', 'error');
    }
  };

  const handleCreateCourse = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    // Minimal validation
    if (!courseForm.name || !courseForm.instructor_id || !courseForm.doctor_id) {
      toast('Please fill all required fields', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await coursesApi.create({
        ...courseForm,
        department_id: parseInt(courseForm.department_id),
        instructor_id: parseInt(courseForm.instructor_id),
        doctor_id: parseInt(courseForm.doctor_id),
        max_score: parseFloat(courseForm.max_score),
        semester: parseInt(courseForm.semester),
        credits: parseFloat(courseForm.credits),
        passing_score: parseFloat(courseForm.passing_score),
        academic_year: courseForm.academic_year ? parseInt(courseForm.academic_year) : null,
        parent_course_id: courseForm.parent_course_id ? parseInt(courseForm.parent_course_id) : null,
        tier_level: parseInt(courseForm.tier_level) || 1,
        is_elective: !!courseForm.is_elective,
        course_code: courseForm.course_code || null,
        description: courseForm.description || null,
      });
      toast('Course created successfully');
      setIsCourseModalOpen(false);
      setCourseForm({ ...EMPTY_COURSE_FORM, department_id: String(id) });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create course';
      toast(msg, 'error');
      console.error('[COURSE_CREATE_ERROR]', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!department) return <div style={{ padding: 40, textAlign: 'center' }}>Department not found.</div>;

  const globalSemester = students.length > 0 ? (students[0].current_semester || 1) : 1;
  const showWarning = filterSemester !== 'All' && parseInt(filterSemester) !== globalSemester;

  const filteredCourses = courses.filter(c => {
    if (filterYear !== 'All' && c.academic_year != filterYear) return false;
    if (filterSemester !== 'All' && c.semester != filterSemester) return false;
    return true;
  });

  const filteredStudents = students.filter(s => {
    if (filterYear !== 'All' && s.academic_year != filterYear) return false;
    if (filterSemester !== 'All' && s.current_semester != filterSemester) return false;
    return true;
  });

  const handleExportCSV = () => {
    let csvContent = "";
    if (activeTab === 'courses') {
      csvContent += "Faculty ID,Department,Academic Year,Semester,Course ID,Course Name,Credits,Passing Score\n";
      filteredCourses.forEach(c => {
        csvContent += `"${department.faculty_id}","${department.name}","${c.academic_year || ''}","${c.semester || ''}","${c.id}","${c.name}","${c.credits || ''}","${c.passing_score || ''}"\n`;
      });
    } else {
      csvContent += "Faculty ID,Department,Academic Year,Semester,Student ID,Student Name,Email,Academic Status\n";
      filteredStudents.forEach(s => {
        csvContent += `"${department.faculty_id}","${department.name}","${s.academic_year || ''}","${s.current_semester || ''}","${s.university_id || ''}","${s.name}","${s.email}","${s.academic_status || ''}"\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${department.name}_${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const studentColumns = [
    { 
      key: 'name', 
      label: 'Student Name', 
      render: (v) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 'full', background: 'var(--bg-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: 'var(--accent)'
          }}>
            {v.charAt(0)}
          </div>
          <span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      )
    },
    { key: 'university_id', label: 'University ID', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{v}</span> },
    { 
      key: 'id', 
      label: 'Action', 
      render: (v) => (
        <Link to={`/students/${v}`} style={{ textDecoration: 'none' }}>
          <Btn size="sm" variant="ghost">Profile</Btn>
        </Link>
      ) 
    }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <ToastContainer />
      
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to={`/faculties/${department.faculty_id}`}>
          <Btn variant="ghost" style={{ padding: 10, borderRadius: 'var(--radius)' }}>
            <ArrowLeft size={18} />
          </Btn>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          <Link to="/faculties" style={{ textDecoration: 'none', color: 'inherit' }}>Faculties</Link>
          <ChevronRight size={14} />
          <Link to={`/faculties/${department.faculty_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>Faculty</Link>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--accent)' }}>{department.name}</span>
        </div>
      </div>

      {/* Header Card */}
      <Card style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '32px 40px', borderRadius: 'var(--radius-lg)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ padding: 8, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius)' }}>
              <Building2 size={20} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Academic Unit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{department.name}</h1>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 4 }}>
                <Btn size="sm" variant="ghost" style={{ padding: 6 }} onClick={() => setIsEditModalOpen(true)}><Edit size={16} /></Btn>
                <Btn size="sm" variant="danger" style={{ padding: 6 }} onClick={() => setIsDeleteConfirm(true)}><Trash2 size={16} /></Btn>
              </div>
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 500 }}>
            {department.description || 'Specialized academic department focusing on student excellence and research.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <StatCard label="Courses" value={filteredCourses.length} />
          <StatCard label="Students" value={filteredStudents.length} />
        </div>
      </Card>

      {/* Tab Switcher & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ 
          display: 'flex', gap: 8, background: 'var(--bg-surface)', 
          border: '1px solid var(--border)', padding: 6, borderRadius: 'var(--radius)',
          width: 'fit-content'
        }}>
          <Btn 
            variant={activeTab === 'courses' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('courses')}
            style={{ padding: '8px 24px' }}
          >
            <BookOpen size={18} /> Courses
          </Btn>
          <Btn 
            variant={activeTab === 'students' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('students')}
            style={{ padding: '8px 24px' }}
          >
            <Users size={18} /> Students
          </Btn>
        </div>

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
          <Btn variant="ghost" onClick={handleExportCSV} style={{ color: 'var(--accent)' }}>
            <Download size={16} style={{ marginRight: 6 }} /> Export CSV
          </Btn>
        </div>
      </div>

      {showWarning && (
        <div style={{ 
          padding: '10px 16px', background: 'rgba(250, 204, 21, 0.1)', 
          border: '1px solid rgba(250, 204, 21, 0.3)', borderRadius: 'var(--radius)',
          color: '#facc15', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 
        }}>
          ⚠️ <strong>Note:</strong> You are viewing data for Semester {filterSemester}, but the current active Academic Semester is {globalSemester}.
        </div>
      )}

      {/* Content */}
      <div className="fade-in">
        {activeTab === 'courses' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {filteredCourses.map(course => {
              const doc = doctors.find(d => d.id === course.doctor_id);
              return (
                <Link to={`/courses/${course.id}`} key={course.id} style={{ textDecoration: 'none' }}>
                  <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }} className="hover-scale">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 40, height: 40, background: 'var(--bg-raised)', 
                        borderRadius: 'var(--radius)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                      }}>
                        <BookOpen size={20} />
                      </div>
                      <Badge color="yellow">Term {course.semester || 1}</Badge>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{course.name}</h3>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>{course.credits || 0} Credits</span>
                        <span>•</span>
                        <span>{course.passing_score || 0}% Pass</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {doc && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Dr.</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{doc.name}</span>
                        </div>
                      )}
                      <Btn size="sm" variant="ghost" style={{ width: 'fit-content', padding: '0 4px', fontSize: 11 }}>View sessions →</Btn>
                    </div>
                  </Card>
                </Link>
              );
            })}
            {isAdmin && (
              <Card 
                style={{ 
                  height: '100%', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', justifyContent: 'center', gap: 12,
                  border: '2px dashed var(--border)', background: 'transparent',
                  cursor: 'pointer'
                }}
                className="hover-scale"
                onClick={() => setIsCourseModalOpen(true)}
              >
                <Plus size={24} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>Add Course</span>
              </Card>
            )}
          </div>
        ) : (
          <Card style={{ padding: 0 }}>
            <Table columns={studentColumns} rows={filteredStudents} emptyText="No students found matching your criteria." />
          </Card>
        )}
      </div>

      {/* Curriculum Grid */}
      {curriculum && curriculum.years && (
        <Card style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius)' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Curriculum Grid</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{curriculum.total_courses} courses across {curriculum.total_years} years</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(curriculum.years).map(([year, semesters]) => (
              <div key={year} style={{ background: 'var(--bg-raised)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', background: 'rgba(198,168,245,0.06)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>Year {year}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {Object.values(semesters).flat().length} courses
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {Object.entries(semesters).map(([sem, courses]) => (
                    <div key={sem} style={{ padding: '16px 20px', borderRight: sem === '1' ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
                        Semester {sem}
                      </div>
                      {courses.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>No courses assigned</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {courses.map(c => (
                            <div key={c.id}
                              onClick={() => navigate(`/courses/${c.id}`)}
                              style={{
                                padding: '8px 12px', borderRadius: 'var(--radius)', background: 'var(--bg-surface)',
                                border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {c.course_code && (
                                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, background: 'rgba(198,168,245,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                    {c.course_code}
                                  </span>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</span>
                                {c.is_elective && <Badge color="yellow" style={{ fontSize: 9, padding: '1px 5px' }}>E</Badge>}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.credits}cr</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Course Creation Modal */}
      {isCourseModalOpen && (
        <Modal title="Add New Course" onClose={() => setIsCourseModalOpen(false)}>
          <CourseForm 
            form={courseForm}
            setForm={setCourseForm}
            faculties={faculties}
            departments={departments}
            doctors={doctors}
            instructors={instructors}
            selectedFacultyId={selectedFacultyId}
            setSelectedFacultyId={setSelectedFacultyId}
            onSubmit={handleCreateCourse}
            onCancel={() => setIsCourseModalOpen(false)}
            submitLabel="Create Course"
            allCourses={courses}
          />
        </Modal>
      )}

      {/* Edit Department Modal */}
      {isEditModalOpen && (
        <Modal title="Edit Department" onClose={() => setIsEditModalOpen(false)}>
          <form onSubmit={handleEditDept} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Field label="Department Name">
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </Field>
            <Field label="Description">
              <textarea
                style={{
                  width: '100%', padding: '12px', background: 'var(--bg-raised)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)', outline: 'none', minHeight: 100, fontSize: 14
                }}
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              />
            </Field>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {isDeleteConfirm && (
        <Modal title="Delete Department" onClose={() => setIsDeleteConfirm(null)} width={400}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Are you sure you want to delete <strong>{department.name}</strong>? This action will remove all associated courses and student links. This cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setIsDeleteConfirm(false)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleDeleteDept}>Delete Anyway</Btn>
          </div>
        </Modal>
      )}

      <style>{`.hover-scale:hover { transform: translateY(-4px); }`}</style>
    </div>
  );
};

export default DepartmentDetailPage;
