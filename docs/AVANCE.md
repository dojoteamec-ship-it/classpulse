# Bitácora de avance

Registro de cada fase: qué se hizo, qué se probó y qué quedó pendiente. Lo más reciente va
arriba.

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

- Ninguno bloqueante.
