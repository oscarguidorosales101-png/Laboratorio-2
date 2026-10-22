const db = require('../db');

/**
 * Servicio para cálculo de métricas y resumen operativo del restaurante
 * Ejecuta agregaciones SQL reales (COUNT, SUM, GROUP BY) sin datos estáticos
 */
const isValidDateStr = (str) => typeof str === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));

const getResumen = async (fechaParam) => {
  // Si no se especifica fecha valida, se utiliza la fecha actual del servidor (YYYY-MM-DD)
  const fecha = (fechaParam && fechaParam !== 'undefined' && fechaParam !== 'null' && isValidDateStr(fechaParam))
    ? fechaParam
    : new Date().toISOString().split('T')[0];

  // 1. Reservas del día agrupadas por estado (SQL GROUP BY)
  const queryEstados = `
    SELECT estado, COUNT(*)::int AS cantidad, COALESCE(SUM(personas), 0)::int AS personas
    FROM reservas
    WHERE fecha = $1
    GROUP BY estado
  `;
  const { rows: estadosRows } = await db.query(queryEstados, [fecha]);

  // Consolidar todos los estados posibles para evitar undefined en el frontend
  const reservasPorEstado = {
    pendiente: 0,
    confirmada: 0,
    cumplida: 0,
    cancelada: 0,
    no_show: 0,
    total: 0,
  };
  let comensalesTotales = 0;

  estadosRows.forEach((row) => {
    if (reservasPorEstado.hasOwnProperty(row.estado)) {
      reservasPorEstado[row.estado] = row.cantidad;
    }
    reservasPorEstado.total += row.cantidad;
    comensalesTotales += row.personas;
  });

  // 2. Ocupación por franja horaria (reservas activas: 'pendiente' y 'confirmada')
  const queryFranjas = `
    SELECT hora_inicio,
           hora_fin,
           COUNT(*)::int AS mesas_ocupadas,
           SUM(personas)::int AS comensales_franja
    FROM reservas
    WHERE fecha = $1
      AND estado IN ('pendiente', 'confirmada')
    GROUP BY hora_inicio, hora_fin
    ORDER BY hora_inicio ASC
  `;
  const { rows: franjasRows } = await db.query(queryFranjas, [fecha]);

  // 3. Totales de mesas físicas y capacidad instalada
  const queryMesas = `
    SELECT 
      COUNT(*)::int AS total_mesas,
      COUNT(CASE WHEN activa = TRUE THEN 1 END)::int AS mesas_activas,
      COALESCE(SUM(CASE WHEN activa = TRUE THEN capacidad END), 0)::int AS capacidad_total_activa
    FROM mesas
  `;
  const { rows: mesasStats } = await db.query(queryMesas);
  const { total_mesas, mesas_activas, capacidad_total_activa } = mesasStats[0];

  // 4. Clientes en alerta por ausencias (no_shows >= 2)
  const queryClientesRiesgo = `
    SELECT id, nombre, telefono, email, no_shows
    FROM clientes
    WHERE no_shows >= 2
    ORDER BY no_shows DESC, nombre ASC
  `;
  const { rows: clientesRiesgo } = await db.query(queryClientesRiesgo);

  // 5. Horario de operación para la fecha consultada
  const [year, month, day] = fecha.split('-').map(Number);
  const diaSemana = new Date(year, month - 1, day).getDay();
  const { rows: horarioRows } = await db.query('SELECT * FROM horarios WHERE dia_semana = $1', [diaSemana]);
  const horarioDia = horarioRows[0] || null;

  return {
    fecha,
    horario_dia: horarioDia,
    kpis: {
      total_reservas_dia: reservasPorEstado.total,
      reservas_activas: reservasPorEstado.pendiente + reservasPorEstado.confirmada,
      comensales_esperados: comensalesTotales,
      mesas_totales: total_mesas,
      mesas_activas: mesas_activas,
      capacidad_total_activa: capacidad_total_activa,
    },
    reservas_por_estado: reservasPorEstado,
    ocupacion_por_franja: franjasRows,
    clientes_en_riesgo: clientesRiesgo,
    glosario_metricas: {
      reservas_activas: 'Suma de reservas en estado "pendiente" y "confirmada" que ocupan franjas horarias.',
      ocupacion_franja: 'Cantidad de mesas comprometidas en cada intervalo de 2 horas para la fecha indicada.',
      clientes_en_riesgo: 'Clientes con 2 ausencias (a una de ser bloqueados) o 3 o más ausencias (bloqueados).',
    },
  };
};

module.exports = {
  getResumen,
};
