# Dockerfile para Next.js/Node.js
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar tsconfig.json explicitamente
COPY tsconfig.json ./tsconfig.json

# Copiar o restante do código
COPY . .

# Limpar cache do Next.js antes do build
RUN rm -rf .next

# Build do projeto Next.js
RUN npm run build

# Expor a porta padrão do Next.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"] 