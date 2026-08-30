import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { assessmentsApi, gradebookApi, coursesApi, instructorsApi } from '../api/client';
import { Card, Table, Badge, Btn, Input, FancySelect, Modal, PageLoader, useToast } from '../components/ui';
import { ChevronLeft, Save, FileDown, Upload, CheckCircle, Clock, AlertCircle, HelpCircle, AlertTriangle, RotateCcw } from 'lucide-react';

export default function AssessmentGradingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();

  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [pendingLeadChange, setPendingLeadChange] = useState(null);
  const [confirmCommitModal, setConfirmCommitModal] = useState(false);
  const [pendingInstructorId, setPendingInstructorId] = useState(null);

  // Local state for the editable grid
  const [gradingData, setGradingData] = useState([]);

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch assessment metadata
      const assRes = await assessmentsApi.get(id);
      const ass = assRes.data;
      setAssessment(ass);

      // 2. Fetch students, existing grades, and instructors in parallel
      const [stuRes, gradeRes, instRes] = await Promise.all([
        coursesApi.students(ass.course_code),
        gradebookApi.get(id),
        instructorsApi.list()
      ]);

      const studentList = stuRes.data;
      const existingGrades = gradeRes.data;

      setStudents(studentList);
      setGrades(existingGrades);
      setInstructors(instRes.data);

      // 3. Merge: Create the grading workspace state
      const initialGrading = studentList.map(s => {
        const existing = existingGrades.find(g => g.student_id === s.id);
        return {
          student_id: s.id,
          university_id: s.university_id,
          student_name: s.name,
          raw_score: existing ? (existing.raw_score || 0) : '',
          instructor_remarks: existing ? (existing.instructor_remarks || '') : '',
          is_flagged: existing ? !!existing.is_flagged : false,
          is_absent: existing ? !!existing.is_absent : false
        };
      });
      
      setGradingData(initialGrading);
    } catch (err) {
      toast('Failed to load grading data', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleScoreChange = (sid, val) => {
    let num = val === '' ? '' : parseFloat(val);
    if (num !== '' && num > assessment.max_score) {
        toast(`Score cannot exceed Max Score (${assessment.max_score})`, 'warning');
        num = assessment.max_score;
        val = String(num);
    }
    setGradingData(prev => prev.map(item => 
      item.student_id === sid ? { ...item, raw_score: val } : item
    ));
  };

  const handleRemarksChange = (sid, val) => {
    setGradingData(prev => prev.map(item => 
      item.student_id === sid ? { ...item, instructor_remarks: val } : item
    ));
  };

  const toggleFlag = (sid) => {
    setGradingData(prev => prev.map(item => 
      item.student_id === sid ? { ...item, is_flagged: !item.is_flagged } : item
    ));
  };

  const toggleAbsent = (sid) => {
    setGradingData(prev => prev.map(item => {
      if (item.student_id === sid) {
        const newAbsent = !item.is_absent;
        return { 
          ...item, 
          is_absent: newAbsent, 
          raw_score: newAbsent ? 0 : (item.raw_score === 0 ? '' : item.raw_score) 
        };
      }
      return item;
    }));
  };

  const handleCommit = async (finalize = false) => {
    setCommitting(true);
    try {
      const payload = {
        grades: gradingData.map(g => ({
          student_id: g.student_id,
          raw_score: parseFloat(g.raw_score) || 0,
          instructor_remarks: g.instructor_remarks,
          is_flagged: g.is_flagged,
          is_absent: g.is_absent
        })),
        finalize,
        instructor_id: pendingInstructorId ? parseInt(pendingInstructorId) : null
      };
      await gradebookApi.commit(id, payload);
      toast(finalize ? 'Grades committed and assessment finalized!' : 'Draft saved successfully.');
      setPendingInstructorId(null);
      loadData(); 
    } catch (err) {
      toast('Failed to save changes', 'error');
    } finally {
      setCommitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await assessmentsApi.updateStatus(id, newStatus);
      setAssessment({ ...assessment, status: newStatus });
      toast(`Status updated to ${newStatus}`);
    } catch (err) {
      toast('Failed to update status', 'error');
    }
  };

  const confirmInstructorChange = () => {
    if (!pendingLeadChange) return;
    const { newId, newName, oldName } = pendingLeadChange;
    
    // Auto-comment logic
    const transitionNote = `[Lead changed from ${oldName} to ${newName}]`;
    setGradingData(prev => prev.map(item => ({
      ...item,
      instructor_remarks: (item.instructor_remarks || '').trim() + (item.instructor_remarks ? '\n' : '') + transitionNote
    })));

    setPendingInstructorId(newId);
    setAssessment(prev => ({ ...prev, instructor_id: newId, instructor_name: newName }));
    toast(`Lead reassigned to ${newName} (Unsaved)`);
    setPendingLeadChange(null);
  };

  const getComputedStatus = (a) => {
    if (!a) return 'Pending';
    if (a.status === 'Finished') return 'Finished';
    if (a.status === 'Waiting for Grade') return 'Waiting for Grade';
    if (a.status === 'Pending') return 'Pending';
    
    if (a.scheduled_date) {
      const scheduledTime = new Date(a.scheduled_date);
      const nowTime = new Date();
      const schedDateOnly = new Date(scheduledTime).setHours(0,0,0,0);
      const nowDateOnly = new Date(nowTime).setHours(0,0,0,0);
      if (schedDateOnly > nowDateOnly) return 'Incoming';
      if (schedDateOnly === nowDateOnly) {
         if (scheduledTime <= nowTime) return 'Active';
         return 'Today';
      }
      return 'Active'; 
    }
    return a.status || 'Pending';
  };

  const currentStatus = getComputedStatus(assessment);

  const handleReset = () => {
    // Reset local state for instructor and reload from server
    setPendingInstructorId(null);
    loadData();
    toast('Draft reset to last saved state.', 'info');
  };

  const isRowDirty = (sid) => {
    const current = gradingData.find(g => g.student_id === sid);
    const original = grades.find(g => g.student_id === sid);
    if (!original) {
      return (current?.raw_score !== '') || (current?.instructor_remarks !== '') || (current?.is_flagged);
    }
    const scoreVal = current.raw_score === '' ? 0 : parseFloat(current.raw_score);
    const origVal = original.raw_score === '' ? 0 : parseFloat(original.raw_score);
    
    return (
      Math.abs(scoreVal - origVal) > 0.001 ||
      (current.instructor_remarks || '') !== (original.instructor_remarks || '') ||
      !!current.is_flagged !== !!original.is_flagged ||
      !!current.is_absent !== !!original.is_absent
    );
  };

  const dirtyCount = gradingData.filter(g => isRowDirty(g.student_id)).length;

  const exportTemplate = () => {
    const headers = ['student_id', 'student_name', 'raw_score', 'instructor_remarks'];
    const rows = gradingData.map(g => [g.student_id, g.student_name, g.raw_score, g.instructor_remarks]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Grading_Template_${assessment.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const newGrading = [...gradingData];
      let updatedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 3) continue;
        
        const sid = parseInt(cols[0]);
        const score = parseFloat(cols[2]);
        const remarks = cols[3] || '';

        const index = newGrading.findIndex(g => g.student_id === sid);
        if (index !== -1) {
          newGrading[index] = { ...newGrading[index], raw_score: score, instructor_remarks: remarks };
          updatedCount++;
        }
      }

      setGradingData(newGrading);
      toast(`Successfully imported ${updatedCount} student grades from CSV.`);
    };
    reader.readAsText(file);
  };

  if (loading) return <PageLoader />;
  if (!assessment) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <AlertCircle size={48} style={{ color: 'var(--red)', marginBottom: 16, opacity: 0.5 }} />
      <h2 style={{ color: '#fff' }}>Assessment Not Found</h2>
      <p style={{ color: 'var(--text-muted)' }}>The assessment you are looking for does not exist or could not be loaded.</p>
      <Btn variant="ghost" onClick={() => navigate('/assessments')} style={{ marginTop: 20 }}>Back to Assessments</Btn>
    </div>
  );

  const columns = [
    { key: 'university_id', label: 'ID', render: v => <span className="mono">{v}</span> },
    { key: 'student_name', label: 'Student Name', render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isRowDirty(row.student_id) && (
          <AlertTriangle size={14} style={{ color: 'var(--accent)' }} title="Unsaved changes in this row" />
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600 }}>{v}</span>
          {row.is_absent && <span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 800, textTransform: 'uppercase' }}>Makeup Pending</span>}
        </div>
      </div>
    )},
    { key: 'is_absent', label: 'Presence', render: (v, row) => (
      <Btn 
        size="xs" 
        variant={v ? 'danger' : 'ghost'} 
        onClick={() => toggleAbsent(row.student_id)}
        style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700 }}
      >
        {v ? 'ABSENT' : 'PRESENT'}
      </Btn>
    )},
    { key: 'raw_score', label: `Score / ${assessment?.max_score}`, render: (v, row) => (
      <Input 
        type="number" 
        step="0.5"
        min="0"
        max={assessment?.max_score}
        value={v} 
        onChange={e => handleScoreChange(row.student_id, e.target.value)}
        disabled={row.is_absent || currentStatus === 'Finished'}
        style={{ 
          width: 80, height: 32, textAlign: 'center',
          opacity: (row.is_absent || currentStatus === 'Finished') ? 0.3 : 1,
          border: row.is_absent ? '1px dashed var(--red)' : '1px solid var(--border)'
        }}
        placeholder={row.is_absent ? 'DNA' : ''}
      />
    )},
    { key: 'pct', label: '%', render: (_, row) => {
      const p = (parseFloat(row.raw_score) / assessment?.max_score) * 100;
      return <Badge color={p >= 60 ? 'green' : 'red'}>{isNaN(p) ? '0%' : p.toFixed(0) + '%'}</Badge>;
    }},
    { key: 'instructor_remarks', label: 'Remarks', render: (v, row) => (
      <Input 
        placeholder="Add comment..." 
        value={v} 
        onChange={e => handleRemarksChange(row.student_id, e.target.value)}
        disabled={currentStatus === 'Finished'}
        style={{ height: 32, fontSize: 12 }}
      />
    )},
    { key: 'is_flagged', label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Flag
        <HelpCircle size={12} style={{ cursor: 'help' }} title="Flag grades for review, student requests, or internal audit. Does not affect scoring." />
      </div>
    ), render: (v, row) => (
      <Btn 
        size="xs" 
        variant={v ? 'danger' : 'ghost'} 
        onClick={() => toggleFlag(row.student_id)}
        disabled={currentStatus === 'Finished'}
        style={{ padding: '4px 8px' }}
      >
        <AlertCircle size={14} />
      </Btn>
    )}
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* LEFT GROUP: Navigation & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
          <Btn variant="ghost" size="sm" onClick={() => navigate('/assessments')} style={{ minWidth: 60 }}>Back</Btn>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{assessment.title}</h1>
              <Badge color={
                currentStatus === 'Finished' ? 'purple' : 
                currentStatus === 'Active' ? 'green' : 
                currentStatus === 'Waiting for Grade' ? 'amber' : 
                currentStatus === 'Pending' ? 'red' : 'default'
              }>
                {currentStatus}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
              Grading Workspace — Max Score: <span style={{ color: 'var(--accent)' }}>{assessment.max_score}</span>
            </div>
          </div>

          {/* Marking Lead - Distinct but secondary */}
          <div style={{ 
            height: 32, width: 1, background: 'var(--border)', margin: '0 10px' 
          }} />
          
          <div style={{ position: 'relative', width: 220 }}>
            {pendingInstructorId && (
              <div style={{ 
                position: 'absolute', top: -16, left: 4, 
                fontSize: 9, fontWeight: 800, color: 'var(--accent)', 
                textTransform: 'uppercase', letterSpacing: '0.1em' 
              }}>
                Unsaved Change
              </div>
            )}
            <FancySelect
              options={instructors.map(i => ({ value: i.id, label: `${i.title} ${i.name}`.toUpperCase() }))}
              value={assessment.instructor_id}
              onSelect={(val) => {
                const inst = instructors.find(i => String(i.id) === String(val));
                setPendingLeadChange({ 
                  newId: val, 
                  newName: `${inst.title} ${inst.name}`,
                  oldName: assessment.instructor_name || 'Unassigned'
                });
              }}
              placeholder="Select Marking Lead..."
            />
          </div>
        </div>

        {/* RIGHT GROUP: Utilities & Workflow Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Utility Box */}
          <div style={{ 
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', 
            padding: '2px 4px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' 
          }}>
            <Btn variant="ghost" size="sm" icon={<FileDown size={14} />} onClick={exportTemplate} style={{ border: 'none', background: 'none' }}>Template</Btn>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '0 12px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Upload size={14} /> Upload CSV
              <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
            </label>
          </div>

          {/* Workflow Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(currentStatus === 'Active' || (assessment.status === 'Pending' && currentStatus !== 'Finished')) && (
              <Btn variant="accent" size="sm" icon={<Clock size={16} />} onClick={() => handleStatusChange('Waiting for Grade')}>Mark Waiting for Grade</Btn>
            )}
            {currentStatus !== 'Finished' && assessment.status !== 'Pending' && (
               <Btn variant="ghost" size="sm" icon={<AlertTriangle size={16} />} style={{ color: 'var(--red)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleStatusChange('Pending')}>Flag Issue</Btn>
            )}
            
            <Btn 
              variant="solid" 
              size="sm"
              icon={<CheckCircle size={16} />} 
              onClick={() => setConfirmCommitModal(true)} 
              disabled={committing || currentStatus === 'Finished'}
              loading={committing}
              style={{ minWidth: 140 }}
            >
              {currentStatus === 'Finished' ? 'Finalized' : 'Commit & Finalize'}
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Grading Workspace ──────────────────────────────────── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Student Grade List</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter individual scores or flags below. Click "Commit & Finalize" to notify students.</p>
          </div>
          
          <div style={{ display: 'flex', gap: 10 }}>
            {dirtyCount > 0 && (
              <Btn 
                variant="ghost" 
                size="sm" 
                icon={<RotateCcw size={14} />} 
                onClick={handleReset}
                style={{ color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
              >
                Reset Changes
              </Btn>
            )}
            <Btn 
              variant="ghost" 
              icon={<Save size={16} />} 
              size="sm"
              onClick={() => handleCommit(false)}
              style={{
                color: (dirtyCount > 0 || pendingInstructorId) ? '#c084fc' : 'var(--text-muted)',
                border: (dirtyCount > 0 || pendingInstructorId) ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border)',
                background: (dirtyCount > 0 || pendingInstructorId) ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                boxShadow: (dirtyCount > 0 || pendingInstructorId) ? '0 0 15px rgba(168, 85, 247, 0.2)' : 'none',
                padding: '8px 20px',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={e => {
                if (dirtyCount > 0 || pendingInstructorId) {
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(168, 85, 247, 0.3)';
                  e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = (dirtyCount > 0 || pendingInstructorId) ? '0 0 15px rgba(168, 85, 247, 0.2)' : 'none';
                e.currentTarget.style.background = (dirtyCount > 0 || pendingInstructorId) ? 'rgba(168, 85, 247, 0.1)' : 'transparent';
              }}
            >
              Save Draft {(dirtyCount > 0 || pendingInstructorId) && `(${dirtyCount + (pendingInstructorId ? 1 : 0)})`}
            </Btn>
          </div>
        </div>
        
        <Table 
          columns={columns} 
          rows={gradingData} 
          emptyText="No students enrolled in this course." 
        />
        
        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Progress: <strong>{gradingData.filter(g => g.raw_score !== '').length} / {gradingData.length}</strong> Students Graded
            </div>
          </div>
        </div>
      </Card>

      {pendingLeadChange && (
        <Modal title="Confirm Lead Transition" onClose={() => setPendingLeadChange(null)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to replace <strong style={{color: '#fff'}}>{pendingLeadChange.oldName}</strong> with <strong style={{color: 'var(--accent)'}}>{pendingLeadChange.newName}</strong> as the marking lead?
            </p>
            <div style={{ padding: '10px 14px', background: 'rgba(255,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, fontSize: 12, color: '#fbbf24' }}>
              <strong>Audit Notice:</strong> A transition note will be automatically appended to all student remarks to maintain a clear correction history.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setPendingLeadChange(null)}>Cancel</Btn>
              <Btn onClick={confirmInstructorChange}>Confirm & Reassign</Btn>
            </div>
          </div>
        </Modal>
      )}

      {confirmCommitModal && (
        <Modal title="Commit & Finalize Grades" onClose={() => setConfirmCommitModal(false)} width={450}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              You are about to finalize <strong style={{color: '#fff'}}>{assessment.title}</strong>. 
              {dirtyCount > 0 ? ` There are ${dirtyCount} unsaved changes that will be persisted.` : " All changes are currently saved as draft."}
            </p>
            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>
              <strong>Action Impact:</strong> Committing will push final grades to student profiles and lock this assessment as 'Finished'. This action is typically irreversible from the dashboard.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="ghost" onClick={() => setConfirmCommitModal(false)}>Cancel</Btn>
              <Btn variant="solid" onClick={() => { setConfirmCommitModal(false); handleCommit(true); }}>Confirm & Finalize</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
