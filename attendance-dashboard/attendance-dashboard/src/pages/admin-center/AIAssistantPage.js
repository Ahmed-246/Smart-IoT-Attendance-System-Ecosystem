import React, { useState } from 'react';
import { adminCenterApi } from '../../api/adminCenterApi';
import { Bot, Send, Sparkles, UserCheck, Shield } from 'lucide-react';

export default function AIAssistantPage() {
  const [taskText, setTaskText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const handleRecommend = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    setLoading(true);
    try {
      const res = await adminCenterApi.recommendRole(taskText);
      setRecommendation(res.data);
    } catch (err) {
      console.error("AI Assistant Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', maxWidth: 800 }}>
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #adc7ff, #4a8eff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(74, 142, 255, 0.2)'
        }}>
          <Bot size={24} color="#0b1326" />
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em', color: '#fff' }}>Aegis Assistant</h1>
          <p style={{ margin: 0, color: '#889bc3', fontSize: 15 }}>Describe a user's operational duties. Let AI recommend the optimal ABAC security configuration.</p>
        </div>
      </div>

      <div style={{
        background: '#131b2e', borderRadius: 16, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.02)', padding: 32,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <form onSubmit={handleRecommend}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#889bc3', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Job Description / Required Tasks
          </label>
          <textarea
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            placeholder="e.g. This user will need to audit the system logs and override security clearances during night shifts..."
            style={{
              width: '100%', height: 120, padding: 16, background: '#0b1326',
              border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
              color: '#dae2fd', fontSize: 15, fontFamily: "'Inter', sans-serif", resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button 
              type="submit" 
              disabled={loading || !taskText.trim()}
              style={{ 
                padding: '12px 24px', background: 'linear-gradient(135deg, #adc7ff, #4a8eff)',
                border: 'none', color: '#0b1326', borderRadius: 8, fontWeight: 700, 
                display: 'flex', alignItems: 'center', gap: 8, cursor: (loading || !taskText.trim()) ? 'not-allowed' : 'pointer',
                opacity: (loading || !taskText.trim()) ? 0.6 : 1
              }}
            >
              <Send size={16} />
              {loading ? 'Processing...' : 'Generate Assignment'}
            </button>
          </div>
        </form>
      </div>

      {recommendation && (
        <div style={{
          marginTop: 32, background: 'linear-gradient(to right, #171f33, #131b2e)',
          borderRadius: 16, padding: 32, border: '1px solid rgba(74, 142, 255, 0.2)',
          boxShadow: '0 16px 32px rgba(0,0,0,0.3)', animation: 'fadeIn 0.4s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Sparkles size={20} color="#4a8eff" />
            <h2 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 }}>Intelligence Recommendation</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div style={{ background: '#0b1326', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <UserCheck size={14} /> Recommended Base Tier
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#4fdbc8', textTransform: 'capitalize' }}>
                {recommendation.base_role}
              </div>
            </div>

            <div style={{ background: '#0b1326', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 11, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                <Shield size={14} /> Suggested Capabilities
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {recommendation.capabilities.length > 0 ? (
                  recommendation.capabilities.map(cap => (
                    <span key={cap} style={{
                      background: 'rgba(74, 142, 255, 0.15)', color: '#adc7ff',
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      border: '1px solid rgba(74, 142, 255, 0.3)'
                    }}>
                      {cap}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#889bc3', fontSize: 13 }}>Standard Base permissions sufficient.</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: '#0b1326', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 11, color: '#889bc3', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 8 }}>
              Reasoning Engine Output
            </div>
            <p style={{ color: '#dae2fd', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {recommendation.reasoning}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
