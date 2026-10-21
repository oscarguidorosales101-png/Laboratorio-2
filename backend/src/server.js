const app = require('./app');
const db = require('./db');
require('dotenv').config();

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`Servidor Backend iniciado en: http://localhost:${PORT}`);
  console.log(`Endpoints disponibles en: http://localhost:${PORT}/api`);
  console.log(`=======================================================`);

  // Verificar conectividad con PostgreSQL
  try {
    const { rows } = await db.query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log(`[BD] Conexion exitosa a PostgreSQL:`);
    console.log(`     Base de datos: ${rows[0].db_name}`);
    console.log(`     Hora del servidor BD: ${rows[0].current_time}`);
  } catch (err) {
    console.warn(`[BD] Advertencia de base de datos:`);
    console.warn(`     No se pudo conectar a PostgreSQL (${err.message}).`);
    console.warn(`     Verifique las variables en backend/.env o ejecute npm run init-db.`);
  }
});

// Manejo de apagado graceful
const shutdown = async () => {
  console.log('\nCerrando servidor backend de forma segura...');
  server.close(async () => {
    try {
      await db.pool.end();
      console.log('Conexiones a PostgreSQL cerradas.');
    } catch (err) {
      console.error('Error al cerrar el pool de PostgreSQL:', err.message);
    }
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
