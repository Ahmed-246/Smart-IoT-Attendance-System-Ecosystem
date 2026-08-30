import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const PERSONA_CONFIG = {
  super_admin: { name: 'Sovereign', color: '#EF4444', icon: '🔴' },
  admin:       { name: 'Operations', color: '#F97316', icon: '🟠' },
  doctor:      { name: 'Academic', color: '#22C55E', icon: '🟢' },
  engineer:    { name: 'Technical', color: '#3B82F6', icon: '🔵' },
  student:     { name: 'Personal', color: '#A855F7', icon: '🟣' },
};

const INITIAL_SUGGESTIONS = {
  super_admin: [
    { icon: '🛡️', label: 'System status', q: 'What is the current system status?' },
    { icon: '📜', label: 'Recent logs', q: 'Show me the recent audit logs.' },
    { icon: '👥', label: 'User count', q: 'How many users are in the system?' },
  ],
  admin: [
    { icon: '📋', label: 'Pending approvals', q: 'Are there any pending student approvals?' },
    { icon: '📊', label: 'Attendance rate', q: 'What is the overall attendance rate?' },
    { icon: '📡', label: 'Device status', q: 'What is the status of the scanners?' },
  ],
  doctor: [
    { icon: '📚', label: 'My courses', q: 'Which courses am I teaching?' },
    { icon: '💯', label: 'Student grades', q: 'How are my students performing?' },
    { icon: '📈', label: 'Attendance', q: 'Show me attendance for my courses.' },
  ],
  engineer: [
    { icon: '🧪', label: 'Active labs', q: 'How many lab sessions are running?' },
    { icon: '📡', label: 'Scanner health', q: 'Are the lab devices online?' },
    { icon: '📝', label: 'Attendance logs', q: 'Show me recent lab attendance.' },
  ],
  student: [
    { icon: '📈', label: 'My attendance', q: 'What is my attendance rate?' },
    { icon: '💯', label: 'My grades', q: 'Show me my recent grades.' },
    { icon: '📚', label: 'My schedule', q: 'What is my course schedule?' },
  ]
};

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: '#a855f7',
          animation: 'bounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  );
}

function MessageBubble({ msg, persona }) {
  const isAi = msg.role === 'ai';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isAi ? 'flex-start' : 'flex-end',
      alignItems: 'flex-end',
      gap: 10,
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      {isAi && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: persona.color || '#7c3aed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, boxShadow: `0 0 12px ${persona.color}44`,
        }}>{persona.icon || '✦'}</div>
      )}
      <div style={{
        maxWidth: 580, padding: '12px 16px',
        borderRadius: isAi ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAi
          ? msg.error ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.12)'
          : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
        color: isAi
          ? msg.error ? '#f87171' : '#e2e8f0'
          : '#ffffff',
        border: isAi
          ? msg.error ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(168,85,247,0.25)'
          : 'none',
        fontSize: 14, lineHeight: 1.7,
        boxShadow: isAi ? 'none' : '0 4px 20px rgba(109,40,217,0.35)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.loading ? <TypingDots /> : msg.text}
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const { role } = useAuth();
  const persona = PERSONA_CONFIG[role] || PERSONA_CONFIG.student;
  
  const [messages, setMessages] = useState([{
    id: 0, role: 'ai',
    text: `Hello! I'm ARIA — your ${persona.name} AI Assistant ${persona.icon}\n\nHow can I help you today?`,
  }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [suggestions, setSuggestions] = useState(INITIAL_SUGGESTIONS[role] || INITIAL_SUGGESTIONS.student);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(question) {
    const q = (question || input).trim();
    if (!q || thinking || sessionExpired) return;
    setInput('');
    inputRef.current?.focus();
    
    setMessages(m => [...m, { id: Date.now(), role: 'user', text: q }, { id: Date.now() + 1, role: 'ai', text: '', loading: true }]);
    setThinking(true);
    
    try {
      const res = await aiApi.query(q, messageCount);
      const data = res.data;
      
      setMessages(m => [...m.slice(0, -1), { id: Date.now() + 2, role: 'ai', text: data.answer }]);
      setMessageCount(prev => prev + 1);
      
      if (data.session_expired) {
        setSessionExpired(true);
      }
      
      if (data.suggestions) {
        setSuggestions(data.suggestions.map(s => ({ icon: '💡', label: s.replace('Did you mean: ', '').replace('?', ''), q: s.replace('Did you mean: ', '').replace('?', '') })));
      } else {
        setSuggestions(INITIAL_SUGGESTIONS[role] || INITIAL_SUGGESTIONS.student);
      }
      
    } catch (err) {
      setMessages(m => [...m.slice(0, -1), { id: Date.now() + 2, role: 'ai', text: 'Connection error. Please try again.', error: true }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .suggestion-chip:hover { background: rgba(168,85,247,0.15) !important; border-color: rgba(168,85,247,0.5) !important; }
      `}</style>

      <div style={{ display: 'flex', height: 'calc(100vh - 56px)', gap: 0, overflow: 'hidden', padding: 20 }}>
        
        {/* Sidebar */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 20 }}>
          <div style={{
            background: 'rgba(30, 16, 48, 0.6)',
            border: `1px solid ${persona.color}44`,
            borderRadius: 16, padding: 24, textAlign: 'center'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16, margin: '0 auto 16px',
              background: persona.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, color: '#fff'
            }}>{persona.icon}</div>
            <h2 style={{ fontSize: 18, color: '#fff', marginBottom: 4 }}>ARIA v2</h2>
            <p style={{ fontSize: 12, color: persona.color }}>{persona.name} Engine</p>
            <div style={{ marginTop: 16, fontSize: 11, color: '#8b5cf6' }}>Built-in Intelligence</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', marginBottom: 12 }}>Suggestions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((s, idx) => (
                <button key={idx} className="suggestion-chip" onClick={() => send(s.q)} disabled={sessionExpired}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.1)',
                    color: '#c4b5fd', fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: '0.2s'
                  }}>
                  <span>{s.icon}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.2)', fontSize: 12, color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Session Progress</span>
              <span>{messageCount}/10</span>
            </div>
            <div style={{ height: 4, background: '#1f2937', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.min(100, messageCount * 10)}%`, background: persona.color, borderRadius: 2, transition: '0.3s' }} />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(17, 24, 39, 0.4)', borderRadius: 20, border: '1px solid rgba(124,58,237,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: 20, borderBottom: '1px solid rgba(124,58,237,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#e9d5ff' }}>ARIA — {persona.name} Persona Active</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} persona={persona} />)}
            <div ref={bottomRef} />
          </div>

          {sessionExpired && (
            <div style={{ padding: '0 20px', marginBottom: 10 }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>⏱️</div>
                <div style={{ fontSize: 14, color: '#fca5a5', fontWeight: 600 }}>Session Complete</div>
                <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>You've reached the 10-message limit.</div>
                <button 
                  onClick={() => {
                    setMessageCount(0);
                    setSessionExpired(false);
                    setMessages([{
                      id: Date.now(), role: 'ai',
                      text: `Session reset! How can I help you now?`,
                    }]);
                  }}
                  style={{
                    marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#ef4444', color: '#fff',
                    border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600
                  }}
                >Start New Session</button>
              </div>
            </div>
          )}

          <div style={{ padding: 20, paddingTop: 0 }}>
            <div style={{
              display: 'flex', gap: 12, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 16, padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={sessionExpired ? "Session expired..." : "Ask me anything..."}
                disabled={thinking || sessionExpired}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || thinking || sessionExpired}
                style={{
                  background: persona.color, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: '0.2s'
                }}>
                {thinking ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
