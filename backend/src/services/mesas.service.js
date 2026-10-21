const db = require('../db');

/**
 * Servicio para gestión del catálogo de mesas
 */
const getAllMesas = async ({ activa, ubicacion, capacidadMin } = {}) => {
  let queryText = 'SELECT * FROM mesas WHERE 1=1';
  const queryParams = [];

  if (activa !== undefined && activa !== null && activa !== '') {
    queryParams.push(activa === 'true' || activa === true);
    queryText += ` AND activa = $${queryParams.length}`;
  }

  if (ubicacion) {
    queryParams.push(ubicacion);
    queryText += ` AND ubicacion ILIKE $${queryParams.length}`;
  }

  if (capacidadMin) {
    queryParams.push(parseInt(capacidadMin, 10));
    queryText += ` AND capacidad >= $${queryParams.length}`;
  }

  queryText += ' ORDER BY numero ASC';

  const { rows } = await db.query(queryText, queryParams);
  return rows;
};

const getMesaById = async (id) => {
  const { rows } = await db.query('SELECT * FROM mesas WHERE id = $1', [id]);
  return rows[0] || null;
};

const createMesa = async ({ numero, capacidad, ubicacion, activa = true }) => {
  const cap = parseInt(capacidad, 10);
  const num = parseInt(numero, 10);

  if (isNaN(num) || num <= 0) {
    const error = new Error('El número de mesa debe ser un entero positivo.');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(cap) || cap <= 0) {
    const error = new Error('La capacidad de la mesa debe ser mayor a 0 personas.');
    error.statusCode = 400;
    throw error;
  }

  if (!ubicacion || typeof ubicacion !== 'string' || ubicacion.trim() === '') {
    const error = new Error('La ubicación de la mesa es obligatoria.');
    error.statusCode = 400;
    throw error;
  }

  // Verificar si ya existe una mesa con ese número
  const existing = await db.query('SELECT id FROM mesas WHERE numero = $1', [num]);
  if (existing.rows.length > 0) {
    const error = new Error(`Ya existe una mesa con el número ${num}.`);
    error.statusCode = 409;
    throw error;
  }

  const { rows } = await db.query(
    `INSERT INTO mesas (numero, capacidad, ubicacion, activa)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [num, cap, ubicacion.trim(), activa]
  );

  return rows[0];
};

const updateMesa = async (id, { numero, capacidad, ubicacion, activa }) => {
  const mesa = await getMesaById(id);
  if (!mesa) {
    const error = new Error(`Mesa con ID ${id} no encontrada.`);
    error.statusCode = 404;
    throw error;
  }

  const num = numero !== undefined ? parseInt(numero, 10) : mesa.numero;
  const cap = capacidad !== undefined ? parseInt(capacidad, 10) : mesa.capacidad;
  const ubi = ubicacion !== undefined ? ubicacion.trim() : mesa.ubicacion;
  const act = activa !== undefined ? Boolean(activa) : mesa.activa;

  if (num <= 0 || cap <= 0 || !ubi) {
    const error = new Error('Valores inválidos: el número y la capacidad deben ser positivos y la ubicación no puede estar vacía.');
    error.statusCode = 400;
    throw error;
  }

  // Si cambia el número, verificar que no colisione
  if (num !== mesa.numero) {
    const existing = await db.query('SELECT id FROM mesas WHERE numero = $1 AND id != $2', [num, id]);
    if (existing.rows.length > 0) {
      const error = new Error(`El número de mesa ${num} ya está en uso.`);
      error.statusCode = 409;
      throw error;
    }
  }

  const { rows } = await db.query(
    `UPDATE mesas
     SET numero = $1, capacidad = $2, ubicacion = $3, activa = $4
     WHERE id = $5
     RETURNING *`,
    [num, cap, ubi, act, id]
  );

  return rows[0];
};

const deleteMesa = async (id) => {
  const mesa = await getMesaById(id);
  if (!mesa) {
    const error = new Error(`Mesa con ID ${id} no encontrada.`);
    error.statusCode = 404;
    throw error;
  }

  // Verificar si tiene reservas asociadas (activas o históricas)
  const reservas = await db.query('SELECT COUNT(*) AS total FROM reservas WHERE mesa_id = $1', [id]);
  const total = parseInt(reservas.rows[0].total, 10);

  if (total > 0) {
    const error = new Error(
      `No se puede eliminar la mesa #${mesa.numero} porque tiene ${total} reserva(s) registrada(s). Para no recibir más reservas, cambie su estado a inactiva.`
    );
    error.statusCode = 409;
    throw error;
  }

  await db.query('DELETE FROM mesas WHERE id = $1', [id]);
  return { message: `Mesa #${mesa.numero} eliminada exitosamente.` };
};

module.exports = {
  getAllMesas,
  getMesaById,
  createMesa,
  updateMesa,
  deleteMesa,
};
