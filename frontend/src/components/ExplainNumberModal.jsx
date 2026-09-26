import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../api/axiosInstance';
import LoadingSpinner from './LoadingSpinner';

export default function ExplainNumberModal({ isOpen, onClose, metricKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && metricKey) {
      setLoading(true);
      api
        .get(`/intelligence/explain-number?metric=${metricKey}`)
        .then((res) => setData(res.data))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, metricKey]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Explain This Metric: ${data?.metricName || 'Live Metric'}`}
      maxWidth="620px"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close Explanation
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner message="Calculating breakdown..." />
      ) : (
        <div>
          <div
            style={{
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ fontSize: '0.78rem', color: '#4338CA', fontWeight: 700 }}>
              MATHEMATICAL FORMULA
            </div>
            <code
              style={{
                fontSize: '0.94rem',
                fontWeight: 700,
                color: '#1E1B4B',
                display: 'block',
                marginTop: '4px',
              }}
            >
              {data?.formula}
            </code>
            <p style={{ fontSize: '0.82rem', color: '#4338CA', marginTop: '6px' }}>
              {data?.explanation}
            </p>
          </div>

          <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>Active Calculation Result:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
              {data?.calculatedValue}
            </span>
          </div>

          {data?.breakdown && data.breakdown.length > 0 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-muted)' }}>
                Constituent Data Items:
              </div>
              <table className="custom-table" style={{ border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>SKU</th>
                    <th>On Hand</th>
                    <th>Calculation Factor</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{row.name}</td>
                      <td><code>{row.sku}</code></td>
                      <td>{row.onHand}</td>
                      <td>{row.unitCost ? `$${row.unitCost}` : row.threshold ? `≤ ${row.threshold}` : '—'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {row.subtotal !== undefined ? `$${row.subtotal.toFixed(2)}` : row.onHand}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
