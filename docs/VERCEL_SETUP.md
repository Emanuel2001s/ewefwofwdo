# Configuração do Vercel Blob Storage

## Problema Resolvido
Este sistema agora suporta upload de arquivos tanto em **desenvolvimento local** quanto em **produção no Vercel**.

### Erro Original:
```
EROFS: read-only file system, open '/var/task/public/uploads/favicon.png'
```

### Solução Implementada:
- **Desenvolvimento**: Arquivos salvos em `/public/uploads/`
- **Produção**: Arquivos salvos no Vercel Blob Storage

## Configuração no Vercel

### 1. Criar Blob Storage Token
1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Storage** → **Browse**
3. Clique em **Create Database** → **Blob**
4. Copie o token gerado

### 2. Configurar Variável de Ambiente
1. No Vercel Dashboard, vá em **Settings** → **Environment Variables**
2. Adicione uma nova variável:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (cole o token copiado)
   - **Environment**: Production, Preview

### 3. Redeploy
Após configurar a variável, faça um novo deploy ou aguarde o próximo push.

## Funcionalidades

✅ **Upload automático** detecta ambiente (dev/prod)
✅ **Fallback inteligente** para desenvolvimento local  
✅ **URLs públicas** funcionam em ambos ambientes
✅ **Validação de tipos** de arquivo mantida
✅ **Integração com banco** de configurações

## Tipos de Arquivo Suportados

**Favicon:**
- `.ico`, `.png`

**Logo:**
- `.jpg`, `.jpeg`, `.png`, `.svg`

## URLs Geradas

**Desenvolvimento:**
```
http://localhost:3000/uploads/favicon.png
http://localhost:3000/uploads/logo.png
```

**Produção:**
```
https://[blob-id].public.blob.vercel-storage.com/favicon.png
https://[blob-id].public.blob.vercel-storage.com/logo.png
``` 