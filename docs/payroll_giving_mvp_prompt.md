# Prompt — MVP Simplificado de Payroll Giving en Colombia

Actúa como Product Manager, UX/UI Designer y Full-Stack Engineer senior.

Quiero construir un MVP extremadamente simple de una plataforma de **Payroll Giving para Colombia**.

El objetivo NO es construir una plataforma completa de filantropía.

El objetivo es validar una sola hipótesis:

> **¿Los empleados colombianos están dispuestos a autorizar una pequeña donación mensual desde su nómina y mantenerla durante varios meses?**

El MVP debe priorizar simplicidad, velocidad de desarrollo, confianza y trazabilidad.

---

# 1. Alcance del piloto

Diseñar el producto inicialmente para:

- 1 empresa
- 1 fundación
- 30–100 empleados
- 1 donación mensual por empleado
- piloto de 3 meses

No diseñar todavía para escalar a cientos de empresas o fundaciones.

La arquitectura puede permitir evolucionar posteriormente, pero NO agregar funcionalidades anticipadamente.

---

# 2. Cómo funciona

El flujo financiero es:

Employee
→ autoriza descuento mensual

Company
→ realiza el descuento mediante su sistema de nómina

Company
→ transfiere el total recaudado directamente a Foundation

Foundation
→ recibe el dinero

Platform
→ registra que el aporte fue completado y se lo muestra al Employee

La plataforma:

- NO recibe dinero;
- NO procesa pagos;
- NO almacena tarjetas;
- NO funciona como wallet;
- NO calcula nómina;
- NO emite certificados tributarios.

---

# 3. Usuarios

Sólo existirán dos interfaces.

## Employee

Puede:

- ingresar mediante invitación;
- elegir cuánto donar mensualmente;
- autorizar el descuento;
- ver su aporte activo;
- cambiar el monto;
- cancelar;
- consultar sus aportes anteriores.

## Company Admin

Puede:

- importar empleados;
- enviar invitaciones;
- consultar donantes activos;
- descargar las autorizaciones vigentes para nómina;
- registrar cuánto fue realmente descontado;
- registrar que el dinero fue transferido a la fundación.

No construir portal para Foundation.

La coordinación con Foundation durante el piloto puede hacerse manualmente por email, teléfono o WhatsApp.

---

# 4. Journey del empleado

El journey debe tener máximo 4 pantallas principales.

Las pantallas del flujo muestran un stepper discreto de orientación:

**1 Monto → 2 Autorización → 3 Activo**

Orientación, no gamificación.

## Pantalla 1 — Invitación

Mostrar:

**Ayuda todos los meses directamente desde tu nómina**

"[Company Name] se unió a [Foundation Name] para facilitar aportes mensuales a [cause description].

No necesitas tarjeta y puedes detener tu aporte cuando quieras."

CTA:

**Quiero participar**

El acceso puede realizarse mediante magic link enviado al email corporativo.

No implementar passwords si no son necesarias.

---

# 5. Pantalla 2 — Elegir monto

Mostrar:

**¿Cuánto quieres aportar mensualmente?**

Opciones:

- $10.000
- $20.000
- $50.000
- Otro monto

Texto:

"Este monto será descontado una vez al mes de tu nómina mientras tu autorización esté activa."

CTA:

**Continuar**

No incluir:

- causas;
- marketplace;
- múltiples fundaciones;
- matching;
- porcentaje del salario;
- recomendaciones.

---

# 6. Pantalla 3 — Autorizar

Mostrar claramente:

### Autorización voluntaria

"Autorizo voluntariamente a [Company Name] a descontar $XX.XXX mensuales de mi nómina y transferir estos recursos a [Foundation Name].

Entiendo que puedo modificar o revocar esta autorización en cualquier momento y que los cambios aplicarán a los períodos de nómina que todavía no hayan sido procesados."

Checkbox:

**He leído y autorizo este descuento voluntario.**

CTA:

**Confirmar aporte mensual**

Registrar como evidencia:

- employee_id;
- name;
- document_number;
- company_id;
- amount;
- foundation;
- authorization_text;
- authorization_text_version;
- timestamp;
- user identity/email;
- IP si está disponible;
- user agent si está disponible.

La autorización original nunca debe eliminarse.

IMPORTANTE:

Antes de usar el MVP con descuentos reales, el texto exacto de autorización debe ser aprobado por un abogado laboral colombiano.

No construir todavía una infraestructura sofisticada de firma electrónica, OTP, certificados criptográficos o documentos notariales.

Diseñar el modelo de datos para poder agregar una firma electrónica más robusta posteriormente.

---

# 7. Pantalla 4 — Mi aporte

Después de confirmar:

**❤️ Tu aporte está activo**

[Foundation Name]

**$20.000 / mes**

Mostrar:

Estado:
**Activo**

Acciones:

- **Cambiar monto**
- **Cancelar aporte**

Debajo:

### Mis aportes

Agosto 2026 — $20.000 — Recibido

Septiembre 2026 — $20.000 — Pendiente

Total aportado:

**$20.000**

Los estados internos nunca se muestran al Employee. Traducción a lenguaje humano:

- AUTHORIZED → **Pendiente de nómina**
- DEDUCTED → **Descontado por tu empresa**
- TRANSFERRED → **Transferido a la fundación**
- RECEIVED → **Recibido por la fundación**

Si el Employee acaba de autorizar y todavía no ha corrido ninguna nómina, "Mis aportes" debe explicarlo (aún no hay descuentos) y mostrar Total aportado $0 — autorizar no es lo mismo que dinero descontado.

Después de confirmar, cambiar monto o cancelar, mostrar una confirmación persistente (banner en "Mi aporte"), no solo un mensaje fugaz.

No construir dashboard de impacto sofisticado.

---

# 8. Cambiar monto

Employee selecciona:

**Cambiar monto**

Escoge nuevo valor.

Debe confirmar nuevamente la autorización.

No sobrescribir la autorización anterior.

Guardar historial:

Authorization #1  
$20.000  
INACTIVE

Authorization #2  
$50.000  
ACTIVE

El nuevo monto aplica únicamente al próximo período de nómina que no haya sido procesado.

---

# 9. Cancelar

Employee selecciona:

**Cancelar aporte**

Mostrar:

"¿Quieres cancelar tu aporte mensual?

No se realizarán nuevos descuentos en períodos de nómina que todavía no hayan sido procesados."

Botones:

- **Mantener aporte**
- **Cancelar aporte**

La cancelación debe:

- ser inmediata dentro de la plataforma;
- no requerir email;
- no requerir llamada;
- no requerir aprobación de HR;
- conservar todo el historial anterior.

Registrar:

- authorization_id;
- cancelled_at;
- user;
- timestamp.

---

# 10. Company Admin

Crear un dashboard extremadamente básico.

Mostrar:

### Agosto 2026

Employees invited:  
100

Active donors:  
34

Amount authorized:  
**$720.000**

Tabla:

| Employee | Document | Monthly Amount |
|---|---|---:|
| Ana Gómez | XXXXX | $20.000 |
| Carlos Ruiz | XXXXX | $50.000 |
| Laura Díaz | XXXXX | $10.000 |

Acciones:

- **Import Employees**
- **Download Payroll CSV**
- **Register Payroll Results**
- **Register Foundation Transfer**

La página del ciclo mensual debe decirle a HR qué sigue en 3 segundos:

- un banner de estado dominante, por ejemplo: "Agosto 2026 · Resultados registrados · Siguiente paso: transferir $680.000 a la fundación y registrarlo aquí.";
- chips **Completado / Pendiente** por cada paso del ciclo.

No construir dashboards adicionales.

---

# 11. Importación de empleados

Company Admin sube un CSV:

- employee_id
- name
- document_number
- email

Validar:

- campos requeridos;
- emails duplicados;
- employee IDs duplicados.

Crear empleados e invitaciones.

No construir integración con HRIS.

---

# 12. Archivo de nómina

Giving platform genera un CSV sencillo:

- employee_id
- document_number
- employee_name
- authorized_amount
- authorization_id

NO incluir información adicional innecesaria.

Este archivo significa:

**"Estas son las autorizaciones actualmente activas."**

La plataforma NO le dice al sistema de nómina si legalmente puede ejecutar cada descuento.

La empresa conserva esa responsabilidad.

---

# 13. Resultado de nómina

Company Admin puede subir un segundo CSV después de ejecutar nómina:

- employee_id
- amount_deducted

Ejemplo:

```csv
employee_id,amount_deducted
12345,20000
67890,50000
```

Sólo los registros presentes en este archivo se consideran efectivamente descontados.

Si un empleado no aparece:

no hubo aporte ese mes.

No preguntar por qué.

No implementar estados complejos como:

- insufficient salary;
- legal threshold;
- payroll error;
- employee inactive.

Eso lo maneja la empresa fuera del MVP.

No acumular aportes no realizados para meses siguientes.

Los montos del archivo se aceptan únicamente en dígitos: `20.000` se rechaza con error — nunca se interpreta como 20 pesos.

## Período operativo

El ciclo mensual opera sobre el **período operativo**: el más reciente que siga abierto y sin transferencia — no el mes calendario. Los resultados de la nómina de agosto pueden registrarse en septiembre sin problema.

- Un mes nuevo se abre solo cuando el anterior fue transferido o cerrado.
- Un período abandonado (≥2 meses atrás y sin descuentos) se cierra automáticamente.
- Un período transferido o cerrado es inmutable: sus filas nunca se reescriben.

---

# 14. Transferencia a Foundation

Después de registrar la nómina, mostrar:

### Total descontado

**$680.000**

### Transferir a

[Foundation Name]

NIT:  
[Foundation NIT]

Cuenta:  
información configurada internamente.

Company Admin realiza la transferencia fuera del sistema.

Después selecciona:

**Registrar transferencia por $680.000**

El monto NO es texto libre: el CTA registra la transferencia por el total exacto descontado. Registrar un monto distinto es un flujo excepcional y explícito ("¿Transferiste un monto diferente?"), detrás de una advertencia.

Campos:

- amount (prellenado con el total descontado);
- date;
- bank_reference;
- upload proof opcional (diferido en el v0; pendiente el campo de URL del comprobante).

La plataforma NO mueve dinero.

---

# 15. Confirmación

Durante el piloto, Foundation confirma la recepción por un proceso manual fuera de la plataforma.

Platform Admin o un operador interno simplemente marca:

**Foundation received funds**

Cuando esto ocurre, todos los aportes incluidos en el período aparecen al Employee como:

**Recibido**

No construir portal para Foundation.

---

# 16. Certificados

Fuera del MVP.

Giving platform NO debe emitir certificados tributarios.

La Foundation maneja este proceso mediante su procedimiento actual.

La plataforma únicamente debe poder exportar, si se necesita:

- employee_name;
- document_number;
- period;
- amount;
- total.

Esto permite que Foundation prepare sus certificados por sus propios medios.

No mostrar:

**"Descarga tu certificado tributario"**

en esta versión.

---

# 17. Fundación

Como sólo existe una Foundation durante el piloto, puede configurarse mediante admin/configuration.

Campos:

- display_name;
- legal_name;
- NIT;
- logo;
- website;
- description;
- bank_name;
- bank_account;
- contact_name;
- contact_email.

No construir:

- marketplace;
- Foundation CRUD completo;
- verification workflows;
- Foundation Admin;
- ranking de fundaciones.

---

# 18. Modelo de datos mínimo

Utilizar aproximadamente estas entidades:

## Company

- id
- name
- NIT
- admin_user_id
- created_at

## Employee

- id
- company_id
- employee_external_id
- name
- document_number
- email
- status
- created_at

## DonationAuthorization

- id
- employee_id
- amount
- status
- authorization_text_version
- authorized_at
- cancelled_at
- superseded_by
- metadata

## PayrollPeriod

- id
- company_id
- month
- year
- status
- created_at

## PayrollContribution

- id
- payroll_period_id
- employee_id
- authorization_id
- amount_authorized
- amount_deducted
- status
- received_by_foundation_at

## Foundation

- id
- name
- legal_name
- NIT
- bank_information

No agregar entidades adicionales salvo que sean estrictamente necesarias.

---

# 19. Estados

DonationAuthorization:

- ACTIVE
- CANCELLED
- SUPERSEDED

PayrollContribution:

- AUTHORIZED
- DEDUCTED
- TRANSFERRED
- RECEIVED

Mantener las state machines simples.

---

# 20. Seguridad mínima necesaria

Implementar correctamente:

- HTTPS;
- authenticated access;
- magic links seguros;
- authorization checks;
- RBAC Employee / Company Admin / Platform Admin;
- server-side validation;
- rate limiting básico;
- secretos en environment variables;
- protección estándar contra XSS, CSRF e injection;
- audit timestamps para autorizaciones y cancelaciones;
- cifrado en tránsito;
- el magic link no se consume en el GET — los escáneres de correo corporativo hacen prefetch; la página solo valida y el ingreso real es un POST (botón "Continuar");
- el login nunca revela si un email está registrado.

No almacenar:

- tarjetas;
- claves bancarias del Employee;
- credenciales de nómina.

La información bancaria de Foundation no debe mostrarse a Employees.

---

# 21. Privacidad

Aplicar data minimization.

Company Admin necesita conocer:

- Employee;
- amount authorized;
- authorization status;
- payroll result.

Platform Admin ve empresas y agregados, no datos personales de más: sus páginas nunca muestran números de documento de empleados, y la lista de empleados en el detalle por empresa va colapsada por defecto.

No construir analytics sobre preferencias ideológicas, religiosas u otras categorías sensibles.

Durante este MVP existe una sola fundación, por lo cual no existe necesidad de almacenar preferencias de causas.

---

# 22. UI

Mobile-first para Employee.

Desktop-first pero responsive para Company Admin.

La interfaz debe sentirse:

- moderna;
- sencilla;
- confiable;
- humana.

Evitar apariencia de:

- software gubernamental;
- ERP;
- sistema bancario antiguo.

Stack sugerido:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- PostgreSQL
- Prisma
- Clerk, Supabase Auth o Auth.js
- Vercel

Construir un monolito.

No microservices.

---

# 23. Landing page

Muy sencilla.

Headline:

**Ayuda todos los meses directamente desde tu nómina.**

Subheadline:

"Elige cuánto aportar, autoriza el descuento y detén tu aporte cuando quieras."

CTA principal:

**Quiero participar**

Si el usuario todavía no pertenece a una empresa registrada:

"Tu empresa todavía no participa."

No construir lead generation sofisticado.

---

# 24. Métricas

Medir únicamente:

### Employees invited

Cantidad de empleados invitados.

### Activation rate

% de invitados que crean una autorización.

### Average contribution

Monto promedio autorizado.

### First deduction rate

% de autorizaciones que terminan en un descuento real.

### 3-month retention

% de donantes del primer mes que siguen aportando en el tercer mes.

### Total received by Foundation

COP efectivamente confirmados como recibidos por la fundación.

La métrica principal del MVP debe ser:

> **% de empleados que activan una donación y siguen aportando al tercer mes.**

Estas métricas son por empresa por naturaleza: viven en el detalle por empresa del Platform Admin (`/platform/empresas/[id]`), junto con los totales mes a mes y el estado de cada período. El overview de `/platform` lista las empresas inscritas con empleados (total/activados), donantes activos, monto autorizado mensual y donado real. Todo solo lectura: no hay CRUD de empresas.

No usar como métrica principal:

- usuarios registrados;
- visitas;
- autorizaciones sin descuento;
- dinero prometido.

---

# 25. Fuera de alcance

NO construir en este MVP:

- corporate matching;
- múltiples fundaciones;
- múltiples causas;
- marketplace;
- wallet;
- payment gateway;
- tarjetas;
- PSE;
- Nequi;
- gamificación;
- puntos;
- badges;
- referrals;
- voluntariado;
- payroll integrations;
- Siigo/Buk/SAP integrations;
- certificados tributarios automáticos;
- portal para fundaciones;
- conciliación bancaria automática;
- reporting ESG;
- AI;
- mobile app nativa;
- notificaciones sofisticadas;
- recomendaciones;
- multi-country;
- multi-currency.

Si una funcionalidad no es necesaria para probar la hipótesis central, no construirla.

---

# 26. Operación manual aceptable

Para este MVP es aceptable que algunas tareas sean manuales.

Ejemplos:

- Foundation confirma por WhatsApp/email que recibió el dinero.
- Platform Admin marca manualmente el período como recibido.
- Company Admin sube CSV de empleados.
- Company Admin descarga CSV de nómina.
- Company Admin sube CSV con descuentos reales.
- Company realiza la transferencia bancaria fuera del sistema.
- Certificados se procesan fuera del producto.

No automatizar un proceso solamente porque pueda automatizarse.

---

# 27. Criterios de éxito del piloto

El piloto debe responder:

1. ¿Qué porcentaje de empleados invitados activa una donación?
2. ¿Cuál es el monto promedio?
3. ¿Cuántas autorizaciones terminan en descuentos reales?
4. ¿Cuántos continúan en el segundo mes?
5. ¿Cuántos continúan en el tercer mes?
6. ¿La operación mensual para HR es suficientemente sencilla?
7. ¿La cancelación funciona sin intervención humana?
8. ¿Los empleados entienden claramente cómo llega el dinero a Foundation?

No definir todavía un threshold rígido de éxito.

El objetivo es obtener comportamiento real y aprender.

---

# 28. Compliance del piloto

El software debe dejar claro que:

- la donación es voluntaria;
- Employee puede cancelarla;
- Platform no procesa ni custodia dinero;
- Company ejecuta el descuento mediante su sistema de nómina;
- Company debe determinar si el descuento puede realizarse legalmente;
- Foundation es quien recibe los recursos.

Antes de hacer descuentos reales:

**un abogado laboral colombiano debe revisar y aprobar el texto exacto de la autorización.**

Antes de prometer beneficios tributarios o certificados:

**un especialista tributario colombiano debe validar el flujo aplicable.**

Estos son launch gates operativos, no funcionalidades adicionales del producto.

---

# 29. Seed data

Crear demo data determinista — re-ejecutar el seed resetea todo.

Foundation:

**Fundación Reconstruir Colombia**

Empresas — cinco, en distintas etapas del piloto, para que las métricas se vean con datos honestos:

- **Celerik** (38 empleados) — 3 meses de historia: junio y julio completados y recibidos, agosto a mitad de ciclo. La retención a 3 meses es medible.
- **ACME** (93) — la misma historia de 3 meses, y conserva el elenco demo original con los estados exactos del journey: autorizaciones ACTIVE, una CANCELLED (Diego), una cadena SUPERSEDED por cambio de monto (María) y empleados que nunca han donado.
- **Gutierrez Group** (65) — snapshot fresco de agosto, sin resultados todavía.
- **Grupo San Remo** (46) — resultados de nómina subidos, transferencia pendiente.
- **Cubia** (4) — recién inscrita, sin períodos.

Un Company Admin por empresa (`rrhh@<dominio>`), más un Platform Admin.

El drift de contribuyentes entre meses y las cancelaciones por empresa mantienen honestas las métricas de activación y retención.

El demo debe permitir recorrer todo el journey sin configurar datos manualmente.

---

# 30. Resultado esperado

Construir una aplicación funcional que permita completar este flujo end-to-end:

1. Company Admin importa empleados.
2. Employee recibe invitación.
3. Employee entra mediante magic link.
4. Employee elige $20.000/mes.
5. Employee lee y acepta autorización.
6. DonationAuthorization queda ACTIVE.
7. Employee ve su aporte activo.
8. Company Admin ve las autorizaciones activas.
9. Company Admin descarga Payroll CSV.
10. Company procesa nómina fuera del sistema.
11. Company Admin sube resultados reales.
12. PayrollContribution queda DEDUCTED.
13. Company transfiere el total a Foundation fuera del sistema.
14. Company Admin registra la transferencia.
15. Platform Admin marca recepción confirmada.
16. Employee ve el aporte como RECEIVED.
17. Employee cambia su monto a $50.000.
18. Autorización anterior queda SUPERSEDED.
19. Nueva autorización queda ACTIVE.
20. Employee posteriormente cancela.
21. Autorización queda CANCELLED.
22. Employee ya no aparece en el siguiente Payroll CSV.
23. Su historial anterior permanece visible.

---

# 31. Antes de programar

Primero entregar:

1. sitemap extremadamente simple;
2. lista de pantallas;
3. modelo de datos;
4. state transitions;
5. wireframes o descripción UI de cada pantalla;
6. arquitectura técnica breve.

Después implementar.

No producir una arquitectura empresarial.

No introducir funcionalidades no solicitadas.

Cuando haya una decisión entre:

**automatización sofisticada**

y

**proceso manual suficiente para el piloto**

elegir el proceso manual.

Principios finales:

> **Validation over scalability.**

> **Simplicity over completeness.**

> **Manual before automated.**

> **Real donations over vanity metrics.**

> **Employee control over retention tricks.**

---

# 32. Cambios posteriores al v0

Decisiones tomadas después del build inicial (agosto 2026). Cada una ya está incorporada en la sección correspondiente de este documento; aquí queda el registro para trazabilidad:

- **Correcciones del audit** — el ciclo mensual opera sobre el período operativo, no el mes calendario (§13); los montos del CSV de resultados se aceptan solo en dígitos (§13); el magic link no se consume en el GET y el login no revela emails registrados (§20).
- **Platform Admin** — overview de empresas inscritas y detalle por empresa con las métricas del piloto (§24). Solo lectura, sin CRUD de empresas ni números de documento (§21).
- **Seed ampliado** — cinco empresas en distintas etapas del piloto en lugar de una sola (§29).
- **Ronda de UX** — banner de estado y chips Completado/Pendiente para HR (§10); transferencia con total fijo y flujo excepcional para montos distintos (§14); estados humanizados, empty state y confirmaciones persistentes para el Employee (§7); stepper del journey (§4).
- **Rebrand** — verde lima + azul claro, Plus Jakarta Sans y títulos en Bricolage Grotesque, UI inspirada en tprf.org. El copy definido en esta spec no cambió.
- **Deploy** — script `vercel-build`: genera el cliente de Prisma, aplica migraciones y compila.
