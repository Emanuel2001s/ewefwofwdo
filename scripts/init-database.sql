-- Criar banco de dados se não existir
CREATE DATABASE IF NOT EXISTS iptv_manager;
USE iptv_manager;

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  senha VARCHAR(255),
  tipo ENUM('admin', 'cliente') DEFAULT 'cliente'
);

-- Criar tabela de servidores
CREATE TABLE IF NOT EXISTS servidores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL
);

-- Criar tabela de planos
CREATE TABLE IF NOT EXISTS planos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL
);

-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
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
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  FOREIGN KEY (plano_id) REFERENCES planos(id),
  FOREIGN KEY (servidor_id) REFERENCES servidores(id)
);

-- Inserir dados de exemplo
INSERT IGNORE INTO usuarios (nome, email, senha, tipo) VALUES 
('Administrador', 'admin@iptv.com', SHA2('admin123', 256), 'admin'),
('João Silva', 'joao@email.com', SHA2('123456', 256), 'cliente');

INSERT IGNORE INTO servidores (nome) VALUES 
('Servidor Principal'),
('Servidor Backup'),
('Servidor Internacional');

INSERT IGNORE INTO planos (nome, valor) VALUES 
('Plano Básico 1 Tela', 29.90),
('Plano Família 3 Telas', 49.90),
('Plano Premium 5 Telas', 79.90);

INSERT IGNORE INTO clientes (nome, whatsapp, data_vencimento, data_ativacao, ultima_renovacao, plano_id, servidor_id, observacoes, dispositivos, usuario, senha, status) VALUES 
('Maria Santos', '5511999999999', '2024-12-31', '2024-01-01', '2024-01-01', 1, 1, 'Cliente VIP', 'TV,Celular', 'maria.santos', '$2b$10$QQYZ9qmXGcL9Mcn7s.Y3DuOTdIb9ENisr0cd0gVRc.C7WBH27mYVq', 'ativo'),
('Pedro Oliveira', '5511888888888', '2024-12-25', '2024-01-01', '2024-01-01', 2, 2, 'Pagamento em dia', 'TV,PC,Celular', 'pedro.oliveira', '$2b$10$QQYZ9qmXGcL9Mcn7s.Y3DuOTdIb9ENisr0cd0gVRc.C7WBH27mYVq', 'ativo'),
('Ana Costa', '5511777777777', '2024-12-20', '2024-01-01', '2024-01-01', 3, 1, 'Cliente premium', 'TV,PC,Celular,Notebook', 'ana.costa', '$2b$10$QQYZ9qmXGcL9Mcn7s.Y3DuOTdIb9ENisr0cd0gVRc.C7WBH27mYVq', 'inativo');
