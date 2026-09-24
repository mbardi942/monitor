# Stage 1: Prune - Estrae solo il codice e le dipendenze necessarie per l'app web
FROM node:20-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo
WORKDIR /app
COPY . .
RUN turbo prune --scope=@monitor/web --docker

# Stage 2: Installer - Installa le dipendenze e compila il progetto
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installa pnpm globalmente
RUN npm install -g pnpm@9.1.0

# Copia i package.json estratti e il lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Installa le dipendenze basandoti solo sul lockfile
RUN pnpm install --frozen-lockfile

# Copia il codice sorgente completo estratto da turbo prune
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json

# Variabile di build per inlining di Next.js nel client bundle (default: false per produzione/docker)
ARG NEXT_PUBLIC_USE_MOCK=false
ENV NEXT_PUBLIC_USE_MOCK=$NEXT_PUBLIC_USE_MOCK

# Esegui la build del progetto filtrando solo per l'applicazione web
RUN pnpm build --filter=@monitor/web

# Stage 3: Runner - Immagine finale super leggera per l'esecuzione
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Crea un utente di sistema per evitare di eseguire il container come root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia i file standalone generati da Next.js.
# Next.js standalone copia i file necessari, inclusi node_modules e packages condivisi.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# Avvia l'applicazione usando il server Node autonomo generato da Next.js
CMD ["node", "apps/web/server.js"]
