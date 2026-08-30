import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Btn, Field, Input, PasswordInput } from '../components/ui';
import { CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    let timer;
    if (step === 3) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else {
        onClose();
      }
    }
    return () => clearTimeout(timer);
  }, [step, countdown, onClose]);

  async function handleSendSms(e) {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      const res = await fetch('/api/auth/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Request failed';
        if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail));
        }
        throw new Error(msg);
      }
      // OFFLINE POPUP LOGIC: Show the reset token to the user
      if (data.debug_token) {
        alert(`RESET CODE: ${data.debug_token}\n\nPlease copy this code and enter it in the next step.`);
      }
      
      setMessage(data.message);
      setStep(2);
    } catch(err) {
      console.error("Password Forgot Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, token, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        let msg = 'Reset failed';
        if (data.detail) {
          msg = typeof data.detail === 'string' ? data.detail : (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail));
        }
        throw new Error(msg);
      }
      setStep(3);
    } catch(err) {
      console.error("Password Reset Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--bg-surface)', width: 400, borderRadius: 'var(--radius-lg)', padding: '24px', border: '1px solid var(--border)'
      }}>
        <h3 style={{marginTop: 0, marginBottom: 16}}>Reset Password</h3>
        
        {error && (
          <div style={{padding: '12px', background: 'var(--red-dim)', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13, border: '1px solid var(--red-dim)', whiteSpace: 'pre-wrap'}}>
            {error.includes('Note:') ? (
              <>
                <div style={{ color: 'var(--red)', fontWeight: 500 }}>{error.split('Note:')[0]}</div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', color: 'var(--accent)', fontWeight: 600 }}>
                  <span style={{ textDecoration: 'underline' }}>Note:</span> {error.split('Note:')[1]}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--red)' }}>{error}</div>
            )}
          </div>
        )}
        {message && <div style={{padding: '8px 12px', background: 'var(--green-dim)', color: 'var(--green)', marginBottom: 16, fontSize: 13, borderRadius: 4, whiteSpace: 'pre-wrap'}}>{message}</div>}
        
        {step === 1 && (
          <form onSubmit={handleSendSms}>
            <Field label="Registered Phone Number">
              <Input 
                value={phone} 
                onChange={e => setPhone(e.target.value.replace(/\s+/g, '').replace(/\D/g, ''))} 
                placeholder="01012345678" 
                maxLength={11}
                required 
              />
            </Field>
            <div style={{display: 'flex', gap: 12, marginTop: 24}}>
              <Btn type="button" variant="ghost" onClick={onClose} style={{flex: 1, color: 'var(--text-muted)'}}>Cancel</Btn>
              <Btn type="submit" style={{flex: 1}} disabled={loading}>{loading ? 'Sending...' : 'Send SMS'}</Btn>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset}>
            <p style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>Enter the 8-character token sent to your phone (check the backend console).</p>
            <Field label="SMS Token">
              <Input value={token} onChange={e => setToken(e.target.value)} placeholder="8-char token" maxLength={8} required />
            </Field>
            <Field label="New Password">
              <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </Field>
            <div style={{display: 'flex', gap: 12, marginTop: 24}}>
              <Btn type="button" variant="ghost" onClick={onClose} style={{flex: 1, color: 'var(--text-muted)'}}>Cancel</Btn>
              <Btn type="submit" style={{flex: 1}} disabled={loading}>{loading ? 'Resetting...' : 'Confirm Reset'}</Btn>
            </div>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <style>{`
              @keyframes scaleIn {
                0% { transform: scale(0); opacity: 0; }
                60% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
              }
              .success-animate {
                animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
              }
            `}</style>
            
            <div className="success-animate" style={{ marginBottom: 20 }}>
              <CheckCircle size={64} style={{ color: 'var(--green)', margin: '0 auto' }} />
            </div>
            
            <h3 style={{ fontSize: 20, marginBottom: 12, color: 'var(--text-strong)' }}>Password Updated!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Your password has been reset successfully.<br />
              You can now log in with your new credentials.
            </p>
            
            <div style={{ padding: '12px', background: 'var(--bg-raised)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-muted)' }}>
              Redirecting to login in <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{countdown}s</span>...
            </div>
            
            <Btn style={{ width: '100%', marginTop: 24 }} onClick={onClose}>
              Back to Login
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}


export default function LoginPage() {
  const { login, token } = useAuth();
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (token) navigate('/dashboard');
  }, [token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
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

      <div style={{ position: 'relative', zIndex: 1, width: 380 }} className="fade-in">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#fff', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: '1px solid var(--border)',
          }}>
             <img 
              src={useAuth().systemLogo?.startsWith('http') ? useAuth().systemLogo : `${useAuth().systemLogo}`} 
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = '/logo.jpg'; }}
            />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Smart Attendance</h1>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px 28px',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Email">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
            </Field>
            <div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                 <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-strong)', marginBottom: 6, display: 'block' }}>Password</label>
                 <span onClick={() => setShowForgot(true)} style={{fontSize: 12, color: 'var(--accent)', cursor: 'pointer'}}>Forgot Password?</span>
              </div>
              <PasswordInput 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                required 
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius)',
                background: 'var(--red-dim)', color: 'var(--red)',
                fontSize: 13, border: '1px solid var(--red-dim)',
              }}>{error}</div>
            )}

            <Btn type="submit" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Btn>
          </form>


          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }} className="hover-link">
              Sign up here
            </Link>
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
}
