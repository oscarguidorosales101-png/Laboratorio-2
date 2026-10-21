const db = require('../db');

/**
 * Servicio para gestión de clientes y seguimiento de inasistencias
 */
const getAllClientes = async ({ search } = {}) => {
  let queryText = 'SELECT * FROM clientes WHERE 1=1';
  const queryParams = [];

  if (search && search.trim() !== '') {
    queryParams.push(`%${search.trim()}%`);
    queryText += ` AND (nombre ILIKE $${queryParams.length} OR telefono ILIKE $${queryParams.length} OR email ILIKE $${queryParams.length})`;
  }

  queryText += ' ORDER BY nombre ASC';

  const { rows } = await db.query(queryText, queryParams);
  return rows;
};

const getClienteById = async (id) => {
  const { rows } = await db.query(
    `SELECT c.*, 
            COUNT(r.id)::int AS total_reservas,
            COUNT(CASE WHEN r.estado = 'no_show' THEN 1 END)::int AS reservas_no_show
     FROM clientes c
     LEFT JOIN reservas r ON r.cliente_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [id]
  );
  return rows[0] || null;
};

const createCliente = async ({ nombre, telefono, email }) => {
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    const error = new Error('El nombre del cliente es obligatorio.');
    error.statusCode = 400;
    throw error;
  }

  if (!telefono || typeof telefono !== 'string' || telefono.trim() === '') {
    const error = new Error('El teléfono del cliente es obligatorio.');
    error.statusCode = 400;
    throw error;
  }

  const { rows } = await db.query(
    `INSERT INTO clientes (nombre, telefono, email, no_shows)
     VALUES ($1, $2, $3, 0)
     RETURNING *`,
    [nombre.trim(), telefono.trim(), email ? email.trim() : null]
  );

  return rows[0];
};

const updateCliente = async (id, { nombre, telefono, email }) => {
  const cliente = await getClienteById(id);
  if (!cliente) {
    const error = new Error(`Cliente con ID ${id} no encontrado.`);
    error.statusCode = 404;
    throw error;
  }

  const nom = nombre !== undefined ? nombre.trim() : cliente.nombre;
  const tel = telefono !== undefined ? telefono.trim() : cliente.telefono;
  const em = email !== undefined ? (email ? email.trim() : null) : cliente.email;

  if (!nom || !tel) {
    const error = new Error('El nombre y el teléfono no pueden estar vacíos.');
    error.statusCode = 400;
    throw error;
  }

  // REGLA DE NEGOCIO: No se permite editar arbitrariamente el contador de no_shows desde aquí
  const { rows } = await db.query(
    `UPDATE clientes
     SET nombre = $1, telefono = $2, email = $3
     WHERE id = $4
     RETURNING *`,
    [nom, tel, em, id]
  );

  return rows[0];
};

const deleteCliente = async (id) => {
  const cliente = await getClienteById(id);
  if (!cliente) {
    const error = new Error(`Cliente con ID ${id} no encontrado.`);
    error.statusCode = 404;
    throw error;
  }

  // REGLA DE INTEGRIDAD: No eliminar clientes que tengan historial de reservas
  const reservas = await db.query('SELECT COUNT(*) AS total FROM reservas WHERE cliente_id = $1', [id]);
  const total = parseInt(reservas.rows[0].total, 10);

  if (total > 0) {
    const error = new Error(
      `No se puede eliminar el cliente "${cliente.nombre}" porque tiene ${total} reserva(s) registrada(s) en el historial.`
    );
    error.statusCode = 409;
    throw error;
  }

  await db.query('DELETE FROM clientes WHERE id = $1', [id]);
  return { message: `Cliente "${cliente.nombre}" eliminado exitosamente.` };
};

module.exports = {
  getAllClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};
