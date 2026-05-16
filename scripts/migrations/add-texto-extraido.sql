-- Agrega columna texto_extraido a pjn_actuaciones para guardar el texto extraído de los PDFs
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID('pjn_actuaciones') AND name = 'texto_extraido'
)
BEGIN
  ALTER TABLE pjn_actuaciones ADD texto_extraido NVARCHAR(MAX) NULL
END
