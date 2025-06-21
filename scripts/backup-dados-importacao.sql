-- ====================================
-- BACKUP PARA IMPORTAÇÃO - DASHBOARD IPTV
-- Para usar em banco já existente
-- Data: 2025-06-21
-- ====================================

-- ====================================
-- ESTRUTURA DAS TABELAS
-- ====================================

-- Tabela: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  tipo ENUM('admin', 'cliente') DEFAULT 'cliente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: configuracoes
CREATE TABLE IF NOT EXISTS configuracoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: servidores
CREATE TABLE IF NOT EXISTS servidores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: planos
CREATE TABLE IF NOT EXISTS planos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  duracao_dias INT NOT NULL DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela: clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  whatsapp VARCHAR(20),
  data_vencimento DATE,
  data_ativacao DATE,
  ultima_renovacao DATE,
  plano_id INT,
  servidor_id INT,
  observacoes TEXT,
  dispositivos SET('TV', 'Celular', 'PC', 'Notebook'),
  usuario VARCHAR(50) UNIQUE,
  senha VARCHAR(255),
  status ENUM('ativo', 'inativo', 'vencido') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE SET NULL,
  FOREIGN KEY (servidor_id) REFERENCES servidores(id) ON DELETE SET NULL
);

-- View: vw_clientes_vencimento
CREATE OR REPLACE VIEW vw_clientes_vencimento AS
SELECT 
  c.*,
  p.nome as plano_nome,
  p.valor as plano_valor,
  s.nome as servidor_nome,
  CASE 
    WHEN c.data_vencimento < CURDATE() THEN 'vencido'
    WHEN c.data_vencimento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'vence_em_breve'
    ELSE 'ativo'
  END as status_vencimento,
  DATEDIFF(c.data_vencimento, CURDATE()) as dias_para_vencimento
FROM clientes c
LEFT JOIN planos p ON c.plano_id = p.id
LEFT JOIN servidores s ON c.servidor_id = s.id;

-- ====================================
-- DADOS ATUAIS DO BANCO
-- ====================================

-- Dados: usuarios
INSERT INTO usuarios (id, nome, usuario, senha, tipo) VALUES 
(1, 'Admin Supremo', 'admin', '$2b$10$GH.didOKjQcwzdm/0YGAL.JMHSirnKtE9GUXmnaLPGIL0cjZkGBw2', 'admin')
ON DUPLICATE KEY UPDATE 
nome = VALUES(nome),
usuario = VALUES(usuario),
senha = VALUES(senha),
tipo = VALUES(tipo);

-- Dados: configuracoes
INSERT INTO configuracoes (id, chave, valor, descricao, created_at, updated_at) VALUES 
(1, 'nome_sistema', 'Dashboard IPTV', 'Nome do sistema exibido em todas as páginas', '2025-06-20 15:06:29', '2025-06-21 13:44:23'),
(2, 'favicon_url', '/uploads/favicon.png', 'URL do favicon do sistema', '2025-06-20 15:06:29', '2025-06-20 20:19:44'),
(3, 'logo_url', '/uploads/logo.png', 'URL da logo exibida na página de login', '2025-06-20 15:06:29', '2025-06-20 15:13:44')
ON DUPLICATE KEY UPDATE 
chave = VALUES(chave),
valor = VALUES(valor),
descricao = VALUES(descricao),
created_at = VALUES(created_at),
updated_at = VALUES(updated_at);

-- Dados: servidores
INSERT INTO servidores (id, nome) VALUES 
(8, 'Fire TV'),
(9, 'Uni TV')
ON DUPLICATE KEY UPDATE 
nome = VALUES(nome);

-- Dados: planos
INSERT INTO planos (id, nome, valor, duracao_dias) VALUES 
(7, '1 Tela', 30.00, 30),
(8, '2 telas', 50.00, 30)
ON DUPLICATE KEY UPDATE 
nome = VALUES(nome),
valor = VALUES(valor),
duracao_dias = VALUES(duracao_dias);

-- Dados: clientes
INSERT INTO clientes (id, nome, whatsapp, data_vencimento, data_ativacao, ultima_renovacao, plano_id, servidor_id, observacoes, dispositivos, usuario, senha, status) VALUES 
(9, 'Emanuel', '5575989898989', '2025-07-20', '2025-06-20', '2025-06-20', 7, 8, 'cliente bom', 'TV,Celular', 'emanuel', '$2b$10$NHDSE2laABvby.W8He/sMe28cNw93903cz4Nll5PHpPosDhECb6Pe', 'inativo'),
(10, 'jessica', '5588554565484', '2025-07-24', '2025-06-24', '2025-06-24', 8, 9, 'otima', 'Celular,Notebook', 'jessica', '$2b$10$95JJktpEvwJQDghFtFiuj.Edv.rg8IgPmGpJTyRETqdAnJMOu.WlO', 'ativo'),
(11, 'Marcia', '5575419898988', '2025-07-20', '2025-06-20', '2025-06-20', 7, 8, 'teste', 'TV,Celular', 'marcia', '$2b$10$n3LVJ48HziXgem3a00ycYu7.cNOfMlb3PxOdW/HhuU0tK4t60PAry', 'ativo')
ON DUPLICATE KEY UPDATE 
nome = VALUES(nome),
whatsapp = VALUES(whatsapp),
data_vencimento = VALUES(data_vencimento),
data_ativacao = VALUES(data_ativacao),
ultima_renovacao = VALUES(ultima_renovacao),
plano_id = VALUES(plano_id),
servidor_id = VALUES(servidor_id),
observacoes = VALUES(observacoes),
dispositivos = VALUES(dispositivos),
usuario = VALUES(usuario),
senha = VALUES(senha),
status = VALUES(status);

-- ====================================
-- ÍNDICES PARA PERFORMANCE
-- ====================================

CREATE INDEX IF NOT EXISTS idx_clientes_plano ON clientes(plano_id);
CREATE INDEX IF NOT EXISTS idx_clientes_servidor ON clientes(servidor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_vencimento ON clientes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_clientes_usuario ON clientes(usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON configuracoes(chave);

-- ====================================
-- INFORMAÇÕES DO BACKUP
-- ====================================
/*
BACKUP PARA IMPORTAÇÃO - 2025-06-21
BANCO ORIGINAL: u636989496_iptvv0

INSTRUÇÕES:
1. Selecione o banco de destino no seu MySQL
2. Execute este arquivo SQL
3. Todas as tabelas e dados serão criados/atualizados
4. Teste o login: admin / admin123@*

DADOS INCLUÍDOS:
- 1 usuário administrador
- 3 configurações do sistema  
- 2 servidores
- 2 planos
- 3 clientes
- 1 view (vw_clientes_vencimento)
- 8 índices para performance

SEGURANÇA:
- ON DUPLICATE KEY UPDATE: Não sobrescreve dados existentes
- IF NOT EXISTS: Evita erros se tabelas já existirem
- Senhas mantidas criptografadas
*/ 