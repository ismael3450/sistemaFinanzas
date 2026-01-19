# FinControl - Frontend

Sistema de Control Financiero Multiorganización desarrollado con Angular 19.

## 🚀 Stack Tecnológico

- **Framework:** Angular 19
- **UI Components:** PrimeNG 17
- **Estilos:** Tailwind CSS 3
- **State Management:** Angular Signals
- **Forms:** Reactive Forms
- **Gráficos:** ng-apexcharts
- **HTTP Client:** Angular HttpClient con Interceptors

## 📁 Estructura del Proyecto

```
src/app/
├── core/                    # Funcionalidad central
│   ├── guards/             # Route guards (auth, org, role)
│   ├── interceptors/       # HTTP interceptors
│   ├── models/             # Interfaces y tipos TypeScript
│   └── services/           # Servicios de la aplicación
│
├── features/               # Módulos de funcionalidades
│   ├── auth/              # Login, Register
│   ├── layout/            # Layout principal con sidebar
│   ├── dashboard/         # Dashboard con estadísticas
│   ├── organizations/     # Gestión de organizaciones
│   ├── accounts/          # Gestión de cuentas
│   ├── categories/        # Gestión de categorías
│   ├── transactions/      # Gestión de transacciones
│   ├── reports/           # Reportes y gráficos
│   ├── audit/             # Bitácora de auditoría
│   └── settings/          # Configuración y miembros
│
├── shared/                 # Componentes compartidos
│   ├── components/        # Componentes reutilizables
│   ├── pipes/             # Pipes personalizados
│   └── directives/        # Directivas
│
└── environments/          # Configuración de ambientes
```

## 🛠️ Instalación

```bash
# Instalar dependencias
pnpm install

# Iniciar en desarrollo
pnpm start

# Build para producción
pnpm build:prod
```

## 📋 Características

### Autenticación
- Login/Logout con JWT
- Registro de usuarios
- Refresh token automático
- Guards de autenticación

### Multi-Organización
- Crear y gestionar organizaciones
- Cambiar entre organizaciones
- Roles y permisos por organización

### Gestión Financiera
- **Cuentas:** Efectivo, banco, tarjetas, inversiones
- **Categorías:** Jerárquicas con subcategorías
- **Transacciones:** Ingresos, egresos, transferencias
- **Métodos de pago:** Configurables por organización

### Reportes
- Resumen por período
- Reportes por categoría
- Reportes por cuenta
- Gráficos de tendencias
- Exportación a CSV/XLSX/PDF

### Auditoría
- Registro de todas las acciones
- Filtros por fecha, usuario, módulo
- Detalle de cambios (antes/después)

## 🔧 Configuración

### Variables de Entorno

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api/v1'
};
```

### Proxy para Desarrollo

Crear `proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

## 🎨 Personalización

### Tema PrimeNG
Los estilos de PrimeNG se pueden personalizar en `src/styles.scss`.

### Colores Tailwind
Los colores se configuran en `tailwind.config.js`.

## 📱 Responsivo

El diseño es completamente responsivo:
- Desktop: Sidebar expandido
- Tablet: Sidebar colapsable
- Mobile: Sidebar oculto con toggle

## 🔐 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| OWNER | Acceso total |
| ADMIN | Gestión completa excepto eliminar org |
| TREASURER | Transacciones y reportes |
| MEMBER | Crear transacciones |
| VIEWER | Solo lectura |

## 📊 Servicios Disponibles

- `AuthService` - Autenticación y tokens
- `OrganizationService` - Gestión de organizaciones
- `AccountService` - Gestión de cuentas
- `CategoryService` - Gestión de categorías
- `TransactionService` - Gestión de transacciones
- `ReportService` - Reportes y estadísticas
- `ExportService` - Exportación de datos
- `AuditService` - Bitácora de auditoría
- `MemberService` - Gestión de miembros
- `PaymentMethodService` - Métodos de pago

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm e2e
```

## 📝 Convenciones

### Dinero
- Los montos se manejan en **minor units** (centavos)
- Ejemplo: $10.50 = 1050
- Usar `MoneyPipe` para formatear

### Componentes
- Standalone components
- Lazy loading por feature
- Signals para estado reactivo

## 📄 Licencia

MIT License
