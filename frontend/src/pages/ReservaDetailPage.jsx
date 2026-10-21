import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useApi from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

export default function ReservaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: reserva, loading, error, refetch } = useApi(
    () => api.getReservaById(id),
    [id]
  );

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDangerous: false,
    onConfirm: null,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const handleCambiarEstado = async (nuevoEstado) => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await api.updateEstadoReserva(id, nuevoEstado);
      setFeedbackMessage({
        type: 'success',
        text: `Estado de la reserva actualizado exitosamente a "${nuevoEstado}".`,
      });
      await refetch();
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'No fue posible actualizar el estado de la reserva.',
      });
    } finally {
      setActionLoading(false);
      setModalConfig((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleEliminar = async () => {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await api.deleteReserva(id);
      navigate('/reservas');
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'No se pudo eliminar la reserva.',
      });
    } finally {
      setActionLoading(false);
      setModalConfig((prev) => ({ ...prev, isOpen: false }));
    }
  };

  if (loading) return <LoadingSpinner message="Cargando detalle de la reserva..." />;

  if (error || !reserva) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--status-error-text)', marginBottom: '12px' }}>Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {error || `La reserva con ID ${id} no existe o fue eliminada.`}
        </p>
        <Link to="/reservas" className="btn btn-primary">
          Volver a Reservas
        </Link>
      </div>
    );
  }

  const isTerminal = ['cumplida', 'cancelada', 'no_show'].includes(reserva.estado);

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Link to="/reservas" style={{ fontSize: '0.88rem', color: 'var(--color-primary)' }}>
              ← Volver al listado
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Reserva #{reserva.id}</span>
          </div>
          <h1 className="page-title">Detalle de Reserva #{reserva.id}</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!isTerminal && (
            <Link to={`/reservas/${reserva.id}/editar`} className="btn btn-secondary">
              ✏️ Modificar Reserva
            </Link>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tarjeta Principal de Información de la Reserva */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 className="card-title">Resumen de la Solicitud</h2>
            <StatusBadge status={reserva.estado} />
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Registrada el: {new Date(reserva.created_at).toLocaleString()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label className="form-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>FECHA DE LA RESERVA</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>
              {reserva.fecha}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>HORARIO DE ATENCIÓN (2 HORAS)</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {reserva.hora_inicio.slice(0, 5)} a {reserva.hora_fin.slice(0, 5)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duración fija de 2 horas</span>
          </div>

          <div>
            <label className="form-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>ASISTENTES CONFIRMADOS</label>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {reserva.personas} personas
            </div>
          </div>
        </div>

        {/* Información del Cliente Relacionado */}
        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-primary-dark)' }}>
            👤 Información del Comensal
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Nombre:</span>
              <div style={{ fontWeight: 600 }}>{reserva.cliente_nombre}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Teléfono:</span>
              <div style={{ fontWeight: 600 }}>{reserva.cliente_telefono}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email:</span>
              <div>{reserva.cliente_email || 'No registrado'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Historial de Ausencias:</span>
              <div>
                <span style={{ fontWeight: 700, color: reserva.cliente_no_shows >= 3 ? 'var(--status-error-text)' : reserva.cliente_no_shows === 2 ? 'var(--status-warning-text)' : 'var(--text-primary)' }}>
                  {reserva.cliente_no_shows} ausencia(s)
                </span>
                {reserva.cliente_no_shows >= 3 && (
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--status-error-text)' }}>
                    ⛔ Bloqueado para nuevas reservas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Información de la Mesa Asignada */}
        <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '10px', color: 'var(--color-primary-dark)' }}>
            🪑 Mesa Asignada
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mesa Número:</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                Mesa #{reserva.mesa_numero}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Capacidad Máxima:</span>
              <div style={{ fontWeight: 600 }}>{reserva.mesa_capacidad} comensales</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ubicación:</span>
              <div style={{ fontWeight: 600 }}>{reserva.mesa_ubicacion}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estado Operativo:</span>
              <div>{reserva.mesa_activa ? '🟢 Operativa' : '🔴 Inactiva'}</div>
            </div>
          </div>
        </div>

        {/* Notas y Observaciones */}
        <div>
          <label className="form-label" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>OBSERVACIONES / NOTAS</label>
          <p style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', fontSize: '0.9rem', color: reserva.nota ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {reserva.nota || 'Sin notas especiales registradas para esta reserva.'}
          </p>
        </div>
      </div>

      {/* Matriz de Acciones y Transiciones de Estado */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Gestión de Estados (Reglas de Negocio)</h2>
        </div>

        {reserva.estado === 'pendiente' && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              La reserva se encuentra en espera de confirmación. Puede confirmarla, cancelarla o registrar una inasistencia.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleCambiarEstado('confirmada')}
              >
                ✅ Confirmar Reserva
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() =>
                  setModalConfig({
                    isOpen: true,
                    title: '¿Cancelar esta reserva?',
                    message: 'Al cancelar la reserva, la mesa y la franja horaria quedarán inmediatamente liberadas para otros comensales.',
                    confirmText: 'Sí, Cancelar Reserva',
                    isDangerous: true,
                    onConfirm: () => handleCambiarEstado('cancelada'),
                  })
                }
              >
                ❌ Cancelar Reserva
              </button>

              <button
                type="button"
                className="btn btn-danger"
                disabled={actionLoading}
                onClick={() =>
                  setModalConfig({
                    isOpen: true,
                    title: '⚠️ Registrar Inasistencia (No Show)',
                    message: `Registrar esta reserva como No Show incrementará en 1 el contador de ausencias de "${reserva.cliente_nombre}" (actualmente: ${reserva.cliente_no_shows}). Si acumula 3 ausencias, no podrá realizar nuevas reservas.`,
                    confirmText: 'Registrar No Show e Incrementar Ausencias',
                    isDangerous: true,
                    onConfirm: () => handleCambiarEstado('no_show'),
                  })
                }
              >
                ⚠️ Registrar No Show
              </button>
            </div>
          </div>
        )}

        {reserva.estado === 'confirmada' && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              La reserva está confirmada. Al llegar los comensales o finalizar el servicio, márquela como cumplida.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionLoading}
                onClick={() => handleCambiarEstado('cumplida')}
              >
                🎉 Marcar como Cumplida
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={actionLoading}
                onClick={() =>
                  setModalConfig({
                    isOpen: true,
                    title: '¿Cancelar esta reserva confirmada?',
                    message: 'Al cancelar la reserva, la mesa y la franja horaria quedarán liberadas.',
                    confirmText: 'Sí, Cancelar',
                    isDangerous: true,
                    onConfirm: () => handleCambiarEstado('cancelada'),
                  })
                }
              >
                ❌ Cancelar Reserva
              </button>

              <button
                type="button"
                className="btn btn-danger"
                disabled={actionLoading}
                onClick={() =>
                  setModalConfig({
                    isOpen: true,
                    title: '⚠️ Registrar Ausencia (No Show)',
                    message: `Registrar esta reserva como No Show incrementará en 1 el contador de ausencias de "${reserva.cliente_nombre}".`,
                    confirmText: 'Registrar No Show',
                    isDangerous: true,
                    onConfirm: () => handleCambiarEstado('no_show'),
                  })
                }
              >
                ⚠️ Registrar No Show
              </button>
            </div>
          </div>
        )}

        {isTerminal && (
          <div>
            <div className="alert alert-info">
              <span>
                Esta reserva se encuentra en estado terminal (<strong>{reserva.estado}</strong>). De acuerdo a las reglas del negocio, las reservas finalizadas no admiten más transiciones de estado para garantizar la trazabilidad del historial.
              </span>
            </div>

            {reserva.estado === 'cancelada' && (
              <div style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() =>
                    setModalConfig({
                      isOpen: true,
                      title: '¿Eliminar registro de reserva cancelada?',
                      message: 'Esta acción eliminará permanentemente el registro de la base de datos.',
                      confirmText: 'Eliminar Registro',
                      isDangerous: true,
                      onConfirm: handleEliminar,
                    })
                  }
                >
                  🗑️ Eliminar Registro
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Reutilizable de Confirmación */}
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDangerous={modalConfig.isDangerous}
        loading={actionLoading}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
