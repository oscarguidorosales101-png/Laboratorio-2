import React, { useState } from 'react';
import api from '../services/api';
import useApi from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HorariosPage() {
  const { data: horarios, loading, error, refetch } = useApi(() => api.getHorarios());

  const [editingHorario, setEditingHorario] = useState(null);
  const [formData, setFormData] = useState({ abierto: true, apertura: '12:00', cierre: '22:00' });
  const [formError, setFormError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleOpenEdit = (h) => {
    setEditingHorario(h);
    setFormData({
      abierto: h.abierto,
      apertura: h.apertura.slice(0, 5),
      cierre: h.cierre.slice(0, 5),
    });
    setFormError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    try {
      await api.updateHorario(editingHorario.id, formData);
      setFeedback({ type: 'success', text: `Horario de ${editingHorario.nombre_dia} actualizado exitosamente.` });
      setEditingHorario(null);
      await refetch();
    } catch (err) {
      setFormError(err.message || 'Error al actualizar horario.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Horarios Semanales de Atención</h1>
          <p className="page-description">
            Configuración de jornadas de operación y límites horarios para la validación automática de reservas.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{feedback.text}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>Error al consultar horarios: {error}</span>
        </div>
      )}

      <div className="alert alert-info" style={{ marginBottom: '24px' }}>
        <span>
          ⏰ <strong>Regla de Horario de Atención:</strong> Ninguna reserva puede comenzar antes de la hora de apertura ni finalizar después de la hora de cierre. Dado que cada reserva dura <strong>2 horas fijas</strong>, la última hora de inicio admitida es exactamente 2 horas antes del cierre del día.
        </span>
      </div>

      {loading ? (
        <LoadingSpinner message="Cargando configuración de horarios semanales..." />
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Día de la Semana</th>
                  <th>Estado del Restaurante</th>
                  <th>Hora de Apertura</th>
                  <th>Hora de Cierre</th>
                  <th>Última Reserva Posible (2h)</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {horarios?.map((h) => {
                  let ultimaReserva = '—';
                  if (h.abierto) {
                    const [ch, cm] = h.cierre.split(':').map(Number);
                    const ultH = ch - 2;
                    if (ultH >= 0) {
                      ultimaReserva = `${String(ultH).padStart(2, '0')}:${String(cm).padStart(2, '0')}`;
                    }
                  }

                  return (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                        {h.nombre_dia}
                      </td>
                      <td>
                        <span className={`badge ${h.abierto ? 'badge-cumplida' : 'badge-cancelada'}`}>
                          <span className="badge-dot"></span>
                          {h.abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{h.abierto ? h.apertura.slice(0, 5) : '—'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{h.abierto ? h.cierre.slice(0, 5) : '—'}</span>
                      </td>
                      <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        {ultimaReserva}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(h)}>
                          ✏️ Modificar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edición de Horario */}
      {editingHorario && (
        <div className="modal-backdrop" onClick={() => setEditingHorario(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modificar Horario: {editingHorario.nombre_dia}</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                onClick={() => setEditingHorario(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="chkAbierto"
                    checked={formData.abierto}
                    onChange={(e) => setFormData({ ...formData, abierto: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="chkAbierto" style={{ fontSize: '0.92rem', cursor: 'pointer', fontWeight: 600 }}>
                    Restaurante ABIERTO este día
                  </label>
                </div>

                {formData.abierto && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Hora de Apertura *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.apertura}
                        onChange={(e) => setFormData({ ...formData, apertura: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Hora de Cierre *</label>
                      <input
                        type="time"
                        className="form-control"
                        value={formData.cierre}
                        onChange={(e) => setFormData({ ...formData, cierre: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                {!formData.abierto && (
                  <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--status-error-bg)', color: 'var(--status-error-text)', fontSize: '0.85rem' }}>
                    Al marcar el día como cerrado, cualquier intento de reserva para esta fecha será rechazado con HTTP 409 por las reglas del negocio.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingHorario(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : 'Actualizar Horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
