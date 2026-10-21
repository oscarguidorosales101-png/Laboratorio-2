import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useApi from '../hooks/useApi';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function ReservasListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFecha, setSelectedFecha] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('todos');
  const [sortBy, setSortBy] = useState('fecha_desc'); // 'fecha_desc' | 'fecha_asc' | 'personas_desc'

  const { data: reservas, loading, error, refetch } = useApi(
    () => api.getReservas({
      fecha: selectedFecha || undefined,
      estado: selectedEstado !== 'todos' ? selectedEstado : undefined,
      q: searchTerm || undefined,
    }),
    [selectedFecha, selectedEstado, searchTerm]
  );

  // Filtrado y ordenamiento en cliente
  const reservasProcesadas = useMemo(() => {
    if (!reservas) return [];
    let list = [...reservas];

    list.sort((a, b) => {
      if (sortBy === 'fecha_desc') {
        const da = new Date(`${a.fecha}T${a.hora_inicio}`);
        const db = new Date(`${b.fecha}T${b.hora_inicio}`);
        return db - da;
      } else if (sortBy === 'fecha_asc') {
        const da = new Date(`${a.fecha}T${a.hora_inicio}`);
        const db = new Date(`${b.fecha}T${b.hora_inicio}`);
        return da - db;
      } else if (sortBy === 'personas_desc') {
        return b.personas - a.personas;
      }
      return 0;
    });

    return list;
  }, [reservas, sortBy]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Reservas</h1>
          <p className="page-description">
            Listado general con búsqueda, filtros por fecha y estado, y detalle de reservas.
          </p>
        </div>

        <div>
          <Link to="/reservas/nueva" className="btn btn-primary">
            Nueva Reserva
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>Error al consultar reservas: {error}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="form-label">Buscar por Cliente / Teléfono</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Carlos Mendoza, 8888..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Filtrar por Fecha</label>
            <input
              type="date"
              className="form-control"
              value={selectedFecha}
              onChange={(e) => setSelectedFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">Estado de la Reserva</label>
            <select
              className="form-control"
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cumplida">Cumplida</option>
              <option value="cancelada">Cancelada</option>
              <option value="no_show">No Show (Ausencia)</option>
            </select>
          </div>

          <div>
            <label className="form-label">Ordenar Por</label>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="fecha_desc">Fecha y Hora (Más reciente primero)</option>
              <option value="fecha_asc">Fecha y Hora (Más antigua primero)</option>
              <option value="personas_desc">Cantidad de Personas (Mayor a menor)</option>
            </select>
          </div>
        </div>

        {(selectedFecha || selectedEstado !== 'todos' || searchTerm) && (
          <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Filtros activos:</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedFecha('');
                setSelectedEstado('todos');
                setSearchTerm('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla de Reservas */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            Resultados ({reservasProcesadas.length} reservas encontradas)
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
            Refrescar
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Consultando reservas en la base de datos..." />
        ) : reservasProcesadas.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario (2h)</th>
                  <th>Cliente</th>
                  <th>Mesa Asignada</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th>Nota</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasProcesadas.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary-dark)', whiteSpace: 'nowrap' }}>
                      {r.fecha}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600 }}>{r.hora_inicio.slice(0, 5)}</span> a {r.hora_fin.slice(0, 5)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.cliente_nombre}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.cliente_telefono}</div>
                      {r.cliente_no_shows > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--status-error-text)', fontWeight: 600 }}>
                          Aviso: {r.cliente_no_shows} ausencia(s)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>Mesa #{r.mesa_numero}</span>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Cap: {r.mesa_capacidad} pers. ({r.mesa_ubicacion})
                      </div>
                    </td>
                    <td>{r.personas} personas</td>
                    <td>
                      <StatusBadge status={r.estado} />
                    </td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {r.nota || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link to={`/reservas/${r.id}`} className="btn btn-secondary btn-sm">
                          Detalle
                        </Link>
                        {['pendiente', 'confirmada'].includes(r.estado) && (
                          <Link to={`/reservas/${r.id}/editar`} className="btn btn-secondary btn-sm">
                            Editar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No se encontraron reservas"
            description="Ninguna reserva coincide con los criterios de búsqueda o filtros seleccionados."
            action={
              <Link to="/reservas/nueva" className="btn btn-primary btn-sm">
                Crear Nueva Reserva
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
