import React from 'react';

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cumplida: 'Cumplida',
  cancelada: 'Cancelada',
  no_show: 'Ausencia (No Show)',
};

export default function StatusBadge({ status }) {
  const normalized = (status || 'pendiente').toLowerCase();
  const label = STATUS_LABELS[normalized] || normalized;

  return (
    <span className={`badge badge-${normalized}`}>
      <span className="badge-dot"></span>
      {label}
    </span>
  );
}
