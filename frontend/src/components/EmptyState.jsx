import React from 'react';

export default function EmptyState({ 
  icon = (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  title = 'No hay registros',
  description = 'Aún no se han encontrado datos para mostrar.',
  action
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p style={{ maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.9rem' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
