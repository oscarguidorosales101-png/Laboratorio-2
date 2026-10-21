/**
 * Script de Pruebas Automatizadas de Concurrencia y Reglas de Negocio
 * Laboratorio #2
 */
const http = require('http');

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
  console.log('🧪 INICIANDO BATERÍA DE PRUEBAS DE CONCURRENCIA Y REGLAS DE NEGOCIO');
  console.log('================================================================\n');

  try {
    // 0. Comprobar salud del backend
    const health = await request('GET', '/health');
    console.log(`[0] Healthcheck backend: Status ${health.status}`, health.body?.status === 'online' ? '✅ OK' : '❌ ERROR');

    // 1. Regla de Cliente con 3 no_shows bloqueado (Cliente #4: Roberto Morales)
    console.log('\n--- PRUEBA 1: Bloqueo de cliente con 3 o más no_shows ---');
    const resBloqueado = await request('POST', '/reservas', {
      cliente_id: 4, // Roberto Morales (no_shows = 3)
      mesa_id: 1,
      fecha: '2026-10-23', // Viernes (abierto)
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resBloqueado.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resBloqueado.body?.error}`);
    if (resBloqueado.status === 409) {
      console.log('✅ REGLA SUPERADA: El cliente con 3 ausencias fue bloqueado.');
    } else {
      console.log('❌ FALLÓ: Se permitió reservar a un cliente bloqueado.');
    }

    // 2. Regla de Exceso de Capacidad (Mesa #1 capacidad 2, solicitando 6 personas)
    console.log('\n--- PRUEBA 2: Exceso de capacidad de la mesa ---');
    const resCapacidad = await request('POST', '/reservas', {
      cliente_id: 1, // Carlos Mendoza (0 no_shows)
      mesa_id: 1,    // Capacidad 2
      fecha: '2026-10-23',
      hora_inicio: '14:00',
      personas: 6,   // Excede capacidad
    });
    console.log(`Status recibido: ${resCapacidad.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resCapacidad.body?.error}`);
    if (resCapacidad.status === 409) {
      console.log('✅ REGLA SUPERADA: Se rechazó la reserva que excede la capacidad de la mesa.');
    } else {
      console.log('❌ FALLÓ: No se validó la capacidad.');
    }

    // 3. Regla de Mesa Inactiva (Mesa #8 inactiva)
    console.log('\n--- PRUEBA 3: Reserva en mesa inactiva ---');
    const resInactiva = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 8,    // Inactiva
      fecha: '2026-10-23',
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resInactiva.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resInactiva.body?.error}`);
    if (resInactiva.status === 409) {
      console.log('✅ REGLA SUPERADA: Se rechazó la reserva en mesa inactiva.');
    } else {
      console.log('❌ FALLÓ: No se validó mesa inactiva.');
    }

    // 4. Regla de Día Cerrado (Lunes = 1 cerrado)
    console.log('\n--- PRUEBA 4: Reserva en día cerrado (Lunes) ---');
    const resCerrado = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 2,
      fecha: '2026-10-26', // Lunes
      hora_inicio: '14:00',
      personas: 2,
    });
    console.log(`Status recibido: ${resCerrado.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resCerrado.body?.error}`);
    if (resCerrado.status === 409) {
      console.log('✅ REGLA SUPERADA: Se rechazó la reserva en día cerrado.');
    } else {
      console.log('❌ FALLÓ: Se permitió reservar en día cerrado.');
    }

    // 5. Regla de Horario de Cierre (Viernes cierra a las 23:00, reserva a las 22:00 terminaría a las 24:00)
    console.log('\n--- PRUEBA 5: Reserva que excede el horario de cierre ---');
    const resExcedeCierre = await request('POST', '/reservas', {
      cliente_id: 1,
      mesa_id: 2,
      fecha: '2026-10-23', // Viernes (cierre 23:00)
      hora_inicio: '22:00', // 22:00 + 2h = 24:00 > 23:00
      personas: 2,
    });
    console.log(`Status recibido: ${resExcedeCierre.status} (Esperado: 409)`);
    console.log(`Mensaje: ${resExcedeCierre.body?.error}`);
    if (resExcedeCierre.status === 409) {
      console.log('✅ REGLA SUPERADA: Se rechazó reserva que excede el horario de cierre.');
    } else {
      console.log('❌ FALLÓ: No se validó el horario de cierre.');
    }

    // 6. Prueba de Concurrencia Simultánea: Dos solicitudes en paralelo para la misma mesa y franja
    console.log('\n--- PRUEBA 6: CONCURRENCIA SIMULTÁNEA (2 solicitudes en paralelo) ---');
    const testFecha = '2026-10-23';
    const testHora = '16:00';
    const testMesa = 3; // Mesa para 4 personas

    console.log(`Disparando 2 solicitudes simultáneas a mesa #${testMesa} para ${testFecha} a las ${testHora}...`);
    const [solicitudA, solicitudB] = await Promise.all([
      request('POST', '/reservas', {
        cliente_id: 1,
        mesa_id: testMesa,
        fecha: testFecha,
        hora_inicio: testHora,
        personas: 4,
        nota: 'Solicitud A simultánea',
      }),
      request('POST', '/reservas', {
        cliente_id: 5,
        mesa_id: testMesa,
        fecha: testFecha,
        hora_inicio: testHora,
        personas: 4,
        nota: 'Solicitud B simultánea',
      }),
    ]);

    console.log(`Respuesta A: Status ${solicitudA.status}`);
    console.log(`Respuesta B: Status ${solicitudB.status}`);

    const unaExitosa = (solicitudA.status === 201 && solicitudB.status === 409) ||
                       (solicitudB.status === 201 && solicitudA.status === 409);

    if (unaExitosa) {
      console.log('✅ CONCURRENCIA SUPERADA: Exactamente una reserva fue aceptada (201) y la otra fue rechazada con conflicto (409).');
    } else {
      console.log('⚠️ Resultado inesperado en concurrencia (ambas 201 o ambas 409). Revisar estados.');
    }

    // 7. Prueba de Reservas Consecutivas Válidas [16:00-18:00) y [18:00-20:00)
    console.log('\n--- PRUEBA 7: Reservas consecutivas semiabiertas [18:00-20:00) tras [16:00-18:00) ---');
    const resConsecutiva = await request('POST', '/reservas', {
      cliente_id: 2,
      mesa_id: testMesa,
      fecha: testFecha,
      hora_inicio: '18:00', // Justo cuando termina la de las 16:00 (16:00-18:00)
      personas: 3,
      nota: 'Reserva consecutiva válida',
    });
    console.log(`Status recibido: ${resConsecutiva.status} (Esperado: 201)`);
    if (resConsecutiva.status === 201) {
      console.log('✅ REGLA SUPERADA: La reserva consecutiva en el límite semiabierto fue aceptada.');
    } else {
      console.log(`❌ FALLÓ: Se rechazó reserva consecutiva válida (${resConsecutiva.body?.error}).`);
    }

    // 8. Consulta de Métricas (GET /api/resumen)
    console.log('\n--- PRUEBA 8: Métricas SQL agregadas ---');
    const resumen = await request('GET', `/resumen?fecha=${testFecha}`);
    console.log(`Status recibido: ${resumen.status} (Esperado: 200)`);
    console.log(`KPIs calculados:`, resumen.body?.data?.kpis);
    console.log(`Reservas por estado:`, resumen.body?.data?.reservas_por_estado);
    if (resumen.status === 200 && resumen.body?.data?.kpis) {
      console.log('✅ MÉTRICAS SUPERADAS: Agregación SQL ejecutada correctamente.');
    }

    console.log('\n================================================================');
    console.log('🎉 BATERÍA DE PRUEBAS COMPLETADA');
    console.log('================================================================');
  } catch (error) {
    console.error('Error durante la ejecución de pruebas:', error.message);
  }
}

runTests();
