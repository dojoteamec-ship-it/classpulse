# Bitácora de avance

Registro de cada fase: qué se hizo, qué se probó y qué quedó pendiente. Lo más reciente va
arriba.

## Fase 3 · Encuesta de clase (25 sep 2026)

### Qué se construyó

- `migrations/cp_0003_respuestas.sql` (+ `cp_0003_down.sql`):
  - `cp_respuestas` (sin identidad; columnas tipadas de 3.1 y 3.2, `version_encuesta`,
    `canal_entrada`, `segundos_para_responder`, `horas_desde_apertura`, `es_prueba`).
  - `cp_respondentes` (identidad) y `cp_contactos` (pedido de contacto): **sin permisos para
    nadie** salvo la service role. El coach las leerá con funciones que dejan auditoría (Fases 6
    y 8).
  - `cp_respuestas_dedupe`: hash(clave + sal) **sin enlace a la respuesta** (más estricto que el
    plan, que lo ponía en `cp_respuestas`). Al cerrar la sesión se borra la sal.
  - `cp_registrar_respuesta()`: solo la service role. Valida la sesión abierta, deduplica y
    escribe respuesta, identidad y contacto en una sola transacción.
  - `cp_conteo_respuestas()` para el panel.
- `lib/encuesta.ts`: el instrumento completo (preguntas, bandas, chips SEEQ, modos de identidad,
  avisos obligatorios). Es la fuente única para la pantalla y el servidor.
- `lib/ghl.ts`: `GET /contacts/{id}` (API v2, Version 2021-07-28); se verifica el `locationId`.
- Server Action `enviarRespuestaClase`: valida todo contra el instrumento. En el enlace personal
  vuelve a consultar el contacto en GHL y comprueba que la sesión le corresponda; la identidad
  sale de GHL, no del navegador.
- Pantallas del alumno (móvil primero, sin guiones): `/g/<grupo>` (enlace general, elige
  sesión si hay varias), `/f?c=<contact_id>[&s=<sesión>]` (enlace personal) y `/privacidad`.
  Los contactos de `GHL_CONTACTOS_PRUEBA` solo ven sesiones de prueba.
- El panel de la sesión muestra el número de respuestas.

### Qué se probó

- `pruebas/rls/fase3_respuestas.sql` en local y contra la base real: anon y mentor no pueden
  registrar; deduplicación por contacto; anónima sin identidad; identidad vacía rechazada sin
  dejar rastro; sesión cerrada no recibe; mentor lee sus respuestas pero no identidades,
  contactos ni hashes; el coach tampoco lee identidades directo.
- Playwright (build local + Supabase y GHL reales): **10 respuestas de prueba** en iPhone 13 y
  Pixel 7 emulados (anónimas, con nombre, con contacto, no asistió, enlace personal con el
  contacto de prueba en 2 sesiones y enlace general). Se verificó en la base: 10 respuestas
  `es_prueba`, las anónimas sin identidad ni contacto, 2 pedidos de contacto, `ghl_contact_id`
  en el enlace personal, banda neutra de «No traje dudas», sin csat cuando no asistió y 10
  hashes. Se rechazó el mismo navegador y el mismo contacto (aunque cambie a anónimo); contacto
  inexistente rechazado; sin guiones ni scroll horizontal.
- Pendiente de la vida real: probarlo en un iPhone y un Android físicos (la emulación cubre
  tamaño, táctil y agente de usuario).

## Fase 2 · Sesiones (25 sep 2026)

### Qué se construyó

- `migrations/cp_0002_sesiones.sql` (+ `cp_0002_down.sql`):
  - `cp_sesiones`, `cp_sesion_mentores` (principal y co-mentores), `cp_sesion_sales` (sal de
    anonimato: nadie la lee salvo la service role; se borra al cerrar) y la base de `cp_alertas`
    (la Fase 6 la completa).
  - `cp_abrir_sesion()`: valida el Grupo, el rol (`cp_puede_abrir`), tipo de sesión según el
    Grupo (Cinturón: Kata, Mondo, Randori, Shinsa; Comunidad: Práctica con clientes), fecha de hoy
    o de los 3 días anteriores, co-mentores con acceso (máx. 3) y que no haya otra sesión abierta
    igual. El coach puede abrirla en nombre de un mentor. Hereda `es_prueba` de las cuentas.
  - `cp_cerrar_sesion()` (quien la dio o el coach) y `cp_cerrar_vencidas()` (cron).
  - `cp_revisar_r6()`: franja del cronograma que pasó hace 2 h o más sin sesión → aviso
    operativo R6 (sin duplicados). Solo en Grupos con al menos un mentor **real** asignado; las
    sesiones de prueba no cuentan. Se resuelve solo cuando alguien abre la sesión de esa clase.
    Semana A/B con `cp_semana_ab()` (referencia 2026-09-28 = A).
  - `cp_sesiones_abiertas(slug)`: única lectura pública (anon) para el enlace general; las
    sesiones de prueba solo aparecen con `?prueba=1`.
  - pg_cron: `cp_cerrar_sesiones` cada 5 min y `cp_revisar_r6` cada 15 min.
- Panel: «Abrir feedback» (Grupo, tipo sugerido por el cronograma del día, fecha, rango,
  co-mentor y, para el coach, «¿Quién dio la clase?»), sesiones abiertas con cuenta regresiva,
  recientes, y para el coach «Clases sin feedback abierto» (R6).
- `/panel/sesion/[id]`: enlace general para copiar, cuenta regresiva, «Cerrar ahora».
- `/g/[grupo]`: enlace general público con las sesiones abiertas del Grupo (la encuesta entra
  en la Fase 3).

### Qué se probó

- Verificador de migraciones, `cp_0002` dos veces en local y en producción, reversión y
  reaplicación en local.
- `pruebas/rls/fase2_sesiones.sql` en local y contra la base real (anon, mentor, co-mentor,
  mentor ajeno, coach; sal inaccesible; cierre a las 24 h; R6 con y sin mentor real,
  deduplicada y resuelta al abrir). Se comprobó que la prueba falla si se sabotea una aserción.
- Playwright (build local + Supabase real): mentor en móvil abre una Kata con co-mentor, ve el
  enlace y la cuenta regresiva; se rechaza la duplicada; `/g/amarillo` no muestra la sesión de
  prueba y `/g/amarillo?prueba=1` sí, sin guiones; el co-mentor y el coach la ven; el coach la
  cierra.
- pg_cron real: una sesión de prueba con `cierra_en` adelantado se cerró sola y su sal se borró.

## Retoma autónoma: Vercel y cierre de la Fase 1 (25 sep 2026)

- Las 6 credenciales responden (Supabase, GitHub, GHL con el contacto de prueba, Vercel).
  `VERCEL_TOKEN` ve el proyecto `classpulse` (`prj_vkoOG6PdVkRsTNFbzOxWR3aTwsD3`).
- Variables en Vercel (API, upsert): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (los 3 entornos); `SUPABASE_SERVICE_ROLE_KEY`, `GHL_PRIVATE_TOKEN` y `CRON_SECRET` como
  *sensitive* (Production y Preview); `GHL_LOCATION_ID`, `GHL_MODO_ENVIO=prueba` y
  `GHL_CONTACTOS_PRUEBA=xZB5m9rMiJ4dz7Ekusib` (los 3 entornos); `NEXT_PUBLIC_APP_URL`
  (Production).
- Protección de Vercel solo en los Preview (`ssoProtection: preview`): producción es pública.
  Se generó un token de bypass para automatización (pruebas de Preview).
- El Preview del PR #1 se revisó con sesión real (curl con la cookie de Supabase): el super admin
  ve los 9 Grupos y el mentor solo Amarillo. Playwright no puede abrir URLs de Vercel desde este
  entorno (la CA del proxy no está en Chromium), así que las pruebas de navegador corren contra
  el build local del mismo commit conectado al Supabase real, como en la Fase 1.
- PR #1 mergeado. Producción (`classpulse-jade.vercel.app`) quedó en `main`, pública y con login
  real funcionando.
- Las contraseñas de las 5 cuentas de prueba se regeneraron para las pruebas automáticas (no se
  publican).

## Fase 1 · Esqueleto y diseño (25 sep 2026)

### Verificación inicial

- Las 6 credenciales respondieron a una llamada de solo lectura: Supabase (proyecto
  `classvote`, Postgres 17.6), Vercel (token limitado al team `dojoteamec-ship-its-projects`),
  GitHub (admin del repo), GHL (51 campos personalizados).
- **GHL no tiene un campo `nivel_actual`.** Se revisaron los 51 campos por API; ninguno guarda
  el nivel del alumno. `cp_config.ghl_campo_nivel` queda en `null` (editable en /admin). Mientras
  sea null, el enlace personal acepta al contacto como identificado y lo deja elegir sesión.
- Contacto de prueba de GHL (Santi, buscado por correo): `xZB5m9rMiJ4dz7Ekusib`.
- **La cuenta de Mike (`dojo.team.ec@gmail.com`) ya existía** en ClassVote como «Dojo Team»
  (activo, rol mentor). No se creó una cuenta nueva: se le dio el rol `coach` en `cp_acceso`.

### Qué se construyó

- Proyecto Next.js 16 con la misma configuración, dependencias y versiones que ClassVote.
- Sistema de diseño copiado tal cual: `app/globals.css`, `components/` (Marca, Emblema,
  FondoDojo, Obi, Rotulo, CuentaRegresiva), `public/marca/` e íconos.
- `migrations/cp_0001_acceso_grupos_config.sql` (+ `cp_0001_down.sql`):
  - Tablas `cp_acceso`, `cp_grupos`, `cp_mentor_grupos`, `cp_horarios`, `cp_config`,
    `cp_auditoria`, con RLS y sin ningún permiso para `anon`.
  - Funciones de permisos: `cp_mi_rol()`, `cp_es_coach()`, `cp_es_super_admin()`,
    `cp_puede_abrir(grupo)`, `cp_directorio()`, `cp_cuentas_classvote()`, `cp_auditar()`.
  - 9 Grupos («Cinturón Amarillo · Nivel 1», …, Comunidad Ronin y Comunidad Anahata) con el
    correo apagado; 11 franjas del cronograma (jueves 18:00: Verde en semana A, Negro Shinsa en
    semana B; semana A de referencia 2026-09-28); configuración inicial (SLA, horario hábil,
    palabras clave, metas).
  - Accesos: Santi `super_admin` (y asignado a Azul por el Randori del lunes), Mike `coach`.
- `scripts/verificar-migraciones.mjs` (`npm run verificar-migraciones`): rechaza cualquier
  migración que cree, altere, borre, dé permisos o escriba sobre objetos sin prefijo `cp_`.
- Login con las cuentas de ClassVote (`/entrar`), roles de ClassPulse y `/panel` con los Grupos
  del usuario. Una cuenta de ClassVote sin `cp_acceso` ve «sin acceso».

### Qué se probó

- Verificador: acepta `cp_0001` y rechaza las 12 violaciones de `pruebas/verificador/cp_9999_mala.sql`.
- `cp_0001` en Postgres 16 local con el shim de Supabase y el esquema real de ClassVote,
  corrida dos veces (idempotente). Aplicada dos veces en producción sin errores.
- `pruebas/rls/fase1_acceso.sql` (anon, sin acceso, mentor, coach, super admin, cuenta
  desactivada) en local y **contra la base real**: pasa. Todo se deshace al final.
- Playwright contra el build local conectado al Supabase real: login de super admin (ve los 9
  Grupos), mentor en móvil (ve solo Amarillo), cuenta sin acceso, contraseña incorrecta y
  redirección sin sesión.

### Usuarios de prueba (creados en Supabase Auth)

| Correo | Rol en ClassPulse | Grupos |
|---|---|---|
| classpulse.prueba.mentor1@example.com | mentor | Amarillo |
| classpulse.prueba.mentor2@example.com | mentor | Naranja |
| classpulse.prueba.coach@example.com | coach | todos |
| classpulse.prueba.admin@example.com | super_admin | todos |
| classpulse.prueba.sinacceso@example.com | ninguno | ninguno |

Por el trigger de ClassVote aparecen como mentores **pendientes** en ClassVote (sin acceso
allí). Están marcados `es_prueba` en `cp_acceso`. Las contraseñas no se publican; se pueden
restablecer desde /admin de ClassVote.

### Pendiente

- Cambiar la cuenta coach al correo personal de Mike cuando esté definido.
- ~~Vercel: proyecto classpulse~~ Resuelto en la retoma autónoma (ver arriba).
