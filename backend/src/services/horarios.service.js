const db = require('../db');
const { isValidTime, timeToMinutes } = require('../middleware/validator');

/**
 * Servicio para gestión y validación de horarios semanales
 */
const getAllHorarios = async () => {
  const { rows } = await db.query(
    'SELECT * FROM horarios ORDER BY dia_semana ASC'
  );
  return rows;
};

const getHorarioByDia = async (diaSemana) => {
  const dia = parseInt(diaSemana, 10);
  if (isNaN(dia) || dia < 0 || dia > 6) {
    const error = new Error('Día de semana no válido. Debe ser un entero entre 0 (Domingo) y 6 (Sábado).');
    error.statusCode = 400;
    throw error;
  }

  const { rows } = await db.query(
    'SELECT * FROM horarios WHERE dia_semana = $1',
    [dia]
  );
  return rows[0] || null;
};

const updateHorario = async (id, { abierto, apertura, cierre }) => {
  const { rows: existingRows } = await db.query(
    'SELECT * FROM horarios WHERE id = $1',
    [id]
  );

  if (existingRows.length === 0) {
    const error = new Error(`Horario con ID ${id} no encontrado.`);
    error.statusCode = 404;
    throw error;
  }

  const horario = existingRows[0];
  const isAbierto = abierto !== undefined ? Boolean(abierto) : horario.abierto;
  const horaApertura = apertura !== undefined ? apertura : horario.apertura;
  const horaCierre = cierre !== undefined ? cierre : horario.cierre;

  if (isAbierto) {
    if (!isValidTime(horaApertura) || !isValidTime(horaCierre)) {
      const error = new Error('Formato de hora de apertura o cierre inválido. Use HH:MM o HH:MM:SS.');
      error.statusCode = 400;
      throw error;
    }

    if (timeToMinutes(horaCierre) <= timeToMinutes(horaApertura)) {
      const error = new Error('La hora de cierre debe ser posterior a la hora de apertura.');
      error.statusCode = 400;
      throw error;
    }
  }

  const { rows } = await db.query(
    `UPDATE horarios
     SET abierto = $1, apertura = $2, cierre = $3
     WHERE id = $4
     RETURNING *`,
    [isAbierto, horaApertura, horaCierre, id]
  );

  return rows[0];
};

module.exports = {
  getAllHorarios,
  getHorarioByDia,
  updateHorario,
};
