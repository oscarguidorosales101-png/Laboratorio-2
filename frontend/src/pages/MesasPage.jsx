import React, { useState } from 'react';
import api from '../services/api';
import useApi from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

export default function MesasPage() {
  const { data: mesas, loading, error, refetch } = useApi(() => api.getMesas());

  // Estado para modal de creación / edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMesa, setEditingMesa] = useState(null); // null = creando
  const [formData, setFormData] = useState({ numero: '', capacidad: 4, ubicacion: 'Interior', activa: true });
  const [formError, setFormError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado para confirmación de eliminación
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, mesa: null });
  const [feedback, setFeedback] = useState(null);

  const handleOpenCreate = () => {
    setEditingMesa(null);
    setFormData({ numero: '', capacidad: 4, ubicacion: 'Interior', activa: true });
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (mesa) => {
    setEditingMesa(mesa);
    setFormData({
      numero: mesa.numero,
      capacidad: mesa.capacidad,
      ubicacion: mesa.ubicacion,
      activa: mesa.activa,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError(null);
    setActionLoading(true);

    try {
      if (editingMesa) {
        await api.updateMesa(editingMesa.id, formData);
        setFeedback({ type: 'success', text: `Mesa #${formData.numero} actualizada correctamente.` });
      } else {
        await api.createMesa(formData);
        setFeedback({ type: 'success', text: `Mesa #${formData.numero} creada exitosamente.` });
      }
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err.message || 'Error al guardar la mesa.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.mesa) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      await api.deleteMesa(deleteModal.mesa.id);
      setFeedback({ type: 'success', text: `Mesa #${deleteModal.mesa.numero} eliminada exitosamente.` });
      setDeleteModal({ isOpen: false, mesa: null });
      await refetch();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'No fue posible eliminar la mesa.' });
      setDeleteModal({ isOpen: false, mesa: null });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo y Gestión de Mesas</h1>
          <p className="page-description">
            Configuración de mesas físicas, capacidad de comensales, ubicaciones y estado operativo.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          Registrar Nueva Mesa
        </button>
      </div>

      {feedback && (
        <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{feedback.text}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>Error al consultar catálogo de mesas: {error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Cargando catálogo de mesas..." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {mesas?.map((m) => (
            <div
              key={m.id}
              className="card"
              style={{
                borderLeft: m.activa ? '4px solid var(--color-primary)' : '4px solid var(--border-color)',
                opacity: m.activa ? 1 : 0.75,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--color-primary-dark)' }}>
                    Mesa #{m.numero}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Ubicación: <strong>{m.ubicacion}</strong>
                  </span>
                </div>

                <span className={`badge ${m.activa ? 'badge-cumplida' : 'badge-cancelada'}`}>
                  <span className="badge-dot"></span>
                  {m.activa ? 'Operativa' : 'Inactiva'}
                </span>
              </div>

              <div style={{ margin: '14px 0', padding: '10px', backgroundColor: 'var(--bg-surface-alt)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capacidad de Comensales:</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                  Hasta {m.capacidad} personas
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(m)}>
                  Editar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => setDeleteModal({ isOpen: true, mesa: m })}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMesa ? `Editar Mesa #${editingMesa.numero}` : 'Registrar Nueva Mesa'}</h3>
              <button
                type="button"
                aria-label="Cerrar modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                onClick={() => setModalOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
                  <label className="form-label">Número Identificador de la Mesa *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    required
                  />
                  <span className="form-help">Debe ser único en el restaurante.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Capacidad Máxima (personas) *</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="30"
                    value={formData.capacidad}
                    onChange={(e) => setFormData({ ...formData, capacidad: parseInt(e.target.value, 10) || 1 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ubicación *</label>
                  <select
                    className="form-control"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    required
                  >
                    <option value="Interior">Interior</option>
                    <option value="Terraza">Terraza</option>
                    <option value="Ventanal">Ventanal</option>
                    <option value="Zona VIP">Zona VIP</option>
                    <option value="Barra">Barra</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="chkActiva"
                    checked={formData.activa}
                    onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="chkActiva" style={{ fontSize: '0.9rem', cursor: 'pointer', fontWeight: 600 }}>
                    Mesa activa (disponible para recibir nuevas reservas)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : 'Guardar Mesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        title={`¿Eliminar Mesa #${deleteModal.mesa?.numero}?`}
        message="Si la mesa tiene reservas registradas en el historial, el servidor rechazará la eliminación para preservar la integridad referencial. En ese caso, la recomendación oficial es cambiarla a inactiva."
        confirmText="Intentar Eliminar"
        isDangerous={true}
        loading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, mesa: null })}
      />
    </div>
  );
}
