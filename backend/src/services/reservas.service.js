const db = require('../db');
const { isValidDate, isValidTime, normalizeTime, addTwoHours, timeToMinutes } = require('../middleware/validator');

/**
 * Matriz de transiciones de estado permitidas
 */
const TRANSICIONES_VALIDAS = {
  pendiente: ['confirmada', 'cancelada', 'no_show'],
  confirmada: ['cumplida', 'cancelada', 'no_show'],
  cumplida: [],  // Estado terminal
  cancelada: [], // Estado terminal
  no_show: [],   // Estado terminal
};

/**
 * Obtiene el día de la semana (0=Domingo, ..., 6=Sábado) para una fecha YYYY-MM-DD
 */
const getDiaSemanaFromFecha = (fechaStr) => {
  const [year, month, day] = fechaStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.getDay();
};

/**
 * Valida las reglas de negocio de horario y apertura del restaurante
 */
const validarHorarioAtencion = async (clientQuery, fecha, horaInicio, horaFin) => {
  const diaSemana = getDiaSemanaFromFecha(fecha);
  const { rows } = await clientQuery('SELECT * FROM horarios WHERE dia_semana = $1', [diaSemana]);

  if (rows.length === 0) {
    const error = new Error(`No hay horario configurado para el día de la semana ${diaSemana}.`);
    error.statusCode = 409;
    throw error;
  }

  const horario = rows[0];

  if (!horario.abierto) {
    const error = new Error(`El restaurante se encuentra cerrado los días ${horario.nombre_dia}.`);
    error.statusCode = 409;
    throw error;
  }

  const aperturaMin = timeToMinutes(horario.apertura);
  const cierreMin = timeToMinutes(horario.cierre);
  const inicioMin = timeToMinutes(horaInicio);
  const finMin = timeToMinutes(horaFin);

  if (inicioMin < aperturaMin || finMin > cierreMin) {
    const error = new Error(
      `La reserva (${horaInicio} a ${horaFin}) debe encontrarse completamente dentro del horario de atención del restaurante para los ${horario.nombre_dia}s (${horario.apertura} a ${horario.cierre}).`
    );
    error.statusCode = 409;
    throw error;
  }

  return horario;
};

/**
 * Lista reservas con filtros avanzados y datos relacionados de cliente y mesa
 */
const getAllReservas = async ({ fecha, estado, mesa_id, cliente_id, q } = {}) => {
  let queryText = `
    SELECT r.*,
           c.nombre AS cliente_nombre,
           c.telefono AS cliente_telefono,
           c.email AS cliente_email,
           c.no_shows AS cliente_no_shows,
           m.numero AS mesa_numero,
           m.capacidad AS mesa_capacidad,
           m.ubicacion AS mesa_ubicacion,
           m.activa AS mesa_activa
    FROM reservas r
    JOIN clientes c ON c.id = r.cliente_id
    JOIN mesas m ON m.id = r.mesa_id
    WHERE 1=1
  `;
  const queryParams = [];

  // 1. Filtro por fecha (ignora valores vacios, 'undefined', 'null' o 'todos')
  if (fecha && typeof fecha === 'string') {
    const cleanFecha = fecha.trim();
    if (cleanFecha !== '' && cleanFecha !== 'undefined' && cleanFecha !== 'null' && cleanFecha !== 'todos') {
      if (!isValidDate(cleanFecha)) {
        const error = new Error('Formato de fecha inválido. Utilice el formato YYYY-MM-DD.');
        error.statusCode = 400;
        throw error;
      }
      queryParams.push(cleanFecha);
      queryText += ` AND r.fecha = $${queryParams.length}`;
    }
  }

  // 2. Filtro por estado (ignora 'todos', vacios, 'undefined' o 'null')
  if (estado && typeof estado === 'string') {
    const cleanEstado = estado.trim().toLowerCase();
    if (cleanEstado !== '' && cleanEstado !== 'todos' && cleanEstado !== 'undefined' && cleanEstado !== 'null') {
      queryParams.push(cleanEstado);
      queryText += ` AND r.estado = $${queryParams.length}`;
    }
  }

  // 3. Filtro por mesa_id
  if (mesa_id !== undefined && mesa_id !== null && mesa_id !== '' && mesa_id !== 'undefined' && mesa_id !== 'null') {
    const numMesa = parseInt(mesa_id, 10);
    if (!isNaN(numMesa) && numMesa > 0) {
      queryParams.push(numMesa);
      queryText += ` AND r.mesa_id = $${queryParams.length}`;
    }
  }

  // 4. Filtro por cliente_id
  if (cliente_id !== undefined && cliente_id !== null && cliente_id !== '' && cliente_id !== 'undefined' && cliente_id !== 'null') {
    const numCliente = parseInt(cliente_id, 10);
    if (!isNaN(numCliente) && numCliente > 0) {
      queryParams.push(numCliente);
      queryText += ` AND r.cliente_id = $${queryParams.length}`;
    }
  }

  // 5. Filtro de busqueda por texto
  if (q && typeof q === 'string') {
    const cleanQ = q.trim();
    if (cleanQ !== '' && cleanQ !== 'undefined' && cleanQ !== 'null') {
      queryParams.push(`%${cleanQ}%`);
      queryText += ` AND (c.nombre ILIKE $${queryParams.length} OR c.telefono ILIKE $${queryParams.length} OR r.nota ILIKE $${queryParams.length})`;
    }
  }

  queryText += ' ORDER BY r.fecha DESC, r.hora_inicio ASC';

  const { rows } = await db.query(queryText, queryParams);
  return rows;
};

/**
 * Obtiene el detalle completo de una reserva con relaciones
 */
const getReservaById = async (id) => {
  const queryText = `
    SELECT r.*,
           c.nombre AS cliente_nombre,
           c.telefono AS cliente_telefono,
           c.email AS cliente_email,
           c.no_shows AS cliente_no_shows,
           m.numero AS mesa_numero,
           m.capacidad AS mesa_capacidad,
           m.ubicacion AS mesa_ubicacion,
           m.activa AS mesa_activa
    FROM reservas r
    JOIN clientes c ON c.id = r.cliente_id
    JOIN mesas m ON m.id = r.mesa_id
    WHERE r.id = $1
  `;
  const { rows } = await db.query(queryText, [id]);
  return rows[0] || null;
};

/**
 * Crea una nueva reserva implementando todas las reglas de negocio y protección ante concurrencia
 */
const createReserva = async ({ cliente_id, mesa_id, fecha, hora_inicio, personas, nota }) => {
  // 1. Validaciones básicas de tipos y formatos
  if (!cliente_id || !mesa_id || !fecha || !hora_inicio || !personas) {
    const error = new Error('Todos los campos son obligatorios: cliente_id, mesa_id, fecha, hora_inicio, personas.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidDate(fecha)) {
    const error = new Error('Formato de fecha inválido. Utilice el formato YYYY-MM-DD.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidTime(hora_inicio)) {
    const error = new Error('Formato de hora de inicio inválido. Utilice HH:MM o HH:MM:SS.');
    error.statusCode = 400;
    throw error;
  }

  const numPersonas = parseInt(personas, 10);
  if (isNaN(numPersonas) || numPersonas <= 0) {
    const error = new Error('La cantidad de personas debe ser un número entero mayor a 0.');
    error.statusCode = 400;
    throw error;
  }

  // REGLA DE NEGOCIO: Duración fija de exactamente 2 horas calculada por el backend
  const normalizedHoraInicio = normalizeTime(hora_inicio);
  const normalizedHoraFin = addTwoHours(normalizedHoraInicio);

  // Ejecución atómica y protegida dentro de una transacción con bloqueo
  return await db.withTransaction(async (client) => {
    // 2. Verificar cliente y regla de inasistencias (no_shows)
    const { rows: clienteRows } = await client.query('SELECT * FROM clientes WHERE id = $1', [cliente_id]);
    if (clienteRows.length === 0) {
      const error = new Error(`El cliente con ID ${cliente_id} no existe.`);
      error.statusCode = 404;
      throw error;
    }
    const cliente = clienteRows[0];

    // REGLA DE NEGOCIO: Clientes con 3 o más ausencias no pueden realizar nuevas reservas
    if (cliente.no_shows >= 3) {
      const error = new Error(
        `El cliente "${cliente.nombre}" ha acumulado ${cliente.no_shows} inasistencias (no-shows) y no tiene permitido realizar nuevas reservas.`
      );
      error.statusCode = 409;
      throw error;
    }

    // 3. REGLA DE NEGOCIO: Horario de apertura del restaurante
    await validarHorarioAtencion(client.query.bind(client), fecha, normalizedHoraInicio, normalizedHoraFin);

    // 4. Bloqueo pesimista de la mesa para evitar condiciones de carrera simultáneas
    const { rows: mesaRows } = await client.query('SELECT * FROM mesas WHERE id = $1 FOR UPDATE', [mesa_id]);
    if (mesaRows.length === 0) {
      const error = new Error(`La mesa con ID ${mesa_id} no existe.`);
      error.statusCode = 404;
      throw error;
    }
    const mesa = mesaRows[0];

    // REGLA DE NEGOCIO: No permitir reservas en mesas inactivas
    if (!mesa.activa) {
      const error = new Error(`La mesa #${mesa.numero} está inactiva y no puede recibir reservas.`);
      error.statusCode = 409;
      throw error;
    }

    // REGLA DE NEGOCIO: Capacidad máxima
    if (numPersonas > mesa.capacidad) {
      const error = new Error(
        `La cantidad de asistentes (${numPersonas} personas) excede la capacidad máxima de la mesa #${mesa.numero} (${mesa.capacidad} personas).`
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. REGLA DE NEGOCIO: Detección estricta de solapamiento [inicio, fin)
    // Dos intervalos [I1, F1) y [I2, F2) se solapan si I1 < F2 AND F1 > I2
    const { rows: conflictoRows } = await client.query(
      `SELECT id, hora_inicio, hora_fin, estado 
       FROM reservas
       WHERE mesa_id = $1 
         AND fecha = $2 
         AND estado IN ('pendiente', 'confirmada')
         AND hora_inicio < $4 
         AND hora_fin > $3`,
      [mesa_id, fecha, normalizedHoraInicio, normalizedHoraFin]
    );

    if (conflictoRows.length > 0) {
      const c = conflictoRows[0];
      const error = new Error(
        `Conflicto de reserva: La mesa #${mesa.numero} ya tiene una reserva activa (${c.hora_inicio} a ${c.hora_fin}, estado: ${c.estado}) que se solapa con el horario solicitado (${normalizedHoraInicio} a ${normalizedHoraFin}).`
      );
      error.statusCode = 409;
      throw error;
    }

    // 6. Inserción de la nueva reserva
    const { rows: nuevaReservaRows } = await client.query(
      `INSERT INTO reservas (cliente_id, mesa_id, fecha, hora_inicio, hora_fin, personas, estado, nota)
       VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7)
       RETURNING *`,
      [cliente_id, mesa_id, fecha, normalizedHoraInicio, normalizedHoraFin, numPersonas, nota ? nota.trim() : null]
    );

    const nuevaReserva = nuevaReservaRows[0];

    // Devolver reserva con datos de relación para respuesta completa
    return {
      ...nuevaReserva,
      cliente_nombre: cliente.nombre,
      cliente_telefono: cliente.telefono,
      cliente_no_shows: cliente.no_shows,
      mesa_numero: mesa.numero,
      mesa_capacidad: mesa.capacidad,
      mesa_ubicacion: mesa.ubicacion,
    };
  });
};

/**
 * Actualiza los datos de una reserva existente (revalidando todas las reglas)
 */
const updateReserva = async (id, { mesa_id, fecha, hora_inicio, personas, nota }) => {
  const reservaActual = await getReservaById(id);
  if (!reservaActual) {
    const error = new Error(`Reserva con ID ${id} no encontrada.`);
    error.statusCode = 404;
    throw error;
  }

  // No permitir modificar reservas terminadas
  if (['cumplida', 'cancelada', 'no_show'].includes(reservaActual.estado)) {
    const error = new Error(`No se puede modificar una reserva en estado terminal (${reservaActual.estado}).`);
    error.statusCode = 409;
    throw error;
  }

  const newMesaId = mesa_id !== undefined ? parseInt(mesa_id, 10) : reservaActual.mesa_id;
  const newFecha = fecha !== undefined ? fecha : reservaActual.fecha;
  const newHoraInicio = hora_inicio !== undefined ? normalizeTime(hora_inicio) : reservaActual.hora_inicio;
  const newHoraFin = addTwoHours(newHoraInicio);
  const newPersonas = personas !== undefined ? parseInt(personas, 10) : reservaActual.personas;
  const newNota = nota !== undefined ? (nota ? nota.trim() : null) : reservaActual.nota;

  if (newPersonas <= 0) {
    const error = new Error('La cantidad de personas debe ser mayor a 0.');
    error.statusCode = 400;
    throw error;
  }

  return await db.withTransaction(async (client) => {
    // Validar horario de atención
    await validarHorarioAtencion(client.query.bind(client), newFecha, newHoraInicio, newHoraFin);

    // Bloqueo de la mesa
    const { rows: mesaRows } = await client.query('SELECT * FROM mesas WHERE id = $1 FOR UPDATE', [newMesaId]);
    if (mesaRows.length === 0) {
      const error = new Error(`Mesa con ID ${newMesaId} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }
    const mesa = mesaRows[0];

    if (!mesa.activa) {
      const error = new Error(`La mesa #${mesa.numero} está inactiva y no acepta reservas.`);
      error.statusCode = 409;
      throw error;
    }

    if (newPersonas > mesa.capacidad) {
      const error = new Error(`La cantidad de personas (${newPersonas}) excede la capacidad de la mesa #${mesa.numero} (${mesa.capacidad}).`);
      error.statusCode = 409;
      throw error;
    }

    // Validar solapamiento excluyendo la propia reserva que se edita
    const { rows: conflictoRows } = await client.query(
      `SELECT id, hora_inicio, hora_fin 
       FROM reservas
       WHERE mesa_id = $1 
         AND fecha = $2 
         AND estado IN ('pendiente', 'confirmada')
         AND id != $5
         AND hora_inicio < $4 
         AND hora_fin > $3`,
      [newMesaId, newFecha, newHoraInicio, newHoraFin, id]
    );

    if (conflictoRows.length > 0) {
      const c = conflictoRows[0];
      const error = new Error(
        `Conflicto: La mesa #${mesa.numero} ya tiene una reserva activa (${c.hora_inicio} a ${c.hora_fin}) en esa franja.`
      );
      error.statusCode = 409;
      throw error;
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE reservas
       SET mesa_id = $1, fecha = $2, hora_inicio = $3, hora_fin = $4, personas = $5, nota = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [newMesaId, newFecha, newHoraInicio, newHoraFin, newPersonas, newNota, id]
    );

    return updatedRows[0];
  });
};

/**
 * Cambia el estado de una reserva según la matriz de transiciones permitidas
 * e incrementa atómicamente el contador de inasistencias en caso de no_show
 */
const updateEstadoReserva = async (id, nuevoEstado) => {
  const estadosPermitidos = ['pendiente', 'confirmada', 'cumplida', 'cancelada', 'no_show'];
  if (!estadosPermitidos.includes(nuevoEstado)) {
    const error = new Error(`Estado "${nuevoEstado}" no válido. Valores permitidos: ${estadosPermitidos.join(', ')}.`);
    error.statusCode = 400;
    throw error;
  }

  return await db.withTransaction(async (client) => {
    // Bloquear fila de la reserva para transición atómica
    const { rows: reservaRows } = await client.query('SELECT * FROM reservas WHERE id = $1 FOR UPDATE', [id]);
    if (reservaRows.length === 0) {
      const error = new Error(`Reserva con ID ${id} no encontrada.`);
      error.statusCode = 404;
      throw error;
    }

    const reserva = reservaRows[0];
    const estadoActual = reserva.estado;

    // Si el estado ya es el mismo, devolver sin cambios
    if (estadoActual === nuevoEstado) {
      return reserva;
    }

    // Verificar si la transición es válida
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      const error = new Error(
        `Transición de estado inválida: No se permite cambiar de "${estadoActual}" a "${nuevoEstado}".`
      );
      error.statusCode = 409;
      throw error;
    }

    // Si la transición es hacia 'no_show', incrementar ausencias del cliente (solo una vez)
    if (nuevoEstado === 'no_show' && estadoActual !== 'no_show') {
      await client.query(
        'UPDATE clientes SET no_shows = no_shows + 1 WHERE id = $1',
        [reserva.cliente_id]
      );
    }

    // Actualizar estado de la reserva
    const { rows: updatedRows } = await client.query(
      `UPDATE reservas 
       SET estado = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [nuevoEstado, id]
    );

    return updatedRows[0];
  });
};

/**
 * Elimina una reserva respetando la integridad referencial
 */
const deleteReserva = async (id) => {
  const reserva = await getReservaById(id);
  if (!reserva) {
    const error = new Error(`Reserva con ID ${id} no encontrada.`);
    error.statusCode = 404;
    throw error;
  }

  // Las reservas cumplidas o marcadas como no_show forman parte del historial de auditoría
  if (['cumplida', 'no_show'].includes(reserva.estado)) {
    const error = new Error(
      `No se permite eliminar una reserva en estado "${reserva.estado}" para preservar la integridad del historial de auditoría y ausencias.`
    );
    error.statusCode = 409;
    throw error;
  }

  await db.query('DELETE FROM reservas WHERE id = $1', [id]);
  return { message: `Reserva con ID ${id} eliminada exitosamente.` };
};

module.exports = {
  getAllReservas,
  getReservaById,
  createReserva,
  updateReserva,
  updateEstadoReserva,
  deleteReserva,
};
