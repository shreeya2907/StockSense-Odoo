import React from 'react';

export default function KPICard({ label, value, icon: Icon, color = '#4F46E5', bgColor = '#EEF2FF' }) {
  return (
    <div className="kpi-card">
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
      {Icon && (
        <div className="kpi-icon-box" style={{ backgroundColor: bgColor, color }}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
