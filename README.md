# Colombia Sigue — Payroll Giving MVP

MVP de payroll giving para Colombia. Valida una sola hipótesis: ¿los empleados están dispuestos a autorizar una pequeña donación mensual desde su nómina y mantenerla varios meses?

La plataforma **no mueve dinero**: registra autorizaciones voluntarias, genera el archivo para nómina y hace trazable el flujo empresa → fundación. Spec completa en [docs/payroll_giving_mvp_prompt.md](docs/payroll_giving_mvp_prompt.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind + shadcn/ui · PostgreSQL · Prisma 7 · monolito.

## Desarrollo local

Requisitos: Node 20+, Docker.

```bash
# 1. Levantar la base de datos
docker compose up -d db

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar dependencias, migrar y sembrar datos demo
npm install
npm run db:migrate
npm run db:seed

# 4. Correr la app
npm run dev
```

## Autenticación

Sin contraseñas: magic links de un solo uso (15 min de vigencia, hash SHA-256 en base de datos) con sesión en cookie JWT firmada (`SESSION_SECRET`). Sin `RESEND_API_KEY`, los enlaces se imprimen en la consola del servidor — el modo esperado en desarrollo.

Para entrar como cualquier usuario en desarrollo:

```bash
npx tsx scripts/mint-login-token.ts ana.gomez@acme.example.com
# abre http://localhost:3000/auth/verify?token=<token>
```

Roles: `EMPLOYEE` (`/app`), `COMPANY_ADMIN` (`/admin`), `PLATFORM_ADMIN` (`/platform`). La autorización se verifica server-side contra la base de datos en cada request — la cookie solo identifica al usuario.

## Datos demo

El seed crea la empresa **Acme Colombia SAS**, la **Fundación Reconstruir Colombia** y 10 empleados que cubren todos los estados del journey: autorizaciones activas, una cancelada, una reemplazada (cambio de monto) y el período de nómina Agosto 2026 con aportes en cada estado (`AUTHORIZED`, `DEDUCTED`, `RECEIVED`).

## Modelo de datos

Seis entidades (`prisma/schema.prisma`): `Company`, `Employee`, `Foundation`, `DonationAuthorization`, `PayrollPeriod`, `PayrollContribution`, más `User` para auth/RBAC.

Regla central: `DonationAuthorization` es **append-only**. Cambiar el monto crea una autorización nueva y marca la anterior como `SUPERSEDED`; cancelar marca `CANCELLED`. Nunca se edita ni borra el consentimiento original.

## Gates legales antes de descuentos reales

- El texto de autorización (`v0-draft`) debe ser aprobado por un abogado laboral colombiano. Cambiarlo es un cambio de datos: nueva versión de texto, no cambio de código.
- Cualquier promesa de beneficio tributario requiere validación de un especialista tributario.
