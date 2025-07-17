#!/usr/bin/env node

/**
 * Script de Verificação Pré-Deploy
 * Dashboard IPTV - Dokploy
 * 
 * Este script verifica se todas as configurações estão corretas
 * antes do deploy no Dokploy
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    logSuccess(`${description} encontrado`);
    return true;
  } else {
    logError(`${description} não encontrado: ${filePath}`);
    return false;
  }
}

function checkPackageJson() {
  log('\n📦 Verificando package.json...', 'bold');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!checkFileExists(packagePath, 'package.json')) {
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Verificar scripts essenciais
    const requiredScripts = ['build', 'start'];
    let scriptsOk = true;
    
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`Script '${script}' configurado`);
      } else {
        logError(`Script '${script}' não encontrado`);
        scriptsOk = false;
      }
    });

    // Verificar dependências críticas
    const criticalDeps = ['next', 'mysql2', 'bcryptjs'];
    criticalDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`Dependência '${dep}' encontrada`);
      } else {
        logError(`Dependência crítica '${dep}' não encontrada`);
        scriptsOk = false;
      }
    });

    return scriptsOk;
  } catch (error) {
    logError(`Erro ao ler package.json: ${error.message}`);
    return false;
  }
}

function checkDockerfile() {
  log('\n🐳 Verificando Dockerfile...', 'bold');
  
  const dockerfilePath = path.join(process.cwd(), 'dockerfile');
  if (!checkFileExists(dockerfilePath, 'Dockerfile')) {
    return false;
  }

  try {
    const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
    
    // Verificações básicas
    const checks = [
      { pattern: /FROM node:/i, message: 'Base image Node.js' },
      { pattern: /WORKDIR/i, message: 'Diretório de trabalho' },
      { pattern: /npm install/i, message: 'Instalação de dependências' },
      { pattern: /npm run build/i, message: 'Build do projeto' },
      { pattern: /EXPOSE 3000/i, message: 'Porta 3000 exposta' },
      { pattern: /CMD\s*\[.*npm.*start.*\]/i, message: 'Comando de inicialização' }
    ];

    let dockerfileOk = true;
    checks.forEach(check => {
      if (check.pattern.test(dockerfileContent)) {
        logSuccess(check.message);
      } else {
        logError(`${check.message} não encontrado no Dockerfile`);
        dockerfileOk = false;
      }
    });

    return dockerfileOk;
  } catch (error) {
    logError(`Erro ao ler Dockerfile: ${error.message}`);
    return false;
  }
}

function checkSqlScript() {
  log('\n🗄️  Verificando script SQL...', 'bold');
  
  const sqlPath = path.join(process.cwd(), 'scripts', 'backup-dados-importacao.sql');
  if (!checkFileExists(sqlPath, 'Script SQL de importação')) {
    return false;
  }

  try {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Verificar tabelas essenciais
    const tables = ['usuarios', 'clientes', 'planos', 'servidores', 'configuracoes'];
    let tablesOk = true;
    
    tables.forEach(table => {
      if (sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
        logSuccess(`Tabela '${table}' definida`);
      } else {
        logError(`Definição da tabela '${table}' não encontrada`);
        tablesOk = false;
      }
    });

    // Verificar dados iniciais
    if (sqlContent.includes("INSERT INTO usuarios")) {
      logSuccess('Dados iniciais do usuário admin');
    } else {
      logWarning('Dados iniciais do usuário admin não encontrados');
    }

    return tablesOk;
  } catch (error) {
    logError(`Erro ao ler script SQL: ${error.message}`);
    return false;
  }
}

function checkEnvExample() {
  log('\n🔧 Verificando .env.example...', 'bold');
  
  const envExamplePath = path.join(process.cwd(), '.env.example');
  if (!checkFileExists(envExamplePath, '.env.example')) {
    return false;
  }

  try {
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Verificar variáveis essenciais
    const requiredVars = [
      'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
      'JWT_SECRET', 'ENCRYPTION_KEY', 'CRON_SECRET'
    ];
    
    let varsOk = true;
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        logSuccess(`Variável '${varName}' documentada`);
      } else {
        logError(`Variável '${varName}' não documentada`);
        varsOk = false;
      }
    });

    return varsOk;
  } catch (error) {
    logError(`Erro ao ler .env.example: ${error.message}`);
    return false;
  }
}

function checkGitIgnore() {
  log('\n📝 Verificando .gitignore...', 'bold');
  
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!checkFileExists(gitignorePath, '.gitignore')) {
    return false;
  }

  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    // Verificar exclusões importantes
    const importantExclusions = ['.env', 'node_modules', '.next'];
    let exclusionsOk = true;
    
    importantExclusions.forEach(exclusion => {
      if (gitignoreContent.includes(exclusion)) {
        logSuccess(`'${exclusion}' está sendo ignorado`);
      } else {
        logError(`'${exclusion}' não está sendo ignorado`);
        exclusionsOk = false;
      }
    });

    return exclusionsOk;
  } catch (error) {
    logError(`Erro ao ler .gitignore: ${error.message}`);
    return false;
  }
}

function checkUploadsDirectory() {
  log('\n📁 Verificando diretório de uploads...', 'bold');
  
  const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsPath)) {
    logSuccess('Diretório de uploads existe');
    
    // Verificar se tem arquivos
    const files = fs.readdirSync(uploadsPath);
    if (files.length > 0) {
      logInfo(`${files.length} arquivo(s) encontrado(s) em uploads`);
      files.forEach(file => {
        logInfo(`  - ${file}`);
      });
    } else {
      logWarning('Diretório de uploads está vazio');
    }
    return true;
  } else {
    logWarning('Diretório de uploads não existe (será criado automaticamente)');
    return true; // Não é crítico
  }
}

function generateSecurityKeys() {
  log('\n🔐 Gerando chaves de segurança...', 'bold');
  
  const crypto = require('crypto');
  
  const jwtSecret = crypto.randomBytes(32).toString('base64');
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const cronSecret = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  
  log('\n🔑 Chaves geradas para uso no Dokploy:', 'yellow');
  log(`JWT_SECRET=${jwtSecret}`);
  log(`ENCRYPTION_KEY=${encryptionKey}`);
  log(`CRON_SECRET=${cronSecret}`);
  log(`NEXT_PUBLIC_CRON_SECRET=${cronSecret}`);
  
  logWarning('⚠️  IMPORTANTE: Copie essas chaves para as variáveis de ambiente no Dokploy!');
  logWarning('⚠️  NUNCA compartilhe essas chaves publicamente!');
}

function main() {
  log('🚀 VERIFICAÇÃO PRÉ-DEPLOY - DASHBOARD IPTV', 'bold');
  log('================================================', 'blue');
  
  const checks = [
    checkPackageJson,
    checkDockerfile,
    checkSqlScript,
    checkEnvExample,
    checkGitIgnore,
    checkUploadsDirectory
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
  }
  
  log('\n================================================', 'blue');
  
  if (allPassed) {
    logSuccess('✅ TODAS AS VERIFICAÇÕES PASSARAM!');
    logSuccess('Seu projeto está pronto para deploy no Dokploy!');
    
    generateSecurityKeys();
    
    log('\n📋 PRÓXIMOS PASSOS:', 'bold');
    log('1. Copie as chaves geradas acima');
    log('2. Configure as variáveis de ambiente no Dokploy');
    log('3. Ajuste DB_HOST, DB_USER, DB_PASSWORD conforme seu MySQL');
    log('4. Configure o volume para /app/public/uploads');
    log('5. Execute o deploy!');
    
  } else {
    logError('❌ ALGUMAS VERIFICAÇÕES FALHARAM!');
    logError('Corrija os problemas antes de fazer o deploy.');
    process.exit(1);
  }
}

// Executar verificação
if (require.main === module) {
  main();
}

module.exports = {
  checkPackageJson,
  checkDockerfile,
  checkSqlScript,
  checkEnvExample,
  checkGitIgnore,
  checkUploadsDirectory
};