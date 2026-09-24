# Stage 1: Prune - Estrae solo il codice e le dipendenze necessarie per il worker
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=worker --docker

# Stage 2: Installer - Installa le dipendenze, compila il codice e isola il pacchetto
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installa pnpm globalmente
RUN npm install -g pnpm@9.1.0

# Copia i package.json estratti e il lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Installa tutte le dipendenze (incluse devDependencies per la compilazione TypeScript)
RUN pnpm install --frozen-lockfile

# Copia il codice sorgente
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json

# Esegui la build di tutti i pacchetti e del worker
RUN pnpm build --filter=worker

# Usa il comando 'pnpm deploy' per isolare l'applicazione worker compilata
# e le sue sole dipendenze di produzione in una cartella autonoma (/app/deployed)
RUN pnpm --filter=worker --prod deploy /app/deployed

# Stage 3: Runner - Immagine finale super leggera per l'esecuzione del worker
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Crea un utente non-root per sicurezza
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 node-worker

# Copia l'applicazione isolata e pronta
COPY --from=installer --chown=node-worker:nodejs /app/deployed ./

USER node-worker

# Comando per avviare il worker (definito in apps/worker/package.json come "node dist/bootstrap.js")
CMD ["node", "dist/bootstrap.js"]
