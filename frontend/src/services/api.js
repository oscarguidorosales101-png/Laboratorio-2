/**
 * Capa centralizada de comunicación con la API REST del backend y webhook de n8n
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/restaurante-ia';

/**
 * Cliente HTTP base con manejo robusto de errores y formato JSON estandarizado
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    let jsonResult;

    try {
      jsonResult = await response.json();
    } catch (parseErr) {
      if (!response.ok) {
        throw new Error(`Error del servidor (${response.status} ${response.statusText})`);
      }
      return null;
    }

    if (!response.ok) {
      const errorMessage = jsonResult?.error || jsonResult?.message || `Error HTTP ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = jsonResult;
      throw error;
    }

    // Retorna la propiedad data si cumple el contrato { ok: true, data: ... }
    return jsonResult.data !== undefined ? jsonResult.data : jsonResult;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netError = new Error('No fue posible conectar con el servidor backend (verifique que esté iniciado en el puerto 3000).');
      netError.status = 503;
      throw netError;
    }
    throw err;
  }
}

export const api = {
  // Verificación de estado
  getHealth: () => request('/health'),

  // MESAS
  getMesas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/mesas${query ? `?${query}` : ''}`);
  },
  getMesaById: (id) => request(`/mesas/${id}`),
  createMesa: (data) => request('/mesas', { method: 'POST', body: JSON.stringify(data) }),
  updateMesa: (id, data) => request(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMesa: (id) => request(`/mesas/${id}`, { method: 'DELETE' }),

  // CLIENTES
  getClientes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/clientes${query ? `?${query}` : ''}`);
  },
  getClienteById: (id) => request(`/clientes/${id}`),
  createCliente: (data) => request('/clientes', { method: 'POST', body: JSON.stringify(data) }),
  updateCliente: (id, data) => request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCliente: (id) => request(`/clientes/${id}`, { method: 'DELETE' }),

  // RESERVAS
  getReservas: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reservas${query ? `?${query}` : ''}`);
  },
  getReservaById: (id) => request(`/reservas/${id}`),
  createReserva: (data) => request('/reservas', { method: 'POST', body: JSON.stringify(data) }),
  updateReserva: (id, data) => request(`/reservas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateEstadoReserva: (id, estado) => request(`/reservas/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }),
  deleteReserva: (id) => request(`/reservas/${id}`, { method: 'DELETE' }),

  // HORARIOS
  getHorarios: () => request('/horarios'),
  getHorarioByDia: (dia) => request(`/horarios/dia/${dia}`),
  updateHorario: (id, data) => request(`/horarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // DISPONIBILIDAD
  getDisponibilidad: ({ fecha, hora, personas, ubicacion } = {}) => {
    const params = new URLSearchParams();
    if (fecha) params.append('fecha', fecha);
    if (hora) params.append('hora', hora);
    if (personas) params.append('personas', personas);
    if (ubicacion) params.append('ubicacion', ubicacion);
    return request(`/disponibilidad?${params.toString()}`);
  },

  // MÉTRICAS Y RESUMEN
  getResumen: (fecha) => {
    const query = fecha ? `?fecha=${fecha}` : '';
    return request(`/resumen${query}`);
  },

  // CONSULTA ASISTENTE IA (n8n Webhook o Fallback Directo de Disponibilidad)
  consultarAgenteIA: async (mensaje) => {
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje }),
      });

      if (!response.ok) {
        throw new Error(`El webhook de n8n respondió con error HTTP ${response.status}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      console.warn('Fallo en webhook de n8n, invocando fallback de disponibilidad directa:', err.message);
      throw err;
    }
  },
};

export default api;
