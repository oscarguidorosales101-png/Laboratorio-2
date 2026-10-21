import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useApi from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  const [selectedFecha, setSelectedFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: resumen, loading: loadingResumen, error: errorResumen, refetch: refetchResumen } = useApi(
    () => api.getResumen(selectedFecha),
    [selectedFecha]
  );

  const { data: reservasHoy, loading: loadingReservas, error: errorReservas, refetch: refetchReservas } = useApi(
    () => api.getReservas({ fecha: selectedFecha }),
    [selectedFecha]
  );

  const kpis = resumen?.kpis || {
    total_reservas_dia: 0,
    reservas_activas: 0,
    comensales_esperados: 0,
    mesas_totales: 0,
    mesas_activas: 0,
    capacidad_total_activa: 0,
  };

  const reservasPorEstado = resumen?.reservas_por_estado || {};

  return (
    <div>
      {/* Header del Dashboard */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel Operativo del Restaurante</h1>
          <p className="page-description">
            Monitoreo en tiempo real de ocupación, reservas del día y estado de mesas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Fecha de consulta:
          </label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
          />
          <Link to="/reservas/nueva" className="btn btn-primary">
            ➕ Nueva Reserva
          </Link>
        </div>
      </div>

      {/* Alerta de Horario de Operación para la fecha */}
      {resumen?.horario_dia && (
        <div className={`alert ${resumen.horario_dia.abierto ? 'alert-info' : 'alert-error'}`}>
          <span>
            {resumen.horario_dia.abierto
              ? `ℹ️ Horario para hoy (${resumen.horario_dia.nombre_dia}): Apertura ${resumen.horario_dia.apertura} — Cierre ${resumen.horario_dia.cierre}. Todas las reservas duran exactamente 2 horas fijas.`
              : `⚠️ El restaurante permanece CERRADO los días ${resumen.horario_dia.nombre_dia}. No se admiten reservas para esta fecha.`}
          </span>
        </div>
      )}

      {errorResumen && (
        <div className="alert alert-error">
          <span>Error al consultar métricas del servidor: {errorResumen}</span>
        </div>
      )}

      {/* Rejilla de Métricas Principales */}
      {loadingResumen ? (
        <LoadingSpinner message="Calculando indicadores SQL en tiempo real..." />
      ) : (
        <div className="metrics-grid">
          <MetricCard
            label="Reservas del Día"
            value={kpis.total_reservas_dia}
            icon="📅"
            hint={`${kpis.reservas_activas} activas (pendientes / confirmadas)`}
            color="#2563EB"
          />
          <MetricCard
            label="Comensales Esperados"
            value={kpis.comensales_esperados}
            icon="👥"
            hint="Total de personas estimadas en reservas"
            color="#059669"
          />
          <MetricCard
            label="Capacidad Instalada"
            value={`${kpis.capacidad_total_activa} personas`}
            icon="🪑"
            hint={`${kpis.mesas_activas} mesas operativas de ${kpis.mesas_totales}`}
            color="#D97706"
          />
          <MetricCard
            label="Pendientes de Confirmar"
            value={reservasPorEstado.pendiente || 0}
            icon="⏳"
            hint="Requieren validación o confirmación"
            color="#DC2626"
          />
        </div>
      )}

      {/* Sección en 2 Columnas: Reservas de Hoy y Resumen de Estados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Distribución por Estado */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Distribución por Estado (SQL Agregado)</h2>
            <Link to="/reservas" style={{ fontSize: '0.85rem' }}>Ver todas →</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['pendiente', 'confirmada', 'cumplida', 'cancelada', 'no_show'].map((st) => {
              const count = reservasPorEstado[st] || 0;
              const total = kpis.total_reservas_dia || 1;
              const percent = Math.round((count / total) * 100);

              return (
                <div key={st} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-surface-alt)' }}>
                  <StatusBadge status={st} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>{count}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ocupación por Franja Horaria */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Ocupación por Franjas Horarias (2 Horas)</h2>
            <Link to="/metricas" style={{ fontSize: '0.85rem' }}>Ver detalle →</Link>
          </div>

          {resumen?.ocupacion_por_franja && resumen.ocupacion_por_franja.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resumen.ocupacion_por_franja.map((franja, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)', fontSize: '0.95rem' }}>
                      {franja.hora_inicio.slice(0, 5)} - {franja.hora_fin.slice(0, 5)}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {franja.comensales_franja} comensales en total
                    </span>
                  </div>
                  <span className="badge badge-confirmada">
                    {franja.mesas_ocupadas} mesa(s) ocupada(s)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No hay reservas activas registradas en franjas horarias para esta fecha.
            </div>
          )}
        </div>
      </div>

      {/* Lista de Reservas del Día */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Agenda de Reservas para {selectedFecha}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { refetchReservas(); refetchResumen(); }}>
              🔄 Actualizar
            </button>
          </div>
        </div>

        {loadingReservas ? (
          <LoadingSpinner message="Cargando agenda del día..." />
        ) : reservasHoy && reservasHoy.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hora (2h)</th>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Mesa</th>
                  <th>Personas</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {reservasHoy.map((reserva) => (
                  <tr key={reserva.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
                        {reserva.hora_inicio.slice(0, 5)} - {reserva.hora_fin.slice(0, 5)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{reserva.cliente_nombre}</div>
                      {reserva.cliente_no_shows > 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--status-error-text)', display: 'inline-block' }}>
                          ⚠️ {reserva.cliente_no_shows} ausencia(s)
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{reserva.cliente_telefono}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>Mesa #{reserva.mesa_numero}</span>{' '}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({reserva.mesa_ubicacion})</span>
                    </td>
                    <td>{reserva.personas} pers.</td>
                    <td>
                      <StatusBadge status={reserva.estado} />
                    </td>
                    <td>
                      <Link to={`/reservas/${reserva.id}`} className="btn btn-secondary btn-sm">
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="📅"
            title="Sin reservas para esta fecha"
            description="No hay reservas programadas para este día. Puede agendar una nueva reserva usando el botón inferior."
            action={
              <Link to="/reservas/nueva" className="btn btn-primary btn-sm">
                ➕ Registrar Reserva
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
