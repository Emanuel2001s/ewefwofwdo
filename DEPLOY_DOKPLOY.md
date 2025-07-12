# Deploy via Dokploy com GitHub

Este projeto será clonado diretamente do repositório GitHub [`ewefwofwdo`](https://github.com/Emanuel2001s/ewefwofwdo.git) para deploy via Dokploy. Siga as orientações abaixo para garantir que o deploy ocorra sem problemas.

## 1. Checklist para Push Inicial

- [ ] Faça o push de todo o código-fonte para o repositório (exceto arquivos sensíveis como `.env`).
- [ ] Certifique-se de que o `Dockerfile` está na raiz do projeto.
- [ ] O arquivo `.gitignore` deve estar configurado para não subir `.env`, arquivos de uploads e outros dados sensíveis.
- [ ] O `README.md` pode ser atualizado com instruções básicas de uso e deploy (opcional, mas recomendado).
- [ ] Teste o build Docker localmente, se possível, para garantir que não há erros de configuração.

## 2. Após o Push, no Dokploy

- Conecte o repositório [`ewefwofwdo`](https://github.com/Emanuel2001s/ewefwofwdo.git) ao Dokploy.
- Configure todas as variáveis de ambiente necessárias pelo painel do Dokploy (NUNCA suba o `.env` para o repositório).
- Configure o volume para uploads, mapeando `public/uploads/` para um diretório persistente na VPS.
- Siga o checklist e os passos detalhados nas seções seguintes deste documento.

## 3. Deploy Inicial

- O Dokploy irá clonar o repositório, construir a imagem Docker e rodar o container automaticamente.
- Se houver erros de build, revise o `Dockerfile` e as dependências listadas no `package.json`.

## 4. Atualizações Futuras

- Sempre que fizer alterações no projeto, faça commit e push para o repositório.
- O Dokploy pode ser configurado para redeploy automático ou manual após cada push.

---

# Plano de Deploy via Dokploy

Este documento descreve o passo a passo e os pontos de atenção para realizar o deploy do projeto **dashboard-iptv-v0** em uma VPS utilizando o Dokploy (ou qualquer plataforma baseada em Docker).

---

## 1. Pré-requisitos

- VPS com Docker e Dokploy instalados e configurados.
- Acesso SSH à VPS.
- Domínio configurado (opcional, mas recomendado).
- Backup dos dados importantes antes de iniciar o deploy.

---

## 2. Estrutura do Projeto

- Projeto baseado em Node.js/Next.js (TypeScript).
- Utiliza MySQL como banco de dados.
- Uploads de arquivos em `public/uploads/`.
- Scripts de cron em `cron/scripts/`.

---

## 3. Passos para Deploy

### 3.1. Adicionar um Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto com o seguinte conteúdo básico (ajuste conforme necessário):

```Dockerfile
# Escolha uma imagem base oficial do Node.js
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copie os arquivos de dependências
COPY package*.json ./

# Instale as dependências
RUN npm install --production

# Copie o restante do código
COPY . .

# Build do projeto (Next.js)
RUN npm run build

# Exponha a porta padrão do Next.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
```

### 3.2. Configurar Variáveis de Ambiente

- Crie um arquivo `.env` com todas as variáveis necessárias (NUNCA suba este arquivo para o git).
- No Dokploy, configure as variáveis de ambiente via painel ou CLI.
- Documente todas as variáveis obrigatórias.

### 3.3. Persistência de Uploads

- Mapeie a pasta `public/uploads/` para um volume externo no Docker para garantir persistência dos arquivos enviados.
- Exemplo de configuração no Dokploy:
  - Volume: `/caminho/na/vps/uploads:/app/public/uploads`

### 3.4. Banco de Dados

- Certifique-se de que o MySQL esteja rodando (pode ser em outro container ou serviço externo).
- Configure as variáveis de conexão no `.env`.
- Execute as migrações/criação de tabelas necessárias antes de iniciar o app.

### 3.5. Scripts de Cron

- Se necessário, crie containers separados para rodar scripts de cron, ou utilize o agendador da própria VPS.
- Documente quais scripts precisam ser executados periodicamente.

### 3.6. Build e Start

- O Dokploy executará os comandos de build e start definidos no `package.json`:
  - `npm run build`
  - `npm start`
- Certifique-se de que estes scripts estejam corretos.

### 3.7. Configuração de Domínio e HTTPS (Opcional)

- Configure o domínio no painel do Dokploy.
- Ative HTTPS se necessário.

---

## 4. Pontos de Atenção

- **Uploads:** Sempre utilize volumes para persistência.
- **Variáveis de ambiente:** Nunca suba `.env` para o git.
- **Banco de dados:** Backup antes de deploys.
- **Dependências do sistema:** Se precisar de libs extras (ex: ffmpeg), adicione ao Dockerfile.
- **Logs:** Configure logs para facilitar troubleshooting.

---

## 5. Checklist Rápido

- [ ] Dockerfile criado e testado
- [ ] Variáveis de ambiente documentadas e configuradas
- [ ] Volumes de uploads configurados
- [ ] Banco de dados acessível e configurado
- [ ] Scripts de cron agendados (se necessário)
- [ ] Domínio e HTTPS configurados (opcional)

---

## 6. Referências

- [Dokploy Docs](https://docs.dokploy.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Docker Volumes](https://docs.docker.com/storage/volumes/)

---

**Dúvidas ou problemas? Consulte a documentação oficial ou peça suporte!** 