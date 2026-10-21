const express = require('express');
const cors = require('cors');
require('dotenv').config();

const mesasRoutes = require('./routes/mesas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const reservasRoutes = require('./routes/reservas.routes');
const horariosRoutes = require('./routes/horarios.routes');
const disponibilidadRoutes = require('./routes/disponibilidad.routes');
const resumenRoutes = require('./routes/resumen.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Configuración de CORS segura
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5678'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (como herramientas de prueba curl, postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origen ${origin} no permitido por política CORS.`));
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

// Logger seguro para desarrollo (registra método y URL sin volcar datos sensibles)
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

// Endpoint de verificación de salud (Health Check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    ok: true,
    status: 'online',
    servicio: 'API Reservas Restaurante - Laboratorio #2',
    timestamp: new Date().toISOString(),
  });
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
