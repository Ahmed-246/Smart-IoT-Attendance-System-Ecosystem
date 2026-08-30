import { useEffect, useState } from 'react';
import { devicesApi, iotApi } from '../api/client';
import { Card, Table, Btn, Modal, Field, Input, PageLoader, useToast, ConfirmModal } from '../components/ui';
import { Upload, Check, Copy, Trash2, Shield, Activity, Radio, Cpu as CpuIcon, Wifi } from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [copied,  setCopied]  = useState(null);
  const [form,    setForm]    = useState({ device_name: '', location: '', api_key: '' });
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [claimModal, setClaimModal] = useState(null);
  const { toast, ToastContainer } = useToast();

  useEffect(() => { 
    load(); 
    // Slow refresh for the main list (5 mins)
    const listInterval = setInterval(load, 300000);
    // Fast refresh for discovery signal (3s) - requested as "instant"
    const radarInterval = setInterval(pollPending, 3000);
    
    return () => {
      clearInterval(listInterval);
      clearInterval(radarInterval);
    };
  }, []);

  async function pollPending() {
    try {
      const res = await iotApi.pending();
      // Check if we have new ones to trigger the animation
      if (res.data.length > pendingDevices.length) {
        setShowNewPulse(true);
        setTimeout(() => setShowNewPulse(false), 5000);
      }
      setPendingDevices(res.data);
    } catch (err) {
      console.error("Failed to poll pending devices:", err);
    }
  }

  async function handleClaim(e) {
    e.preventDefault();
    try {
      await iotApi.claim(claimModal.id, form.device_name, form.location);
      toast('Device claimed successfully!');
      setClaimModal(null);
      setForm({ device_name: '', location: '', api_key: '' });
      load();
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to claim device', 'error');
    }
  }

  async function load() {
    setLoading(true);
    try { const r = await devicesApi.list(); setDevices(r.data); } catch {}
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await devicesApi.create(form);
      toast('Device registered successfully!');
      setModal(false); setForm({ device_name: '', location: '', api_key: '' }); load();
    } catch (err) { 
      const msg = err.response?.data?.detail || err.message || 'Error adding device';
      toast(msg, 'error');
    }
  }

  async function handleUpdate(e) {
    e.preventDefault();
    try {
      await devicesApi.update(editModal.id, { api_key: form.api_key });
      toast('API key updated successfully!');
      setEditModal(null); setForm({ device_name: '', location: '', api_key: '' }); load();
    } catch (err) { 
      const msg = err.response?.data?.detail || err.message || 'Error updating API key';
      toast(msg, 'error');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await devicesApi.delete(deleteConfirm.id);
      toast('Device deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) { 
      const msg = err.response?.data?.detail || err.message || 'Error deleting device';
      toast(msg, 'error');
    }
  }

  function copyKey(key, id) {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const columns = [
    { key: 'id',          label: 'ID',       render: v => <span className="mono" style={{ color: 'var(--text-muted)' }}>#{v}</span> },
    { key: 'device_name', label: 'Name',     render: v => <span style={{ fontWeight: 500 }}>{v}</span> },
    { key: 'location',    label: 'Location', render: v => <span style={{ color: 'var(--text-secondary)' }}>{v || '—'}</span> },
    { key: 'api_key',     label: 'API Key',  render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {v.slice(0, 12)}…
        </span>
        <Btn size="sm" variant="ghost" onClick={() => copyKey(v, row.id)}>
          {copied === row.id ? <Check size={14} /> : <Copy size={14} />}
          {copied === row.id ? 'Copied' : 'Copy'}
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => { setForm({ api_key: v, device_name: row.device_name }); setEditModal(row); }} style={{ gap: 4 }}>
          <Upload size={14} /> Update Key
        </Btn>
        <Btn size="sm" variant="ghost" onClick={() => setDeleteConfirm(row)} style={{ color: '#ef4444' }}>
          <Trash2 size={14} />
        </Btn>
      </div>
    )},
  ];

  const getStatus = (lastSeen) => {
    if (!lastSeen) return { label: 'Offline', color: 'var(--text-muted)' };
    const last = new Date(lastSeen);
    // Use 1.5 minutes window for safety (avoids flickering if a packet is slow)
    const diff = (new Date() - last) / 1000 / 60; 
    return diff < 1.5 ? { label: 'Online', color: '#10b981' } : { label: 'Offline', color: 'var(--text-muted)' };
  };

  const columnsWithStatus = [
    { label: 'STATUS', key: 'last_seen', render: (v) => {
      const { label, color } = getStatus(v);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: label === 'Online' ? '0 0 8px var(--green)' : 'none' }} />
          {label}
        </div>
      );
    }},
    ...columns
  ];

  const stats = {
    total: devices.length,
    online: devices.filter(d => getStatus(d.last_seen).label === 'Online').length,
    offline: devices.filter(d => getStatus(d.last_seen).label === 'Offline').length
  };

  const [prevPendingCount, setPrevPendingCount] = useState(0);
  const [showNewPulse, setShowNewPulse] = useState(false);

  if (loading) return <PageLoader />;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ToastContainer />
      
      {/* Header with Counter and Refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            Hardware Fleet
            <span style={{ 
              fontSize: 14, background: 'var(--accent-dim)', color: 'var(--accent)', 
              padding: '4px 10px', borderRadius: 20, border: '1px solid var(--accent-glow)' 
            }}>
              {stats.total} Total
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Real-time monitoring and authorization for IoT attendance nodes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={load} style={{ border: '1px solid var(--border)' }}>
            <Activity size={16} className={loading ? 'spin' : ''} /> Refresh
          </Btn>
          <Btn onClick={() => setModal(true)} style={{ boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            + Register Device
          </Btn>
        </div>
      </div>

      {/* Stats Dashboard Block */}
      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16,
        marginBottom: 8
      }}>
        <div style={{ 
          background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity color="#10b981" size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online Nodes</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{stats.online}</div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wifi color="#ef4444" size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offline Nodes</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{stats.offline}</div>
          </div>
        </div>

        <div style={{ 
          background: 'var(--accent)', padding: 20, borderRadius: 'var(--radius)', 
          display: 'flex', alignItems: 'center', gap: 16, color: 'white',
          boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)'
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CpuIcon color="white" size={24} />
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Load</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Normal</div>
          </div>
        </div>
      </div>

      {/* Discovery Radar Section */}
      {pendingDevices.length > 0 && (
        <div className="discovery-radar fade-in" style={{
          background: 'var(--bg-surface)',
          border: '2px solid var(--accent)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          marginBottom: '24px',
          transition: 'all 0.5s ease-in-out',
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Animated Pulse Background */}
          <div className="pulse-circle" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 300, height: 300, borderRadius: '50%', border: '1px solid var(--accent)', opacity: 0.1,
            animation: 'radar-pulse 4s infinite ease-out'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: 16, background: 'var(--accent)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)'
              }}>
                <Radio className="spin-slow" size={28} color="white" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Smart Discovery Active</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  The system has detected <strong>{pendingDevices.length}</strong> unclaimed ESP32 devices nearby.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '4px' }}>
              {pendingDevices.map(dev => (
                <div key={dev.id} className="slide-up" style={{
                  background: 'var(--bg-body)', padding: '12px 16px', borderRadius: 12,
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12,
                  minWidth: 200, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CpuIcon size={16} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{dev.mac_address}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Ready to Claim</div>
                  </div>
                  <Btn size="sm" onClick={() => { setForm({ device_name: `Device-${dev.mac_address.slice(-5)}`, location: '' }); setClaimModal(dev); }}>Claim</Btn>
                </div>
              ))}
            </div>
          </div>

          {/* New Device Notification Overlay */}
          {showNewPulse && (
            <div className="fade-in-up" style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              background: '#10b981', color: 'white', padding: '6px 16px', borderRadius: 20,
              fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)', zIndex: 10
            }}>
              <Activity size={14} />
              NEW DEVICE DETECTED (+1)
            </div>
          )}
        </div>
      )}

      <Card style={{ padding: 0 }}>
        <Table columns={columnsWithStatus} rows={devices} emptyText="No devices registered yet" loading={loading} />
      </Card>

      {/* Claim Modal */}
      {claimModal && (
        <Modal title="Claim IoT Device" onClose={() => setClaimModal(null)}>
          <form onSubmit={handleClaim} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--accent-dim)', padding: 16, borderRadius: 12, border: '1px solid var(--accent-glow)', display: 'flex', gap: 12 }}>
              <Wifi size={24} color="var(--accent)" />
              <div style={{ fontSize: 13 }}>
                <strong>Zero-Touch Setup:</strong> Once you claim this device, the server will automatically push the security keys to the ESP32 at <strong>{claimModal.mac_address}</strong>.
              </div>
            </div>
            <Field label="Give this device a name">
              <Input 
                value={form.device_name} 
                onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))} 
                placeholder="e.g. Science Lab Entrance" 
                required 
                autoFocus
              />
            </Field>
            <Field label="Location">
              <Input 
                value={form.location} 
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} 
                placeholder="e.g. Ground Floor, West Wing" 
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" type="button" onClick={() => setClaimModal(null)}>Cancel</Btn>
              <Btn type="submit">Activate Device</Btn>
            </div>
          </form>
        </Modal>
      )}

      {modal && (
        <Modal title="Register ESP32 Device" onClose={() => setModal(false)}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 12, borderRadius: 8, display: 'flex', gap: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <Shield size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>Naming Tip:</strong> "Device Name" is just a personal label for you (e.g. "Front Gate"). Use whatever name helps you identify the hardware.
              </div>
            </div>
            <Field label="Device name">
              <Input value={form.device_name} onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))} placeholder="e.g. Lab-ESP32-01" required />
            </Field>
            <Field label="Location (optional)">
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Room 101" />
            </Field>
            <Field label="Manual API Key (Optional)">
              <Input 
                value={form.api_key} 
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} 
                placeholder="Paste key from your ESP32 config.h (if already flashed)" 
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Leave empty to automatically generate a new key.
              </p>
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" type="button" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn type="submit">Register & Generate Key</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editModal && (
        <Modal title={`Update Device: ${editModal.device_name}`} onClose={() => setEditModal(null)}>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              Enter the exact <code className="mono">DEVICE_API_KEY</code> from your ESP32's <code className="mono">config.h</code> file.
            </div>
            <Field label="New Device Name">
              <Input 
                value={form.device_name || ''} 
                onChange={e => setForm(f => ({ ...f, device_name: e.target.value }))} 
                placeholder="Name your device (e.g. Science Lab)" 
                required
              />
            </Field>
            <Field label="New API Key">
              <Input 
                value={form.api_key} 
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} 
                placeholder="Paste key here..." 
                required
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <Btn variant="ghost" type="button" onClick={() => setEditModal(null)}>Cancel</Btn>
              <Btn type="submit">Update & Save</Btn>
            </div>
          </form>
        </Modal>
      )}
      {deleteConfirm && (
        <ConfirmModal 
          title="Delete Device"
          message={`Are you sure you want to delete ${deleteConfirm.device_name}? This device will be immediately blocked from scanning card attendance.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}
