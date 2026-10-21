import React from 'react';

export default function EmptyState({ icon = '📋', title = 'No hay registros', description = 'Aún no se han encontrado datos para mostrar.', action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p style={{ maxWidth: '420px', margin: '0 auto 16px', fontSize: '0.9rem' }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
