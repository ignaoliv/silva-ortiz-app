IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='plantillas' AND xtype='U')
BEGIN
  CREATE TABLE plantillas (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    nombre         NVARCHAR(200)   NOT NULL,
    categoria      NVARCHAR(100)   NULL,
    contenido      NVARCHAR(MAX)   NOT NULL,
    creado_por     NVARCHAR(200)   NULL,
    creado_en      DATETIME2       DEFAULT GETDATE(),
    actualizado_en DATETIME2       DEFAULT GETDATE()
  )
END
