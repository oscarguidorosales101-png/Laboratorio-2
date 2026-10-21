const db = require('../db');
const { isValidDate, isValidTime, normalizeTime, addTwoHours, timeToMinutes } = require('../middleware/validator');

/**
 * Servicio para consultar la disponibilidad real de mesas
 */
const consultarDisponibilidad = async ({ fecha, hora, personas, ubicacion }) => {
  // 1. Validaciones de parámetros de entrada
  if (!fecha || !hora || !personas) {
    const error = new Error('Los parámetros fecha, hora y personas son obligatorios.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidDate(fecha)) {
    const error = new Error('Formato de fecha inválido. Utilice el formato YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidTime(hora)) {
    const error = new Error('Formato de hora inválido. Utilice HH:MM o HH:MM:SS.');
    error.statusCode = 400;
    throw error;
  }

  const numPersonas = parseInt(personas, 10);
  if (isNaN(numPersonas) || numPersonas <= 0) {
    const error = new Error('La cantidad de personas debe ser un número entero mayor a 0.');
    error.statusCode = 400;
    throw error;
  }

  const horaInicio = normalizeTime(hora);
  let horaFin;
  try {
    horaFin = addTwoHours(horaInicio);
  } catch (err) {
    return {
      disponible: false,
      motivo: err.message,
      mesas: [],
    };
  }

  // 2. Comprobar horario de atención del restaurante para ese día de la semana
  const [year, month, day] = fecha.split('-').map(Number);
  const diaSemana = new Date(year, month - 1, day).getDay();

  const { rows: horarioRows } = await db.query(
    'SELECT * FROM horarios WHERE dia_semana = $1',
    [diaSemana]
  );

  if (horarioRows.length === 0 || !horarioRows[0].abierto) {
    const diaNombre = horarioRows[0]?.nombre_dia || 'seleccionado';
    return {
      disponible: false,
      motivo: `El restaurante se encuentra cerrado los días ${diaNombre}.`,
      mesas: [],
    };
  }

  const horario = horarioRows[0];
  const aperturaMin = timeToMinutes(horario.apertura);
  const cierreMin = timeToMinutes(horario.cierre);
  const inicioMin = timeToMinutes(horaInicio);
  const finMin = timeToMinutes(horaFin);

  if (inicioMin < aperturaMin || finMin > cierreMin) {
    return {
      disponible: false,
      motivo: `El horario solicitado (${horaInicio} a ${horaFin}) excede el horario de atención para los ${horario.nombre_dia}s (${horario.apertura} a ${horario.cierre}). Recuerde que cada reserva dura 2 horas fijas.`,
      mesas: [],
    };
  }

  // 3. Consulta de mesas activas con capacidad suficiente y sin solapamiento
  let queryText = `
    SELECT m.id, m.numero, m.capacidad, m.ubicacion
    FROM mesas m
    WHERE m.activa = TRUE
      AND m.capacidad >= $1
  `;
  const queryParams = [numPersonas, fecha, horaInicio, horaFin];

  if (ubicacion && ubicacion.trim() !== '') {
    queryParams.push(ubicacion.trim());
    queryText += ` AND m.ubicacion ILIKE $${queryParams.length}`;
  }

  // Excluir mesas con reservas activas (pendiente o confirmada) en el intervalo [inicio, fin)
  queryText += `
    AND NOT EXISTS (
      SELECT 1 FROM reservas r
      WHERE r.mesa_id = m.id
        AND r.fecha = $2
        AND r.estado IN ('pendiente', 'confirmada')
        AND r.hora_inicio < $4
        AND r.hora_fin > $3
    )
    ORDER BY m.capacidad ASC, m.numero ASC
  `;

  const { rows: mesasDisponibles } = await db.query(queryText, queryParams);

  return {
    disponible: mesasDisponibles.length > 0,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    personas: numPersonas,
    total_mesas_disponibles: mesasDisponibles.length,
    mesas: mesasDisponibles,
    motivo: mesasDisponibles.length === 0 ? 'No hay mesas libres con la capacidad y ubicación solicitadas en esa franja horaria.' : null,
  };
};

module.exports = {
  consultarDisponibilidad,
};
