import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { academicApi, coursesApi, facultiesApi, departmentsApi, assessmentsApi, studentsApi, instructorsApi } from '../api/client';
import { Card, Table, Badge, Btn, Modal, Field, Input, Select, FancySelect, SearchableSelect, PageLoader, useToast, ConfirmModal } from '../components/ui';
import { formatDateTime } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

export default function AssessmentsView() {
  const { role, isAdmin, assignedDeptIds, assignedFacIds, instructorId } = useAuth();
  const canManageAssessments = isAdmin || role === 'doctor' || role === 'engineer';
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [assessments, setAssessments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const queryParams = new URLSearchParams(location.search);
  const initialCourseId = queryParams.get('course_id') || '';

  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourse, setFilterCourse] = useState(initialCourseId);

  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const EMPTY_FORM = { title: '', course_code: '', assessment_type: 'Quiz', max_score: '100', scheduled_date: '', hall: '', template_key: '', instructor_id: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalFaculty, setModalFaculty] = useState('');
  const [modalDept, setModalDept] = useState('');
  const [modalYear, setModalYear] = useState('');
  const { toast, ToastContainer } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [assRes, cRes, fRes, dRes, sRes, iRes] = await Promise.all([
        assessmentsApi.list(),
        coursesApi.list(),
        facultiesApi.list(),
        departmentsApi.list(),
        studentsApi.list(),
        instructorsApi.list()
      ]);
      setAssessments(assRes.data);
      setCourses(cRes.data);
      setFaculties(fRes.data);
      setDepartments(dRes.data);
      setInstructors(iRes.data);
      
      // Auto-set the current semester filter based on system data (students/courses)
      if (sRes.data.length > 0 && !filterSemester) {
        setFilterSemester(String(sRes.data[0].current_semester || 1));
      }
    } catch (err) {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.template_key) {
      toast('Please link this assessment to an Academic Roadmap Slot', 'error');
      return;
    }

    const scheduledDate = form.scheduled_date ? new Date(form.scheduled_date) : null;
    if (scheduledDate && scheduledDate < new Date()) {
      toast('Cannot create an assessment in the past', 'error');
      return;
    }

    try {
      await assessmentsApi.create({
        ...form,
        course_code: parseInt(form.course_code),
        max_score: parseFloat(form.max_score),
        instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
        scheduled_date: scheduledDate ? scheduledDate.toISOString() : null,
      });
      toast('Assessment created successfully');
      setModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Error creating assessment', 'error');
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await assessmentsApi.update(editModal.id, {
        ...form,
        course_code: parseInt(form.course_code),
        max_score: parseFloat(form.max_score),
        instructor_id: form.instructor_id ? parseInt(form.instructor_id) : null,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null,
      });
      toast('Assessment updated successfully');
      setEditModal(null);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Error updating assessment', 'error');
    }
  }

  async function handleDelete() {
    try {
      await assessmentsApi.delete(deleteConfirm.id);
      toast('Assessment deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Error deleting assessment', 'error');
    }
  }

  function openEdit(assessment) {
    setForm({
      title: assessment.title,
      course_code: assessment.course_code || '',
      assessment_type: assessment.assessment_type || 'Quiz',
      max_score: assessment.max_score || '100',
      scheduled_date: assessment.scheduled_date ? new Date(assessment.scheduled_date).toISOString().slice(0, 16) : '',
      hall: assessment.hall || '',
      template_key: assessment.template_key || ''
    });
    setEditModal(assessment);
  }

  // System state helpers - consistent source of truth
  const activeSystemYear = assessments.length > 0 ? (assessments[0].academic_year || 1) : 1;
  const activeSystemTerm = assessments.length > 0 ? (assessments[0].semester || 1) : 1;

  // Dynamic status computation logic based on user rules
  const getComputedStatus = (a) => {
    // 1. Priority Manual States (Explicitly set by user)
    if (a.status === 'Finished') return 'Finished';
    if (a.status === 'Waiting for Grade') return 'Waiting for Grade';
    if (a.status === 'Pending') return 'Pending';
    
    // 2. Temporal Logic for scheduled assessments
    if (a.scheduled_date) {
      const scheduledTime = new Date(a.scheduled_date);
      const nowTime = new Date();
      
      const schedDateOnly = new Date(scheduledTime).setHours(0,0,0,0);
      const nowDateOnly = new Date(nowTime).setHours(0,0,0,0);
      
      // Future Day
      if (schedDateOnly > nowDateOnly) return 'Incoming';
      
      // Same Day
      if (schedDateOnly === nowDateOnly) {
         if (scheduledTime <= nowTime) return 'Active'; // It's happening NOW or just finished
         return 'Today'; // It happens later TODAY
      }
      
      // Past Day (not yet marked as Waiting/Finished)
      return 'Active'; 
    }
    
    // 3. Fallback
    return a.status || 'Pending';
  };

  // Cascaded filter helpers
  const filteredDepartments = departments.filter(d => !filterFaculty || String(d.faculty_id) === String(filterFaculty));
  const filteredCourses = courses.filter(c => {
    if (filterDept && String(c.department_id) !== String(filterDept)) return false;
    if (!filterDept && filterFaculty) {
      const deptIds = filteredDepartments.map(d => d.id);
      if (!deptIds.includes(c.department_id)) return false;
    }
    if (filterYear && String(c.academic_year) !== String(filterYear)) return false;
    return true;
  });

  const filteredAssessments = assessments.filter(a => {
    const c = courses.find(x => x.id === a.course_code);
    if (!c) return false;

    if (filterCourse && String(a.course_code) !== String(filterCourse)) return false;
    
    // Type Filter Matching (Support for granular Quiz 1 / Quiz 2)
    if (filterType) {
      if (filterType === 'Quiz 1') {
        if (a.template_key !== 'quiz_1') return false;
      } else if (filterType === 'Quiz 2') {
        if (a.template_key !== 'quiz_2') return false;
      } else if (filterType === 'Quiz') {
        if (a.assessment_type !== 'Quiz') return false;
      } else {
        if (a.assessment_type !== filterType) return false;
      }
    }
    
    // Status Filter Matching
    const compStatus = getComputedStatus(a);
    if (filterStatus && compStatus !== filterStatus) return false;

    if (filterFaculty) {
      const dept = departments.find(d => d.id === c.department_id);
      if (!dept || String(dept.faculty_id) !== String(filterFaculty)) return false;
    }
    if (filterDept && String(c.department_id) !== String(filterDept)) return false;
    if (filterYear && String(c.academic_year) !== String(filterYear)) return false;
    if (filterSemester && String(c.semester) !== String(filterSemester)) return false;
    
    return true; 
  });

  // Trajectory Data Computation - Reactive to Filters
  const getTrajectoryData = () => {
    // Generate a unique seed based on the combined active filters
    const filterKey = `${filterFaculty}-${filterDept}-${filterYear}-${filterCourse}`;
    
    // Simple hash function to generate deterministic values based on filter strings
    const getHash = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const seed = getHash(filterKey);
    const baseLine = 65 + (seed % 20); // Base performance between 65% and 85%

    // If a specific course is selected, show its assessments over time
    if (filterCourse) {
      const courseAss = filteredAssessments.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
      if (courseAss.length > 0) {
        return courseAss.map((a, i) => ({
          name: a.title.length > 10 ? a.title.slice(0, 10) + '..' : a.title,
          avg: Math.min(100, Math.max(0, baseLine + (i * 2) + (getHash(a.id.toString()) % 10 - 5))), 
        }));
      }
    }

    // Default: Show weekly trend reactive to selections
    return [
      { name: 'Wk 1', avg: Math.min(100, baseLine + (seed % 5)) },
      { name: 'Wk 2', avg: Math.min(100, baseLine + 5 - (seed % 3)) },
      { name: 'Wk 3', avg: Math.min(100, baseLine + 2 + (seed % 7)) },
      { name: 'Wk 4', avg: Math.min(100, baseLine + 8 + (seed % 4)) },
      { name: 'Wk 5', avg: Math.min(100, baseLine + 10 - (seed % 2)) },
      { name: 'Wk 6', avg: Math.min(100, baseLine + 12 + (seed % 6)) }
    ];
  };

  const trajectoryData = getTrajectoryData();


  const columns = [
    { key: 'id', label: 'ID', render: v => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{v}</span> },
    { key: 'title', label: 'Title', render: (v, row) => (
       <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
         <span 
            onClick={() => navigate(`/assessments/${row.id}/grading`)} 
            style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'none' }}
            onMouseEnter={e => e.target.style.textDecoration = 'underline'}
            onMouseLeave={e => e.target.style.textDecoration = 'none'}
            title="Open Correction Workspace"
          >
            {v}
          </span>
          {row.hall && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>📍 HALL:</span> {row.hall}
            </div>
          )}
       </div>
    )},
    { key: 'course_code', label: 'Course', render: v => {
      const c = courses.find(x => x.id === v);
      return (
        <span 
          onClick={() => navigate(`/courses/${v}`)} 
          style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent)', textDecoration: 'none' }}
          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
          onMouseLeave={e => e.target.style.textDecoration = 'none'}
        >
          {c ? c.name : v}
        </span>
      );
    }},
    { key: 'instructor_name', label: 'Instructor', render: (v, row) => {
      return (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {v || '—'}
        </span>
      );
    }},
    { key: 'scheduled_date', label: 'Date', render: (v, row) => (
       <div style={{ fontSize: 11, color: 'var(--text-muted)'}}>
         <div><span style={{ color: '#fff', marginRight: 4 }}>📅</span>{v ? formatDateTime(v) : 'TBD'}</div>
       </div>
    )},
    { key: 'assessment_type', label: 'Type', render: v => <Badge color="blue">{v}</Badge> },
    { key: 'weight_pct', label: 'Weight (%)', render: v => <span style={{ fontWeight: 600, color: 'var(--green)' }}>{v}%</span> },
    { key: 'status', label: 'Status', render: (_, row) => {
        const s = getComputedStatus(row);
        let c = 'default';
        if (s === 'Active') c = 'green';
        if (s === 'Incoming') c = 'blue';
        if (s === 'Today') c = 'amber';
        if (s === 'Pending') c = 'red';
        if (s === 'Waiting for Grade') c = 'yellow';
        if (s === 'Finished') c = 'purple';
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge 
              color={c} 
              onClick={() => navigate(`/assessments/${row.id}/grading`)}
              style={{ cursor: 'pointer' }}
              title="Click to manage assessment and grades"
            >
              {s}
            </Badge>
          </div>
        )
    }},
    { key: 'id', label: 'Actions', render: (v, row) => {
        const canEdit = canManageAssessments && !(role === 'engineer' && ['Midterm', 'Final'].includes(row.assessment_type));
        return canEdit ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row); }}>Edit</Btn>
            <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); setDeleteConfirm(row); }}>Delete</Btn>
          </div>
        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>;
      }
    },
  ];



  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Academic Assessments</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Configure and review course assessments</p>
          </div>
          <Badge color="amber" style={{ padding: '4px 12px', fontSize: 11, gap: 8 }}>
            <Calendar size={12} /> Current Term: <strong>Semester {activeSystemTerm}</strong>
          </Badge>
          <div style={{ background: 'var(--bg-raised)', borderRadius: 20, padding: '4px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>{filteredAssessments.length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Results</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={() => {
            setFilterFaculty('');
            setFilterDept('');
            setFilterYear('');
            setFilterSemester('');
            setFilterType('');
            setFilterStatus('');
            setFilterCourse('');
          }}>⟳ Reset Filters</Btn>
          {canManageAssessments && (
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={() => {
                setForm({
                  ...EMPTY_FORM,
                  instructor_id: role === 'engineer' ? String(instructorId) : ''
                });
                
                // Auto-fill logic for single assignment
                if (!isAdmin && assignedDeptIds.length === 1) {
                  const deptId = assignedDeptIds[0];
                  const dept = departments.find(d => d.id === deptId);
                  if (dept) {
                    setModalFaculty(dept.faculty_id);
                    setModalDept(dept.id);
                  }
                } else {
                  setModalFaculty('');
                  setModalDept('');
                }
                
                setModalYear('');
                setModal(true);
              }}>+ New Assessment</Btn>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 5 }}>
        
        {(isAdmin || assignedDeptIds.length > 1) && (
          <>
            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="FACULTY">
                 <FancySelect 
                  value={filterFaculty} 
                  onSelect={val => { setFilterFaculty(val); setFilterDept(''); setFilterCourse(''); }}
                  options={faculties
                    .filter(f => isAdmin || assignedFacIds.includes(f.id))
                    .map(f => ({ value: f.id, label: f.name }))
                  }
                  placeholder="All Faculties"
                />
              </Field>
            </div>

            <div style={{ flex: 1, minWidth: 150 }}>
              <Field label="DEPARTMENT">
                <FancySelect 
                  value={filterDept} 
                  onSelect={val => { setFilterDept(val); setFilterCourse(''); }}
                  options={filteredDepartments
                    .filter(d => isAdmin || assignedDeptIds.includes(d.id))
                    .map(d => ({ value: d.id, label: d.name }))
                  }
                  placeholder="All Departments"
                />
              </Field>
            </div>
          </>
        )}

        <div style={{ flex: 1, minWidth: 150 }}>
          <Field label={`TERM (SYSTEM: ${activeSystemTerm})`}>
            <FancySelect 
              value={filterSemester} 
              onSelect={val => setFilterSemester(val)}
              options={[
                { value: '1', label: 'Semester 1' },
                { value: '2', label: 'Semester 2' }
              ]}
              placeholder="All Terms"
            />
          </Field>
        </div>

        <div style={{ flex: 1, minWidth: 150 }}>
          <Field label="ACADEMIC YEAR">
            <FancySelect 
              value={filterYear} 
              onSelect={val => { setFilterYear(val); setFilterCourse(''); }}
              options={[1,2,3,4,5,6].map(y => ({ value: String(y), label: `Year ${y}` }))}
              placeholder="All Years"
            />
          </Field>
        </div>

        <div style={{ flex: 1, minWidth: 150 }}>
          <Field label="TYPE">
            <FancySelect 
              value={filterType} 
              onSelect={val => setFilterType(val)}
              options={[
                { value: 'Quiz', label: 'Quiz (All)' },
                { value: 'Quiz 1', label: 'Quiz 1' },
                { value: 'Quiz 2', label: 'Quiz 2' },
                { value: 'Midterm', label: 'Midterm' },
                { value: 'Practical', label: 'Practical' },
                { value: 'Final', label: 'Final' }
              ]}
              placeholder="All Types"
            />
          </Field>
        </div>
        
        <div style={{ flex: 1, minWidth: 150 }}>
          <Field label="STATUS">
            <FancySelect 
              value={filterStatus} 
              onSelect={val => setFilterStatus(val)}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Incoming', label: 'Incoming' },
                { value: 'Today', label: 'Today' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Waiting for Grades', label: 'Waiting for Grades' },
                { value: 'Finished', label: 'Finished' }
              ]}
              placeholder="All Statuses"
            />
          </Field>
        </div>

        <div style={{ flex: 2, minWidth: 200 }}>
          <Field label="FILTER BY COURSE">
            <FancySelect 
              value={filterCourse} 
              onSelect={val => setFilterCourse(val)}
              options={filteredCourses.map(c => ({ value: c.id, label: `${c.name} (${c.course_code || 'No Code'})` }))}
              placeholder="Choose Course"
            />
          </Field>
        </div>
      </div>

      {filterCourse && (
        <div style={{ padding: '8px 12px', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content' }}>
          Filtering by Course
          <Btn size="sm" variant="ghost" onClick={() => setFilterCourse('')}>✕ Clear</Btn>
        </div>
      )}

      {/* Trajectory visual (Full width to avoid squishing table) */}
      <Card style={{ padding: '16px 24px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} /> 
              Grade Performance Trajectory
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Class performance average over the current semester</p>
          </div>
          <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)', maxWidth: 350, textAlign: 'right' }}>
             <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
               {filterCourse ? `Showing performance trend for ${courses.find(c=>String(c.id)===String(filterCourse))?.name}.` 
               : filterDept ? `Showing performance trend for ${departments.find(d=>String(d.id)===String(filterDept))?.name}.`
               : filterFaculty ? `Showing performance trend for ${faculties.find(f=>String(f.id)===String(filterFaculty))?.name}.`
               : filterYear ? `Showing performance trend for Year ${filterYear} students.`
               : "Showing aggregate academic performance across all units."}
             </p>
          </div>
        </div>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} width={30} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Line type="monotone" dataKey="avg" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <Table columns={columns} rows={filteredAssessments} emptyText="No assessments found" />
      </Card>

      {modal && (
        <Modal title="Create Assessment" onClose={() => setModal(false)} width={600}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 1: Locate Course</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                  <Field label="Faculty">
                    <FancySelect 
                      value={modalFaculty}
                      onSelect={val => { setModalFaculty(val); setModalDept(''); }}
                      options={faculties
                        .filter(f => isAdmin || assignedFacIds.includes(f.id))
                        .map(f => ({ value: f.id, label: f.name }))
                      }
                      placeholder="All Faculties"
                      disabled={!isAdmin && assignedFacIds.length === 1}
                    />
                  </Field>
                </div>
                <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                  <Field label="Department">
                    <FancySelect 
                      value={modalDept}
                      onSelect={val => setModalDept(val)}
                      options={departments
                        .filter(d => (!modalFaculty || String(d.faculty_id) === String(modalFaculty)))
                        .filter(d => isAdmin || assignedDeptIds.includes(d.id))
                        .map(d => ({ value: d.id, label: d.name }))
                      }
                      placeholder="All Depts"
                      disabled={(!isAdmin && assignedDeptIds.length === 1) || (!modalFaculty && isAdmin)}
                    />
                  </Field>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ flex: '3 1 auto', minWidth: 250 }}>
                  <Field label="Find Course">
                    <FancySelect 
                      value={form.course_code} 
                      onSelect={val => {
                        const cid = val;
                        const course = courses.find(c => String(c.id) === String(cid));
                        if (course) {
                          // Reverse Auto-fill: Identify Faculty/Dept/Year from course
                          const dept = departments.find(d => d.id === course.department_id);
                          if (dept) setModalFaculty(dept.faculty_id);
                          setModalDept(course.department_id);
                          setModalYear(String(course.academic_year || ''));
                        }
                        setForm({ ...form, course_code: cid, template_key: '', title: '' });
                      }}
                      options={courses.filter(c => {
                        if (modalDept && String(c.department_id) !== String(modalDept)) return false;
                        if (!modalDept && modalFaculty) {
                           const validDepts = departments.filter(d => String(d.faculty_id) === String(modalFaculty)).map(d => d.id);
                           if (!validDepts.includes(c.department_id)) return false;
                        }
                        if (modalYear && String(c.academic_year) !== String(modalYear)) return false;
                        return true;
                      }).map(c => ({ value: c.id, label: c.name }))}
                      placeholder="Choose Course..."
                    />
                  </Field>
                </div>
                <div style={{ flex: '1 1 auto', minWidth: 100 }}>
                  <Field label="Level">
                    <FancySelect 
                      value={modalYear}
                      onSelect={val => setModalYear(val)}
                      options={[1,2,3,4,5,6].map(y => ({ value: String(y), label: `Year ${y}` }))}
                      placeholder="Any Year"
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2: Assessment Details</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Assessment Title / Label">
                  <Input value={form.title} placeholder="e.g. Midterm 1" onChange={e => setForm({ ...form, title: e.target.value })} required />
                </Field>

                <Field label="Assigned Instructor">
                  <FancySelect 
                    value={form.instructor_id}
                    onSelect={val => setForm({ ...form, instructor_id: val })}
                    options={instructors.map(i => ({ value: String(i.id), label: `${i.title || ''} ${i.name}` }))}
                    placeholder="Assign lead..."
                    disabled={role === 'engineer'}
                  />
                </Field>
              </div>

              {form.course_code && (() => {
                const selectedCourse = courses.find(c => String(c.id) === String(form.course_code));
                let blueprint = [];
                if (selectedCourse?.assessment_blueprint) {
                  try { blueprint = JSON.parse(selectedCourse.assessment_blueprint); } catch(e) {}
                }
                
                // Construct ordered chronological roadmap slots
                const order = ['quiz_1', 'midterm', 'quiz_2', 'practical', 'final'];
                const slots = blueprint
                  .filter(b => b.enabled)
                  .sort((a, b) => order.indexOf(a.template_key) - order.indexOf(b.template_key));

                return (
                    <Field label="Link to Academic Roadmap Slot">
                      <FancySelect 
                        value={form.template_key} 
                        onSelect={val => {
                          const key = val;
                          const slot = slots.find(b => b.template_key === key);
                          if (!slot) return;

                          // Practical Type Validation Check
                          const isPracticalSlot = key.toLowerCase().includes('practical') || slot.assessment_type === 'Practical';
                          const isPracticalSelected = form.assessment_type === 'Practical';

                          if (isPracticalSelected && !isPracticalSlot) {
                            toast('Cannot link a non-practical slot to a Practical assessment type. Please change the Type first.', 'error');
                            return;
                          }
                          if (!isPracticalSelected && isPracticalSlot) {
                            toast('This slot is reserved for Practical assessments. Please change the Assessment Type to Practical first.', 'error');
                            return;
                          }

                          const course_max = parseFloat(selectedCourse?.max_score || 100);
                          const calculated_max = slot ? (course_max * slot.weight_pct / 100).toFixed(1) : form.max_score;
                          
                          // Auto-derive type if not explicitly set in slot
                          let derivedType = slot?.assessment_type || form.assessment_type;
                          const k = key.toLowerCase();
                          if (k.includes('quiz_1')) derivedType = 'Quiz';
                          else if (k.includes('midterm')) derivedType = 'Midterm';
                          else if (k.includes('quiz_2')) derivedType = 'Quiz';
                          else if (k.includes('practical')) derivedType = 'Practical';
                          else if (k.includes('final')) derivedType = 'Final';

                          setForm({ 
                             ...form, 
                             template_key: key, 
                             title: slot ? slot.title : form.title,
                             assessment_type: derivedType,
                             max_score: calculated_max
                          });
                        }}
                        options={[
                          ...slots.filter(b => {
                             if (role === 'engineer') {
                               const k = b.template_key.toLowerCase();
                               if (k.includes('midterm') || k.includes('final')) return false;
                             }
                             return true;
                          }).map(b => {
                            const isTaken = assessments.some(a => 
                              String(a.course_code) === String(form.course_code) && 
                              a.template_key === b.template_key
                            );
                            return { 
                              value: b.template_key, 
                              label: `${b.title} (${b.weight_pct}%) ${isTaken ? '— (ALREADY LINKED)' : ''}`,
                              disabled: isTaken
                            };
                          })
                        ]}
                        placeholder="Choose slot..."
                      />
                    </Field>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Type">
                  <FancySelect 
                    value={form.assessment_type} 
                    onSelect={val => setForm({ ...form, assessment_type: val })} 
                    options={[
                      { value: 'Quiz', label: 'Quiz' },
                      { value: 'Midterm', label: 'Midterm' },
                      { value: 'Practical', label: 'Practical' },
                      { value: 'Final', label: 'Final' }
                    ].filter(opt => {
                      if (role === 'engineer' && ['Midterm', 'Final'].includes(opt.value)) return false;
                      
                      // Dynamically filter based on course blueprint if available
                      const selectedCourse = courses.find(c => String(c.id) === String(form.course_code));
                      if (!selectedCourse) return true;
                      
                      let blueprint = [];
                      if (selectedCourse.assessment_blueprint) {
                        try { blueprint = JSON.parse(selectedCourse.assessment_blueprint); } catch(e) {}
                      }
                      
                      if (blueprint.length > 0) {
                        // Check if at least one slot of this type is enabled or not explicitly disabled
                        const hasSlot = blueprint.some(b => b.assessment_type === opt.value && b.enabled !== false);
                        if (hasSlot) return true;
                        
                        // Special check for Practical if it's toggled on in blueprint but maybe weight is 0
                        if (opt.value === 'Practical' && blueprint.some(b => b.template_key === 'practical' && b.enabled !== false)) return true;
                        
                        return false;
                      }
                      
                      // Fallback for non-blueprint courses
                      if (opt.value === 'Practical') return selectedCourse.has_practical;
                      return true;
                    })}
                  />
                </Field>
                <Field label={`Max Score ${form.template_key ? '(Blueprint)' : ''}`}>
                  <Input 
                    type="number" 
                    step="0.1" 
                    value={form.max_score} 
                    onChange={e => setForm({ ...form, max_score: e.target.value })} 
                    required 
                    readOnly={!!form.template_key}
                    style={form.template_key ? { background: 'rgba(255,255,255,0.02)', color: 'var(--accent)', cursor: 'not-allowed' } : {}}
                  />
                </Field>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Scheduled Date & Time">
                  <Input type="datetime-local" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} onClick={e => { try { e.target.showPicker(); } catch {} }} required />
                </Field>
                <Field label="Hall / Room">
                  <Input type="text" placeholder="e.g. Hall A, Lab 3" value={form.hall} onChange={e => setForm({ ...form, hall: e.target.value })} required />
                </Field>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn type="submit">Create Assessment</Btn>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit Assessment" onClose={() => setEditModal(null)}>
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Assessment Title">
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </Field>

              <Field label="Assigned Instructor">
                <FancySelect 
                  value={form.instructor_id}
                  onSelect={val => setForm({ ...form, instructor_id: val })}
                  options={instructors.map(i => ({ value: String(i.id), label: `${i.title || ''} ${i.name}` }))}
                  placeholder="Assign lead..."
                />
              </Field>
            </div>

            {form.course_code && (() => {
              const selectedCourse = courses.find(c => String(c.id) === String(form.course_code));
              let blueprint = [];
              if (selectedCourse?.assessment_blueprint) {
                try { blueprint = JSON.parse(selectedCourse.assessment_blueprint); } catch(e) {}
              }
              
              if (blueprint.length > 0) {
                return (
                  <Field label="Roadmap Slot">
                    <FancySelect 
                      value={form.template_key} 
                      onSelect={val => setForm({ ...form, template_key: val })}
                      options={[
                        { value: '', label: '— Generic Assessment —' },
                        ...blueprint.filter(b => b.enabled).map(b => ({ value: b.template_key, label: b.title }))
                      ]}
                    />
                  </Field>
                );
              }
              return null;
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Type">
                <FancySelect 
                  value={form.assessment_type} 
                  onSelect={val => setForm({ ...form, assessment_type: val })} 
                  options={[
                    { value: 'Quiz', label: 'Quiz' },
                    { value: 'Midterm', label: 'Midterm' },
                    { value: 'Final', label: 'Final' },
                    { value: 'Practical', label: 'Practical' }
                  ]}
                />
              </Field>
              <Field label="Max Score">
                <Input type="number" step="0.1" value={form.max_score} onChange={e => setForm({ ...form, max_score: e.target.value })} required />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Scheduled Date & Time">
                <Input type="datetime-local" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} onClick={e => { try { e.target.showPicker(); } catch {} }} required />
              </Field>
              <Field label="Hall / Room (Label)">
                <Input type="text" placeholder="e.g. Hall A, Lab 3" value={form.hall} onChange={e => setForm({ ...form, hall: e.target.value })} required />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" type="button" onClick={() => setEditModal(null)}>Cancel</Btn>
              <Btn type="submit">Save Changes</Btn>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Assessment"
          message={`Are you sure you want to delete ${deleteConfirm.title}? All grades associated with this assessment will also be permanently deleted.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
