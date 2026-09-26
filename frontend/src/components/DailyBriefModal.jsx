import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import api from '../api/axiosInstance';
import LoadingSpinner from './LoadingSpinner';

export default function DailyBriefModal({ isOpen, onClose }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .get('/intelligence/daily-brief')
        .then((res) => setBrief(res.data))
        .catch(() => setBrief(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Daily Briefing & Health Assessment"
      maxWidth="650px"
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          Acknowledge & Proceed
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner message="Generating executive briefing..." />
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0F172A',
              color: '#FFFFFF',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                Warehouse Health Score
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: brief?.healthScore >= 75 ? '#34D399' : '#FBBF24' }}>
                {brief?.healthScore} <span style={{ fontSize: '1rem', color: '#94A3B8' }}>/ 100</span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
              }}
            >
              Status: {brief?.healthStatus}
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
              Executive Summary
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {brief?.executiveSummary}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {brief?.keyMetrics.map((km, idx) => (
              <div
                key={idx}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid var(--border)',
                  padding: '12px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{km.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>{km.value}</div>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)' }}>
              Top Priority Focus Areas Today
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {brief?.priorities.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                  }}
                >
                  <ArrowRight size={15} color="var(--primary)" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
