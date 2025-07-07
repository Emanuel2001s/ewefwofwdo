-- Atualizar campos de data para DATETIME
ALTER TABLE clientes
  MODIFY COLUMN data_vencimento DATETIME,
  MODIFY COLUMN data_ativacao DATETIME,
  MODIFY COLUMN ultima_renovacao DATETIME;

-- Atualizar registros existentes para definir horário correto
UPDATE clientes 
SET data_ativacao = DATE_FORMAT(data_ativacao, '%Y-%m-%d 00:00:00')
WHERE data_ativacao IS NOT NULL;

UPDATE clientes 
SET data_vencimento = DATE_FORMAT(data_vencimento, '%Y-%m-%d 23:59:59')
WHERE data_vencimento IS NOT NULL;

-- Atualizar última renovação se existir
UPDATE clientes 
SET ultima_renovacao = DATE_FORMAT(ultima_renovacao, '%Y-%m-%d 00:00:00')
WHERE ultima_renovacao IS NOT NULL; 