import React from 'react';

export default function MetricCard({ label, value, icon, hint, color }) {
  return (
    <div className="metric-card">
      <div className="metric-icon-wrap" style={color ? { backgroundColor: `${color}15`, color: color } : {}}>
        {icon || '📊'}
      </div>
      <div className="metric-body">
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {hint && <div className="metric-hint">{hint}</div>}
      </div>
    </div>
  );
}
