const disponibilidadService = require('./disponibilidad.service');

const N8N_WEBHOOK_URL = process.env.N8N_RESERVAS_WEBHOOK || 'http://localhost:5678/webhook/restaurante-ia';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

/**
 * Servicio de integracion con el Agente de IA y Gemini
 */
const procesarConsultaIA = async (mensaje) => {
  if (!mensaje || typeof mensaje !== 'string' || mensaje.trim().length === 0) {
    const error = new Error('El mensaje en lenguaje natural es obligatorio.');
    error.statusCode = 400;
    throw error;
  }

  const promptTexto = mensaje.trim();

  // 1. Intentar delegar al Webhook de n8n primero
  try {
    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: promptTexto }),
    });

    if (n8nRes.ok) {
      const json = await n8nRes.json();
      if (json && json.ok) {
        return json;
      }
    }
  } catch (err) {
    // Si n8n no responde o falla, continuar con el motor directo
  }

  // 2. Procesamiento de extraccion de parametros
  const hoy = new Date();
  let fecha = hoy.toISOString().split('T')[0];
  const lower = promptTexto.toLowerCase();

  if (lower.includes('manana') || lower.includes('mañana')) {
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    fecha = manana.toISOString().split('T')[0];
  } else if (lower.includes('viernes')) {
    const target = new Date(hoy);
    const day = target.getDay();
    const diff = (5 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
    fecha = target.toISOString().split('T')[0];
  } else if (lower.includes('sabado') || lower.includes('sábado')) {
    const target = new Date(hoy);
    const day = target.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
    fecha = target.toISOString().split('T')[0];
  } else if (lower.includes('domingo')) {
    const target = new Date(hoy);
    const day = target.getDay();
    const diff = (0 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
    fecha = target.toISOString().split('T')[0];
  } else if (lower.includes('lunes')) {
    const target = new Date(hoy);
    const day = target.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    target.setDate(target.getDate() + (diff === 0 ? 7 : diff));
    fecha = target.toISOString().split('T')[0];
  }

  // Extraccion de hora (24h)
  let hora = '18:00';
  const matchHora = lower.match(/(\d{1,2}):(\d{2})/);
  if (matchHora) {
    hora = `${matchHora[1].padStart(2, '0')}:${matchHora[2]}`;
  } else if (lower.includes('ocho de la noche') || lower.includes('8 de la noche') || lower.includes('20:00') || lower.includes('8:00 pm')) {
    hora = '20:00';
  } else if (lower.includes('siete de la noche') || lower.includes('7 de la noche') || lower.includes('19:00') || lower.includes('7:00 pm')) {
    hora = '19:00';
  } else if (lower.includes('dos de la tarde') || lower.includes('2 de la tarde') || lower.includes('14:00')) {
    hora = '14:00';
  } else if (lower.includes('una de la tarde') || lower.includes('1 de la tarde') || lower.includes('13:00')) {
    hora = '13:00';
  }

  // Extraccion de personas
  let personas = 2;
  const matchNum = lower.match(/(\d+)\s*(personas|comensales|pax)/);
  if (matchNum) {
    personas = parseInt(matchNum[1], 10);
  } else if (lower.includes('cuatro personas') || lower.includes('para 4')) {
    personas = 4;
  } else if (lower.includes('dos personas') || lower.includes('para 2')) {
    personas = 2;
  } else if (lower.includes('tres personas') || lower.includes('para 3')) {
    personas = 3;
  } else if (lower.includes('seis personas') || lower.includes('para 6')) {
    personas = 6;
  }

  // Extraccion de ubicacion
  let ubicacion = '';
  if (lower.includes('terraza')) ubicacion = 'Terraza';
  else if (lower.includes('ventanal')) ubicacion = 'Ventanal';
  else if (lower.includes('vip') || lower.includes('zona vip')) ubicacion = 'Zona VIP';
  else if (lower.includes('interior')) ubicacion = 'Interior';

  // 3. Consultar disponibilidad REAL en PostgreSQL
  const resDisp = await disponibilidadService.consultarDisponibilidad({
    fecha,
    hora,
    personas,
    ubicacion,
  });

  let respuestaAgente = '';
  if (!resDisp.disponible) {
    respuestaAgente = `No fue posible encontrar disponibilidad para los parametros solicitados. ${resDisp.motivo || 'Verifique el horario o la capacidad.'}`;
  } else {
    const mesaSugerida = resDisp.mesas[0];
    respuestaAgente = `Disponibilidad confirmada en base de datos para el ${fecha} (${resDisp.hora_inicio.slice(0, 5)} a ${resDisp.hora_fin.slice(0, 5)}). Se encontraron ${resDisp.total_mesas_disponibles} mesas libres. Mesa sugerida: #${mesaSugerida.numero} (${mesaSugerida.capacidad} personas, ${mesaSugerida.ubicacion}). Cada reserva dura exactamente 2 horas fijas.`;
  }

  return {
    ok: true,
    data: {
      mensaje: respuestaAgente,
      agente: 'Agente IA (Procesamiento de Lenguaje Natural + API Disponibilidad)',
      parametros_extraidos: {
        fecha,
        hora,
        personas,
        ubicacion: ubicacion || 'Cualquiera',
      },
      disponibilidad: resDisp,
      timestamp: new Date().toISOString(),
    },
    error: null,
  };
};

module.exports = {
  procesarConsultaIA,
};
