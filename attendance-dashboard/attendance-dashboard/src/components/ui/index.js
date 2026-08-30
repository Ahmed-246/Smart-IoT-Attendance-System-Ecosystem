import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Search, ChevronDown, X, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';

/* ── Card ──────────────────────────────────────────────────── */
export function Card({ children, style, className = '', ...props }) {
  return (
    <div className={`app-card ${className}`} style={style} {...props}>
      {children}
      <style>{`
        .app-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px 24px;
          transition: border-color 0.2s ease;
        }
      `}</style>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────── */
export function StatCard({ label, value, icon, sub, color = 'var(--accent)', highlight, onClick, style }) {
  const isClickable = !!onClick;
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${highlight ? color : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isClickable ? 'pointer' : 'default',
        boxShadow: highlight ? `0 0 20px -10px ${color}` : 'none',
        ...style
      }}
      onMouseEnter={e => {
        if (isClickable) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.background = 'var(--bg-raised)';
          e.currentTarget.style.boxShadow = `0 10px 30px -10px ${color}80`;
        }
      }}
      onMouseLeave={e => {
        if (isClickable) {
          e.currentTarget.style.borderColor = highlight ? color : 'var(--border)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.background = 'var(--bg-surface)';
          e.currentTarget.style.boxShadow = highlight ? `0 0 20px -10px ${color}` : 'none';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 }}>
          {label}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isClickable && <ExternalLink size={12} style={{ color, opacity: 0.4 }} />}
          {icon && <div style={{ color, opacity: 0.8 }}>{icon}</div>}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 32, fontFamily: 'var(--font-mono)', fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>
          {value}
        </div>
        {sub && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────── */
export function Badge({ children, color = 'default', style, onClick, ...props }) {
  const colors = {
    default: { bg: 'var(--bg-raised)', text: 'var(--text-secondary)' },
    green:   { bg: 'var(--green-dim)', text: 'var(--green)' },
    red:     { bg: 'var(--red-dim)',   text: 'var(--red)' },
    accent:  { bg: 'var(--accent-dim)', text: 'var(--accent)' },
    amber:   { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24' },
    blue:    { bg: 'var(--blue-dim)', text: 'var(--blue)' },
    yellow:  { bg: 'var(--yellow-dim)', text: 'var(--yellow)' },
    purple:  { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' },
  };
  const c = colors[color] || colors.default;
  const isClickable = !!onClick;

  return (
    <span 
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 12px', borderRadius: 20,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
        background: c.bg, color: c.text, border: c.border || '1px solid transparent',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      onMouseEnter={e => {
        if (isClickable) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.filter = 'brightness(1.2)';
          if (color === 'purple' || color === 'default') {
             e.currentTarget.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.3)';
          }
        }
      }}
      onMouseLeave={e => {
        if (isClickable) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.filter = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      {...props}
    >
      {children}
    </span>
  );
}

/* ── Button ──────────────────────────────────────────────────── */
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style, type = 'button' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 6,
    borderRadius: 'var(--radius)', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1, transition: 'all 0.2s ease', border: '1px solid transparent',
    fontSize: size === 'sm' ? 12 : 14,
    padding: size === 'sm' ? '6px 14px' : '9px 18px',
    filter: disabled ? 'brightness(0.6)' : 'none',
  };
  const variants = {
    primary:  { background: 'var(--accent)',      color: '#0b0f1a', borderColor: 'var(--accent)' },
    accent:   { background: 'var(--accent-dim)',  color: 'var(--accent)', borderColor: 'var(--accent)' },
    solid:    { background: 'var(--green)',       color: '#0b0f1a', borderColor: 'var(--green)' },
    ghost:    { background: 'transparent',         color: 'var(--text-secondary)', borderColor: 'var(--border)' },
    danger:   { background: 'var(--red-dim)',      color: 'var(--red)',   borderColor: 'var(--red-dim)' },
    success:  { background: 'var(--green-dim)',    color: 'var(--green)', borderColor: 'var(--green-dim)' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {children}
    </button>
  );
}

/* ── Table ──────────────────────────────────────────────────── */
export function Table({ columns, rows, emptyText = 'No data', maxHeight = '650px' }) {
  if (!rows.length) return <EmptyState text={emptyText} />;
  return (
    <div className="custom-scrollbar" style={{ 
      maxHeight, 
      overflowY: 'auto', 
      overflowX: 'auto',
      position: 'relative',
      borderRadius: 'inherit'
    }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 500 }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                position: 'sticky', top: 0, zIndex: 10,
                textAlign: 'left', padding: '12px 16px',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--text-muted)', textTransform: 'uppercase',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-surface)',
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {columns.map(c => (
                <td key={c.key} style={{ 
                  padding: '12px 16px', 
                  color: 'var(--text-primary)', 
                  fontSize: 13,
                  borderBottom: '1px solid var(--border)'
                }}>
                  {c.render ? c.render(row[c.key], row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────── */
export function Modal({ title, children, onClose, width = 520 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px',
        width, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} style={{
            color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer',
            background: 'none', border: 'none', lineHeight: 1,
            width: 32, height: 32, borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-raised)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Confirm Modal ────────────────────────────────────────── */
export function ConfirmModal({ title, message, onConfirm, onCancel, variant = 'danger', confirmText = 'Confirm' }) {
  const icons = {
    danger:  <AlertTriangle color="var(--red)" size={32} />,
    success: <CheckCircle color="var(--green)" size={32} />,
    info:    <Info color="var(--blue)" size={32} />
  };
  const colors = {
    danger:  { btn: 'danger', iconBg: 'var(--red-dim)', border: 'rgba(239, 68, 68, 0.2)' },
    success: { btn: 'success', iconBg: 'var(--green-dim)', border: 'rgba(16, 185, 129, 0.2)' },
    info:    { btn: 'primary', iconBg: 'var(--blue-dim)', border: 'rgba(59, 130, 246, 0.2)' }
  };
  
  const c = colors[variant] || colors.info;
  const icon = icons[variant] || icons.info;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={onCancel}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '40px 32px',
        width: 380, maxWidth: '90vw', textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'success-scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 64, height: 64, borderRadius: '20%', background: c.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', border: `1px solid ${c.border}`,
          transform: 'rotate(-5deg)'
        }}>
          {icon}
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Btn variant="ghost" onClick={onCancel} style={{ flex: 1, padding: '12px 0', border: '1px solid var(--border)' }}>Cancel</Btn>
          <Btn variant={c.btn} onClick={onConfirm} style={{ flex: 1, padding: '12px 0' }}>{confirmText}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ── Form field ──────────────────────────────────────────────── */
export function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

export const formatPhoneNumber = (val) => {
  if (!val) return '';
  const clean = val.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
};

export function Input({ value, onChange, placeholder, type = 'text', required, style, ...props }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      {...props}
      style={{
        background: 'var(--bg-raised)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 14px',
        color: 'var(--text-primary)', fontSize: 14, outline: 'none',
        width: '100%', transition: 'border-color 0.2s, box-shadow 0.2s',
        ...style
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

export function PhoneInput({ value, onChange, placeholder = '01X YYYY ZZZZ', required, style, ...props }) {
  const handleChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    // Call parent onChange with a mock event object or just the value
    // Most our components expect (e) => setVal(e.target.value)
    onChange({ target: { value: formatted } });
  };

  return (
    <Input 
      type="tel" 
      value={value} 
      onChange={handleChange} 
      placeholder={placeholder} 
      required={required} 
      maxLength={13} // 11 digits + 2 spaces
      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', ...style }}
      {...props}
    />
  );
}

export function PasswordInput({ value, onChange, placeholder, required, style }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ paddingRight: 40, ...style }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 4,
          color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', opacity: 0.8,
          transition: 'all 0.15s', zIndex: 1
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <style>{`
        /* Hide browser-default password reveal button */
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }
        input::-webkit-contacts-auto-fill-button {
          visibility: hidden;
          display: none !important;
          pointer-events: none;
          position: absolute;
          right: 0;
        }
      `}</style>
    </div>
  );
}

export function Select({ value, onChange, children, style, ...props }) {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select value={value} onChange={onChange} {...props}
        style={{
          background: 'var(--bg-raised)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '10px 36px 10px 14px',
          color: 'var(--text-primary)', fontSize: 14, outline: 'none', width: '100%',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a7c6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          ...style,
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
      >
        {children}
      </select>
    </div>
  );
}

/* ── Fancy Select (Premium) ────────────────────────────────── */
export function FancySelect({ 
  options = [], 
  value, 
  onSelect, 
  placeholder = 'Select...', 
  style, 
  disabled = false,
  searchPlaceholder = 'Search items...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const scrollRef = useRef(null);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      setIsFlipped(false);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filtered.length) {
          onSelect(filtered[selectedIndex].value);
          setIsOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      const el = scrollRef.current.children[selectedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div 
      className="fancy-select-container" 
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      style={{ position: 'relative', width: '100%', outline: 'none', ...style }}
    >
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-raised)',
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOpen ? '0 0 0 3px var(--accent-glow)' : 'none',
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            opacity: 0.6
          }} 
        />
      </div>

      {isOpen && (
        <div 
          ref={menuRef}
          className="fancy-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '320px',
            background: 'rgba(23, 22, 26, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden',
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {options.length > 5 && (
            <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input 
                autoFocus
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ 
                  background: 'none', border: 'none', outline: 'none', 
                  color: 'var(--text-primary)', fontSize: 13, width: '100%' 
                }}
              />
              {query && <X size={14} onClick={() => setQuery('')} style={{ cursor: 'pointer', opacity: 0.5 }} />}
            </div>
          )}

          <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, padding: 4 }} className="custom-scrollbar">
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No results found
              </div>
            ) : (
              filtered.map((option, index) => (
                <div 
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    background: (selectedIndex === index || String(option.value) === String(value)) ? 'var(--accent-dim)' : 'transparent',
                    color: (selectedIndex === index || String(option.value) === String(value)) ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: (selectedIndex === index || String(option.value) === String(value)) ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                  className="fancy-option"
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDownOut { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--accent); }
      `}</style>
    </div>
  );
}

export const SearchableSelect = FancySelect;

/* ── Spinner ──────────────────────────────────────────────────── */
export function Spinner({ size = 24 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
      <Spinner size={32} />
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────── */
export function EmptyState({ text = 'Nothing here yet', icon = '○' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 10, padding: '48px 24px', color: 'var(--text-muted)',
    }}>
      <span style={{ fontSize: 32, opacity: 0.3 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

/* ── Progress bar ───────────────────────────────────────────── */
export function ProgressBar({ value, max = 100, color = 'var(--accent)' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--accent)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: barColor, minWidth: 36, fontWeight: 600 }}>{pct}%</span>
    </div>
  );
}

/* ── Toast notification ─────────────────────────────────────── */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  
  const formatMsg = (msg) => {
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) {
      // Handle Pydantic validation errors: [{"loc":..., "msg":...}]
      return msg.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
    }
    if (typeof msg === 'object' && msg !== null) {
      return JSON.stringify(msg);
    }
    return String(msg);
  };

  const add = (msg, type = 'success') => {
    const id = Date.now();
    const formatted = formatMsg(msg);
    setToasts(t => [...t, { id, msg: formatted, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000); // 6s duration
  };

  const remove = (id) => setToasts(t => t.filter(x => x.id !== id));

  const ToastContainer = () => (
    <div style={{ 
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999, 
      display: 'flex', flexDirection: 'column', gap: 10,
      maxWidth: 420
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'var(--bg-surface)',
          border: `1px solid ${t.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
          borderLeft: `4px solid ${t.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
          boxShadow: 'var(--shadow-lg)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--radius)', 
          padding: '14px 18px', 
          fontSize: 13, 
          fontWeight: 400,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          animation: 'slideIn 0.3s ease-out forwards',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 700, color: t.type === 'error' ? 'var(--red)' : 'var(--green)',
              fontSize: 11, textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.05em'
            }}>
              {t.type === 'error' ? 'Error' : 'Success'}
            </div>
            {t.msg}
          </div>
          <button 
            onClick={() => remove(t.id)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 2, fontSize: 16,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
  return { toast: add, ToastContainer };
}

/* ── Tooltip (Portal-based — never clipped by overflow) ──── */
export function Tooltip({ children, content, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top, left;
    if (position === 'top') {
      top = rect.top + scrollY - 10;
      left = rect.left + scrollX + rect.width / 2;
    } else if (position === 'bottom') {
      top = rect.bottom + scrollY + 10;
      left = rect.left + scrollX + rect.width / 2;
    } else if (position === 'left') {
      top = rect.top + scrollY + rect.height / 2;
      left = rect.left + scrollX - 10;
    } else {
      top = rect.top + scrollY + rect.height / 2;
      left = rect.right + scrollX + 10;
    }
    setCoords({ top, left });
  }, [position]);

  const handleEnter = () => { updatePosition(); setVisible(true); };
  const handleLeave = () => setVisible(false);

  const transformOrigin = {
    top: 'center bottom',
    bottom: 'center top',
    left: 'right center',
    right: 'left center',
  };
  const translate = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  const arrowStyle = {
    position: 'absolute',
    width: 8, height: 8,
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid var(--border)',
    transform: 'rotate(45deg)',
    ...(position === 'top' ? { bottom: -5, left: 'calc(50% - 4px)', borderTop: 'none', borderLeft: 'none' } : {}),
    ...(position === 'bottom' ? { top: -5, left: 'calc(50% - 4px)', borderBottom: 'none', borderRight: 'none' } : {}),
    ...(position === 'left' ? { right: -5, top: 'calc(50% - 4px)', borderBottom: 'none', borderLeft: 'none' } : {}),
    ...(position === 'right' ? { left: -5, top: 'calc(50% - 4px)', borderTop: 'none', borderRight: 'none' } : {}),
  };

  return (
    <>
      <div
        ref={triggerRef}
        style={{ display: 'inline-flex' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </div>
      {visible && content && createPortal(
        <div style={{
          position: 'absolute',
          zIndex: 99999,
          top: coords.top,
          left: coords.left,
          transform: translate[position],
          transformOrigin: transformOrigin[position],
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-primary)',
          fontSize: 12,
          minWidth: 180,
          pointerEvents: 'none',
          animation: 'tooltipPortalIn 0.15s ease-out forwards',
          textAlign: 'left',
          lineHeight: 1.5,
          whiteSpace: 'normal',
          width: 'max-content',
          maxWidth: '280px',
        }}>
          {content}
          <div style={arrowStyle} />
          <style>{`
            @keyframes tooltipPortalIn {
              from { opacity: 0; transform: ${translate[position]} scale(0.95); }
              to   { opacity: 1; transform: ${translate[position]} scale(1); }
            }
          `}</style>
        </div>,
        document.body
      )}
    </>
  );
}
