-- ============================================================
-- Migración: Notas, Instrucciones del cliente y Negociación
-- Ejecutar en la base SQL Server del estudio
-- ============================================================

-- 1) NOTAS PROPIAS del estudio por expediente
IF OBJECT_ID('caso_notas','U') IS NULL
CREATE TABLE caso_notas (
  id_nota       INT IDENTITY(1,1) PRIMARY KEY,
  id_caso       INT NOT NULL,
  contenido     NVARCHAR(MAX) NOT NULL DEFAULT '',
  fecha_creacion DATETIME2    NOT NULL DEFAULT GETDATE(),
  fecha_mod     DATETIME2    NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_notas_caso FOREIGN KEY (id_caso) REFERENCES casos(id_caso)
)
GO

-- 2) INSTRUCCIONES DEL CLIENTE por expediente
IF OBJECT_ID('caso_instrucciones','U') IS NULL
CREATE TABLE caso_instrucciones (
  id_instruccion INT IDENTITY(1,1) PRIMARY KEY,
  id_caso        INT NOT NULL,
  contenido      NVARCHAR(MAX) NOT NULL DEFAULT '',
  fecha_creacion DATETIME2     NOT NULL DEFAULT GETDATE(),
  fecha_mod      DATETIME2     NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_instrucciones_caso FOREIGN KEY (id_caso) REFERENCES casos(id_caso)
)
GO

-- 3) NEGOCIACIÓN: estado actual (una fila por caso)
IF OBJECT_ID('caso_negociacion','U') IS NULL
CREATE TABLE caso_negociacion (
  id_negociacion    INT IDENTITY(1,1) PRIMARY KEY,
  id_caso           INT          NOT NULL UNIQUE,
  monto_max_cliente DECIMAL(18,2) NULL,
  monto_ofrecido    DECIMAL(18,2) NULL,
  contraoferta      DECIMAL(18,2) NULL,
  estado            VARCHAR(50)  NOT NULL DEFAULT 'En curso',
  notas             NVARCHAR(MAX) NULL,
  fecha_mod         DATETIME2    NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_negociacion_caso FOREIGN KEY (id_caso) REFERENCES casos(id_caso)
)
GO

-- 4) HISTORIAL DE OFERTAS
IF OBJECT_ID('caso_negociacion_historial','U') IS NULL
CREATE TABLE caso_negociacion_historial (
  id_historial INT IDENTITY(1,1) PRIMARY KEY,
  id_caso      INT           NOT NULL,
  tipo         VARCHAR(20)   NOT NULL,  -- 'Oferta', 'Contraoferta', 'Acuerdo', 'Rechazo'
  monto        DECIMAL(18,2) NULL,
  descripcion  NVARCHAR(500) NULL,
  fecha        DATETIME2     NOT NULL DEFAULT GETDATE(),
  CONSTRAINT FK_historial_caso FOREIGN KEY (id_caso) REFERENCES casos(id_caso)
)
GO

-- ============================================================
-- MOCK DATA: usar los primeros 3 casos activos reales
-- ============================================================

DECLARE @c1 INT, @c2 INT, @c3 INT

SELECT @c1 = MIN(id_caso) FROM casos WHERE activo = 1
SELECT @c2 = MIN(id_caso) FROM casos WHERE activo = 1 AND id_caso > @c1
SELECT @c3 = MIN(id_caso) FROM casos WHERE activo = 1 AND id_caso > @c2

-- Notas
IF @c1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_notas WHERE id_caso = @c1)
  INSERT INTO caso_notas (id_caso, contenido, fecha_creacion, fecha_mod) VALUES
  (@c1,
   N'- Revisar peritos antes del 20/05.
- El juez Martínez suele pedir documentación adicional en esta etapa.
- Coordinar con el cliente la disponibilidad para audiencia virtual.',
   DATEADD(day, -15, GETDATE()), DATEADD(day, -2, GETDATE()))

IF @c2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_notas WHERE id_caso = @c2)
  INSERT INTO caso_notas (id_caso, contenido, fecha_creacion, fecha_mod) VALUES
  (@c2,
   N'- Caso con antecedentes similares: exp 1234/2021 (ganado).
- Buscar jurisprudencia Cámara Civil Sala D sobre daños y perjuicios 2024.
- Testigo clave: Sr. García, tel. 11-xxxx-xxxx.',
   DATEADD(day, -30, GETDATE()), DATEADD(day, -5, GETDATE()))

-- Instrucciones del cliente
IF @c1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_instrucciones WHERE id_caso = @c1)
  INSERT INTO caso_instrucciones (id_caso, contenido, fecha_creacion, fecha_mod) VALUES
  (@c1,
   N'El cliente prioriza llegar a un acuerdo antes de juicio oral.
Monto mínimo aceptable: $1.800.000.
No acepta cuotas, solo pago en una sola vez.
Requiere confidencialidad total del acuerdo.
Avisarle con 48hs de anticipación antes de cualquier audiencia.',
   DATEADD(day, -20, GETDATE()), DATEADD(day, -20, GETDATE()))

IF @c2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_instrucciones WHERE id_caso = @c2)
  INSERT INTO caso_instrucciones (id_caso, contenido, fecha_creacion, fecha_mod) VALUES
  (@c2,
   N'Instrucción principal: llegar a juicio si la contraparte no supera $3.000.000.
El cliente autoriza transacción hasta $2.500.000 con aprobación del directorio.
Copiar en todos los correos a: gerencia@empresa.com.ar',
   DATEADD(day, -10, GETDATE()), DATEADD(day, -10, GETDATE()))

-- Negociación
IF @c1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_negociacion WHERE id_caso = @c1)
  INSERT INTO caso_negociacion (id_caso, monto_max_cliente, monto_ofrecido, contraoferta, estado, notas) VALUES
  (@c1, 1800000, 2200000, 1600000, 'En curso',
   N'La contraparte mostró intención de negociar. Próxima reunión pendiente de confirmar.')

IF @c2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_negociacion WHERE id_caso = @c2)
  INSERT INTO caso_negociacion (id_caso, monto_max_cliente, monto_ofrecido, contraoferta, estado, notas) VALUES
  (@c2, 2500000, 3500000, 2800000, 'En curso',
   N'Negociación activa. Hay acercamiento en los montos.')

IF @c3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_negociacion WHERE id_caso = @c3)
  INSERT INTO caso_negociacion (id_caso, monto_max_cliente, monto_ofrecido, contraoferta, estado, notas) VALUES
  (@c3, 500000, 750000, NULL, 'Sin iniciar', NULL)

-- Historial de ofertas
IF @c1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_negociacion_historial WHERE id_caso = @c1)
BEGIN
  INSERT INTO caso_negociacion_historial (id_caso, tipo, monto, descripcion, fecha) VALUES
  (@c1, 'Oferta',       2200000, N'Primera oferta presentada por carta documento.', DATEADD(day,-40,GETDATE())),
  (@c1, 'Contraoferta', 1200000, N'Contraparte rechazó y ofreció suma inferior.', DATEADD(day,-30,GETDATE())),
  (@c1, 'Oferta',       2000000, N'Segunda oferta nuestra, con descuento menor.',  DATEADD(day,-18,GETDATE())),
  (@c1, 'Contraoferta', 1600000, N'Acercamiento de la contraparte.',               DATEADD(day,-5, GETDATE()))
END

IF @c2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM caso_negociacion_historial WHERE id_caso = @c2)
BEGIN
  INSERT INTO caso_negociacion_historial (id_caso, tipo, monto, descripcion, fecha) VALUES
  (@c2, 'Oferta',       3500000, N'Oferta inicial. Incluye daños y perjuicios.',  DATEADD(day,-25,GETDATE())),
  (@c2, 'Contraoferta', 2800000, N'La contraparte propone suma inferior.',         DATEADD(day,-10,GETDATE()))
END

GO

PRINT 'Migración completa. Tablas creadas y datos mock insertados.'
