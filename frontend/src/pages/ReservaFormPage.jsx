import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import useApi from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ReservaFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  // Estados del formulario
  const [clienteId, setClienteId] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [personas, setPersonas] = useState(2);
  const [ubicacionPreferencia, setUbicacionPreferencia] = useState('');
  const [mesaSeleccionada, setMesaSeleccionada] = useState('');
  const [nota, setNota] = useState('');

  // Estados de consulta de disponibilidad en tiempo real
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [loadingDisponibilidad, setLoadingDisponibilidad] = useState(false);
  const [disponibilidadError, setDisponibilidadError] = useState(null);

  // Estados de guardado y feedback
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Cargar catálogo de clientes y mesas
  const { data: clientes, loading: loadingClientes } = useApi(() => api.getClientes());

  // Si estamos en modo edición, cargar la reserva existente
  useEffect(() => {
    if (isEditing) {
      api.getReservaById(id)
        .then((r) => {
          setClienteId(String(r.cliente_id));
          setFecha(r.fecha);
          setHoraInicio(r.hora_inicio.slice(0, 5));
          setPersonas(r.personas);
          setMesaSeleccionada(String(r.mesa_id));
          setNota(r.nota || '');
        })
        .catch((err) => {
          setFormError(`No se pudo cargar la reserva para edición: ${err.message}`);
        });
    }
  }, [id, isEditing]);

  // Consultar disponibilidad real cada vez que cambian fecha, hora, personas o preferencia de ubicación
  useEffect(() => {
    if (!fecha || !horaInicio || !personas || personas <= 0) return;

    let mounted = true;
    setLoadingDisponibilidad(true);
    setDisponibilidadError(null);

    api.getDisponibilidad({
      fecha,
      hora: horaInicio,
      personas,
      ubicacion: ubicacionPreferencia || undefined,
    })
      .then((res) => {
        if (!mounted) return;
        setDisponibilidad(res);
        // Si la mesa previamente seleccionada ya no está disponible, deseleccionarla
        if (res.mesas && !res.mesas.some((m) => String(m.id) === String(mesaSeleccionada))) {
          if (!isEditing) {
            setMesaSeleccionada('');
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setDisponibilidadError(err.message || 'Error al comprobar disponibilidad de mesas.');
          setDisponibilidad(null);
        }
      })
      .finally(() => {
        if (mounted) setLoadingDisponibilidad(false);
      });

    return () => {
      mounted = false;
    };
  }, [fecha, horaInicio, personas, ubicacionPreferencia]);

  // Cliente seleccionado actual
  const clienteActual = clientes?.find((c) => String(c.id) === String(clienteId));
  const clienteBloqueado = clienteActual && clienteActual.no_shows >= 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!clienteId) {
      setFormError('Por favor seleccione un cliente.');
      return;
    }

    if (clienteBloqueado) {
      setFormError(`El cliente "${clienteActual.nombre}" tiene 3 o más ausencias acumuladas y está bloqueado para nuevas reservas.`);
      return;
    }

    if (!mesaSeleccionada) {
      setFormError('Debe seleccionar una mesa disponible.');
      return;
    }

    setSubmitLoading(true);

    try {
      if (isEditing) {
        await api.updateReserva(id, {
          mesa_id: parseInt(mesaSeleccionada, 10),
          fecha,
          hora_inicio: horaInicio,
          personas: parseInt(personas, 10),
          nota,
        });
        navigate(`/reservas/${id}`);
      } else {
        const nuevaReserva = await api.createReserva({
          cliente_id: parseInt(clienteId, 10),
          mesa_id: parseInt(mesaSeleccionada, 10),
          fecha,
          hora_inicio: horaInicio,
          personas: parseInt(personas, 10),
          nota,
        });
        navigate(`/reservas/${nuevaReserva.id}`);
      }
    } catch (err) {
      // Capturar conflictos HTTP 409 o errores de validación HTTP 400
      setFormError(err.message || 'Ocurrió un error al procesar la reserva.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link to="/reservas" style={{ fontSize: '0.88rem', color: 'var(--color-primary)' }}>
              ← Volver al listado
            </Link>
          </div>
          <h1 className="page-title">
            {isEditing ? `Modificar Reserva #${id}` : 'Crear Nueva Reserva'}
          </h1>
          <p className="page-description">
            Complete los datos. La disponibilidad de mesas se valida en tiempo real con el servidor.
          </p>
        </div>
      </div>

      {formError && (
        <div className="alert alert-error">
          <span>❌ {formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Paso 1: Selección de Cliente */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">1. Selección del Cliente</h2>
            <Link to="/clientes" style={{ fontSize: '0.85rem' }}>+ Gestionar Clientes</Link>
          </div>

          <div className="form-group">
            <label className="form-label">Cliente Comensal *</label>
            {loadingClientes ? (
              <LoadingSpinner size="sm" message="Cargando lista de clientes..." />
            ) : (
              <select
                className="form-control"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required
                disabled={isEditing}
              >
                <option value="">-- Seleccione un cliente registrado --</option>
                {clientes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.telefono}) {c.no_shows > 0 ? `[${c.no_shows} ausencias]` : ''}
                  </option>
                ))}
              </select>
            )}

            {clienteBloqueado && (
              <div className="form-error" style={{ marginTop: '8px', fontWeight: 600 }}>
                ⛔ Este cliente ha acumulado {clienteActual.no_shows} inasistencias (no-shows) y tiene bloqueada la creación de reservas según las reglas del negocio.
              </div>
            )}

            {clienteActual && !clienteBloqueado && clienteActual.no_shows > 0 && (
              <div className="form-help" style={{ color: 'var(--status-warning-text)', fontWeight: 500 }}>
                ⚠️ Advertencia: El cliente tiene {clienteActual.no_shows} ausencia(s). Con 3 ausencias será bloqueado.
              </div>
            )}
          </div>
        </div>

        {/* Paso 2: Fecha, Horario y Asistentes */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h2 className="card-title">2. Parámetros de la Reserva</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Fecha *</label>
              <input
                type="date"
                className="form-control"
                value={fecha}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora de Inicio *</label>
              <input
                type="time"
                className="form-control"
                value={horaInicio}
                step="900" // pasos de 15 minutos
                onChange={(e) => setHoraInicio(e.target.value)}
                required
              />
              <span className="form-help">Cada reserva dura exactamente 2 horas fijas.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Cantidad de Personas *</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="20"
                value={personas}
                onChange={(e) => setPersonas(parseInt(e.target.value, 10) || 1)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ubicación Preferida (Opcional)</label>
              <select
                className="form-control"
                value={ubicacionPreferencia}
                onChange={(e) => setUbicacionPreferencia(e.target.value)}
              >
                <option value="">Todas las ubicaciones</option>
                <option value="Interior">Interior</option>
                <option value="Terraza">Terraza</option>
                <option value="Ventanal">Ventanal</option>
                <option value="Zona VIP">Zona VIP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Paso 3: Disponibilidad y Selección de Mesa Real */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="card-title">3. Mesas Disponibles en Tiempo Real</h2>
              {loadingDisponibilidad && <LoadingSpinner size="sm" message="" />}
            </div>
            {disponibilidad && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                Ventana: {disponibilidad.hora_inicio?.slice(0, 5)} a {disponibilidad.hora_fin?.slice(0, 5)}
              </span>
            )}
          </div>

          {disponibilidadError && (
            <div className="alert alert-error">
              <span>{disponibilidadError}</span>
            </div>
          )}

          {disponibilidad?.motivo && (
            <div className="alert alert-error">
              <span>⚠️ {disponibilidad.motivo}</span>
            </div>
          )}

          {disponibilidad?.mesas && disponibilidad.mesas.length > 0 ? (
            <div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Seleccione una mesa disponible. Se muestran ordenadas por optimización de capacidad (mesa más pequeña con capacidad suficiente primero):
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {disponibilidad.mesas.map((m) => {
                  const isSelected = String(mesaSeleccionada) === String(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => setMesaSeleccionada(String(m.id))}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        boxShadow: isSelected ? '0 0 0 1px var(--color-primary)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary-dark)' }}>
                          Mesa #{m.numero}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                            ✓ SELECCIONADA
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Capacidad: <strong>{m.capacidad} personas</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Ubicación: {m.ubicacion}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !loadingDisponibilidad && !disponibilidad?.motivo ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No hay mesas disponibles para los parámetros solicitados. Ajuste la hora o cantidad de personas.
            </div>
          ) : null}
        </div>

        {/* Paso 4: Observaciones y Envío */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label className="form-label">Notas u Observaciones Especiales (Opcional)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Ej. Aniversario, comensal alérgico al gluten, trona para bebé..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <Link to="/reservas" className="btn btn-secondary">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitLoading || clienteBloqueado || !mesaSeleccionada}
            >
              {submitLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }}></span>
                  Guardando reserva...
                </>
              ) : isEditing ? (
                'Actualizar Reserva'
              ) : (
                'Confirmar y Guardar Reserva'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
