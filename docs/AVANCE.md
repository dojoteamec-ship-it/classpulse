# Bitácora de avance

Registro de cada fase: qué se hizo, qué se probó y qué quedó pendiente. Lo más reciente va
arriba.

## Informe final de la retoma autónoma (25 sep 2026)

**Estado:** las Fases 1 a 8 del plan están construidas, probadas, mergeadas en `main` y en
producción en https://classpulse-jade.vercel.app. La Fase 9 (piloto de 2 semanas con Amarillo
y Azul) queda en manos de Santi.

### Entregado

| Fase | PR | Migración | Pruebas RLS |
|---|---|---|---|
| 1 · Esqueleto y diseño | dojoteamec-ship-it/classpulse#1 | cp_0001 | fase1_acceso |
| 2 · Sesiones | dojoteamec-ship-it/classpulse#2 | cp_0002 | fase2_sesiones |
| 3 · Encuesta de clase | dojoteamec-ship-it/classpulse#3 | cp_0003 | fase3_respuestas |
| 4 · Correo GHL y NPS de Cinturón | dojoteamec-ship-it/classpulse#4 | cp_0004 | fase4_cinturon_envios |
| 5 · Tableros | dojoteamec-ship-it/classpulse#5 | cp_0005 | fase5_tableros |
| 6 · Alertas y bandeja | dojoteamec-ship-it/classpulse#6 | cp_0006 | fase6_alertas |
| 7 · Kaizen | dojoteamec-ship-it/classpulse#7 | cp_0007 | fase7_kaizen |
| 8 · Admin y cumplimiento | dojoteamec-ship-it/classpulse#8 | cp_0008 | fase8_cumplimiento |

- Cada migración pasó el verificador (solo objetos `cp_`), tiene su `_down.sql`, se probó dos
  veces en local (junto con la reversión y la reaplicación) y se aplicó dos veces en producción.
- Las 8 pruebas RLS pasan en local y **contra la base real**; hay 12 pruebas unitarias
  (`npm test`). Cada fase tuvo su prueba E2E con Playwright y una revisión del Preview.
- pg_cron en producción: `cp_cerrar_sesiones` (5 min), `cp_recalcular_sla` (5 min),
  `cp_revisar_r6` (15 min), `cp_revisar_r7` (diario) y `cp_retencion` (diario). Vercel Cron:
  resumen diario a las 08:00 de Ecuador.
- Vercel: variables por entorno, protección **solo en los Preview** y producción pública.

### Reglas respetadas

- **Cero cambios en ClassVote.** Sus 6 tablas y su trabajo `classvote-cerrar-ciclos` siguen
  intactos; solo se leen `mentores`, `cinturones` y `auth.users`. Hay dos efectos indirectos
  conocidos, ya previstos por el plan (7.2): el trigger de ClassVote creó filas «pendiente» en
  `mentores` para la cuenta de prueba `classpulse.prueba.nuevo@example.com` y, antes, para las
  5 cuentas de prueba de la Fase 1.
- **GHL en modo prueba en todos los entornos.** Se enviaron **5 correos en total, todos al
  contacto de prueba** `xZB5m9rMiJ4dz7Ekusib`. No se publicaron enlaces en GHL ni se contactó
  a ningún alumno real. `enviarCorreo()` rechaza por código a cualquier destinatario fuera de
  `GHL_CONTACTOS_PRUEBA` mientras el modo sea prueba.
- **Datos de prueba:** las 26 respuestas de producción son todas `es_prueba`; ninguna cuenta
  real las ve en los tableros.
- No se imprimió ninguna credencial.

### Cambios frente al plan (decididos durante la construcción)

1. **Resumen diario con Vercel Cron** en lugar de pg_cron: pg_cron no puede llamar a la app
   sin `pg_net`, y crear extensiones queda fuera de la regla de solo objetos `cp_`.
2. **Hash de deduplicación sin enlace a la respuesta** (`cp_respuestas_dedupe`), más estricto
   que guardarlo en `cp_respuestas`.
3. **La identidad no se lee directo** ni siquiera como coach: solo con `cp_ver_identidad` y
   `cp_historial_alumno`, que dejan auditoría.
4. **R6 solo en Grupos con al menos un mentor real asignado**, para no llenar la bandeja de
   avisos de Grupos que todavía no usan ClassPulse. Hoy aplica solo a Azul (Santi).
5. Playwright no puede abrir las URL de Vercel desde este entorno: la CA del proxy no está en
   Chromium y fijarla fue rechazado por seguridad. Las pruebas de navegador corren contra el
   build local del mismo commit, conectado a Supabase y GHL reales, y cada Preview se verificó
   con sesiones reales por HTTP.

### Pendientes para Santi (nada de esto bloquea el piloto en modo prueba)

1. **Workflows de gate en GHL:** agregar la acción Send Email con
   `https://classpulse-jade.vercel.app/cinturon?c={{contact.id}}&n=N` (ver la Fase 4).
2. **Campo de nivel en GHL** (`ghl_campo_nivel` en /admin): sin él, el correo real no sale
   para los Cinturones y el enlace personal acepta cualquier Cinturón.
3. **Contacto de Mike en GHL** (`ghl_contacto_resumen` en /admin) para el resumen diario.
4. **Cuenta de Mike:** hoy es `dojo.team.ec@gmail.com`. Cuando tenga correo personal, crear la
   cuenta en /admin/usuarios y desactivar la actual.
5. **Rangos de cada nivel** (`rangos_por_nivel`) y **metas** (sobre todo el NPS objetivo) en
   /admin/configuracion.
6. Encender el **correo por Grupo** en /admin/grupos para el piloto (Amarillo y Azul) y
   asignar a los mentores reales sus Grupos en /admin/usuarios.
7. Cambiar `GHL_MODO_ENVIO` a `real` en Vercel **solo cuando decidas empezar con alumnos**.
8. Plan de Vercel: Hobby no es para uso comercial (plan 9.1).
9. Probar la encuesta en un iPhone y un Android físicos.
10. Opcional: borrar las cuentas y los datos de prueba antes del piloto. Todo lleva
    `es_prueba` (o el dominio `@example.com`) y no aparece en los tableros reales.

## Fase 8 · Admin y cumplimiento (25 sep 2026)

### Qué se construyó

- `migrations/cp_0008_admin_cumplimiento.sql` (+ down):
  - `cp_registrar_buzon()` (solo service role): el buzón pasa por R1 y R4 como el resto.
  - `cp_anonimizar_vencidas()` + pg_cron `cp_retencion` (diario, 02:00 de Ecuador): borra la
    identidad y el contacto de las respuestas con más de `retencion_identidad_meses` (24); las
    respuestas quedan anónimas. Deja auditoría.
  - `cp_borrar_alumno()` (solo super admin): borrado a pedido por contact_id, correo o
    teléfono. `cp_solicitudes_borrado` registra fechas, plazo de 15 días y cantidad, **sin
    guardar el identificador**; las notas ocultan correos.
  - `cp_estado_cumplimiento()`: verificaciones en vivo para el checklist.
- `/admin` (super admin): modo de envío de GHL visible y **checklist de la LOPDP** con
  verificaciones reales. Además:
  - `/admin/usuarios`: roles, activar o desactivar, Grupos por persona y dar acceso a cuentas
    de ClassVote. También **crear una cuenta nueva** con la service role (para la cuenta de
    Mike), con contraseña temporal mostrada una vez. Nadie puede cambiar su propio acceso.
  - `/admin/grupos`: nombre, tag de GHL, activo e interruptor de correo.
  - `/admin/configuracion`: las 12 claves de `cp_config`, con validación (pruebas unitarias).
  - `/admin/datos`: exportación CSV **sin identidades** de respuestas, alertas, acciones y
    sesiones; borrado a pedido; registro de auditoría legible.
  - Todo cambio queda en `cp_auditoria`.
- `/buzon` (público, sin guiones) y `/coach/buzon` (coach, sin nombres).

### Qué se probó

- `pruebas/rls/fase8_cumplimiento.sql` en local y contra la base real: el buzón solo lo
  escribe la service role y dispara R4 y R1. Mentor y coach no borran alumnos ni cambian la
  configuración. La retención borra la identidad de 25 meses sin borrar la respuesta y deja
  auditoría. El borrado a pedido valida las entradas, fija el plazo de 15 días y no guarda el
  correo. El super admin gestiona la configuración, los Grupos y las asignaciones. También se
  probaron la reversión y la reaplicación. Son 12 pruebas unitarias en total.
- Playwright:
  1. Buzón en iPhone: el anónimo con «cancelar» genera R4 y el de contacto genera R1.
  2. El coach ve el buzón sin nombres y no entra a `/admin` ni exporta (403). El mentor
     tampoco entra.
  3. Super admin:
     - Checklist de la LOPDP con **7 de 7 en verde**.
     - La configuración rechaza valores inválidos y guarda los válidos.
     - Cambió el rol de una cuenta de prueba y lo devolvió; no puede cambiar el suyo.
     - **Creó la cuenta de prueba `classpulse.prueba.nuevo@example.com`**, que entró con la
       contraseña temporal. Quedó `es_prueba` y «pendiente» en ClassVote.
     - Encendió y apagó el correo de Blanco.
     - Exportó el CSV sin identidades, con auditoría.
     - Hizo un borrado a pedido.
     - La auditoría muestra todo.
- Se corrigió un detalle de accesibilidad: las etiquetas «Rol», «Nombre» y «Correo» estaban
  repetidas en `/admin/usuarios`.

## Fase 7 · Kaizen (25 sep 2026)

### Qué se construyó

- `migrations/cp_0007_kaizen.sql` (+ down):
  - `cp_acciones`: problema con enlace a los datos, hasta 5 porqués, acción, responsable, fecha
    compromiso, estado PDCA (Planificar → Hacer → Verificar → Estandarizar, o Descartar),
    alcance (Grupo, mentor y tipo de sesión), métrica, inicio y ventana, «Publicar en Dijiste,
    hicimos» y enlace opcional a la alerta que la originó (R7).
  - `cp_medir()`: CSAT medio, % Top 2, % Bottom 2, % distintiva en rojo o NPS en un alcance y
    rango; **solo agregados** con su n. `cp_medir_accion()` devuelve antes (N días previos al
    inicio) y después (desde el inicio). Al pasar a Verificar o Estandarizar, un trigger
    **congela** las dos mediciones.
  - RLS: el coach y el super admin crean y editan; solo el super admin borra; un mentor lee
    únicamente sus acciones.
- `lib/kaizen.ts` (pruebas unitarias): estados, métricas, «¿mejoró?» según la dirección de cada
  métrica, `sinGuiones()` y el texto de «Dijiste, hicimos».
- `/kaizen` (todos los roles, cada uno con su alcance), `/kaizen/nueva` y `/kaizen/[id]`
  (formulario PDCA), `/kaizen/dijimos` (texto mensual por Grupo, sin guiones, con botón para
  copiar). En las alertas R7 hay un botón «Crear acción PDCA». El tablero del mentor muestra
  sus acciones.

### Qué se probó

- `pruebas/rls/fase7_kaizen.sql` en local y contra la base real (métricas antes y después
  exactas, congelado al verificar, alcance por rol); reversión y reaplicación en local. 10
  pruebas unitarias en total.
- Playwright, **una acción completa**: 2 respuestas de prueba con nota 2 hace 2 días (enlace
  general, Pixel 7). El coach crea la acción desde ayer, con los 5 porqués parciales y publicar
  marcado. Antes = 2,00 (n = 2) y después = 4,00 (n = 7), **iguales a SQL**. La pasa a Verificar
  y quedan congeladas, con «✓ Mejoró». «Dijiste, hicimos» de Amarillo, septiembre de 2026, la
  incluye y sale **sin guiones**. El mentor 1 la ve sin poder editarla ni generar el texto, y el
  mentor 2 recibe 404.

## Fase 6 · Alertas y bandeja de Mike (25 sep 2026)

### Qué se construyó

- `migrations/cp_0006_alertas.sql` (+ down):
  - `cp_sumar_horas_habiles()`: SLA en horas hábiles según `cp_config.horario_habil`
    (lunes a viernes, de 09:00 a 18:00, hora de Ecuador).
  - `cp_evaluar_alertas()` con R1 (pidió contacto, alta, 24 h), R2 (nota 1 o 2 con identidad,
    media, 24 h), R3 (NPS de 0 a 6 con identidad, media, 48 h), R4 (palabras clave, sin tildes
    ni mayúsculas; si es anónima: aviso sin contacto y sin SLA) y R5 (2 respuestas seguidas en
    rojo o con nota ≤ 2 del mismo alumno identificado). La disparan triggers `AFTER INSERT` en
    `cp_respuestas`, `cp_respondentes` y `cp_contactos`; sin duplicados por respuesta y regla.
  - `cp_revisar_r7()` (pg_cron diario, 06:00 de Ecuador): mentor con CSAT de 30 días < 3,8 y
    n ≥ 15 por tipo de sesión → alerta Kaizen **solo para el super admin**.
  - `cp_recalcular_sla()` (pg_cron cada 5 min): recalcula vencimientos si cambia el horario o
    el SLA.
  - `cp_bandeja()` (sin identidades), `cp_ver_identidad()` y `cp_historial_alumno()` (**dejan
    auditoría**), `cp_alumnos_en_riesgo()`, `cp_actualizar_alerta()` (estados Nueva → En
    contacto → Resuelta o Descartada, notas y `primer_contacto_en`) y `cp_metricas_sla()`
    (cumplimiento, mediana y p90 del tiempo hasta el contacto).
- `/coach` es ahora la **bandeja de casos** (primera pantalla del coach): métricas de SLA,
  filtro por estado, casos ordenados por gravedad y vencimiento, y alumnos con varias alertas.
  El tablero global pasó a `/coach/tablero`.
- `/coach/alerta/[id]`: detalle del caso. La identidad y el historial **no viajan con la
  página**: se piden con un botón y quedan en la auditoría. Notas y cambios de estado.
- Resumen diario: `/api/cron/resumen`, protegido con `CRON_SECRET` y disparado por **Vercel
  Cron** (`vercel.json`, 13:00 UTC = 08:00 de Ecuador). Solo cifras, sin identidades. En modo
  prueba va a `GHL_CONTACTOS_PRUEBA`; en modo real, a `cp_config.ghl_contacto_resumen` (hoy
  null: hay que cargar el contacto de Mike en GHL).
  - **Cambio frente al plan:** el plan decía que lo disparara pg_cron, pero pg_cron no hace
    HTTP sin la extensión `pg_net`, y crear extensiones está fuera de lo permitido (solo objetos
    `cp_`). Por eso lo dispara Vercel Cron.

### Qué se probó

- `pruebas/rls/fase6_alertas.sql` en local y contra la base real: horas hábiles (fin de
  semana y fuera de horario), cada regla con sus casos negativos, R7 sin duplicados, anon y
  mentor sin acceso, el coach sin R7 y el super admin con R7, identidad y seguimiento con
  auditoría, y métricas de SLA. También se probaron la reversión y la reaplicación en local.
- Se encontró y corrigió un error: con triggers diferidos, R5 tomaba como «anterior» una
  respuesta posterior de la misma transacción. Se pasó a triggers inmediatos.
- Las pruebas de la Fase 5 ya no dependen de los datos de las pruebas E2E.
- Playwright, **ciclo completo de una alerta**:
  1. El contacto de prueba responde en Android con nota 2, rojo, «reembolso» y pedido de
     contacto. Se generan R1, R2 y R4 con su vencimiento.
  2. El mentor no entra a la bandeja ni al caso.
  3. El coach ve la R1 en la bandeja sin identidades, abre el caso y pide la identidad, lo
     que queda auditado.
  4. Marca «En contacto» con una nota y luego «Resuelta».
  5. **Tiempo hasta el contacto medido: 21 s, en plazo.**
- Resumen diario: 401 sin el secreto o con uno incorrecto; con el secreto, 1 correo al
  contacto de prueba, registrado en `cp_envios`. En total van **5 correos, todos al contacto de
  prueba**.

## Fase 5 · Tableros (25 sep 2026)

### Qué se construyó

- `migrations/cp_0005_tableros.sql` (+ down): `cp_referencia_academia()` (CSAT semanal de la
  academia por tipo de sesión, **solo agregados**, para la línea de referencia del mentor) y
  `cp_aprobaciones` (tasa de aprobación por Rango; la escribe el super admin y la lee el coach).
- `lib/metricas.ts`: KPIs de 4.1 como funciones puras (CSAT medio, Top 2, Bottom 2,
  distribución, bandas sin neutras, inasistencia y motivos, NPS, NES, CES, chips por dimensión
  SEEQ, tendencia semanal, tasa de respuesta). Tiene **pruebas unitarias** (`npm test`).
- `components/graficos.tsx`: SVG propio con los tokens de ClassVote. Cada cifra lleva su n y
  se atenúa con «muestra pequeña» si n < `muestra_minima` (15); la distribución va junto al
  promedio; tooltip por marca; la tendencia tiene vista de tabla. La paleta de bandas (roja
  `#b8342b`, amarilla `#b38c26`, verde `#1f9e70`) pasó el validador de color para modo oscuro
  (con etiquetas directas y separación, porque la separación para daltonismo queda en 7,9).
- `/panel/tablero` (todos los roles, solo las clases que dio la persona): por tipo de sesión,
  KPIs, distribución, bandas, tendencia de 90 días contra la academia, chips SEEQ y tarjetas
  por sesión. `/panel/sesion/[id]` muestra los resultados y los comentarios sin nombre.
- `/coach` (coach y super admin): filtros por Grupo, mentor, tipo y fechas; KPIs con metas de
  `cp_config.metas`; tabla por mentor **dentro de cada tipo de sesión**; motivos de inasistencia
  por nivel; chips; comentarios recientes sin nombre.
- `/coach/programa` (super admin): NPS, NES, CES, dificultad, aplicación y clientes activos por
  Cinturón, junto a la aprobación por Rango (se carga pegando un CSV).
- Datos de prueba fuera de los tableros: cada tablero muestra solo filas con
  `es_prueba = es_prueba de la cuenta` (las cuentas reales nunca ven pruebas).
- Navegación por rol en el encabezado.

### Qué se probó

- `pruebas/rls/fase5_tableros.sql` (local y remoto) y 6 pruebas unitarias de métricas.
- Playwright contra los datos de prueba reales en Supabase: el tablero del mentor muestra solo
  su Kata (no el Mondo del mentor 2), con CSAT y n **iguales a los calculados en SQL**, y marca
  «muestra pequeña»; el CSAT global del coach coincide con SQL; una tabla por tipo; el filtro
  funciona; mentor y coach no entran a las vistas que no les tocan; el super admin ve el NPS
  de Cinturón con el n correcto y carga el CSV (rechaza aprobados > presentados). **Ninguna
  página de tablero contiene nombres ni correos de los respondentes de prueba.**

## Fase 4 · Correo por GHL y NPS de Cinturón (25 sep 2026)

### Verificación de la API de GHL (en vivo)

- `POST /contacts/search` (Version 2021-07-28) con filtro `tags eq <tag>`: funciona (el
  contacto de prueba aparece con su tag). La subcuenta tiene 1.802 contactos.
- `POST /conversations/messages` tipo Email (Version 2021-04-15), sin `emailFrom` (usa el
  remitente por defecto de la subcuenta): «Email queued successfully». En esta fase se
  enviaron **4 correos, todos al contacto de prueba** `xZB5m9rMiJ4dz7Ekusib` (1 de verificación
  y 3 de las corridas de la prueba E2E).

### Qué se construyó

- `migrations/cp_0004_correo_cinturon.sql` (+ `cp_0004_down.sql`, que restaura la versión de
  `cp_registrar_respuesta` de cp_0003):
  - Columnas de la encuesta de Cinturón en `cp_respuestas` (`nps`, `nes`, `aplicacion`,
    `dificultad`, `ces`, `clientes_activos`, `rango_top`, `texto_cambio_nivel`).
  - `cp_registrar_cinturon()` (solo service role) y `cp_guardar_identidad()` compartida.
  - Deduplicación por contacto y nivel con una pimienta secreta en `cp_secretos` (solo service
    role): sin ella, el hash no se puede vincular con un contact_id.
  - `cp_envios`: registro de cada correo (enviado, omitido o error). Solo el super admin lo lee
    porque lleva el contact_id.
  - `cp_config.rangos_por_nivel` (vacío: la pregunta 7 es texto libre hasta que se carguen).
- Al abrir una sesión, el correo sale con `after()` (no bloquea al mentor):
  - **Modo prueba** (hoy, en todos los entornos): solo a `GHL_CONTACTOS_PRUEBA`, y solo si el
    Grupo tiene el correo encendido o la sesión es de prueba. `enviarCorreo()` además se niega
    a escribir a cualquier otro contacto (segunda barrera).
  - **Modo real** (cuando Santi lo cambie): Grupos de clientes por tag; Cinturones por
    `ghl_campo_nivel`. Mientras ese campo sea null, **no se envía** a los Cinturones (se
    registra un aviso). Máximo 1 correo por alumno cada 48 h (`correo_intervalo_horas`).
  - Enlace: `/f?c=<contact_id>&s=<sesión>`. El panel de la sesión muestra los correos enviados.
- `/cinturon?c=<contact_id>&n=<N>`: las 9 preguntas de 3.3 (clientes activos solo en los
  niveles 3 a 6), con identidad al final. La identidad sale de GHL.

### Workflow de gate en GHL (lo hace Santi; ClassPulse no publica nada en GHL)

En cada Workflow de gate («aprobó el Nivel N»), agregar una acción **Send Email** con un
botón o enlace a:

```
https://classpulse-jade.vercel.app/cinturon?c={{contact.id}}&n=N
```

(N = número del nivel aprobado, de 0 a 6.) Texto sugerido, sin guiones: «¡Felicitaciones por
aprobar el Cinturón X! Cuéntanos cómo fue tu nivel; te toma unos 2 minutos».

### Qué se probó

- `pruebas/rls/fase4_cinturon_envios.sql` en local y contra la base real; reversión y
  reaplicación en local (la encuesta de clase sigue pasando tras la reversión).
- Las pruebas RLS de las Fases 2 y 3 ya no dependen de las sesiones de prueba que dejan
  abiertas las pruebas E2E.
- Playwright (build local + Supabase y GHL reales): el mentor abre una sesión de prueba → 1
  correo **enviado al contacto de prueba** y registrado en `cp_envios`; el panel muestra «1
  correos enviados»; el enlace del correo abre la encuesta de esa sesión (Pixel 7). Encuesta
  de Cinturón del Nivel 4 en iPhone: guardada con todos los campos, `es_prueba` e identidad
  desde GHL; no se repite el mismo nivel; el Nivel 1 no pregunta clientes activos; nivel
  inexistente rechazado; sin guiones ni scroll horizontal.

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
| classpulse.prueba.nuevo@example.com | mentor (creada desde /admin en la Fase 8) | ninguno |

Por el trigger de ClassVote aparecen como mentores **pendientes** en ClassVote (sin acceso
allí). Están marcados `es_prueba` en `cp_acceso`. Las contraseñas no se publican; se pueden
restablecer desde /admin de ClassVote.

### Pendiente

- Cargar en `cp_config.ghl_contacto_resumen` el contact_id de Mike en GHL (resumen diario).
- Workflows de gate en GHL: agregar la acción Send Email (ver Fase 4). Lo hace Santi.
- Cargar los Rangos de cada nivel en `cp_config.rangos_por_nivel`.
- Definir el campo de GHL con el nivel del alumno (`ghl_campo_nivel`); sin él, el correo real no sale para los Cinturones.

- Cambiar la cuenta coach al correo personal de Mike cuando esté definido.
- ~~Vercel: proyecto classpulse~~ Resuelto en la retoma autónoma (ver arriba).
