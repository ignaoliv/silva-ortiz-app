-- Tabla para almacenar feedback de usuarios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='feedback' AND xtype='U')
BEGIN
  CREATE TABLE feedback (
    id               INT           IDENTITY(1,1) PRIMARY KEY,
    tipo             NVARCHAR(50)  NOT NULL,
    mensaje          NVARCHAR(2000) NOT NULL,
    pagina           NVARCHAR(500) NULL,
    email_usuario    NVARCHAR(255) NOT NULL,
    nombre_usuario   NVARCHAR(255) NULL,
    leido            BIT           NOT NULL DEFAULT 0,
    fecha_creacion   DATETIME2     NOT NULL DEFAULT GETDATE()
  );

  PRINT 'Tabla feedback creada OK';
END
ELSE
BEGIN
  PRINT 'Tabla feedback ya existe';
END
