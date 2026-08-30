import React, { useState, useEffect } from 'react';
import { Field, Input, Select, Btn, Modal } from '../ui';
import { CalendarPlus, X, Clock, ClipboardList, Info, AlertTriangle } from 'lucide-react';
import { assessmentsApi } from '../../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Schedule Builder component ---
export const ScheduleBuilder = ({ form, setForm }) => {
  // Parse existing schedule from JSON string
  const getInitialSlots = () => {
    try {
      if (!form.weekly_schedule) return [];
      const parsed = JSON.parse(form.weekly_schedule);
      return Object.entries(parsed).map(([day, time]) => {
        const [start, end] = time.split('-');
        return { day, start: start || '08:00', end: end || '10:00' };
      });
    } catch (e) {
      console.error('Failed to parse weekly schedule:', e);
      return [];
    }
  };

  const [slots, setSlots] = useState(getInitialSlots);
  const [adding, setAdding] = useState(false);
  const [newDay, setNewDay] = useState('Sun');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('10:00');

  // Ensure internal slots stay in sync if the form context changes outwardly
  useEffect(() => {
    setSlots(getInitialSlots());
  }, [form.weekly_schedule]);

  const syncToForm = (updated) => {
    const obj = {};
    updated.forEach(s => { 
      if (s.day && s.start && s.end) {
        obj[s.day] = `${s.start}-${s.end}`; 
      }
    });
    const jsonString = JSON.stringify(obj);
    if (jsonString === '{}') {
      setForm(f => ({ ...f, weekly_schedule: '' }));
    } else {
      setForm(f => ({ ...f, weekly_schedule: jsonString }));
    }
  };

  const addSlot = () => {
    // Basic validation
    if (slots.some(s => s.day === newDay)) {
      alert(`There is already a session scheduled for ${newDay}. Please remove it first to change the time.`);
      return;
    }

    const updated = [...slots, { day: newDay, start: newStart, end: newEnd }];
    setSlots(updated);
    syncToForm(updated);
    setAdding(false);
  };

  const removeSlot = (index) => {
    const updated = slots.filter((_, i) => i !== index);
    setSlots(updated);
    syncToForm(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Weekly Schedule
        </span>
        <Btn type="button" variant="ghost" size="sm" onClick={() => setAdding(!adding)} style={{ color: 'var(--accent)', gap: 6 }}>
          <CalendarPlus size={16} /> Set Weekly Schedule
        </Btn>
      </div>

      {adding && (
        <div style={{ 
          display: 'flex', gap: 10, alignItems: 'flex-end', padding: 12, 
          background: 'var(--bg-surface)', borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'
        }}>
          <Field label="Day" style={{ flex: 1 }}>
            <Select value={newDay} onChange={e => setNewDay(e.target.value)}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="From" style={{ flex: 1 }}>
            <Input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
          </Field>
          <Field label="To" style={{ flex: 1 }}>
            <Input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
            <Btn type="button" size="sm" onClick={addSlot}>Add</Btn>
            <Btn type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Btn>
          </div>
        </div>
      )}

      {slots.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {slots.map((s, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', 
              background: 'var(--bg-raised)', border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', fontSize: 13 
            }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{s.day}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{s.start} - {s.end}</span>
              <button type="button" onClick={() => removeSlot(i)} style={{ 
                background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--red)', display: 'flex' 
              }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', textAlign: 'center' }}>
          No sessions scheduled yet.
        </div>
      )}
    </div>
  );
};

// --- Assessment Blueprint component ---
const BlueprintConfig = ({ blueprint, setBlueprint, hasPractical, setHasPractical, existingPracticals = [] }) => {
  const [showWarning, setShowWarning] = useState(false);
  
  const total = blueprint.reduce((acc, curr) => acc + (curr.enabled ? parseFloat(curr.weight_pct) : 0), 0);
  const isInvalid = Math.abs(total - 100) > 0.01;

  const updateWeight = (key, val) => {
    setBlueprint(prev => prev.map(item => 
      item.template_key === key ? { ...item, weight_pct: parseFloat(val) || 0 } : item
    ));
  };

  const togglePractical = (enabled) => {
    // PROTECTIVE LOGIC: Warning if disabling with existing assessments
    if (!enabled && existingPracticals.length > 0) {
      setShowWarning(true);
      return;
    }
    
    commitToggle(enabled);
  };

  const commitToggle = (enabled) => {
    setHasPractical(enabled);
    setBlueprint(prev => {
      return prev.map(item => {
        if (item.template_key === 'practical') return { ...item, enabled: enabled, weight_pct: enabled ? 20 : 0 };
        if (item.template_key === 'final') return { ...item, weight_pct: enabled ? 40 : 60 };
        return item;
      });
    });
    setShowWarning(false);
  };


  return (
    <div style={{ 
      padding: 16, background: 'rgba(99, 102, 241, 0.03)', borderRadius: 'var(--radius)', 
      border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', flexDirection: 'column', gap: 12 
    }}>
      {showWarning && (
        <Modal title="Confirm Deletion" onClose={() => setShowWarning(false)} width={420}>
           <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
                <AlertTriangle size={30} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Practical Assessments?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
                This course already has <strong>{existingPracticals.length}</strong> practical assessment(s) created. 
                Disabling this slot will permanently delete them for data consistency.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <Btn variant="ghost" fullWidth onClick={() => setShowWarning(false)}>Cancel</Btn>
                <Btn variant="danger" fullWidth onClick={() => commitToggle(false)}>Confirm & Delete</Btn>
              </div>
           </div>
        </Modal>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardList size={16} /> Course Assessment Roadmap
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              const standard = [
                {title: 'Quiz 1', assessment_type: 'Quiz', weight_pct: 10, template_key: 'quiz_1', enabled: true},
                {title: 'Midterm', assessment_type: 'Midterm', weight_pct: 20, template_key: 'midterm', enabled: true},
                {title: 'Quiz 2', assessment_type: 'Quiz', weight_pct: 10, template_key: 'quiz_2', enabled: true},
                {title: 'Practical Exam', assessment_type: 'Practical', weight_pct: 20, template_key: 'practical', enabled: true},
                {title: 'Final Exam', assessment_type: 'Final', weight_pct: 40, template_key: 'final', enabled: true},
              ];
              setBlueprint(standard);
              setHasPractical(true);
            }}
            style={{ fontSize: 10, padding: '2px 8px', color: 'var(--accent)' }}
          >
            Apply Standard Roadmap
          </Btn>
          <div style={{ fontSize: 12, fontWeight: 600, color: isInvalid ? 'var(--red)' : 'var(--green)' }}>
            Total Weight: {total}% {isInvalid && '(Must be 100%)'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 12, opacity: 0.6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '0 4px' }}>
        <span>Assessment Type</span>
        <span>Weight %</span>
        <span>Status</span>
      </div>

      {blueprint.map((item) => (
        <div key={item.template_key} style={{ 
          display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 12, alignItems: 'center',
          padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</span>
          <Input 
            type="number" 
            size="sm"
            value={item.weight_pct} 
            onChange={e => updateWeight(item.template_key, e.target.value)}
            disabled={!item.enabled}
          />
          {item.template_key === 'practical' ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={hasPractical} onChange={e => togglePractical(e.target.checked)} />
              <span style={{ fontSize: 11 }}>{hasPractical ? 'ON' : 'OFF'}</span>
            </label>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Required</span>
          )}
        </div>
      ))}
      
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
        <Info size={14} style={{ color: 'var(--accent)', marginTop: 2 }} />
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
          Blueprint items are automatically created as placeholders.
          <br/><b>Rule:</b> Students must score ≥ 60% on the Final Exam to pass.
        </p>
      </div>
    </div>
  );
};

// --- Standard Course Form ---
const CourseForm = ({
  form, setForm, faculties, departments, doctors, instructors,
  selectedFacultyId, setSelectedFacultyId, onSubmit, onCancel, submitLabel,
  isEdit = false, allCourses = []
}) => {

  const [hasPractical, setHasPractical] = useState(form.has_practical !== undefined ? form.has_practical : true);
  const [existingPracticals, setExistingPracticals] = useState([]);
  const [blueprint, setBlueprint] = useState(() => {
    if (form.assessment_blueprint) {
      if (typeof form.assessment_blueprint === 'string') {
        try { return JSON.parse(form.assessment_blueprint); } catch(e) { console.error(e); }
      } else {
        return form.assessment_blueprint;
      }
    }
    return [
      {title: 'Quiz 1', assessment_type: 'Quiz', weight_pct: 10, template_key: 'quiz_1', enabled: true},
      {title: 'Midterm', assessment_type: 'Midterm', weight_pct: 20, template_key: 'midterm', enabled: true},
      {title: 'Quiz 2', assessment_type: 'Quiz', weight_pct: 10, template_key: 'quiz_2', enabled: true},
      {title: 'Practical Exam', assessment_type: 'Practical', weight_pct: 20, template_key: 'practical', enabled: true},
      {title: 'Final Exam', assessment_type: 'Final', weight_pct: 40, template_key: 'final', enabled: true},
    ];
  });

  // CRITICAL: Ensure the initial/default blueprint is synced to the parent form state on mount.
  // This prevents the "No Blueprint" error if a user creates a course without manually editing weights.
  useEffect(() => {
    if (!form.assessment_blueprint) {
      setForm(f => ({ ...f, assessment_blueprint: blueprint }));
    }
  }, []);

  // Check for existing assessments if editing
  useEffect(() => {
    if (isEdit && form.id) {
       checkAssessments();
    }
  }, [isEdit, form.id]);

  async function checkAssessments() {
    try {
      const res = await assessmentsApi.list();
      const coursePracticals = res.data.filter(a => 
        String(a.course_code) === String(form.id) && a.template_key === 'practical'
      );
      setExistingPracticals(coursePracticals);
    } catch (e) { console.error("Failed to check practical assessments", e); }
  }

  const handleFacultyChange = (e) => {
    setSelectedFacultyId(e.target.value);
    setForm(f => ({ ...f, department_id: '' }));
  };

  // Get total_years from selected faculty (default 6)
  const selectedFaculty = faculties.find(f => String(f.id) === String(selectedFacultyId));
  const totalYears = selectedFaculty?.total_years || 6;

  // Filter available parent courses (exclude self if editing)
  const parentOptions = allCourses.filter(c => !isEdit || c.id !== form.id);

  const totalWeight = blueprint.reduce((acc, curr) => acc + (curr.enabled ? parseFloat(curr.weight_pct) : 0), 0);
  const isWeightInvalid = Math.abs(totalWeight - 100) > 0.01;

  const handleUpdateBlueprint = (newBlueprint) => {
    setBlueprint(newBlueprint);
    setForm(f => ({ ...f, assessment_blueprint: newBlueprint }));
  };

  const handleUpdatePractical = (val) => {
    setHasPractical(val);
    setForm(f => ({ ...f, has_practical: val }));
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Course Code and Name */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
        <Field label="Course Code">
          <Input
            value={form.course_code || ''}
            onChange={e => setForm(f => ({ ...f, course_code: e.target.value }))}
            placeholder="e.g. ANAT-101"
            maxLength={20}
          />
        </Field>
        <Field label="Course name">
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Anatomy I"
            required
            autoFocus
          />
        </Field>
      </div>

      {/* Description */}
      <Field label="Description (optional)">
        <textarea
          style={{
            width: '100%', padding: '10px 12px', background: 'var(--bg-raised)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            color: 'var(--text-primary)', outline: 'none', minHeight: 60, fontSize: 13,
            resize: 'vertical', fontFamily: 'inherit'
          }}
          value={form.description || ''}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief course description..."
        />
      </Field>

      {/* Academic Year, Semester, Credits, Passing Score */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Field label="Academic Year">
          <Select
            value={form.academic_year || ''}
            onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
          >
            <option value="">— Year —</option>
            {Array.from({ length: totalYears }, (_, i) => i + 1).map(y => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </Select>
        </Field>
        <Field label="Semester">
          <Select
            value={form.semester}
            onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
            required
          >
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
          </Select>
        </Field>
        <Field label="Credits">
          <Input
            type="number"
            step="0.5"
            value={form.credits}
            onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
            required
          />
        </Field>
        <Field label="Max Score">
          <Input
            type="number"
            step="0.1"
            value={form.max_score}
            onChange={e => setForm(f => ({ ...f, max_score: e.target.value }))}
            required
          />
        </Field>
      </div>

      {/* Passing Score + Elective checkbox */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
        <Field label="Passing Score">
          <Input
            type="number"
            step="0.1"
            value={form.passing_score}
            onChange={e => setForm(f => ({ ...f, passing_score: e.target.value }))}
            required
          />
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 0' }}>
          <input
            type="checkbox"
            checked={form.is_elective || false}
            onChange={e => setForm(f => ({ ...f, is_elective: e.target.checked }))}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Elective Course</span>
        </label>
      </div>

      {/* Faculty and Department */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Faculty">
          <Select
            value={selectedFacultyId}
            onChange={handleFacultyChange}
            required
          >
            <option value="">Select Faculty</option>
            {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>

        <Field label="Department">
          <Select
            value={form.department_id}
            onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
            disabled={!selectedFacultyId || isEdit}
            required
          >
            <option value="">Select Department</option>
            {departments
              .filter(d => !selectedFacultyId || String(d.faculty_id) === String(selectedFacultyId))
              .map(d => <option key={d.id} value={d.id}>{d.name}</option>)
            }
          </Select>
        </Field>
      </div>

      {/* Doctor and Instructor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Doctor">
          <Select
            value={form.doctor_id}
            onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
            required
          >
            <option value="">Select Doctor</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.title} {d.name}</option>)}
          </Select>
        </Field>

        <Field label="Instructor">
          <Select
            value={form.instructor_id}
            onChange={e => setForm(f => ({ ...f, instructor_id: e.target.value }))}
            required
          >
            <option value="">Select Instructor</option>
            {instructors.map(i => <option key={i.id} value={i.id}>{i.title} {i.name}</option>)}
          </Select>
        </Field>
      </div>

      {/* Course Series — Parent Course Link */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <Field label="Prerequisite (Parent Course — optional)">
          <Select
            value={form.parent_course_id || ''}
            onChange={e => setForm(f => ({ ...f, parent_course_id: e.target.value || null }))}
          >
            <option value="">— No prerequisite —</option>
            {parentOptions.map(c => (
              <option key={c.id} value={c.id}>{c.course_code ? `[${c.course_code}] ` : ''}{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Series Tier">
          <Input
            type="number"
            min="1"
            max="10"
            value={form.tier_level || 1}
            onChange={e => setForm(f => ({ ...f, tier_level: parseInt(e.target.value) || 1 }))}
          />
        </Field>
      </div>

      {/* Google Drive Link */}
      <Field label="Google Drive Link (optional)">
        <Input
          value={form.drive_link}
          onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
          placeholder="https://drive.google.com/..."
        />
      </Field>

      {/* Assessment Blueprint Configuration */}
      <BlueprintConfig 
        blueprint={blueprint} 
        setBlueprint={handleUpdateBlueprint} 
        hasPractical={hasPractical}
        setHasPractical={handleUpdatePractical}
        existingPracticals={existingPracticals}
      />

      {/* Weekly Schedule */}
      <ScheduleBuilder form={form} setForm={setForm} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
        <Btn variant="ghost" type="button" onClick={onCancel}>Cancel</Btn>
        <Btn 
          type="submit" 
          style={{ 
            minWidth: 160,
            background: isWeightInvalid ? '#ef4444' : 'var(--accent)',
            color: isWeightInvalid ? '#ffffff' : '#0b0f1a', // High contrast white for error
            opacity: isWeightInvalid ? 0.8 : 1,
            cursor: isWeightInvalid ? 'not-allowed' : 'pointer',
            border: isWeightInvalid ? '1px solid #f87171' : 'none',
            boxShadow: isWeightInvalid ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none'
          }} 
          disabled={isWeightInvalid}
        >
          {isWeightInvalid ? `Weight Error: ${totalWeight}%` : submitLabel}
        </Btn>
      </div>
    </form>
  );
};

export default CourseForm;
