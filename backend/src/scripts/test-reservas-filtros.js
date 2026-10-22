/**
 * Script de Pruebas Automatizadas para Endpoint de Reservas y Filtros
 * Laboratorio #2 - GourmetReserve
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
  console.log('PRUEBAS DE VALIDACION DE FILTROS, FECHAS Y CONSULTA DE RESERVAS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    assert(
      health.status === 200 && health.body?.ok === true,
      'Verificacion de servicio /api/health',
      `Status: ${health.status}`
    );

    // 2. Consulta general sin parametros
    const resSinParams = await request('GET', '/reservas');
    assert(
      resSinParams.status === 200 && Array.isArray(resSinParams.body?.data) && resSinParams.body.data.length >= 18,
      'GET /api/reservas sin parametros retorna 200 y todas las reservas existentes',
      `Status: ${resSinParams.status}, Total registros: ${resSinParams.body?.data?.length}`
    );

    // 3. Verificacion del caso exacto que produjo el error del usuario
    const resParamsUndefined = await request('GET', '/reservas?fecha=undefined&estado=undefined&q=undefined');
    assert(
      resParamsUndefined.status === 200 && Array.isArray(resParamsUndefined.body?.data) && resParamsUndefined.body.data.length >= 18,
      'GET /api/reservas?fecha=undefined&estado=undefined&q=undefined maneja cadenas undefined sin error SQL 22007',
      `Status: ${resParamsUndefined.status}, Error: ${resParamsUndefined.body?.error}`
    );

    // 4. Parametros con valor null como texto o vacios
    const resParamsNull = await request('GET', '/reservas?fecha=null&estado=null&q=null');
    assert(
      resParamsNull.status === 200 && Array.isArray(resParamsNull.body?.data),
      'GET /api/reservas con parametros null no genera error de fecha u hora',
      `Status: ${resParamsNull.status}`
    );

    // 5. Parametros con valor "todos"
    const resParamsTodos = await request('GET', '/reservas?fecha=todos&estado=todos');
    assert(
      resParamsTodos.status === 200 && Array.isArray(resParamsTodos.body?.data),
      'GET /api/reservas?fecha=todos&estado=todos ignora el comodin "todos" correctamente',
      `Status: ${resParamsTodos.status}`
    );

    // 6. Formato de fecha en la respuesta (debe ser YYYY-MM-DD sin sufijo T... o conversion de zona horaria)
    if (resSinParams.body?.data?.length > 0) {
      const primeraReserva = resSinParams.body.data[0];
      const esFechaPura = typeof primeraReserva.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(primeraReserva.fecha);
      assert(
        esFechaPura,
        'El campo fecha en la respuesta es una cadena pura YYYY-MM-DD sin desfase horario',
        `Valor obtenido: ${primeraReserva.fecha}`
      );
    }

    // 7. Filtro especifico por fecha valida
    const resFechaEspecifica = await request('GET', '/reservas?fecha=2026-11-22');
    assert(
      resFechaEspecifica.status === 200 &&
      Array.isArray(resFechaEspecifica.body?.data) &&
      resFechaEspecifica.body.data.some((r) => r.id === 23),
      'GET /api/reservas?fecha=2026-11-22 retorna la reserva ID 23 creada previamente',
      `Registros: ${resFechaEspecifica.body?.data?.length}`
    );

    // 8. Filtro por busqueda de texto (q)
    const resBusqueda = await request('GET', '/reservas?q=Aniversario');
    assert(
      resBusqueda.status === 200 &&
      Array.isArray(resBusqueda.body?.data) &&
      resBusqueda.body.data.length > 0 &&
      resBusqueda.body.data[0].nota.includes('Aniversario'),
      'GET /api/reservas?q=Aniversario encuentra la reserva por coincidencia en la nota',
      `Registros: ${resBusqueda.body?.data?.length}`
    );

    // 9. Validacion de fecha realmente invalida (debe responder 400 controlado, no error no capturado)
    const resFechaInvalida = await request('GET', '/reservas?fecha=invalida-999');
    assert(
      resFechaInvalida.status === 400 && resFechaInvalida.body?.ok === false,
      'GET /api/reservas?fecha=invalida-999 responde 400 con mensaje controlado',
      `Status: ${resFechaInvalida.status}, Mensaje: ${resFechaInvalida.body?.error}`
    );

    // 10. Endpoint /resumen con y sin parametros
    const resResumenNormal = await request('GET', '/resumen');
    assert(
      resResumenNormal.status === 200 && resResumenNormal.body?.ok === true,
      'GET /api/resumen responde 200 con metricas consolidadas',
      `Status: ${resResumenNormal.status}`
    );

    const resResumenUndefined = await request('GET', '/resumen?fecha=undefined');
    assert(
      resResumenUndefined.status === 200 && resResumenUndefined.body?.ok === true,
      'GET /api/resumen?fecha=undefined sanea parametro y no arroja error de fecha',
      `Status: ${resResumenUndefined.status}`
    );

  } catch (error) {
    console.error('Error no controlado durante la ejecucion de pruebas:', error);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`RESUMEN DE PRUEBAS: ${passed} superadas, ${failed} fallidas`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
