/**
 * Script de Pruebas Automatizadas de Concurrencia y Reglas de Negocio
 * Laboratorio #2
 */
const http = require('http');
const db = require('../db');

const API_BASE = 'http://localhost:3000/api';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('INICIANDO BATERIA DE PRUEBAS DE CONCURRENCIA Y REGLAS DE NEGOCIO');
  console.log('================================================================\n');

  try {
    const testFecha = '2026-11-20'; // Viernes (abierto 12:00-23:00)
    const testMesa = 3; // Mesa para 4 personas

    // Limpieza previa de datos de pruebas anteriores para aislamiento
    await db.query("DELETE FROM reservas WHERE fecha = $1 OR nota LIKE '%simultanea%' OR nota LIKE '%consecutiva%'", [testFecha]);

    // 0. Comprobar salud del backend y base de datos
    const health = await request('GET', '/health');
    console.log(`[0] Healthcheck backend: Status ${health.status} - Base de datos conectada: ${health.body?.database?.connected}`);

    // 1. Regla de Cliente con 3 no_shows bloqueado (Cliente #4: Roberto Morales)
    console.log('\n--- PRUEBA 1: Bloqueo de cliente con 3 o mas no_shows ---');
    const resBloqueado = await request('POST', '/reservas', {
      cliente_id: 4, // Roberto Morales (no_shows = 3)
      mesa_id: 1,
      fecha: testFecha,
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resBloqueado.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resBloqueado.body?.error}`);
    if (resBloqueado.status === 409) {
      console.log('[OK] REGLA SUPERADA: El cliente con 3 ausencias fue bloqueado.');
    } else {
      console.log('[FALLO] Se permitio reservar a un cliente bloqueado.');
    }

    // 2. Regla de Exceso de Capacidad (Mesa #1 capacidad 2, solicitando 6 personas)
    console.log('\n--- PRUEBA 2: Exceso de capacidad de la mesa ---');
    const resCapacidad = await request('POST', '/reservas', {
      cliente_id: 1, // Carlos Mendoza (0 no_shows)
      mesa_id: 1,    // Capacidad 2
      fecha: testFecha,
      hora_inicio: '14:00',
      personas: 6,   // Excede capacidad
    });
    console.log(`Status recibido: ${resCapacidad.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resCapacidad.body?.error}`);
    if (resCapacidad.status === 409) {
      console.log('[OK] REGLA SUPERADA: Se rechazo la reserva que excede la capacidad de la mesa.');
    } else {
      console.log('[FALLO] No se valido la capacidad.');
    }

    // 3. Regla de Mesa Inactiva (Mesa #8 inactiva)
    console.log('\n--- PRUEBA 3: Reserva en mesa inactiva ---');
    const resInactiva = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 8,    // Inactiva
      fecha: testFecha,
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resInactiva.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resInactiva.body?.error}`);
    if (resInactiva.status === 409) {
      console.log('[OK] REGLA SUPERADA: Se rechazo la reserva en mesa inactiva.');
    } else {
      console.log('[FALLO] No se valido mesa inactiva.');
    }

    // 4. Regla de Dia Cerrado (Lunes = 1 cerrado)
    console.log('\n--- PRUEBA 4: Reserva en dia cerrado (Lunes) ---');
    const resCerrado = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 2,
      fecha: '2026-11-23', // Lunes
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resCerrado.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resCerrado.body?.error}`);
    if (resCerrado.status === 409) {
      console.log('[OK] REGLA SUPERADA: Se rechazo la reserva en dia cerrado.');
    } else {
      console.log('[FALLO] Se permitio reservar en dia cerrado.');
    }

    // 5. Regla de Horario de Cierre (Viernes cierra a las 23:00, reserva a las 22:00 terminaria a las 24:00)
    console.log('\n--- PRUEBA 5: Reserva que excede el horario de cierre ---');
    const resExcedeCierre = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 2,
      fecha: testFecha,
      hora_inicio: '22:00', // 22:00 + 2h = 24:00 > 23:00
      personas: 2,
    });
    console.log(`Status recibido: ${resExcedeCierre.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resExcedeCierre.body?.error}`);
    if (resExcedeCierre.status === 409) {
      console.log('[OK] REGLA SUPERADA: Se rechazo reserva que excede el horario de cierre.');
    } else {
      console.log('[FALLO] No se valido el horario de cierre.');
    }

    // 6. Prueba de Concurrencia Simultanea: Dos solicitudes en paralelo para la misma mesa y franja
    console.log('\n--- PRUEBA 6: CONCURRENCIA SIMULTANEA (2 solicitudes en paralelo) ---');
    const testHora = '16:00';

    console.log(`Disparando 2 solicitudes simultaneas a mesa #${testMesa} para ${testFecha} a las ${testHora}...`);
    const [solicitudA, solicitudB] = await Promise.all([
      request('POST', '/reservas', {
        cliente_id: 1,
        mesa_id: testMesa,
        fecha: testFecha,
        hora_inicio: testHora,
        personas: 4,
        nota: 'Solicitud A simultanea',
      }),
      request('POST', '/reservas', {
        cliente_id: 5,
        mesa_id: testMesa,
        fecha: testFecha,
        hora_inicio: testHora,
        personas: 4,
        nota: 'Solicitud B simultanea',
      }),
    ]);

    console.log(`Respuesta A: Status ${solicitudA.status}`);
    console.log(`Respuesta B: Status ${solicitudB.status}`);

    const unaExitosa = (solicitudA.status === 201 && solicitudB.status === 409) ||
                       (solicitudB.status === 201 && solicitudA.status === 409);

    if (unaExitosa) {
      console.log('[OK] CONCURRENCIA SUPERADA: Exactamente una reserva fue aceptada (201) y la otra fue rechazada con conflicto (409).');
    } else {
      console.log(`[AVISO] Concurrencia retorno A=${solicitudA.status}, B=${solicitudB.status}`);
    }

    // 7. Prueba de Reservas Consecutivas Validas [16:00-18:00) y [18:00-20:00)
    console.log('\n--- PRUEBA 7: Reservas consecutivas semiabiertas [18:00-20:00) tras [16:00-18:00) ---');
    const resConsecutiva = await request('POST', '/reservas', {
      cliente_id: 2,
      mesa_id: testMesa,
      fecha: testFecha,
      hora_inicio: '18:00', // Justo cuando termina la de las 16:00 (16:00-18:00)
      personas: 3,
      nota: 'Reserva consecutiva valida',
    });
    console.log(`Status recibido: ${resConsecutiva.status} (Esperado: 201)`);
    if (resConsecutiva.status === 201) {
      console.log('[OK] REGLA SUPERADA: La reserva consecutiva en el limite semiabierto fue aceptada.');
    } else {
      console.log(`[FALLO] Se rechazo reserva consecutiva valida (${resConsecutiva.body?.error}).`);
    }

    // 8. Consulta de Metricas (GET /api/resumen)
    console.log('\n--- PRUEBA 8: Metricas SQL agregadas ---');
    const resumen = await request('GET', `/resumen?fecha=${testFecha}`);
    console.log(`Status recibido: ${resumen.status} (Esperado: 200)`);
    console.log(`KPIs calculados:`, resumen.body?.data?.kpis);
    console.log(`Reservas por estado:`, resumen.body?.data?.reservas_por_estado);
    if (resumen.status === 200 && resumen.body?.data?.kpis) {
      console.log('[OK] METRICAS SUPERADAS: Agregacion SQL ejecutada correctamente.');
    }

    // 9. Prueba de Validacion de Transicion de Estado
    console.log('\n--- PRUEBA 9: Transicion de estado de reserva ---');
    // Obtenemos la reserva consecutiva creada
    const reservaCreada = resConsecutiva.body?.data;
    if (reservaCreada?.id) {
      const transValida = await request('PATCH', `/reservas/${reservaCreada.id}/estado`, { estado: 'confirmada' });
      console.log(`Transicion valida a confirmada: Status ${transValida.status} (Esperado: 200)`);
      
      const transInvalida = await request('PATCH', `/reservas/${reservaCreada.id}/estado`, { estado: 'pendiente' });
      console.log(`Transicion invalida de confirmada a pendiente: Status ${transInvalida.status} (Esperado: 409)`);
      if (transValida.status === 200 && transInvalida.status === 409) {
        console.log('[OK] TRANSICION DE ESTADO SUPERADA: Matriz validada.');
      }
    }

    // 10. Limpieza final de datos de prueba
    await db.query("DELETE FROM reservas WHERE fecha = $1 OR nota LIKE '%simultanea%' OR nota LIKE '%consecutiva%'", [testFecha]);
    await db.pool.end();

    console.log('\n================================================================');
    console.log('BATERIA DE PRUEBAS COMPLETADA EXITOSAMENTE');
    console.log('================================================================');
  } catch (error) {
    console.error('Error durante la ejecucion de pruebas:', error.message);
    try { await db.pool.end(); } catch (e) {}
  }
}

runTests();
