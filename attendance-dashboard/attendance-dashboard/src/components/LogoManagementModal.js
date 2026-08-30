import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { Btn } from './ui';
import { Upload, X, Sidebar as SidebarIcon, LayoutPanelLeft, ShieldAlert, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';

export default function LogoManagementModal({ onClose }) {
  const { updateSystemLogo } = useAuth();
  
  // File & Source state
  const [file, setFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Editor state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const cropSize = 280;

  // Load file into source
  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target.result);
    reader.readAsDataURL(selected);
    setError('');
    // Reset editor params
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setImageLoaded(false);
  }

  // Draw canvas whenever params change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    canvas.width = cropSize * 2; // High DPI
    canvas.height = cropSize * 2;
    ctx.scale(2, 2);

    ctx.clearRect(0, 0, cropSize, cropSize);

    // Clip to circle (as per user request image)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.translate(cropSize / 2, cropSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const aspect = img.naturalWidth / img.naturalHeight;
    let drawW, drawH;
    if (aspect >= 1) {
      drawH = cropSize;
      drawW = cropSize * aspect;
    } else {
      drawW = cropSize;
      drawH = cropSize / aspect;
    }

    ctx.drawImage(
      img,
      -drawW / 2 + offset.x,
      -drawH / 2 + offset.y,
      drawW,
      drawH
    );
    ctx.restore();
  }, [zoom, rotation, offset, imageLoaded]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // Mouse handlers for dragging
  const handleMouseDown = (e) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  async function handleSave() {
    if (!canvasRef.current) {
      setError('Please select and position an image first.');
      return;
    }

    setLoading(true);
    setError('');

    canvasRef.current.toBlob(async (blob) => {
      if (!blob) {
        setLoading(false);
        setError('Failed to generate image blob');
        return;
      }

      const croppedFile = new File([blob], 'system_logo.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', croppedFile);

      try {
        const res = await api.post('/admin/system/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        updateSystemLogo(res.data.system_logo_url);
        onClose();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to update system logo');
      } finally {
        setLoading(false);
      }
    }, 'image/png', 0.95);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{
        background: 'var(--bg-surface)', width: '100%', maxWidth: 740,
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LayoutPanelLeft size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Branding Editor</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--radius)',
              fontSize: 13, border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
            {/* Editor Area */}
            <div style={{ flexShrink: 0 }}>
              {!imageSrc ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: cropSize, height: cropSize, border: '2px dashed var(--border)', borderRadius: '50%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', background: 'rgba(0,0,0,0.2)',
                    gap: 8, color: 'var(--text-muted)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
                >
                  <Upload size={32} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Click to select logo</span>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>SVG, PNG or JPG</span>
                </div>
              ) : (
                <div style={{ position: 'relative', width: cropSize, height: cropSize }}>
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    style={{
                      width: cropSize, height: cropSize, borderRadius: '50%',
                      cursor: dragging ? 'grabbing' : 'grab',
                      border: '3px solid rgba(245, 158, 11, 0.3)',
                      boxShadow: '0 0 40px rgba(0,0,0,0.4)',
                      background: '#fff'
                    }}
                  />
                  {/* Guide overlay */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>

            {/* Mirrors Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mirror Previews</div>
              
              {/* Sidebar Mirror */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                  <SidebarIcon size={14} /> Sidebar View
                </div>
                <div style={{
                  background: '#0f1520', padding: '12px 16px', borderRadius: 12, 
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: '#fff', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a3f5f'
                  }}>
                    <MirrorCanvas source={canvasRef} size={36} radius={10} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f4fa' }}>Attendance</div>
                    <div style={{ fontSize: 9, color: '#5a7194', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Smart System</div>
                  </div>
                </div>
              </div>

              {/* Login Mirror */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>
                  <LayoutPanelLeft size={14} /> Login Header View
                </div>
                <div style={{
                  background: '#080c14', padding: '16px 24px', borderRadius: 12, 
                  border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, background: '#fff', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #2a3f5f'
                  }}>
                    <MirrorCanvas source={canvasRef} size={52} radius={14} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Smart Attendance</div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, width: '100%',
            background: 'rgba(255,255,255,0.03)', padding: '16px 24px',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
            opacity: imageSrc ? 1 : 0.4, pointerEvents: imageSrc ? 'auto' : 'none'
          }}>
            <ZoomOut size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="range" min="0.5" max="3" step="0.01"
              value={zoom} onChange={e => setZoom(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <ZoomIn size={16} style={{ color: 'var(--text-muted)' }} />

            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

            <button
              onClick={() => setRotation(r => r + 90)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)',
                color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <RotateCw size={14} /> Rotate
            </button>

            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'flex-end', gap: 12,
          background: 'rgba(0,0,0,0.2)'
        }}>
          <Btn variant="ghost" onClick={onClose} style={{ color: 'var(--text-muted)' }}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={loading}>{loading ? 'Applying Changes...' : 'Save System Logo'}</Btn>
        </div>
      </div>

      {/* Hidden image loader */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt=""
        style={{ display: 'none' }}
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}

function MirrorCanvas({ source, size, radius }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationId;
    const draw = () => {
      const canvas = canvasRef.current;
      const srcCanvas = source.current;
      if (canvas && srcCanvas) {
        const ctx = canvas.getContext('2d');
        // Set display size
        canvas.width = size * 2;
        canvas.height = size * 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the entire source canvas onto the mirror canvas, scaled
        ctx.drawImage(
          srcCanvas, 
          0, 0, srcCanvas.width, srcCanvas.height, 
          0, 0, canvas.width, canvas.height
        );
      }
      animationId = requestAnimationFrame(draw);
    };
    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [source, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: radius, display: 'block' }} />;
}
