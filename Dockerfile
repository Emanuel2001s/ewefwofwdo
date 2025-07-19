# Dockerfile para Next.js/Node.js
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar tsconfig.json explicitamente
COPY tsconfig.json ./tsconfig.json

# Copiar o restante do código
COPY . .

# Limpar cache do Next.js antes do build
RUN rm -rf .next

# Build do projeto Next.js com SKIP_DB para evitar conexões durante build
ENV SKIP_DB=true
RUN npm run build

# Definir SKIP_DB como string vazia para runtime (será interpretado como false)
ENV SKIP_DB=

# Expor a porta padrão do Next.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]