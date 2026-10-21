/**
 * Middleware y utilidades de validacion de entradas HTTP
 */

/**
 * Valida formato de fecha ISO YYYY-MM-DD
 */
const isValidDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const d = new Date(dateString + 'T00:00:00');
  return !isNaN(d.getTime());
};

/**
 * Valida formato de hora HH:MM o HH:MM:SS (24 horas)
 */
const isValidTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return false;
  const regex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return regex.test(timeString);
};

/**
 * Normaliza una hora al formato HH:MM:SS
 */
const normalizeTime = (timeString) => {
  if (!timeString) return '';
  const parts = timeString.split(':');
  const hh = parts[0].padStart(2, '0');
  const mm = (parts[1] || '00').padStart(2, '0');
  const ss = (parts[2] || '00').padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

/**
 * Suma exactamente 2 horas a una hora HH:MM o HH:MM:SS
 */
const addTwoHours = (timeString) => {
  const normalized = normalizeTime(timeString);
  const [hh, mm, ss] = normalized.split(':').map(Number);
  const totalMinutes = hh * 60 + mm + 120; // + 2 horas = 120 minutos
  const newHh = Math.floor(totalMinutes / 60);
  const newMm = totalMinutes % 60;
  
  if (newHh >= 24) {
    const error = new Error('La reserva excede el limite del dia actual (no se permite traslape a la medianoche).');
    error.statusCode = 409;
    throw error;
  }

  return `${String(newHh).padStart(2, '0')}:${String(newMm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/**
 * Convierte un string de hora HH:MM:SS a minutos desde las 00:00 para comparacion directa
 */
const timeToMinutes = (timeString) => {
  const normalized = normalizeTime(timeString);
  const [hh, mm] = normalized.split(':').map(Number);
  return hh * 60 + mm;
};

module.exports = {
  isValidDate,
  isValidTime,
  normalizeTime,
  addTwoHours,
  timeToMinutes,
};
