# Bitácora de Uso de Inteligencia Artificial (BITACORA_IA.md)
> **Proyecto:** GourmetReserve — Sistema Integral de Reservas de Restaurante  
> **Laboratorio #2:** Front End Development + Backend Express + PostgreSQL + n8n AI Agent  
> **Estudiante:** Oscar Guido Rosales  
> **Modelo IA:** Gemini 3.8 Flash High (Antigravity)

---

## INTRODUCCIÓN Y METODOLOGÍA

Esta bitácora registra las cinco interacciones más relevantes con el modelo de IA generativa durante el desarrollo del Laboratorio #2. Cada registro detalla el prompt exacto formulado, el objetivo perseguido, el código o solución obtenida, los problemas o casos límite detectados, las correcciones arquitectónicas aplicadas y el resultado empírico de las pruebas.

---

## ENTRADA 1: Diseño del Esquema Relacional con Intervalos Temporales y Duración de 2 Horas

### 1. Prompt Utilizado
> *"Diseña el esquema DDL en PostgreSQL 17 para el sistema de reservas de restaurante (Caso 2) con las tablas mesas, clientes, horarios y reservas. Asegura que la duración de cada reserva sea exactamente de 2 horas calculada y protegida por la base de datos, que no se permita traslape en la misma mesa para reservas activas, y añade datos de prueba con clientes que tengan 0, 1, 2 y 3 inasistencias."*

### 2. Objetivo
Establecer un modelo de base de datos relacional sólido en `schema.sql` con restricciones `CHECK`, claves foráneas con integridad referencial (`ON DELETE RESTRICT`) y datos semilla que permitan poner a prueba de inmediato la regla de clientes bloqueados por inasistencias.

### 3. Resultado Obtenido
Se generaron las tablas `mesas`, `clientes`, `horarios` y `reservas`, incluyendo la restricción `CHECK (hora_fin = hora_inicio + INTERVAL '2 hours')` y semillas con el cliente "Roberto Morales" configurado con 3 ausencias.

### 4. Errores Detectados y Análisis Crítico
- **Detección:** Inicialmente se consideró una restricción de exclusión pura `EXCLUDE USING gist` en PostgreSQL, pero si la extensión `btree_gist` no está habilitada o no se cuenta con permisos de superusuario en el entorno local del estudiante, el script `schema.sql` fallaría durante la creación.
- **Riesgo:** Confiar exclusivamente en la base de datos para la exclusión sin bloqueo en la capa de servicios dejaría desprotegidos los motores si la extensión fallaba.

### 5. Correcciones Realizadas
Se implementó un enfoque de doble barrera:
1. En `schema.sql` se añadió `CREATE EXTENSION IF NOT EXISTS btree_gist;` de forma condicional.
2. En la capa de servicios del backend (`reservas.service.js`) se implementó una transacción con bloqueo pesimista `SELECT * FROM mesas WHERE id = $1 FOR UPDATE` y consulta de solapamiento de intervalos semiabiertos `[inicio, fin)`.

### 6. Resultado de Pruebas
La ejecución de `npm run test-concurrency` demostró que dos reservas simultáneas para la misma mesa a la misma hora son serializadas correctamente, aprobando una con HTTP 201 y rechazando la otra con HTTP 409.

---

## ENTRADA 2: Algoritmo de Detección de Solapamientos Semiabiertos y Concurrencia

### 1. Prompt Utilizado
> *"Escribe el servicio de reservas en Node.js con pg para crear una reserva. Debe ejecutarse dentro de una transacción, calcular la hora final sumando 2 horas a la hora de inicio, verificar que la mesa esté activa y tenga capacidad suficiente, que el cliente no tenga 3 ausencias, que el restaurante esté abierto ese día y hora, y verificar solapamientos semiabiertos [inicio, fin) considerando que dos reservas consecutivas (ej. 18:00-20:00 y 20:00-22:00) sí son válidas."*

### 2. Objetivo
Garantizar la lógica de negocio central del backend, protegiendo todas las invariantes antes de persistir cualquier registro.

### 3. Resultado Obtenido
Módulo `backend/src/services/reservas.service.js` con método `createReserva` envuelto en `db.withTransaction`.

### 4. Errores Detectados
- **Error en la condición de solapamiento:** La primera propuesta utilizaba `hora_inicio <= $hora_fin AND hora_fin >= $hora_inicio`. Con los operadores menor o igual (`<=`) y mayor o igual (`>=`), una reserva que termina a las 20:00 colisionaba con una reserva que comenzaba a las 20:00.
- **Consecuencia:** Rechazaba reservas consecutivas perfectamente válidas.

### 5. Correcciones Realizadas
Se corrigieron estrictamente los operadores a desigualdades estrictas para modelar intervalos semiabiertos `[inicio, fin)`:
```sql
WHERE mesa_id = $1 
  AND fecha = $2 
  AND estado IN ('pendiente', 'confirmada')
  AND hora_inicio < $nueva_hora_fin 
  AND hora_fin > $nueva_hora_inicio
```
Con esta corrección:
- `18:00 - 20:00` y `20:00 - 22:00`: `18:00 < 22:00` (TRUE) pero `20:00 > 20:00` (FALSE) → NO colisionan (Aceptada).
- `18:00 - 20:00` y `19:00 - 21:00`: `18:00 < 21:00` (TRUE) y `20:00 > 19:00` (TRUE) → COLISIONAN (Rechazada con HTTP 409).

### 6. Resultado de Pruebas
Verificado con la Prueba 6 y 7 de `test-concurrency.js`: Reservas consecutivas retornan `HTTP 201 Created` y reservas solapadas retornan `HTTP 409 Conflict`.

---

## ENTRADA 3: Transición Atómica de Estados e Incremento de No-Shows

### 1. Prompt Utilizado
> *"Implementa el endpoint PATCH /api/reservas/:id/estado en Express con una matriz de transiciones estrictas (pendiente a confirmada/cancelada/no_show; confirmada a cumplida/cancelada/no_show; y terminales no modificables). Si el nuevo estado es no_show, incrementa en 1 el contador no_shows del cliente en la misma transacción, evitando dobles incrementos si ya estaba en no_show."*

### 2. Objetivo
Cumplir el requerimiento 6.5 y 6.6, asegurando que el pase a inasistencia incremente el contador del cliente de forma atómica y no duplicada.

### 3. Resultado Obtenido
Método `updateEstadoReserva` con bloqueo `SELECT * FROM reservas WHERE id = $1 FOR UPDATE`.

### 4. Errores Detectados
- Si un cliente ejecutaba dos veces la petición hacia `no_show` por reintentos de red, un código sin validación previa del estado actual incrementaría dos veces el contador de ausencias del comensal.

### 5. Correcciones Realizadas
Se incorporó la verificación `if (nuevoEstado === 'no_show' && estadoActual !== 'no_show')` antes de ejecutar `UPDATE clientes SET no_shows = no_shows + 1 WHERE id = $cliente_id`. Además, si `estadoActual === nuevoEstado`, la operación retorna de inmediato de forma idempotente sin alteraciones.

### 6. Resultado de Pruebas
Se probó enviando dos veces seguidas la transición a `no_show`; la primera incrementó el contador de 1 a 2, y la segunda petición confirmó el estado sin volver a incrementar las ausencias.

---

## ENTRADA 4: Construcción del Workflow n8n y Contrato Superior JSON

### 1. Prompt Utilizado
> *"Crea el archivo workflow-n8n.json para el Caso 2 con los nodos Webhook, Code para validar y extraer fecha/hora/comensales, AI Agent con Gemini y la herramienta HttpRequest que consuma /api/disponibilidad. La respuesta final debe responder al webhook con el contrato superior { ok, data: { mensaje, mesas }, error }."*

### 2. Objetivo
Configurar el flujo de n8n para importar en la herramienta sin incluir credenciales reales y cumpliendo las especificaciones de no invención de mesas.

### 3. Resultado Obtenido
Archivo `workflow-n8n.json` con 7 nodos conectados siguiendo el esquema de ejecución `v1` de n8n.

### 4. Errores Detectados
- El nodo LangChain AI Agent devolvía una cadena de texto en bruto en `$json.output`, lo que rompía el contrato JSON exigido `{ ok, data, error }` si se conectaba directamente al nodo `Respond to Webhook`.
- Los parámetros de fecha relativa como "mañana" o "este viernes" no tenían una fecha base del restaurante para calcularse con precisión.

### 5. Correcciones Realizadas
1. Se añadió un nodo de código previo ("Validar y Normalizar Solicitud") que inyecta `fecha_referencia` (la fecha ISO de hoy) y la zona horaria (`America/Costa_Rica`).
2. Se añadió un nodo de código posterior ("Estandarizar Contrato JSON") que empaqueta la salida del agente en `{ ok: true, data: { mensaje, agente, timestamp }, error: null }`.

### 6. Resultado de Pruebas
Importación del JSON validada estructuralmente y probada desde el frontend con el botón de prueba en `/ia`.

---

## ENTRADA 5: Consulta de Disponibilidad Reactiva en Frontend y Sugerencia de Mesa Óptima

### 1. Prompt Utilizado
> *"Crea el componente ReservaFormPage en React con Vite. Debe tener un selector de clientes que deshabilite y advierta si el cliente tiene 3 ausencias. Cada vez que cambie la fecha, hora o personas, debe consultar api.getDisponibilidad() para mostrar las mesas libres en tiempo real ordenadas por capacidad (la mesa más pequeña suficiente primero) y permitir seleccionarla visualmente."*

### 2. Objetivo
Ofrecer una experiencia de usuario fluida y reactiva donde la disponibilidad se consulte dinámicamente antes de enviar el formulario, reduciendo la probabilidad de conflictos.

### 3. Resultado Obtenido
Componente `ReservaFormPage.jsx` con efecto `useEffect` que escucha `[fecha, horaInicio, personas, ubicacionPreferencia]`.

### 4. Errores Detectados
- Si el usuario cambiaba la hora rápidamente (tecleando en el campo de hora), se disparaban múltiples peticiones asíncronas consecutivas y una respuesta más lenta podía sobreescribir una selección más reciente (*race condition* en UI).

### 5. Correcciones Realizadas
Se implementó el patrón de limpieza con bandera de montaje (`let mounted = true; ... return () => { mounted = false; };`) dentro del `useEffect`, descartando respuestas desactualizadas si los parámetros cambiaron antes de que el servidor respondiera.

### 6. Resultado de Pruebas
Compilación de producción verificada con `npm run build` (0 errores) y navegación interactiva sin parpadeos ni inconsistencias de selección.
