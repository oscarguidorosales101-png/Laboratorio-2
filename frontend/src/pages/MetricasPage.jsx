import React, { useState } from 'react';
import api from '../services/api';
import useApi from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MetricasPage() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: resumen, loading, error, refetch } = useApi(
    () => api.getResumen(fecha),
    [fecha]
  );

  const kpis = resumen?.kpis || {};
  const reservasPorEstado = resumen?.reservas_por_estado || {};
  const ocupacion = resumen?.ocupacion_por_franja || [];
  const clientesRiesgo = resumen?.clientes_en_riesgo || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Métricas e Indicadores SQL</h1>
          <p className="page-description">
            Cálculo de agregaciones en tiempo real (COUNT, SUM, GROUP BY) ejecutadas en PostgreSQL.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Fecha de Análisis:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => refetch()}>
            🔄 Recalcular
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>Error al calcular indicadores: {error}</span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Ejecutando consultas SQL agregadas en PostgreSQL..." />
      ) : (
        <>
          {/* Fila de KPIs Principales */}
          <div className="metrics-grid">
            <MetricCard
              label="Total Reservas Fecha"
              value={kpis.total_reservas_dia || 0}
              icon="📊"
              hint="SELECT COUNT(*) WHERE fecha = $1"
              color="#2563EB"
            />
            <MetricCard
              label="Comensales Totales"
              value={kpis.comensales_esperados || 0}
              icon="🍽️"
              hint="SELECT SUM(personas) WHERE fecha = $1"
              color="#059669"
            />
            <MetricCard
              label="Capacidad Instalada"
              value={`${kpis.capacidad_total_activa || 0} pers.`}
              icon="🪑"
              hint={`${kpis.mesas_activas || 0} mesas operativas de ${kpis.mesas_totales || 0}`}
              color="#D97706"
            />
            <MetricCard
              label="Clientes en Riesgo"
              value={clientesRiesgo.length}
              icon="⚠️"
              hint="Comensales con 2 o más ausencias"
              color="#DC2626"
            />
          </div>

          {/* Gráfico de Ocupación por Franja Horaria de 2 Horas */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2 className="card-title">Ocupación por Franja Horaria ({fecha})</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Intervalos semiabiertos [inicio, fin)
              </span>
            </div>

            {ocupacion.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                {ocupacion.map((f, idx) => {
                  const mesasActivas = kpis.mesas_activas || 1;
                  const porcentaje = Math.min(100, Math.round((f.mesas_ocupadas / mesasActivas) * 100));

                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>
                          ⏰ {f.hora_inicio.slice(0, 5)} - {f.hora_fin.slice(0, 5)}
                        </span>
                        <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          <strong>{f.mesas_ocupadas}</strong> mesas ocupadas ({f.comensales_franja} comensales) — <strong>{porcentaje}%</strong> de ocupación
                        </span>
                      </div>

                      {/* Barra visual de ocupación */}
                      <div style={{ height: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${porcentaje}%`,
                            backgroundColor: porcentaje > 80 ? 'var(--status-error-dot)' : porcentaje > 50 ? 'var(--color-primary)' : 'var(--color-primary-soft)',
                            transition: 'width 300ms ease-out',
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No existen reservas activas registradas para la fecha seleccionada.
              </div>
            )}
          </div>

          {/* Clientes con Ausencias Acumuladas (Riesgo de Bloqueo) */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h2 className="card-title">Clientes con Riesgo de Bloqueo por Ausencias (No-Shows)</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Regla: 3 inasistencias = bloqueo estricto
              </span>
            </div>

            {clientesRiesgo.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Teléfono</th>
                      <th>Inasistencias Acumuladas</th>
                      <th>Estado en el Sistema</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesRiesgo.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                        <td>{c.telefono}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: c.no_shows >= 3 ? 'var(--status-error-text)' : 'var(--status-warning-text)' }}>
                            {c.no_shows} ausencias
                          </span>
                        </td>
                        <td>
                          {c.no_shows >= 3 ? (
                            <span className="badge badge-no_show">
                              ⛔ Bloqueado para nuevas reservas
                            </span>
                          ) : (
                            <span className="badge badge-pendiente">
                              ⚠️ En riesgo (a 1 ausencia del bloqueo)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--status-success-text)' }}>
                ✅ Ningún comensal presenta 2 o más ausencias acumuladas en este momento.
              </div>
            )}
          </div>

          {/* Glosario y Explicación Técnica de las Consultas SQL */}
          <div className="card" style={{ backgroundColor: 'var(--bg-surface-alt)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', marginBottom: '10px' }}>
              📖 Glosario Técnico de Métricas y Agregaciones SQL
            </h3>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              <li>
                <strong>Ocupación por Franja:</strong> Calculada mediante <code>GROUP BY hora_inicio, hora_fin</code> filtrando exclusivamente reservas activas (<code>estado IN ('pendiente', 'confirmada')</code>). Las reservas canceladas o cumplidas no bloquean capacidad.
              </li>
              <li>
                <strong>Comensales Esperados:</strong> Calculados mediante <code>SUM(personas)</code> para evaluar la carga proyectada de servicio y preparación de cocina.
              </li>
              <li>
                <strong>Control de Ausencias (No-Shows):</strong> Monitoreado mediante <code>SELECT ... WHERE no_shows &gt;= 2</code> para advertir preventivamente al personal antes de que un comensal alcance el límite de 3 ausencias.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
