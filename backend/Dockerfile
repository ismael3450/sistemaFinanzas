# ---- Single Stage Build (más simple y confiable) ----
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copiar dependencias
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Instalar todas las dependencias
RUN pnpm install --frozen-lockfile

# Generar Prisma Client
RUN pnpm prisma:generate

# Copiar código fuente y compilar
COPY . .
RUN pnpm build

# Limpiar source code (dejar solo dist y node_modules)
RUN rm -rf src test scripts eslint.config.mjs tsconfig*.json nest-cli.json

RUN chmod +x fly-release.sh

EXPOSE 8080

CMD ["node", "dist/src/main.js"]
