-- Ejecutar una sola vez en Azure SQL (DSO)
-- Agrega columna url_blob a pjn_actuaciones para guardar el PDF en Azure Blob Storage

ALTER TABLE pjn_actuaciones
  ADD url_blob NVARCHAR(1000) NULL;

-- Índice para buscar actuaciones con documento adjunto
CREATE INDEX ix_pjn_act_blob ON pjn_actuaciones (id_pjn_expediente)
  WHERE url_blob IS NOT NULL;
