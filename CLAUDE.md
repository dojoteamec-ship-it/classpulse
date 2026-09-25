@AGENTS.md

# ClassPulse · reglas del proyecto

Feedback de clases en vivo y de mentores de RoninX Academy. App hermana de ClassVote
(`../classvote`, repo público `dojoteamec-ship-it/classvote`).

**Fuente de verdad:** `docs/00_PLAN.md`. Las decisiones de su sección 0 están cerradas: si
algo las contradice, es ambiguo o no se puede hacer, detenerse y preguntar a Santi.
**Bitácora:** `docs/AVANCE.md` (actualizarla en cada fase).

## Reglas que no se negocian

1. **Diseño idéntico a ClassVote.** `app/globals.css`, `components/` de marca y `public/marca/`
   copiados tal cual. Inter vía `<link>`, sin `next/font`. No inventar estética.
2. **Stack idéntico:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase
   (Postgres, RLS, Auth, pg_cron), Vercel. Antes de escribir código de Next, leer
   `node_modules/next/dist/docs/` (`proxy.ts`, `cookies()`/`params` asíncronos).
3. **Cero cambios en objetos de ClassVote.** Todo lo nuevo lleva prefijo `cp_`. ClassPulse solo
   LEE `mentores`, `cinturones` y `auth.users`. Nunca borrar datos fuera de `cp_`.
4. **Migraciones** en `migrations/cp_XXXX_*.sql`, idempotentes, con su `cp_XXXX_down.sql`.
   Antes de aplicarlas: `npm run verificar-migraciones` y `pruebas/preparar-local.sh`
   (Postgres local con el shim de Supabase). Se aplican con la Management API de Supabase.
5. **Autorización en RLS.** La service role solo en el servidor (`server-only`) y solo en los
   usos listados en `docs/03-arquitectura.md` (respuestas del alumno, cuenta de Mike, resumen
   diario, envío por GHL), siempre tras verificar el rol o el secreto del cron.
6. **Privacidad.** La identidad del alumno vive solo en `cp_respondentes` (coach y super admin).
   Un mentor jamás lee identidades, alertas ni pedidos de contacto. En modo anónimo no se guarda
   nada que identifique al alumno. Probar cada rol (`pruebas/rls/`).
7. **GHL:** solo API v2 oficial con Private Integration Token del servidor. Verificar cada
   endpoint en https://marketplace.gohighlevel.com/docs/ antes de usarlo. Nada de n8n ni
   WhatsApp. `GHL_MODO_ENVIO=prueba` en todos los entornos: solo Santi lo cambia a `real`. En
   prueba solo se envía a `GHL_CONTACTOS_PRUEBA`. Nunca contactar alumnos reales ni publicar
   enlaces en GHL.
8. **Idioma:** código, dominio, comentarios y textos en español neutro ecuatoriano, sin voseo.
   En textos que ve el alumno, **sin guiones ni rayas** (ni `-` ni `—`).
9. **Datos de prueba** marcados con `es_prueba` y fuera de los tableros.
10. **Calidad:** `npm run lint`, `npm run typecheck`, `npm run build` y las pruebas deben pasar
    antes de cada PR. Un PR por fase hacia `main`.

## Comandos

```bash
npm run dev | lint | typecheck | build
npm run verificar-migraciones            # rechaza migraciones que toquen objetos sin cp_
pruebas/preparar-local.sh ../classvote   # Postgres local: shim + ClassVote + cp_ (x2)
pruebas/correr-sql.sh local pruebas/rls/*.sql   # o "remoto" (Management API)
```
