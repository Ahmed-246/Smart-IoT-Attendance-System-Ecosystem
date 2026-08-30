import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Btn, Field, Input, PasswordInput, PhoneInput, Select, Modal } from '../components/ui';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [errorFields, setErrorFields] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [academicYear, setAcademicYear] = useState('1');
  
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [idCardFile, setIdCardFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [regResult, setRegResult] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIdCardFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Hook imports are at the top
  
  useEffect(() => {
    fetch('/api/faculties/')
      .then(r => r.json())
      .then(data => {
        setFaculties(data);
        if(data.length > 0) setFacultyId(data[0].id.toString());
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (facultyId) {
      fetch(`/api/departments/?faculty_id=${facultyId}`)
        .then(r => r.json())
        .then(data => {
          setDepartments(data);
          if(data.length > 0) setDepartmentId(data[0].id.toString());
        })
        .catch(console.error);
    } else {
      setDepartments([]);
    }
  }, [facultyId]);

  // Helper to extract clean error message
  const extractError = (data, defaultMsg) => {
    if (!data.detail) return defaultMsg;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail)) {
      const err = data.detail[0];
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      if (field && field !== 'body') {
        setErrorFields(data.detail.map(e => e.loc[e.loc.length - 1]));
        return `${field.replace('_', ' ')}: ${err.msg}`;
      }
      return err.msg;
    }
    return JSON.stringify(data.detail);
  };

  // Submit Step 1: Send Token to Email
  async function handleInitSearch(e) {
    e.preventDefault();
    setLoading(true); setError(''); setErrorFields([]);
    try {
      const res = await fetch('/api/auth/register/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Email already exists'));
      
      // OFFLINE POPUP LOGIC: Show the token to the user
      if (data.debug_token) {
        setVerificationCode(data.debug_token);
        setShowCodeModal(true);
      }
      
      setStep(2);
    } catch(err) {
      console.error("Register Init Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Submit Step 2: Verify Token
  async function handleVerifyToken(e) {
    e.preventDefault();
    setLoading(true); setError(''); setErrorFields([]);
    try {
      const res = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: email, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Invalid token'));
      setStep(3);
    } catch(err) {
      console.error("Token Verify Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  // Submit Step 3: Complete Registration
  async function handleCompleteRegistration(e) {
    e.preventDefault();
    if (!idCardFile) return setError("Please upload your University ID Card");

    const validatePhone = (num) => {
      const clean = num.replace(/\s+/g, '');
      return clean.length === 11 && ['010', '011', '012', '015'].some(p => clean.startsWith(p));
    };

    if (!validatePhone(phone)) {
      return setError("Invalid phone number. Must be 11 digits and start with 010, 011, 012, or 015.");
    }
    
    setLoading(true); setError(''); setErrorFields([]);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('phone_number', phone.replace(/\s+/g, ''));
      formData.append('university_id', universityId);
      formData.append('faculty_id', facultyId);
      formData.append('department_id', departmentId);
      formData.append('academic_year', academicYear);
      formData.append('id_card', idCardFile);

      const res = await fetch('/api/auth/register/complete', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(extractError(data, 'Registration failed'));
      
      setRegResult(data);
      // Redirect after 4 seconds to let them see the success animation
      setTimeout(() => navigate('/login'), 4500);
    } catch(err) {
      console.error("Register Complete Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (regResult) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', padding: '20px'
      }}>
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          style={{
            position: 'fixed', inset: 0, width: '100vw', height: '100vh',
            objectFit: 'cover', zIndex: 0, filter: 'blur(3px) brightness(0.4)',
            pointerEvents: 'none' /* Prevents IDM/Download extensions from showing overlays */
          }}
        >
          <source src="/bg-video.mp4" type="video/mp4" />
        </video>

        <div style={{ textAlign: 'center', width: 440, position: 'relative', zIndex: 1 }} className="animate-success">
          <div style={{ 
            width: 100, height: 100, background: 'var(--green-dim)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px',
            border: '2px solid var(--green)', boxShadow: '0 0 40px var(--green-dim)',
            position: 'relative'
          }}>
            <svg style={{ width: 48, height: 48, color: 'var(--green)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" className="checkmark-draw" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>
            {regResult.status === 'APPROVED' ? 'Account Active!' : 'Request Received'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 36, lineHeight: 1.6 }}>
            {regResult.status === 'APPROVED' 
              ? "Your details matched our records and your account has been automatically approved. You can log in immediately."
              : "Your registration is pending review by the administration. You will be notified once your account is activated."}
            <br/><br/>
            Current Status: <strong style={{ color: regResult.status === 'APPROVED' ? 'var(--green)' : 'var(--accent)' }}>{regResult.status}</strong>
          </p>
          <div style={{ 
            padding: '16px 24px', background: 'var(--bg-raised)', borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            <div className="spin" style={{ width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }} />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Redirecting to Login...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: '20px'
    }}>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'fixed', inset: 0, width: '100vw', height: '100vh',
          objectFit: 'cover', zIndex: 0, filter: 'blur(3px) brightness(0.4)',
          pointerEvents: 'none' /* Prevents IDM/Download extensions from showing overlays */
        }}
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>

      <div style={{ position: 'relative', zIndex: 1, width: 440 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
           <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Student Onboarding</h1>
           <div style={{display: 'flex', gap: 6, justifyContent: 'center'}}>
              <div style={{flex: 1, height: 4, background: step >= 1 ? 'var(--accent)' : 'var(--bg-raised)', borderRadius: 2}}/>
              <div style={{flex: 1, height: 4, background: step >= 2 ? 'var(--accent)' : 'var(--bg-raised)', borderRadius: 2}}/>
              <div style={{flex: 1, height: 4, background: step >= 3 ? 'var(--accent)' : 'var(--bg-raised)', borderRadius: 2}}/>
           </div>
           <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
             {step === 1 && "Basic Information"}
             {step === 2 && "Email Verification"}
             {step === 3 && "ID Card & Details"}
           </p>
        </div>

        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 28px',
        }}>
          
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleInitSearch} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Full Name">
                <Input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Mona El-Said" 
                  required 
                  style={errorFields.includes('name') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                />
              </Field>
              <Field label="Email Address">
                <Input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="student@university.edu" 
                  required 
                  style={errorFields.includes('email') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                />
              </Field>
              <Btn type="submit" disabled={loading}>{loading ? 'Checking...' : 'Continue'}</Btn>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyToken} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{fontSize: 14, color: 'var(--text-muted)'}}>We sent an 8-character token to <strong>{email}</strong>. (Check Backend Server Console)</p>
              <Field label="Verification Token">
                <Input value={token} onChange={e => setToken(e.target.value)} placeholder="8-char token" maxLength={8} required style={{textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center'}} />
              </Field>
              <Btn type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Token'}</Btn>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleCompleteRegistration} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{display: 'flex', gap: 14}}>
                 <Field label="University ID" style={{flex: 1}}>
                    <Input 
                      value={universityId} 
                      onChange={e => setUniversityId(e.target.value)} 
                      placeholder="2025001" 
                      required 
                      style={errorFields.includes('university_id') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                    />
                 </Field>
                 <Field label="Phone" style={{flex: 1}}>
                    <PhoneInput 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      required 
                      style={errorFields.includes('phone_number') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                    />
                 </Field>
              </div>

              <Field label="College/Faculty">
                  <Select 
                    value={facultyId} 
                    onChange={e => setFacultyId(e.target.value)} 
                    required
                    style={errorFields.includes('faculty_id') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                  >
                    {Array.isArray(faculties) && faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </Select>
               </Field>
               <Field label="Department/Major">
                  <Select 
                    value={departmentId} 
                    onChange={e => setDepartmentId(e.target.value)} 
                    required
                    style={errorFields.includes('department_id') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                  >
                    {Array.isArray(departments) && departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
               </Field>
               <Field label="Academic Year (Level)">
                  <Select 
                    value={academicYear} 
                    onChange={e => setAcademicYear(e.target.value)} 
                    required
                    style={errorFields.includes('academic_year') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                  >
                    {[1,2,3,4,5,6,7].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </Select>
               </Field>
               
               <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 12 }}>Upload Student ID Card (Required)</p>

              <Field label="Password">
                <PasswordInput 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  style={errorFields.includes('password') ? { borderColor: 'var(--red)', boxShadow: '0 0 0 1px var(--red)' } : {}}
                />
              </Field>
              
              <Field label="Upload ID Card Photo">
                <label style={{
                   border: '2px dashed var(--border)', borderRadius: 'var(--radius)', 
                   minHeight: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                   background: 'var(--bg-raised)', cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'all 0.2s'
                }}>
                   <input type="file" required accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                   
                   {preview ? (
                      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                         <img src={preview} alt="ID Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.3s'
                         }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <div style={{ background: 'var(--accent)', color: '#0b0f1a', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                               Change Photo
                            </div>
                         </div>
                      </div>
                   ) : (
                      <div style={{ padding: 20, textAlign: 'center' }}>
                         <svg style={{width: 32, height: 32, color: 'var(--text-muted)', marginBottom: 8}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="10.5" r="2.5"></circle>
                            <path d="M21 15l-4.5-4.5a2 2 0 0 0-2.828 0L3 20"></path>
                         </svg>
                         <p style={{fontSize: 13, fontWeight: 500, color: 'var(--text-strong)', marginBottom: 4}}>Tap to upload ID photo</p>
                         <p style={{fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, margin: '0 auto'}}>
                           Ensure the card is well-lit and clearly visible for auto-approval.
                         </p>
                      </div>
                   )}
                </label>
              </Field>

              <Btn type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Complete Onboarding'}</Btn>
            </form>
          )}

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Already have an account? <Link to="/login" style={{color: 'var(--accent)', textDecoration:'none', fontWeight: 500}}>Sign In here</Link>
          </div>
        </div>
      </div>

      {showCodeModal && (
        <Modal title="Verification Code" onClose={() => setShowCodeModal(false)} width={400}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
              Use the following code to verify your identity. You can copy it directly below:
            </p>
            <div style={{
              background: 'var(--bg-raised)',
              padding: '24px',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--accent)',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: 4,
              color: 'var(--accent)',
              fontFamily: 'var(--font-mono)',
              marginBottom: 24,
              cursor: 'text',
              userSelect: 'all'
            }}>
              {verificationCode}
            </div>
            <Btn style={{ width: '100%' }} onClick={() => setShowCodeModal(false)}>
              Got it, Continue
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
