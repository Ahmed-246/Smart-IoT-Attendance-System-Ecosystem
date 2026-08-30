import { useState, useRef, useCallback, useEffect } from 'react';
import { Btn, Modal } from './ui';
import { useAuth } from '../context/AuthContext';
import { ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

/**
 * ImageCropModal
 * - Full-screen modal for cropping a profile image into a circle.
 * - Drag to reposition, slider to zoom, rotate button.
 * - "Mirror Preview" shows how the final result looks as a sidebar avatar.
 */
export default function ImageCropModal({ file, onConfirm, onCancel }) {
  const { name, email, role } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const cropSize = 280;
  const previewSize = 44;

  // Load the file into a data URL
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  // Draw canvas whenever params change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    canvas.width = cropSize;
    canvas.height = cropSize;

    ctx.clearRect(0, 0, cropSize, cropSize);

    // Clip to circle
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

  // Touch handlers
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const handleTouchMove = (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  // Export cropped image as blob
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], 'profile.png', { type: 'image/png' });
        onConfirm(croppedFile);
      }
    }, 'image/png', 0.92);
  };

  if (!imageSrc) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(12px)',
      zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setDragging(false)}
    >
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f172a 100%)',
        borderRadius: 20, padding: 40, border: '1px solid rgba(198, 168, 245, 0.2)',
        boxShadow: '0 32px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(198, 168, 245, 0.1)',
        maxWidth: 600, width: '95vw',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, marginBottom: 6 }}>
            Edit Profile Photo
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Drag to reposition • Use slider to zoom • Click rotate to turn
          </p>
        </div>

        {/* Main crop area + mirror preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          {/* Crop Area */}
          <div style={{ position: 'relative' }}>
            {/* Crosshair guides */}
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
              background: 'rgba(198, 168, 245, 0.15)', zIndex: 2, pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
              background: 'rgba(198, 168, 245, 0.15)', zIndex: 2, pointerEvents: 'none',
            }} />

            <canvas
              ref={canvasRef}
              width={cropSize}
              height={cropSize}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              style={{
                borderRadius: '50%',
                cursor: dragging ? 'grabbing' : 'grab',
                border: '3px solid rgba(198, 168, 245, 0.4)',
                boxShadow: '0 0 40px rgba(198, 168, 245, 0.15), inset 0 0 60px rgba(0,0,0,0.3)',
                display: 'block',
              }}
            />

            {/* Ring glow effect */}
            <div style={{
              position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
              borderRadius: '50%', border: '2px solid rgba(198, 168, 245, 0.1)',
              pointerEvents: 'none',
            }} />
          </div>

          {/* Mirror Preview */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              Preview
            </div>

            {/* Sidebar-like preview */}
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 12,
              padding: '16px 20px', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
              minWidth: 180,
            }}>
              <canvas
                width={cropSize}
                height={cropSize}
                ref={el => {
                  if (!el || !canvasRef.current) return;
                  const ctx = el.getContext('2d');
                  el.width = previewSize;
                  el.height = previewSize;
                  // Draw scaled-down version from main canvas
                  try {
                    ctx.clearRect(0, 0, previewSize, previewSize);
                    ctx.beginPath();
                    ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(canvasRef.current, 0, 0, previewSize, previewSize);
                  } catch (e) {}
                }}
                style={{
                  width: previewSize, height: previewSize,
                  borderRadius: '50%', border: '2px solid var(--border)',
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {name || email || 'User Name'}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                  {role || 'Role'}
                </div>
              </div>
            </div>

            {/* Larger mirror */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(198, 168, 245, 0.05), rgba(0, 0, 0, 0.1))',
              borderRadius: 16, padding: 20, border: '1px solid rgba(198, 168, 245, 0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <canvas
                width={cropSize}
                height={cropSize}
                ref={el => {
                  if (!el || !canvasRef.current) return;
                  const size = 80;
                  const ctx = el.getContext('2d');
                  el.width = size;
                  el.height = size;
                  try {
                    ctx.clearRect(0, 0, size, size);
                    ctx.beginPath();
                    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(canvasRef.current, 0, 0, size, size);
                  } catch (e) {}
                }}
                style={{
                  width: 80, height: 80,
                  borderRadius: '50%', border: '3px solid rgba(198, 168, 245, 0.3)',
                  boxShadow: '0 0 20px rgba(198, 168, 245, 0.2)',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Profile Card View
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, width: '100%',
          background: 'rgba(255,255,255,0.03)', padding: '16px 20px',
          borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <ZoomOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={zoom}
            onChange={e => setZoom(parseFloat(e.target.value))}
            style={{
              flex: 1, accentColor: 'var(--accent)',
              height: 4, cursor: 'pointer',
            }}
          />
          <ZoomIn size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

          <button
            onClick={() => setRotation(r => r + 90)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(198, 168, 245, 0.1)', border: '1px solid rgba(198, 168, 245, 0.2)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(198, 168, 245, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(198, 168, 245, 0.1)'; }}
          >
            <RotateCw size={14} /> Rotate
          </button>

          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onCancel} style={{ padding: '10px 24px', gap: 8 }}>
            <X size={16} /> Cancel
          </Btn>
          <Btn onClick={handleConfirm} style={{
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            color: '#000', fontWeight: 700, padding: '10px 28px', gap: 8,
            boxShadow: '0 0 20px rgba(198, 168, 245, 0.3)',
          }}>
            <Check size={16} /> Apply Photo
          </Btn>
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
