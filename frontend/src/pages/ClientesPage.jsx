import React, { useState } from 'react';
import api from '../services/api';
import useApi from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: clientes, loading, error, refetch } = useApi(
    () => api.getClientes({ search: searchTerm }),
    [searchTerm]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '' });
  const [formError, setFormError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, cliente: null });
  const [feedback, setFeedback] = useState(null);

  const handleOpenCreate = () => {
    setEditingCliente(null);
    setFormData({ nombre: '', telefono: '', email: '' });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCliente(c);
    setFormData({ nombre: c.nombre, telefono: c.telefono, email: c.email || '' });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    try {
      if (editingCliente) {
        await api.updateCliente(editingCliente.id, formData);
        setFeedback({ type: 'success', text: `Cliente "${formData.nombre}" actualizado correctamente.` });
      } else {
        await api.createCliente(formData);
        setFeedback({ type: 'success', text: `Cliente "${formData.nombre}" registrado exitosamente.` });
      }
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err.message || 'Error al guardar datos del cliente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.cliente) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await api.deleteCliente(deleteModal.cliente.id);
      setFeedback({ type: 'success', text: `Cliente "${deleteModal.cliente.nombre}" eliminado exitosamente.` });
      setDeleteModal({ isOpen: false, cliente: null });
      await refetch();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'No fue posible eliminar el cliente.' });
      setDeleteModal({ isOpen: false, cliente: null });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Directorio y Control de Clientes</h1>
          <p className="page-description">
            Registro de comensales, historial de contacto y seguimiento estricto del contador de ausencias (no-shows).
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          ➕ Registrar Nuevo Cliente
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{feedback.text}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>Error al consultar clientes: {error}</span>
        </div>
      )}

      {/* Regla de negocio visible */}
      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <span>
          🛡️ <strong>Regla de Ausencias:</strong> Los comensales con <strong>3 o más inasistencias</strong> quedan bloqueados automáticamente por el backend para realizar nuevas reservas. El contador de ausencias no puede manipularse manualmente para preservar la integridad de las reglas.
        </span>
      </div>

      {/* Buscador */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ maxWidth: '400px' }}>
          <label className="form-label">Buscar cliente por nombre o teléfono</label>
          <input
            type="text"
            className="form-control"
            placeholder="Escriba para filtrar en tiempo real..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Clientes Registrados ({clientes?.length || 0})</h2>
        </div>

        {loading ? (
          <LoadingSpinner message="Consultando directorio de clientes..." />
        ) : clientes && clientes.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Teléfono</th>
                  <th>Correo Electrónico</th>
                  <th>Inasistencias (No-Shows)</th>
                  <th>Estado de Reserva</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const isBlocked = c.no_shows >= 3;
                  const isWarning = c.no_shows === 2;

                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        {c.nombre}
                      </td>
                      <td>{c.telefono}</td>
                      <td>{c.email || '—'}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: isBlocked ? 'var(--status-error-text)' : isWarning ? 'var(--status-warning-text)' : 'var(--text-primary)',
                          }}
                        >
                          {c.no_shows} ausencias
                        </span>
                      </td>
                      <td>
                        {isBlocked ? (
                          <span className="badge badge-no_show">
                            <span className="badge-dot"></span>
                            ⛔ Bloqueado (≥3 ausencias)
                          </span>
                        ) : isWarning ? (
                          <span className="badge badge-pendiente">
                            <span className="badge-dot"></span>
                            ⚠️ Alerta (2 ausencias)
                          </span>
                        ) : (
                          <span className="badge badge-cumplida">
                            <span className="badge-dot"></span>
                            🟢 Habilitado
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(c)}>
                            ✏️ Editar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteModal({ isOpen: true, cliente: c })}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No se encontraron clientes registrados con ese criterio.
          </div>
        )}
      </div>

      {/* Modal de Creación / Edición */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCliente ? `Editar Cliente "${editingCliente.nombre}"` : 'Registrar Nuevo Cliente'}</h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
                onClick={() => setModalOpen(false)}
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

                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. Sofía Martínez"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono de Contacto *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Ej. +506 8888-2222"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="sofia@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                {editingCliente && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Inasistencias acumuladas: <strong>{editingCliente.no_shows}</strong>. El contador se incrementa exclusivamente al marcar reservas como "No Show" mediante transacciones seguras del servidor.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title={`¿Eliminar a ${deleteModal.cliente?.nombre}?`}
        message="Si el cliente posee reservas en el historial (activas o cumplidas), la base de datos rechazará la eliminación para no romper la integridad referencial."
        confirmText="Confirmar Eliminación"
        isDangerous={true}
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, cliente: null })}
      />
    </div>
  );
}
