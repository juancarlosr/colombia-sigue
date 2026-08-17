# Colombia Sigue — Payroll Giving

MVP de payroll giving para Colombia. Valida una sola hipótesis: ¿los empleados están dispuestos a autorizar un aporte mensual pequeño desde su nómina y sostenerlo varios meses?

La plataforma **no toca la plata**: registra autorizaciones voluntarias, genera el archivo para nómina y deja trazable el flujo empresa → fundación. La spec completa (31 secciones más los cambios post-v0) vive en [docs/payroll_giving_mvp_prompt.md](docs/payroll_giving_mvp_prompt.md). Si vienes a auditar o eres un agente, arranca por [AGENTS.md](AGENTS.md).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 + shadcn (Base UI) · PostgreSQL · Prisma 7 · monolito. UI verde lima + azul claro, Plus Jakarta Sans para el cuerpo y Bricolage Grotesque para los títulos. Deploy en Vercel: `vercel-build` genera el cliente de Prisma, aplica migraciones y compila.

## Correrlo local

Requisitos: Node 20+ y Docker.

```bash
docker compose up -d db      # Postgres 16 en el puerto 5433
cp .env.example .env         # y define SESSION_SECRET (mínimo 32 caracteres):
#   openssl rand -base64 48
npm install
npx prisma generate          # ojo: en Prisma 7, migrate NO genera el cliente
npm run db:migrate
npm run db:seed              # datos demo deterministas — re-córrelo sin miedo
npm run dev                  # http://localhost:3000
```

Para verificar: `npm test` (necesita la base arriba), `npm run lint`, `npm run typecheck`, `npm run build`.

## Autenticación (sin contraseñas)

Magic links de un solo uso (15 min de vigencia, hash SHA-256 en base de datos), con sesión en cookie JWT firmada (`SESSION_SECRET`). El rol se re-verifica contra la base en cada request — la cookie solo identifica al usuario. Sin `RESEND_API_KEY`, los "correos" salen por la consola del dev server: ese es el modo esperado en desarrollo.

Dos detalles que no son accidente:

- Abrir el link **no** consume el token (los escáneres de correo corporativo hacen prefetch): el GET solo valida y el ingreso real es el clic en "Continuar".
- El login nunca revela si un email está registrado o no.

Para entrar como cualquier usuario en desarrollo:

```bash
npx tsx scripts/mint-login-token.ts ana.gomez@acme.example.com
# abre http://localhost:3000/auth/verify?token=<token>
```

Roles: `EMPLOYEE` → `/app`, `COMPANY_ADMIN` → `/admin`, `PLATFORM_ADMIN` → `/platform`.

## Datos demo

El seed crea la **Fundación Reconstruir Colombia** y **cinco empresas** en distintas etapas del piloto, para que las métricas se vean con datos honestos:

| Empresa | Etapa |
|---|---|
| Celerik (38 empleados) | 3 meses de historia: junio y julio completados y recibidos, agosto en curso |
| ACME (93) | Misma historia de 3 meses; conserva el elenco demo de la spec §29 (cambio de monto de María, cancelación de Diego) |
| Gutierrez Group (65) | Snapshot fresco de agosto |
| Grupo San Remo (46) | Resultados subidos, transferencia pendiente |
| Cubia (4) | Recién inscrita, sin períodos |

Cuentas útiles: `platform@colombiasigue.example.com` (plataforma), `rrhh@acme.example.com` (admin de empresa), `sofia.herrera@acme.example.com` (empleada que nunca ha donado — el journey completo disponible). La lista completa está en [AGENTS.md](AGENTS.md). Ojo: re-correr el seed resetea todo e invalida las sesiones.

## Ciclo mensual de nómina

El flujo admin opera sobre **un período a la vez**: el más reciente que siga abierto y sin transferencia — no el mes calendario. Los resultados de la nómina de agosto pueden subirse en septiembre sin problema. Un mes nuevo se abre cuando el anterior fue transferido; un período abandonado (≥2 meses atrás, sin descuentos) se cierra solo. Registrada la transferencia, el período queda inmutable y los aportes sin descuento se resuelven como "no hubo aporte ese mes" (spec §13).

La página de nómina le dice a RRHH qué sigue en 3 segundos: banner de estado dominante ("Agosto 2026 · Resultados registrados · Siguiente paso: transferir $X") y chips Completado/Pendiente por paso. Y el monto de la transferencia ya no es texto libre: un botón registra el total exacto ("Registrar transferencia por $X"); un monto distinto es un flujo excepcional detrás de una advertencia.

Los montos del CSV de resultados se aceptan solo en dígitos: `20.000` se rechaza, nunca se lee como 20 pesos.

## Vista de plataforma

`/platform` lista las empresas inscritas (empleados, donantes activos, autorizado mensual, donado real) y cada una tiene su detalle en `/platform/empresas/[id]`: métricas del piloto (spec §24), totales mes a mes con estado del período y la lista de empleados — sin números de documento, por minimización de datos (spec §21). Todo solo lectura: no hay CRUD de empresas.

## Modelo de datos

Seis entidades de dominio (`prisma/schema.prisma`): `Company`, `Employee`, `Foundation`, `DonationAuthorization`, `PayrollPeriod`, `PayrollContribution`, más `User` para auth/RBAC.

Regla central: `DonationAuthorization` es **append-only**. Cambiar el monto crea una autorización nueva y marca la anterior `SUPERSEDED`; cancelar marca `CANCELLED`. El consentimiento original (texto, versión, email, IP, user agent) jamás se edita ni se borra. Y solo puede haber una autorización `ACTIVE` por empleado (advisory lock de Postgres).

## Gates legales antes de descuentos reales

- El texto de autorización (`v0-draft`) debe aprobarlo un abogado laboral colombiano. Cambiarlo es un cambio de datos — nueva versión del texto — no de código.
- Cualquier promesa de beneficio tributario necesita el visto bueno de un especialista tributario.
