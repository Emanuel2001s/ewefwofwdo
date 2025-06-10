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
  plano_id INT,
  servidor_id INT,
  observacoes TEXT,
  dispositivos SET('TV', 'Celular', 'PC', 'Notebook'),
  usuario_id INT,
  status ENUM('ativo', 'inativo') DEFAULT 'ativo',
  FOREIGN KEY (plano_id) REFERENCES planos(id),
  FOREIGN KEY (servidor_id) REFERENCES servidores(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
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

INSERT IGNORE INTO clientes (nome, whatsapp, data_vencimento, plano_id, servidor_id, observacoes, dispositivos, status) VALUES 
('Maria Santos', '(11) 99999-9999', '2024-12-31', 1, 1, 'Cliente VIP', 'TV,Celular', 'ativo'),
('Pedro Oliveira', '(11) 88888-8888', '2024-12-25', 2, 2, 'Pagamento em dia', 'TV,PC,Celular', 'ativo'),
('Ana Costa', '(11) 77777-7777', '2024-12-20', 3, 1, 'Cliente premium', 'TV,PC,Celular,Notebook', 'inativo');
