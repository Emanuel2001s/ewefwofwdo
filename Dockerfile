# Dockerfile multi-stage para produção
FROM node:18-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Imagem final
FROM node:18-alpine AS production

WORKDIR /app

# Instalar dependências de runtime
RUN apk add --no-cache libc6-compat

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar arquivos necessários
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

# Comando para iniciar
CMD ["npm", "start"] 