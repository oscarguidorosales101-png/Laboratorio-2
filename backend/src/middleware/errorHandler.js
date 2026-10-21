/**
 * Middleware centralizado para el manejo seguro de errores
 * Estandariza la respuesta en el formato: { ok: false, error: "mensaje" }
 * Protege contra fugas de trazas internas o credenciales hacia el cliente
 */
const errorHandler = (err, req, res, next) => {
  // Estado HTTP por defecto: 500 (Internal Server Error)
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Error interno del servidor';

  // Manejo de códigos de error específicos de PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        statusCode = 409;
        message = 'Conflicto: Ya existe un registro con los datos suministrados.';
        if (err.detail && err.detail.includes('numero')) {
          message = 'Ya existe una mesa registrada con ese número.';
        }
        break;

      case '23503': // foreign_key_violation
        statusCode = 409;
        message = 'Conflicto de integridad: No se puede eliminar o modificar el registro porque está relacionado con otros datos.';
        if (err.detail && err.detail.includes('mesas')) {
          message = 'La mesa especificada no existe o no es válida.';
        } else if (err.detail && err.detail.includes('clientes')) {
          message = 'El cliente especificado no existe o no es válido.';
        }
        break;

      case '23514': // check_violation
        statusCode = 400;
        message = 'Violación de restricción de datos en la base de datos.';
        if (err.constraint === 'chk_duracion_dos_horas') {
          message = 'Regla de negocio violada: La reserva debe durar exactamente 2 horas.';
        } else if (err.constraint === 'chk_horas_coherentes') {
          message = 'La hora de finalización debe ser posterior a la hora de inicio.';
        }
        break;

      case '23P01': // exclusion_violation
        statusCode = 409;
        message = 'Conflicto de disponibilidad: La mesa ya se encuentra reservada en esa franja horaria.';
        break;

      case '22007': // invalid_datetime_format
      case '22008': // datetime_field_overflow
        statusCode = 400;
        message = 'Formato de fecha u hora no válido.';
        break;

      case 'ECONNREFUSED':
        statusCode = 503;
        message = 'No se pudo establecer conexión con el servidor de base de datos.';
        break;

      default:
        // Mantener mensaje genérico para otros errores de bajo nivel
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[PG Error ${err.code}]:`, err.message);
        }
        break;
    }
  }

  // Registrar el error en la consola del servidor para diagnóstico (sin exponer secretos)
  if (statusCode >= 500) {
    console.error(`[Error 500 en ${req.method} ${req.originalUrl}]:`, err.message);
  }

  res.status(statusCode).json({
    ok: false,
    error: message,
  });
};

module.exports = errorHandler;
