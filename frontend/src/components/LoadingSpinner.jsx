import React from 'react';

export default function LoadingSpinner({ message = 'Cargando datos...', size = 'md' }) {
  const dimension = size === 'sm' ? 18 : size === 'lg' ? 36 : 24;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: '12px' }}>
      <div className="spinner" style={{ width: dimension, height: dimension }}></div>
      {message && <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{message}</span>}
    </div>
  );
}
