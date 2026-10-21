const { Pool } = require('pg');
require('dotenv').config();

// Configuración del Pool de conexiones a PostgreSQL
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'restaurante_reservas',
      max: 20, // Máximo de conexiones concurrentes en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Error imprevisto en el cliente del Pool de PostgreSQL:', err.message);
});

/**
 * Ejecuta una consulta SQL parametrizada garantizando el uso de parámetros
 * @param {string} text Sentencia SQL
 * @param {Array} params Parámetros para la consulta
 */
const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta un bloque de operaciones dentro de una transacción segura
 * Hace ROLLBACK automático en caso de error y libera el cliente
 * @param {Function} callback Función asíncrona que recibe el cliente de la transacción
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
};
