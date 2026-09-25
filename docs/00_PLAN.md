# ClassPulse — Planificación v1

**RoninX Academy · Feedback de clases en vivo y de mentores, con base Kaizen**
Versión 1.1 · 25 de septiembre de 2026 · Preparado para Santiago Jiménez (Andreti Page LLC)

> Documento de planificación. No contiene código. Es la fuente de verdad para construir ClassPulse en Claude Code, fase por fase, igual que se hizo con ClassVote. Copiarlo al repo como `docs/00_PLAN.md` antes de la Fase 1.

---

## 0. Resumen en una página

**Qué es.** ClassPulse recoge el feedback del alumno después de cada clase en vivo (Kata, Mondo, Randori, Shinsa y práctica con clientes). También recoge un NPS al aprobar cada Cinturón. Con esos datos arma tableros por clase, mentor, nivel y tipo de sesión, y cierra el ciclo de mejora continua (PDCA) con un registro de acciones y el «Dijiste, hicimos».

**Para quién:**

| Rol | Quién | Qué hace |
|---|---|---|
| Alumno | Todos | Responde en menos de 60 segundos. No tiene cuenta. |
| Mentor | Dani, Liz, Diana, Victor, Ismael, Harold, Fer, Sergio, Efraím, David, Rafa, Andreti, Dafne (y Santi como mentor de Azul) | Abre el feedback de su clase y ve solo su propio feedback. |
| Coach | Mike (Student Success Coach) | Ve todo, incluida la identidad de quien la dejó. Gestiona alertas y pedidos de contacto. Registra acciones Kaizen. |
| Super admin | Santi | Todo lo anterior, más usuarios, grupos, umbrales, SLA, exportaciones y auditoría. |

**Decisiones cerradas en esta sesión:**

| # | Decisión | Elegido |
|---|---|---|
| D1 | Identificación del alumno | Enlace personal desde GHL con `{{contact.id}}` (tipo UTM). La app valida el contacto en la API de GHL. |
| D2 | Atribución de clase y mentor | El mentor abre la sesión de feedback desde su panel. El alumno no elige mentor ni escribe el nombre de la clase. |
| D3 | Sesiones evaluadas | Mondo, Randori, Kata puntual, Shinsa y práctica con clientes. |
| D4 | Arquitectura | App separada (repo y URL propios) sobre el mismo Supabase de ClassVote. Reutiliza cuentas y login. |
| D5 | Envío | Correo personal enviado por la API de GHL, más un enlace general por nivel en el chat de la clase. Sin n8n y sin WhatsApp. |
| D6 | Vista del mentor | Todo, sin mínimo de respuestas. Los comentarios se muestran sin nombre. |
| D7 | Alertas a Mike | Panel más resumen diario por correo. |
| D8 | IA (Claude API) | Fase 2 del producto, no entra en la v1. |
| D9 | Accesos | Solo Santi, Mike y los mentores. |
| D10 | NPS de programa | Al aprobar cada Cinturón. Lo dispara el Workflow de gate que ya existe en GHL. |
| D11 | Kaizen | Registro de acciones PDCA dentro de la app, con salida «Dijiste, hicimos». |
| D12 | Nombre | **ClassPulse** |
| D13 | SLA de Mike | 24 h hábiles para pedidos de contacto y notas 1–2. 48 h para detractores de NPS. |
| D14 | Escala general | 5 caritas, guardadas como 1 a 5. |

---

## 1. Fundamento (qué dice la investigación y cómo se aplica)

1. **La encuesta corta es la que se responde.** Con 2 preguntas termina el 91,6 % de las personas y con 5 preguntas el 76 % ([Survicate 2025](https://survicate.com/reports/survey-completion-time-benchmarks/)). El abandono crece más rápido entre las preguntas 1 y 15 ([SurveyMonkey](https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/)). **Aplicación:** la encuesta de clase dura menos de 60 segundos y tiene 4 interacciones obligatorias como máximo.
2. **La satisfacción no mide el aprendizaje.** Dos metaanálisis encontraron una correlación de 0,09 entre las encuestas de satisfacción y el aprendizaje. Thalheimer propone preguntas con opciones «distintivas», etiquetadas de antemano como inaceptable, aceptable o superior ([Work-Learning Research](https://www.worklearning.com/2018/01/24/updated-smile-sheet-questions-for-2018/)). **Aplicación:** además de las caritas, cada tipo de sesión tiene su propia pregunta distintiva.
3. **El NPS sirve para la relación, no para cada clase.** Qualtrics distingue el NPS transaccional del relacional ([Qualtrics](https://www.qualtrics.com/articles/customer-experience/transactional-vs-relational-nps/)). **Aplicación:** el NPS se pregunta solo al aprobar cada Cinturón.
4. **Kirkpatrick y LTEM.** Se mide la reacción (niveles 1 y 3 de LTEM), la aplicación (nivel 3 de Kirkpatrick) y el resultado, que son los clientes activos ([Kirkpatrick](https://www.kirkpatrickpartners.com/the-kirkpatrick-model/)). El aprendizaje ya lo miden los exámenes al 90 %. **Aplicación:** los tableros cruzan el feedback con la tasa de aprobación por Rango, que es la métrica de éxito que fijó el Informe v2 (sección 6).
5. **Para evaluar al mentor, SEEQ (Marsh).** Tiene 9 dimensiones, y se recomiendan al menos 15 evaluadores para confiar en un promedio ([ERIC](https://files.eric.ed.gov/fulltext/ED402338.pdf)). También hay sesgos documentados, como el de género: una línea de advertencia en el formulario subió 0,41 puntos la nota de las docentes ([PLOS One](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0216241)). **Aplicación:** chips de dimensiones, una línea contra el sesgo, ventana móvil de 90 días y nunca comparar tipos de sesión distintos.
6. **Kaizen es cerrar el ciclo.** El 61 % de las empresas líderes en NPS llama al detractor en menos de 48 h ([Bain](https://www.bain.com/insights/loyalty-insights-assessing-your-net-promoter-system/)). BloomTech le cuenta a sus alumnos cada semana qué cambió gracias a su feedback ([BloomTech](https://www.bloomtech.com/article/your-feedback-and-making-bloomtech-better)). **Aplicación:** alertas con SLA para Mike (circuito interno) y acciones PDCA con «Dijiste, hicimos» (circuito externo).
7. **Confidencial y anónimo no son lo mismo.** Culture Amp y Lattice atribuyen la respuesta internamente y la ocultan en los reportes ([Culture Amp](https://support.cultureamp.com/en/articles/7048386-confidentiality-protections-in-reporting)). **Aplicación:** al final de la encuesta el alumno elige entre anónimo (no se guarda nada) o con su nombre (solo Mike y Santi lo ven).
8. **Calidad de datos.** Para un NPS con un margen de ±15 puntos hacen falta 126 respuestas ([MeasuringU](https://measuringu.com/nps-ci-sample-size/)). **Aplicación:** cada cifra muestra su «n». Además, se muestra la distribución y no solo el promedio.

---

## 2. Flujos

### 2.1 Clase en vivo (flujo principal)

```
Mentor termina la clase
   └─ En su panel: «Abrir feedback» → elige Grupo, tipo de sesión y co-mentor (opcional)
        ├─ La app crea la sesión (abierta 24 h)
        ├─ Muestra el enlace general del Grupo para pegar en el chat de la clase (últimos 2 min)
        └─ Envía, por la API de GHL, un correo con el enlace personal a cada alumno del nivel
Alumno abre el enlace
   ├─ Personal (?c=<contact_id>) → la app consulta GHL, valida el contacto y su nivel, y precarga los datos
   └─ General (/g/<grupo>) → la app muestra la sesión abierta de ese Grupo (si hay 2, el alumno elige)
Encuesta (≤ 60 s) → elección final de identidad → Gracias
A las 24 h → la sesión se cierra sola (pg_cron)
```

**Por qué el mentor abre la sesión.** Hay rotaciones A/B, co-mentores (David + Rafa), Kata puntuales y reemplazos. Si el mentor abre la sesión, se sabe con certeza quién dio la clase y la atribución es exacta.

**Red de seguridad.** La app conoce el horario fijo de cada Cinturón (tabla `cinturones` de ClassVote). Si pasan 2 horas desde una clase programada y nadie abrió el feedback, se genera una alerta operativa para Mike y Santi.

### 2.2 NPS de Cinturón

```
Alumno aprueba el Nivel N → Workflow de gate en GHL (ya existe)
   └─ Nueva acción: Send Email con el enlace .../cinturon?c={{contact.id}}&n=N
Alumno responde la encuesta de Cinturón (≈ 2 min) → elección de identidad → Gracias
```

No hace falta nada fuera de GHL. Solo se agrega una acción **Send Email** a cada Workflow de gate.

### 2.3 Identidad (el alumno decide al final)

| Opción | Qué se guarda | Quién ve la identidad |
|---|---|---|
| **Anónimo** | Solo las respuestas. Ni contact_id, ni nombre, ni correo. | Nadie |
| **Con mi nombre** | Respuestas más identidad (desde GHL o escrita a mano en el enlace general) | Mike y Santi. **El mentor nunca.** |
| **Con mi nombre y quiero que Mike me contacte** | Lo anterior más el motivo, el canal preferido y un mensaje | Mike y Santi. Genera una alerta de SLA 24 h. |

Textos obligatorios en pantalla (sin guiones, porque son para el alumno):

- Antes de enviar: «Tu mentor leerá tus comentarios sin tu nombre.»
- Si elige anónimo: «No guardamos tu nombre ni tu correo. Si necesitas ayuda, elige la opción de contacto.»

---

## 3. Instrumentos: preguntas, escalas y variables

Todas las encuestas llevan un `version_encuesta`. Si mañana cambia una pregunta, las tendencias no se mezclan.

### 3.1 Encuesta de clase (menos de 60 segundos)

| # | Pregunta (texto al alumno) | Tipo | Obligatoria | Variable |
|---|---|---|---|---|
| 1 | ¿Cómo viviste esta clase? — En vivo · Vi la grabación · No pude asistir | Opción única | Sí | `asistencia` |
| 1b | *(solo si no pudo asistir)* ¿Qué pasó? — El horario no me funciona · No me enteré de la clase · El tema no me interesaba · Problema técnico · Otro | Opción única, luego termina | Sí | `motivo_inasistencia` |
| 2 | ¿Cómo calificas la clase de hoy? | 5 caritas (1 a 5) | Sí | `csat` |
| 3 | Pregunta distintiva según el tipo de sesión (ver 3.2) | Opción única, 4 o 5 niveles | Sí | `distintiva_codigo`, `distintiva_banda` |
| 4 | Si `csat` ≥ 4: «¿Qué estuvo mejor?» · Si `csat` ≤ 3: «¿Qué faltó?» | Chips, varias opciones | No | `chips[]` |
| 5 | ¿Qué deberíamos mantener? | Texto corto, 500 caracteres | No | `texto_mantener` (Plus) |
| 6 | ¿Qué cambiarías para la próxima clase? | Texto corto, 500 caracteres | No | `texto_cambiar` (Delta) |
| 7 | Elección de identidad (2.3) | Opción única | Sí | `modo_identidad`, `contacto_solicitado` |

Línea contra el sesgo, en letra pequeña sobre la pregunta 2: «Califica la clase por lo que aprendiste y te llevas. Todos tenemos sesgos inconscientes, por ejemplo de género o de acento.»

**Chips y su dimensión SEEQ.** Las etiquetas negativas técnicas separan un problema del mentor de un problema de la plataforma.

| Positivos (csat ≥ 4) | Dimensión | Negativos (csat ≤ 3) | Dimensión |
|---|---|---|---|
| Explicó con claridad | Claridad | Poco claro | Claridad |
| Dominó el tema | Dominio | Se notó poco preparado | Dominio |
| Respondió mis dudas | Interacción | No se respondió mi duda | Interacción |
| Ejemplos aplicables a mi negocio | Valor aplicable | Muy teórico | Valor aplicable |
| Buen ritmo | Organización | Muy rápido · Muy lento | Organización |
| Empezó puntual | Organización | Empezó tarde | Organización |
| Buena energía | Entusiasmo | — | — |
| — | — | Audio o conexión | Técnico (no es del mentor) |
| — | — | Problema con GHL o accesos | Plataforma (no es del mentor) |

### 3.2 Pregunta distintiva por tipo de sesión (Thalheimer)

La banda (🔴 inaceptable, 🟡 aceptable, 🟢 superior) es interna. El alumno no ve colores.

**Mondo — «¿Se resolvió tu duda?»**

| Opción | Banda |
|---|---|
| No traje dudas | Neutra (se excluye del cálculo) |
| Mi duda no se alcanzó a tratar | 🔴 |
| Se trató, pero sigo con la duda | 🔴 |
| Quedó resuelta | 🟡 |
| Quedó resuelta y ya sé cómo aplicarla | 🟢 |

**Randori — «Después de esta práctica, ¿qué tan listo estás para hacerlo con un cliente real?»**

| Opción | Banda |
|---|---|
| Todavía no podría hacerlo | 🔴 |
| Podría hacerlo con ayuda | 🟡 |
| Podría hacerlo solo | 🟢 |
| Podría hacerlo y enseñarlo | 🟢 |

**Kata — «¿Qué tan claro te quedó el tema?»**

| Opción | Banda |
|---|---|
| Me perdí | 🔴 |
| Entendí algunas partes | 🔴 |
| Entendí lo principal | 🟡 |
| Lo entendí y sé cómo aplicarlo | 🟢 |

**Shinsa — «¿Qué tan útil fue el feedback sobre tu proyecto?»**

| Opción | Banda |
|---|---|
| No recibí un feedback claro | 🔴 |
| Recibí feedback, pero no sé qué hacer con él | 🔴 |
| Sé exactamente qué corregir | 🟡 |
| Sé qué corregir y por qué | 🟢 |

**Práctica con clientes — «¿Qué tan útil fue para tu trabajo en este lanzamiento?»**

| Opción | Banda |
|---|---|
| No me sirvió | 🔴 |
| Me sirvió poco | 🔴 |
| Me sirvió; ya sé qué hacer | 🟡 |
| Ya lo estoy aplicando en mis campañas | 🟢 |

### 3.3 Encuesta de Cinturón (al aprobar un nivel, unos 2 minutos)

| # | Pregunta | Escala | Variable | Marco |
|---|---|---|---|---|
| 1 | ¿Qué tan probable es que recomiendes RoninX Academy a un colega? | 0 a 10 | `nps` | NPS relacional |
| 2 | Si alguien te preguntara por el Nivel N, ¿qué le dirías? — No fue efectivo; dudaría en recomendarlo · Le faltan mejoras para recomendarlo · Lo recomendaría aunque tiene cosas por mejorar · Fue efectivo; lo recomiendo · Fue muy efectivo; lo recomiendo mucho | 5 opciones | `nes` | Net Effectiveness Score (Thalheimer) |
| 3 | ¿Ya aplicaste lo del nivel? — Sí, con un cliente que paga · Sí, en una prueba o en mi negocio · Todavía no, pero tengo un plan · Todavía no y no sé cómo | 4 opciones | `aplicacion` | Kirkpatrick N3 |
| 4 | ¿Qué tan difícil fue el nivel? | 1 a 5 (muy fácil a muy difícil) | `dificultad` | Calibración del pensum |
| 5 | Fue fácil avanzar en este nivel (acceso a cursos, examen, clases) | 1 a 7 (desacuerdo a acuerdo) | `ces` | Customer Effort Score |
| 6 | *(Niveles 3 a 6)* ¿Cuántos clientes activos tienes hoy? — 0 · 1 · 2 a 4 · 5 o más | Opción única | `clientes_activos` | Kirkpatrick N4 |
| 7 | ¿Qué Rango te aportó más? | Lista de Rangos del nivel | `rango_top` | Pensum |
| 8 | Si pudieras cambiar una sola cosa del Nivel N, ¿cuál sería? | Texto | `texto_cambio_nivel` | Kaizen |
| 9 | Elección de identidad | Igual que 2.3 | `modo_identidad` | — |

### 3.4 Buzón abierto (opcional, recomendado)

Enlace fijo `/buzon`, siempre disponible. Tiene un solo campo de texto y la elección de identidad. Es la práctica de BloomTech para lo que no encaja en una clase: pagos, accesos, trato o propuestas. Pasa por las mismas reglas de alerta.

### 3.5 Variables automáticas (el alumno no las ve)

`sesion_id`, `grupo`, `nivel`, `tipo_sesion`, `mentores[]`, `fecha_clase`, `canal_entrada` (personal o general), `segundos_para_responder`, `horas_desde_apertura`, `version_encuesta`, `creado_en`.

---

## 4. Métricas y tableros

### 4.1 Definiciones

| KPI | Fórmula | Meta propuesta (Santi confirma) |
|---|---|---|
| CSAT medio | Promedio de `csat` (1 a 5) | ≥ 4,3 |
| % Top-2 | `csat` 4 o 5 sobre el total | ≥ 80 % |
| % Bottom-2 | `csat` 1 o 2 sobre el total | ≤ 5 % |
| Índice distintivo | % 🟢, % 🟡 y % 🔴 (sin contar las neutras) | 🔴 ≤ 15 % |
| NPS de Cinturón | % de 9–10 menos % de 0–6 | Santi define (Le Wagon se fija 70) |
| NES | Distribución de las 5 opciones | ≥ 70 % en las dos superiores |
| CES | Promedio de 1 a 7 | ≥ 5,5 |
| Tasa de respuesta (personal) | Respuestas por enlace personal sobre correos enviados | ≥ 40 % |
| Respuestas por clase | Total de la sesión | Se muestra siempre junto a cada cifra |
| Inasistencia declarada | % «No pude asistir» y sus motivos | Solo seguimiento |
| Tiempo hasta el contacto | Mediana y p90, de la alerta al primer contacto | Dentro del SLA |
| Cumplimiento del SLA | % de alertas contactadas en plazo | ≥ 90 % |
| Acciones Kaizen | Abiertas, cerradas y % verificadas con datos | ≥ 1 acción por nivel al mes |

**Reglas para leer los datos** (van en la interfaz, no solo en este documento):

- Cada cifra muestra su n. Con n < 15, la cifra se ve atenuada con la leyenda «muestra pequeña».
- Las notas de un mentor se leen en una ventana móvil de 90 días, nunca por una sola clase.
- Nunca se comparan tipos de sesión distintos: un Mondo se compara con otro Mondo.
- Siempre se muestra la distribución (barras de 1 a 5) junto al promedio.

### 4.2 Tablero del mentor (ve solo lo suyo)

- Una tarjeta por cada sesión que abrió: CSAT, distribución, bandas de la distintiva, n y comentarios sin nombre.
- Tendencia de 90 días por tipo de sesión, con una línea de referencia: el promedio de la academia para ese mismo tipo de sesión, sin nombres de otros mentores.
- Sus chips más frecuentes, positivos y negativos, agrupados por dimensión SEEQ.
- Sus acciones Kaizen y el estado de cada una.
- **No ve:** identidades, alertas, pedidos de contacto ni datos de otros mentores.

### 4.3 Tablero de Mike (coach)

- **Bandeja de casos** (primera pantalla): alertas por gravedad y vencimiento del SLA, con estados Nueva → En contacto → Resuelta o Descartada, notas de seguimiento e historial de feedback del alumno.
- Vista global por nivel, mentor, tipo de sesión y fecha, con filtros.
- Alumnos con varias alertas o con tendencia negativa.
- Motivos de inasistencia por nivel, que sirven para decidir horarios.
- Tablero Kaizen con todas las acciones.
- Resumen diario a las 08:00 (hora de Ecuador) por correo: alertas nuevas, alertas por vencer y clases sin feedback abierto.

### 4.4 Tablero de Santi (super admin)

- Todo lo que ve Mike, más:
  - Usuarios y roles.
  - Grupos, que son los 7 Cinturones más Comunidad Ronin y Comunidad Anahata.
  - Umbrales y metas.
  - SLA y horario hábil.
  - Interruptor de correo por Grupo.
- Vista de programa: NPS, NES, CES, aplicación y clientes activos por Cinturón, junto con la tasa de aprobación por Rango (carga manual o CSV en la v1).
- Exportación CSV.
- Registro de auditoría: quién vio identidades y cuándo.

---

## 5. Alertas (circuito interno)

| Regla | Disparador | Gravedad | SLA |
|---|---|---|---|
| R1 | Pidió contacto | Alta | 24 h hábiles |
| R2 | `csat` 1 o 2 con identidad | Media | 24 h hábiles |
| R3 | `nps` de 0 a 6 con identidad | Media | 48 h hábiles |
| R4 | El texto contiene palabras clave: reembolso, devolución, cancelar, estafa, abandonar, «no entiendo nada», «no puedo entrar» (lista editable) | Alta | 24 h hábiles |
| R5 | El mismo alumno deja 2 respuestas seguidas con 🔴 o `csat` ≤ 2 | Media | 24 h hábiles |
| R6 | Clase programada sin feedback abierto 2 h después | Operativa | Sin SLA; solo aviso |
| R7 | Un mentor queda con CSAT de 30 días < 3,8 con n ≥ 15 | Kaizen (solo Santi) | Sin SLA; va a acción PDCA |

- Una respuesta anónima que activa R4 genera un aviso sin posibilidad de contacto. Mike ve el texto y el contexto, pero no a quién contactar.
- Horario hábil configurable. Por defecto: lunes a viernes, de 09:00 a 18:00, hora de Ecuador.
- En la Fase 2 del producto, la regla R4 pasa de palabras clave a clasificación con IA.

---

## 6. Ciclo Kaizen dentro de la app (circuito externo)

**Registro de acción (PDCA).** Tiene estos campos:

- Problema observado, con enlace a los datos que lo muestran.
- Causa raíz con 5 Porqués, en 5 campos opcionales.
- Acción.
- Responsable.
- Fecha compromiso.
- Estado: Planificar → Hacer → Verificar → Estandarizar, o Descartar.
- Métrica antes y métrica después, que la app calcula sola.
- Casilla «Publicar en Dijiste, hicimos».

**Cadencia sugerida.** Es operativa, no la impone la app:

- Semanal: huddle de 15 minutos de Mike con los mentores de cada nivel, con el tablero abierto.
- Mensual: retrospectiva KPT (Keep, Problem, Try) con todos los mentores y Anita, sobre los temas que se repiten.
- Mensual: Mike o un mentor par revisa la grabación de una clase de cada mentor (Gemba).

**«Dijiste, hicimos».** La app genera el texto mensual por Grupo con las acciones marcadas. El texto sale sin guiones, listo para que Anita lo publique en el Grupo de Comunidad.

---

## 7. Arquitectura

### 7.1 Stack (igual que ClassVote)

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, RLS, Auth, pg_cron) · Vercel.

- **Repo:** `dojoteamec-ship-it/classpulse`.
- **Supabase:** el mismo proyecto `cvpvkactwtymvckbpxhm`.
- **Diseño:** se copian tal cual de ClassVote `app/globals.css` (tokens `noche-*`, `cian-*`, `washi`, `matcha`, `shu-*`, `ai-400`), `components/` (Marca, Emblema, FondoDojo, Obi, Rotulo) y `public/marca/`. La fuente es Inter vía `<link>`, sin `next/font`. Para gráficos se usa SVG propio o Recharts con los mismos tokens.

### 7.2 Convivencia con ClassVote (regla de oro)

- **Cero cambios en las tablas de ClassVote.** Todo lo nuevo lleva el prefijo `cp_`.
- ClassPulse **lee** `mentores`, `cinturones` y `auth.users`. No las modifica.
- Los roles de ClassPulse viven en `cp_acceso`. Ser admin en ClassVote no da acceso a ClassPulse, ni al revés.
- No hay registro público en ClassPulse. Santi da acceso a mentores que ya existen, y crea la cuenta de Mike desde el panel admin con la service role. Ojo: por el trigger `crear_mentor_desde_auth` de ClassVote, esa cuenta de Mike también aparece como mentor pendiente en ClassVote. Se deja pendiente o se rechaza.
- Cada migración `cp_` se prueba en un Postgres local con el mismo shim de roles que se usó en ClassVote antes de correrla en producción.

### 7.3 Integración con GHL (sin n8n)

| Uso | Mecanismo |
|---|---|
| Validar el enlace personal y precargar los datos | API v2 de GHL: consultar el contacto por ID ([Contacts](https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts/)) |
| Lista de alumnos del nivel para el correo | API v2 de GHL: buscar contactos con el campo `nivel_actual` = N ([Search Contacts](https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced/)) |
| Enviar el correo del enlace personal | API v2 de GHL: enviar mensaje de tipo Email al contacto ([Send a new message](https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/index.html)) |
| Resumen diario para Mike | Misma API, al contacto de Mike en GHL |
| NPS de Cinturón | Acción Send Email dentro del Workflow de gate existente, con `{{contact.id}}` en el enlace |
| Autenticación | Private Integration Token de la subcuenta de la academia ([PIT](https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/)), guardado solo en el servidor |

### 7.4 Seguridad y privacidad

- **Autorización real en RLS**, como en ClassVote.
  - Un mentor solo lee `cp_respuestas` de sesiones donde figura en `cp_sesion_mentores`.
  - La identidad vive en otra tabla, `cp_respondentes`, que solo pueden leer el coach y el super admin.
- **Excepción documentada al principio de ClassVote.** Las respuestas del alumno entran por una Server Action que valida con GHL y escribe con la service role. Así el navegador no puede inventar una identidad. `anon` no tiene permiso de escribir directo en ninguna tabla `cp_`.
- **Deduplicación sin romper el anonimato.**
  - Enlace personal: se guarda `hash(contact_id + sal_de_la_sesión)`. La sal se borra al cerrar la sesión, y desde ese momento el hash ya no se puede vincular con nadie.
  - Enlace general: identificador del navegador, igual que ClassVote (riesgo aceptado).
- **Enlace personal falsificable.** Cambiar el `contact_id` exige conocer el ID de 20 caracteres de otra persona. Además, la app verifica que el `nivel_actual` del contacto coincida con el Grupo de la sesión. Si alguien reenvía su enlace, otra persona podría responder a su nombre. Riesgo aceptado para la v1.
- **LOPDP Ecuador:**
  - Aviso de privacidad en la primera pantalla.
  - Retención de la identidad por 24 meses; después se anonimiza sola.
  - Auditoría de quién vio identidades.
  - Borrado a pedido del alumno, con plazo de 15 días.
  - Una persona decide siempre: ninguna alerta genera acciones automáticas (Art. 20).

### 7.5 Modelo de datos (guía para Claude Code; el detalle final se define en la Fase 1)

| Tabla | Para qué | Columnas clave |
|---|---|---|
| `cp_acceso` | Rol en ClassPulse | `mentor_id` (FK a mentores), `rol` (mentor, coach o super_admin), `activo` |
| `cp_grupos` | Los 7 Cinturones y los 2 grupos de clientes | `slug`, `nombre`, `tipo` (cinturon o cliente), `cinturon_id`, `activo`, `enviar_correo` |
| `cp_mentor_grupos` | En qué Grupos puede abrir sesión un mentor | `mentor_id`, `grupo_id` |
| `cp_sesiones` | Una clase evaluada | `grupo_id`, `tipo_sesion` (kata, mondo, randori, shinsa o practica_cliente), `fecha_clase`, `abierta_por`, `cierra_en`, `estado`, `sal_anonimato`, `correos_enviados`, `rango` (opcional) |
| `cp_sesion_mentores` | Co-mentores | `sesion_id`, `mentor_id` |
| `cp_respuestas` | Respuesta sin identidad | `sesion_id` (vacío en Cinturón y buzón), `encuesta` (clase, cinturon o buzon), `version_encuesta`, columnas tipadas de la sección 3, `detalle` (jsonb), `modo_identidad`, `canal_entrada`, `dedupe_hash` |
| `cp_respondentes` | Identidad (solo coach y super admin) | `respuesta_id`, `ghl_contact_id`, `nombre`, `email`, `telefono`, `nivel` |
| `cp_contactos` | Pedido de contacto | `respuesta_id`, `motivo`, `canal_preferido`, `mensaje` |
| `cp_alertas` | Bandeja de Mike | `respuesta_id`, `regla`, `gravedad`, `estado`, `vence_en`, `primer_contacto_en`, `resuelta_en`, `notas` |
| `cp_acciones` | Kaizen PDCA | `grupo_id`, `mentor_id`, `problema`, `porques` (jsonb), `accion`, `responsable`, `fecha_compromiso`, `estado`, `metrica_antes`, `metrica_despues`, `publicar` |
| `cp_config` | Umbrales, SLA, horario hábil, palabras clave | `clave`, `valor` (jsonb) |
| `cp_auditoria` | Quién vio qué | `usuario`, `accion`, `objeto`, `creado_en` |

**Cron (pg_cron):**

- Cada 5 minutos: cerrar sesiones vencidas y borrar su sal.
- Cada 5 minutos: recalcular el vencimiento de los SLA.
- Cada 15 minutos: aplicar la regla R6.
- A las 08:00 de Ecuador: resumen diario. Lo dispara una ruta protegida de la app que llama a la API de GHL.

### 7.6 Rutas

| Ruta | Acceso | Qué hace |
|---|---|---|
| `/f?c=<contact_id>` | Pública (enlace personal) | Encuesta de clase del nivel del alumno |
| `/g/<grupo>` | Pública (enlace general) | Encuesta de clase de la sesión abierta del Grupo |
| `/cinturon?c=<id>&n=<N>` | Pública (enlace personal) | Encuesta de Cinturón |
| `/buzon` | Pública | Buzón abierto |
| `/entrar` | Sin sesión | Login con la cuenta de ClassVote |
| `/panel` | Mentor | Sus sesiones, «Abrir feedback», su tablero |
| `/coach` | Coach y super admin | Bandeja de casos y tableros globales |
| `/kaizen` | Todos los roles (cada uno con su alcance) | Acciones PDCA |
| `/admin` | Super admin | Usuarios, Grupos, configuración, exportación y auditoría |

---

## 8. Plan de construcción en Claude Code

Cada fase se entrega en su propio Pull Request. Antes de cada merge se corre `npm run lint`, `npm run typecheck` y `npm run build`, y se revisa en Preview. **No se pasa a la fase siguiente sin la aprobación de Santi.**

| Fase | Alcance | Criterio de «listo» |
|---|---|---|
| **0 · Preparación (Santi, sin código, en paralelo a las Fases 1 y 2; obligatoria antes de la Fase 3)** | Crear el Private Integration Token en la subcuenta de la academia con permisos de lectura de contactos y envío de mensajes. Confirmar la clave exacta del campo `nivel_actual`. Crear el contacto de Mike en GHL. Crear el repo y el proyecto en Vercel. Resolver los pendientes de la sección 9. | Token probado con 1 contacto real |
| **1 · Esqueleto y diseño** | Repo, sistema de diseño copiado de ClassVote, migración `cp_0001` (acceso, grupos, config), login con las cuentas existentes, roles, layout | Santi entra como super admin y ve el panel vacío con la identidad RONIN |
| **2 · Sesiones** | «Abrir feedback» en el panel del mentor, co-mentores, enlace general por Grupo, cierre a las 24 h con pg_cron, regla R6 | Un mentor abre una sesión y la ve cerrarse sola |
| **3 · Encuesta de clase** | Flujos personal y general, preguntas 3.1 y 3.2, identidad al final, deduplicación, versión de encuesta, móvil primero | 10 respuestas de prueba correctas en iPhone y Android, con modo anónimo verificado en la base |
| **4 · Correo por GHL y NPS de Cinturón** | Envío del correo al abrir la sesión, encuesta de Cinturón, acción Send Email en los Workflows de gate | El correo llega con el enlace personal y el Workflow de gate manda la encuesta |
| **5 · Tableros** | Tablero del mentor, de Mike y de Santi con los KPIs de la sección 4 y las reglas de lectura | Datos de prueba reflejados correctamente, sin fugas de identidad (probado con cada rol) |
| **6 · Alertas y bandeja de Mike** | Reglas R1 a R7, estados, SLA con horario hábil, resumen diario | Una alerta de prueba recorre todo el ciclo y queda medido su tiempo hasta el contacto |
| **7 · Kaizen** | Registro PDCA, métricas antes y después, generador del «Dijiste, hicimos» | Una acción completa, publicada como texto |
| **8 · Admin y cumplimiento** | Usuarios, Grupos, configuración, exportación CSV, auditoría, retención de 24 meses, buzón | Checklist de la LOPDP completo |
| **9 · Piloto** | 2 semanas con 2 niveles (propuesta: Amarillo y Azul) antes de abrirlo a todos | Tasa de respuesta ≥ 40 % y cero incidentes de privacidad |
| **Producto fase 2** | Claude API: sentimiento, tema y urgencia por comentario, resúmenes semanales por mentor y nivel, R4 con IA. Mike revisa siempre. | Por definir |

---

## 9. Pendientes y riesgos (decidir antes o durante la Fase 0)

1. **Vercel Hobby es solo para uso personal y no comercial** ([Vercel](https://vercel.com/docs/plans/hobby)). ClassVote ya está en Hobby y ClassPulse es de uso comercial. Pasar a Pro cuesta 20 USD al mes por miembro. Hay que decidirlo para las dos apps.
2. **Fatiga de correo.** Según el cronograma del Informe v2, Amarillo, Naranja, Verde y Azul tienen 2 clases por semana, así que sus alumnos recibirían 2 correos semanales. Mitigación: interruptor de correo por Grupo, y un correo como máximo por alumno cada 48 h. Si baja la tasa de respuesta, se revisa.
3. **La tasa de respuesta real necesita la asistencia real.** GHL no confirma que la Sala en Directo exporte la lista de asistentes. En la v1, la tasa se mide sobre los correos enviados y el alumno declara si asistió.
4. **Límites de la API de GHL.** Hay que verificar en la Fase 0 el límite de solicitudes por subcuenta ([FAQ de la API](https://marketplace.gohighlevel.com/docs/oauth/Faqs/index.html)). Si un nivel tiene cientos de alumnos, el envío se hace en lotes.
5. **Vista del mentor sin mínimo (D6).** En Shinsa y en clases pequeñas, el mentor puede deducir quién escribió. Se mitiga con el aviso previo al alumno (2.3). Riesgo aceptado por Santi.
6. **El mentor puede olvidar abrir la sesión.** Se mitiga con la regla R6 y con la opción de que Mike la abra en su nombre.
7. **Metas.** Santi confirma el NPS objetivo por Cinturón y las metas de la tabla 4.1.
8. **Documentos a actualizar cuando ClassPulse esté construida y en producción (no antes):**
   - Especificación v5: nueva acción Send Email en los Workflows de gate.
   - Bitácora v3: nuevo proyecto ClassPulse.
   - Informe v2, sección 6: ClassPulse como medición de las clases en vivo.
   - Excel v7, hoja Pendientes.

---

## 10. Arranque en Claude Code

El mensaje inicial está en el archivo aparte `ClassPulse_Mensaje_Inicial_Claude_Code.md`. Se pega completo como primer mensaje de la sesión, con este plan guardado en el repo como `docs/00_PLAN.md`. El mensaje le pide a Claude Code leer el plan y el repo de ClassVote, devolver un resumen con dudas y esperar aprobación antes de cada fase.

---

## Fuentes

- Survicate, tiempos de finalización: https://survicate.com/reports/survey-completion-time-benchmarks/
- SurveyMonkey, número de preguntas y tasa de finalización: https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/
- MeasuringU, número de puntos de escala: https://measuringu.com/scale-points/
- MeasuringU, números frente a caritas: https://measuringu.com/numbers-versus-face-emojis/
- MeasuringU, tamaño de muestra del NPS: https://measuringu.com/nps-ci-sample-size/
- MeasuringU, validez del NPS: https://measuringu.com/nps-discredited/
- Qualtrics, NPS transaccional frente a relacional: https://www.qualtrics.com/articles/customer-experience/transactional-vs-relational-nps/
- Thalheimer, preguntas de smile sheets 2018: https://www.worklearning.com/2018/01/24/updated-smile-sheet-questions-for-2018/
- Thalheimer, Net Effectiveness Score: https://www.worklearning.com/2018/01/09/replacement-for-the-net-promoter-score-for-learning-assessments/
- Kirkpatrick Partners: https://www.kirkpatrickpartners.com/the-kirkpatrick-model/
- Marsh, SEEQ: https://files.eric.ed.gov/fulltext/ED402338.pdf
- Peterson et al. 2019, mitigación de sesgo: https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0216241
- Bain, sistema Net Promoter: https://www.bain.com/insights/loyalty-insights-assessing-your-net-promoter-system/
- Bain, circuito interno: https://www.netpromotersystem.com/about/net-promoter-system-framework/inner-loop/
- BloomTech, uso del feedback: https://www.bloomtech.com/article/your-feedback-and-making-bloomtech-better
- Le Wagon, NPS por lote: https://medium.com/le-wagon/teaching-programming-is-hard-f4ad74e702d0
- Udemy, reseñas de cursos: https://teach.udemy.com/course-reviews-101/
- Maven, encuesta de fin de curso: https://help.maven.com/en/articles/5597349-end-of-course-survey
- Lean Enterprise Institute, PDCA: https://www.lean.org/lexicon-terms/pdca/
- Lean Enterprise Institute, 5 Porqués: https://www.lean.org/lexicon-terms/5-whys/
- Culture Amp, confidencialidad en reportes: https://support.cultureamp.com/en/articles/7048386-confidentiality-protections-in-reporting
- Lattice, anonimato en encuestas: https://help.lattice.com/hc/en-us/articles/360061207493-Anonymity-in-Engagement-Surveys-and-Pulse
- LOPDP Ecuador: https://www.finanzaspopulares.gob.ec/wp-content/uploads/2021/07/ley_organica_de_proteccion_de_datos_personales.pdf
- HighLevel API, contactos: https://marketplace.gohighlevel.com/docs/ghl/contacts/contacts/
- HighLevel API, búsqueda avanzada de contactos: https://marketplace.gohighlevel.com/docs/ghl/contacts/search-contacts-advanced/
- HighLevel API, enviar mensaje: https://marketplace.gohighlevel.com/docs/ghl/conversations/send-a-new-message/index.html
- HighLevel API, Private Integration Token: https://marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken/
- HighLevel API, preguntas frecuentes: https://marketplace.gohighlevel.com/docs/oauth/Faqs/index.html
- Vercel, plan Hobby: https://vercel.com/docs/plans/hobby
