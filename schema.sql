-- ============================================================================
-- LABORATORIO #2: SISTEMA INTEGRAL DE RESERVAS DE RESTAURANTE
-- Esquema Relacional de Base de Datos (PostgreSQL 17)
-- ============================================================================

-- Habilitar extensión btree_gist para restricciones de exclusión temporal si está disponible
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. TABLA: mesas
-- Representa las mesas físicas del restaurante con capacidad y ubicación
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    numero INT NOT NULL UNIQUE,
    capacidad INT NOT NULL CHECK (capacidad > 0),
    ubicacion VARCHAR(50) NOT NULL, -- 'Interior', 'Terraza', 'Ventanal', 'Zona VIP'
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comentarios explicativos
COMMENT ON TABLE mesas IS 'Catálogo de mesas del restaurante con capacidad y estado operativo';
COMMENT ON COLUMN mesas.activa IS 'Indica si la mesa está disponible para recibir nuevas reservas';

-- ----------------------------------------------------------------------------
-- 2. TABLA: clientes
-- Registra a los comensales y mantiene el contador acumulado de ausencias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    no_shows INT NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE clientes IS 'Clientes con registro de contacto e historial de inasistencias';
COMMENT ON COLUMN clientes.no_shows IS 'Inasistencias acumuladas. Clientes con >= 3 no pueden reservar';

-- ----------------------------------------------------------------------------
-- 3. TABLA: horarios
-- Configuración de días y horarios de apertura y cierre del restaurante
-- dia_semana: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL UNIQUE CHECK (dia_semana BETWEEN 0 AND 6),
    nombre_dia VARCHAR(20) NOT NULL,
    abierto BOOLEAN NOT NULL DEFAULT TRUE,
    apertura TIME NOT NULL,
    cierre TIME NOT NULL,
    CONSTRAINT chk_horario_consistente CHECK (
        (abierto = FALSE) OR (cierre > apertura)
    )
);

COMMENT ON TABLE horarios IS 'Horarios de operación semanales del restaurante';

-- ----------------------------------------------------------------------------
-- 4. TABLA: reservas
-- Almacena las solicitudes y reservas de los comensales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    mesa_id INT NOT NULL REFERENCES mesas(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    personas INT NOT NULL CHECK (personas > 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'confirmada', 'cumplida', 'cancelada', 'no_show')),
    nota TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Restricción: la hora de finalización debe ser posterior a la de inicio
    CONSTRAINT chk_horas_coherentes CHECK (hora_fin > hora_inicio),
    
    -- Restricción de negocio: Duración fija de exactamente 2 horas
    CONSTRAINT chk_duracion_dos_horas CHECK (hora_fin = hora_inicio + INTERVAL '2 hours')
);

COMMENT ON TABLE reservas IS 'Reservas de mesas con duración de 2h e integridad de estados';

-- ----------------------------------------------------------------------------
-- 5. ÍNDICES PARA ALTO RENDIMIENTO
-- Optimizan la consulta frecuente de disponibilidad, agenda diaria y estados
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_horarios ON reservas(fecha, hora_inicio, hora_fin);
CREATE INDEX IF NOT EXISTS idx_reservas_mesa_fecha ON reservas(mesa_id, fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_mesas_capacidad ON mesas(capacidad, activa);

-- ----------------------------------------------------------------------------
-- 6. DATOS DE EJEMPLO REALISTAS (SEEDS)
-- Permite pruebas funcionales inmediatas y demostración académica
-- ----------------------------------------------------------------------------

-- Inserción de Mesas en diferentes ubicaciones y capacidades
INSERT INTO mesas (numero, capacidad, ubicacion, activa) VALUES
(1, 2, 'Ventanal', TRUE),
(2, 2, 'Interior', TRUE),
(3, 4, 'Interior', TRUE),
(4, 4, 'Terraza', TRUE),
(5, 6, 'Terraza', TRUE),
(6, 6, 'Zona VIP', TRUE),
(7, 8, 'Zona VIP', TRUE),
(8, 4, 'Barra', FALSE) -- Mesa inactiva para validar rechazo de reservas
ON CONFLICT (numero) DO NOTHING;

-- Inserción de Clientes con diferentes niveles de no_shows
INSERT INTO clientes (nombre, telefono, email, no_shows) VALUES
('Carlos Mendoza', '+506 8888-1111', 'carlos.mendoza@email.com', 0),   -- Cliente sin ausencias
('Sofía Martínez', '+506 8888-2222', 'sofia.martinez@email.com', 1),   -- 1 ausencia
('Juan Pérez', '+506 8888-3333', 'juan.perez@email.com', 2),          -- 2 ausencias (al límite)
('Roberto Morales', '+506 8888-4444', 'roberto.morales@email.com', 3), -- 3 ausencias (BLOQUEADO)
('Elena Navarro', '+506 8888-5555', 'elena.navarro@email.com', 0)     -- Cliente frecuente
ON CONFLICT DO NOTHING;

-- Inserción de Horarios Semanales (Lunes a Domingo)
-- Nota: Lunes está marcado como CERRADO para validar regla de negocio
INSERT INTO horarios (dia_semana, nombre_dia, abierto, apertura, cierre) VALUES
(0, 'Domingo',   TRUE,  '12:00:00', '21:00:00'),
(1, 'Lunes',     FALSE, '00:00:00', '00:00:00'), -- Día de descanso / cerrado
(2, 'Martes',    TRUE,  '12:00:00', '22:00:00'),
(3, 'Miércoles', TRUE,  '12:00:00', '22:00:00'),
(4, 'Jueves',    TRUE,  '12:00:00', '22:00:00'),
(5, 'Viernes',   TRUE,  '12:00:00', '23:00:00'),
(6, 'Sábado',    TRUE,  '12:00:00', '23:00:00')
ON CONFLICT (dia_semana) DO UPDATE SET
    nombre_dia = EXCLUDED.nombre_dia,
    abierto = EXCLUDED.abierto,
    apertura = EXCLUDED.apertura,
    cierre = EXCLUDED.cierre;

-- Inserción de Reservas de Ejemplo para fecha actual y fechas próximas
-- Usamos fechas estables relativas y absolutas para garantizar datos de prueba
INSERT INTO reservas (cliente_id, mesa_id, fecha, hora_inicio, hora_fin, personas, estado, nota) VALUES
(1, 1, CURRENT_DATE, '13:00:00', '15:00:00', 2, 'confirmada', 'Celebración de almuerzo'),
(2, 3, CURRENT_DATE, '18:00:00', '20:00:00', 4, 'pendiente', 'Mesa cerca del pasillo si es posible'),
(5, 5, CURRENT_DATE, '20:00:00', '22:00:00', 5, 'confirmada', 'Cena familiar con niños'),
(3, 2, CURRENT_DATE - INTERVAL '1 day', '19:00:00', '21:00:00', 2, 'cumplida', 'Visita regular cumplida'),
(1, 4, CURRENT_DATE - INTERVAL '2 days', '14:00:00', '16:00:00', 3, 'cancelada', 'Canceló con aviso previo'),
(2, 6, CURRENT_DATE + INTERVAL '1 day', '19:00:00', '21:00:00', 6, 'confirmada', 'Reunión ejecutiva')
ON CONFLICT DO NOTHING;
