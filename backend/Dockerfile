# ---- Build Stage ----
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma Client
RUN pnpm prisma:generate

# Copiar código fuente
COPY . .

# Build
RUN pnpm build

# ---- Production Stage ----
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Solo dependencias de producción
RUN pnpm install --frozen-lockfile --prod

# Generar Prisma Client en prod
RUN pnpm prisma generate

# Copiar build
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/v1').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start: migrar y luego arrancar
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main"]