-- Ejecutar una sola vez en Azure SQL (DSO)
-- Tabla para guardar credenciales PJN por usuario

CREATE TABLE pjn_credenciales (
  id_credencial       INT IDENTITY(1,1) PRIMARY KEY,
  email_usuario       NVARCHAR(255) NOT NULL UNIQUE,
  pjn_cuit            NVARCHAR(20)  NOT NULL,
  pjn_password_enc    NVARCHAR(500) NOT NULL,
  fecha_actualizacion DATETIME      DEFAULT GETDATE()
);
