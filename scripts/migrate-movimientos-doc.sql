-- Ejecutar una sola vez en Azure SQL (DSO)
-- Agrega columna url_documento a movimientos para guardar link al PDF en Azure Blob

ALTER TABLE movimientos
  ADD url_documento NVARCHAR(1000) NULL;
