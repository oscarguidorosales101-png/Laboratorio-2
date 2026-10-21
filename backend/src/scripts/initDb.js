const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const targetDbName = process.env.DB_NAME || 'restaurante_reservas';

async function init() {
  console.log('--- INICIALIZADOR DE BASE DE DATOS POSTGRESQL ---');
  console.log(`Host: ${dbHost}:${dbPort} | Usuario: ${dbUser} | BD Destino: ${targetDbName}`);

  // 1. Conectar a la base de datos de administración 'postgres' para crear la BD si no existe
  const adminClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    await adminClient.connect();
    console.log('[OK] Conexión administrativa a PostgreSQL exitosa.');

    const checkDbRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`Creando base de datos "${targetDbName}"...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`[OK] Base de datos "${targetDbName}" creada exitosamente.`);
    } else {
      console.log(`[INFO] La base de datos "${targetDbName}" ya existe.`);
    }
  } catch (err) {
    console.error('[ERROR] Error en conexión administrativa:', err.message);
    if (err.code === '28P01') {
      console.error('[AYUDA] Verifique la contraseña configurada en backend/.env (DB_PASSWORD).');
    }
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // 2. Conectar a la base de datos de la aplicación y ejecutar schema.sql
  const appClient = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: targetDbName,
  });

  try {
    await appClient.connect();
    console.log(`[OK] Conectado a "${targetDbName}". Leyendo schema.sql...`);

    const schemaPath = path.join(__dirname, '../../../schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró el archivo schema.sql en: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await appClient.query(schemaSql);
    console.log('[OK] Esquema y datos semilla ejecutados correctamente.');

    // Verificar conteos
    const mesasCount = await appClient.query('SELECT COUNT(*) FROM mesas');
    const clientesCount = await appClient.query('SELECT COUNT(*) FROM clientes');
    const horariosCount = await appClient.query('SELECT COUNT(*) FROM horarios');
    const reservasCount = await appClient.query('SELECT COUNT(*) FROM reservas');

    console.log('\n--- RESUMEN DE LA BASE DE DATOS ---');
    console.log(`- Mesas registradas:    ${mesasCount.rows[0].count}`);
    console.log(`- Clientes registrados: ${clientesCount.rows[0].count}`);
    console.log(`- Horarios semanales:   ${horariosCount.rows[0].count}`);
    console.log(`- Reservas de prueba:   ${reservasCount.rows[0].count}`);
    console.log('------------------------------------\n');
  } catch (err) {
    console.error('[ERROR] Error al ejecutar schema.sql:', err.message);
    process.exit(1);
  } finally {
    await appClient.end();
  }
}

init();
