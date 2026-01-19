# Sistema de Control Financiero Multiorganización - API

API REST para el control general de dinero (entradas/salidas) aplicable a iglesias, comités, ONG, condominios, equipos y negocios pequeños.

## 🚀 Características

- **Multi-organización (multi-tenant)**: Cada organización tiene sus propios datos aislados
- **Roles y permisos**: OWNER, ADMIN, TREASURER, MEMBER, VIEWER
- **Manejo seguro de dinero**: Almacenamiento en minor units (centavos) usando Dinero.js
- **Auditoría completa**: Registro de todas las operaciones
- **Integración con Wompi El Salvador**: Pagos de suscripciones
- **API documentada**: Swagger/OpenAPI con SDK generado

## 📋 Stack Tecnológico

- **NestJS** con **Fastify**
- **Prisma ORM** + **PostgreSQL**
- **JWT** para autenticación
- **Swagger/OpenAPI** para documentación
- **Dinero.js** para manejo de dinero

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- pnpm

### Pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Generar cliente Prisma
pnpm prisma:generate

# 4. Ejecutar migraciones
pnpm prisma:migrate

# 5. Sembrar datos iniciales
pnpm prisma:seed

# 6. Iniciar servidor de desarrollo
pnpm start:dev
```

## 📚 Documentación API

- **Swagger UI**: http://localhost:3000/docs
- **API Base**: http://localhost:3000/api/v1

## 💰 Convención de Dinero

Todos los montos se almacenan en **minor units** (centavos):
- $10.50 → 1050
- $100.00 → 10000

## 🔑 Roles

| Rol | Descripción |
|-----|-------------|
| OWNER | Control total |
| ADMIN | Gestión completa |
| TREASURER | Transacciones y reportes |
| MEMBER | Crear transacciones |
| VIEWER | Solo lectura |

## 💳 Wompi El Salvador

Configurar en `.env`:
```env
WOMPI_PUBLIC_KEY=your-public-key
WOMPI_PRIVATE_KEY=your-private-key
WOMPI_EVENTS_SECRET=your-events-secret
```

## 👥 Credenciales Demo

```
Email: admin@example.com
Password: Admin123!
```
