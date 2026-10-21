const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const mesasRoutes = require('./routes/mesas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const reservasRoutes = require('./routes/reservas.routes');
const horariosRoutes = require('./routes/horarios.routes');
const disponibilidadRoutes = require('./routes/disponibilidad.routes');
const resumenRoutes = require('./routes/resumen.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Configuracion de CORS flexible para cualquier puerto localhost de desarrollo
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (curl, postman, n8n interno) o cualquier puerto en localhost
      if (
        !origin ||
        /^http:\/\/localhost(:\d+)?$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        configuredOrigins.includes(origin) ||
        configuredOrigins.includes('*')
      ) {
        callback(null, true);
      } else {
        callback(new Error(`Origen ${origin} no permitido por politica CORS.`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Middlewares para parseo de JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger seguro para desarrollo (registra metodo y URL sin volcar datos sensibles)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Endpoint de verificacion de salud con comprobacion real de PostgreSQL
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT NOW() AS current_time, current_database() AS db_name');
    res.status(200).json({
      ok: true,
      status: 'online',
      servicio: 'API Reservas Restaurante - Laboratorio #2',
      database: {
        connected: true,
        name: rows[0].db_name,
        time: rows[0].current_time,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      status: 'degraded',
      servicio: 'API Reservas Restaurante - Laboratorio #2',
      database: {
        connected: false,
        error: 'No se pudo conectar a la base de datos PostgreSQL',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Montaje de rutas modulares
app.use('/api/mesas', mesasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);
app.use('/api/resumen', resumenRoutes);

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: `Recurso no encontrado: ${req.method} ${req.originalUrl}`,
  });
});

// Middleware centralizado de manejo de errores
app.use(errorHandler);

module.exports = app;
