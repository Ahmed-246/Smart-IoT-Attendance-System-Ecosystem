import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Btn, Badge } from '../components/ui';
import { ShieldAlert, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function UpgradeReportPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  
  if (!state?.audit_report) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>No audit report found</h2>
        <Btn onClick={() => navigate('/academic-standing')} style={{ marginTop: 16 }}>Return</Btn>
      </div>
    );
  }

  const report = state.audit_report;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/academic-standing')}>
          <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back
        </Btn>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={28} /> UPGRADE GUARD LOCKED
        </h1>
      </div>

      <Card style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, color: 'var(--text-primary)' }}>
          The active term transition could not proceed. The Upgrade Guard Audit Engine detected missing grades or incomplete assessments. 
          Please resolve the following issues before attempting the transition again to protect database integrity.
        </p>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginTop: 8 }}>
        {Object.entries(report).map(([facultyName, depts]) => (
          <div key={facultyName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8, margin: 0 }}>
              {facultyName}
            </h2>
            {Object.entries(depts).map(([deptName, years]) => (
              <div key={deptName} style={{ marginLeft: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, margin: 0 }}>
                  {deptName}
                </h3>
                {Object.entries(years).map(([yearName, courses]) => (
                  <div key={yearName} style={{ marginLeft: 20, marginBottom: 16 }}>
                    <div style={{ marginBottom: 12 }}><Badge color="blue">{yearName}</Badge></div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {Object.entries(courses).map(([courseName, errors]) => (
                        <Card key={courseName} style={{ background: 'var(--bg-surface)', padding: 16, marginLeft: 16, borderLeft: '3px solid var(--red)' }}>
                          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={16} color="var(--red)" /> {courseName}
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 24, color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {errors.map((err, idx) => (
                              <li key={idx} style={{ lineHeight: 1.5 }}>
                                {err}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
