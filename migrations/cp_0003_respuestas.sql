-- cp_0003 · Fase 3: respuestas de la encuesta de clase, identidad y pedidos de contacto.
--
-- Privacidad (plan 2.3 y 7.4):
--   * cp_respuestas no guarda nada que identifique al alumno.
--   * La identidad vive en cp_respondentes y el pedido de contacto en cp_contactos. Nadie las
--     lee directo: el coach las verá por funciones que dejan auditoría (Fases 6 y 8).
--   * La deduplicación usa hash(clave + sal de la sesión) en cp_respuestas_dedupe, una tabla
--     SIN enlace a la respuesta. Al cerrar la sesión se borra la sal.
--   * Solo la service role escribe, por cp_registrar_respuesta (Server Action que valida con
--     GHL). anon no tiene ningún permiso.
--
-- Idempotente. Reversión: cp_0003_down.sql.

-- 1. Tipos ----------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cp_encuesta') then
    create type cp_encuesta as enum ('clase', 'cinturon', 'buzon');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_modo_identidad') then
    create type cp_modo_identidad as enum ('anonimo', 'nombre', 'contacto');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_canal') then
    create type cp_canal as enum ('personal', 'general');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_asistencia') then
    create type cp_asistencia as enum ('en_vivo', 'grabacion', 'no_asistio');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_banda') then
    create type cp_banda as enum ('roja', 'amarilla', 'verde', 'neutra');
  end if;
end $$;

-- 2. Tablas ---------------------------------------------------------------------
create table if not exists cp_respuestas (
  id uuid primary key default gen_random_uuid(),
  encuesta cp_encuesta not null,
  version_encuesta smallint not null default 1,
  -- Vacío en Cinturón y buzón.
  sesion_id uuid references cp_sesiones (id) on delete set null,
  grupo_id uuid references cp_grupos (id) on delete set null,
  tipo_sesion cp_tipo_sesion,
  nivel smallint,
  fecha_clase date,
  canal_entrada cp_canal not null,
  modo_identidad cp_modo_identidad not null,
  -- Encuesta de clase (plan 3.1 y 3.2).
  asistencia cp_asistencia,
  motivo_inasistencia text check (motivo_inasistencia ~ '^[a-z_]{2,40}$'),
  csat smallint check (csat between 1 and 5),
  distintiva_codigo text check (distintiva_codigo ~ '^[a-z_]{2,40}$'),
  distintiva_banda cp_banda,
  chips text[] not null default '{}' check (cardinality(chips) <= 16),
  texto_mantener text check (char_length(texto_mantener) <= 500),
  texto_cambiar text check (char_length(texto_cambiar) <= 500),
  -- Otras encuestas (Cinturón en la Fase 4) y datos extra.
  detalle jsonb not null default '{}',
  segundos_para_responder integer check (segundos_para_responder between 0 and 86400),
  horas_desde_apertura numeric(7, 2),
  es_prueba boolean not null default false,
  creado_en timestamptz not null default now(),
  check (encuesta <> 'clase' or asistencia is not null),
  check (asistencia is distinct from 'no_asistio' or (motivo_inasistencia is not null and csat is null)),
  check (encuesta <> 'clase' or asistencia = 'no_asistio' or (csat is not null and distintiva_codigo is not null))
);
create index if not exists cp_respuestas_sesion_idx on cp_respuestas (sesion_id);
create index if not exists cp_respuestas_creado_idx on cp_respuestas (encuesta, creado_en desc);

-- Identidad (solo si el alumno la eligió). Nunca la ve un mentor.
create table if not exists cp_respondentes (
  respuesta_id uuid primary key references cp_respuestas (id) on delete cascade,
  ghl_contact_id text check (ghl_contact_id ~ '^[A-Za-z0-9]{10,40}$'),
  nombre text not null check (char_length(nombre) between 1 and 120),
  email text check (char_length(email) <= 200),
  telefono text check (char_length(telefono) <= 40),
  nivel smallint,
  creado_en timestamptz not null default now()
);
create index if not exists cp_respondentes_contacto_idx on cp_respondentes (ghl_contact_id);

create table if not exists cp_contactos (
  respuesta_id uuid primary key references cp_respuestas (id) on delete cascade,
  motivo text not null check (motivo ~ '^[a-z_]{2,40}$'),
  canal_preferido text not null check (canal_preferido in ('whatsapp', 'correo', 'llamada')),
  mensaje text check (char_length(mensaje) <= 1000),
  creado_en timestamptz not null default now()
);

-- Deduplicación sin enlace a la respuesta.
create table if not exists cp_respuestas_dedupe (
  sesion_id uuid not null references cp_sesiones (id) on delete cascade,
  hash text not null,
  primary key (sesion_id, hash)
);

-- 3. Registro (solo service role) --------------------------------------------------
-- p_clave: 'c:<contact_id>' (enlace personal) o 'f:<id del navegador>' (enlace general).
-- p_respuesta: campos de la encuesta. p_identidad: {nombre, email, telefono, ghl_contact_id,
-- nivel} o null. p_contacto: {motivo, canal_preferido, mensaje} o null.
create or replace function cp_registrar_respuesta(
  p_sesion_id uuid,
  p_clave text,
  p_respuesta jsonb,
  p_identidad jsonb default null,
  p_contacto jsonb default null,
  p_es_prueba boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_s cp_sesiones;
  v_nivel smallint;
  v_sal text;
  v_modo cp_modo_identidad := (p_respuesta ->> 'modo_identidad')::cp_modo_identidad;
  v_id uuid;
begin
  select * into v_s from cp_sesiones where id = p_sesion_id;
  if v_s.id is null or v_s.estado <> 'abierta' or v_s.cierra_en <= now() then
    raise exception 'Esta clase ya no recibe respuestas.';
  end if;
  select sal into v_sal from cp_sesion_sales where sesion_id = p_sesion_id;
  if v_sal is null then raise exception 'Esta clase ya no recibe respuestas.'; end if;
  if p_clave is null or p_clave !~ '^[cf]:[A-Za-z0-9-]{10,64}$' then
    raise exception 'Clave de deduplicación inválida.';
  end if;

  insert into cp_respuestas_dedupe (sesion_id, hash)
  values (p_sesion_id, encode(sha256(convert_to(p_clave || ':' || v_sal, 'UTF8')), 'hex'))
  on conflict do nothing;
  if not found then raise exception 'Ya respondiste esta clase. ¡Gracias!'; end if;

  select nivel into v_nivel from cp_grupos where id = v_s.grupo_id;
  insert into cp_respuestas (
    encuesta, version_encuesta, sesion_id, grupo_id, tipo_sesion, nivel, fecha_clase,
    canal_entrada, modo_identidad, asistencia, motivo_inasistencia, csat,
    distintiva_codigo, distintiva_banda, chips, texto_mantener, texto_cambiar,
    segundos_para_responder, horas_desde_apertura, es_prueba
  ) values (
    'clase', coalesce((p_respuesta ->> 'version_encuesta')::smallint, 1), v_s.id, v_s.grupo_id,
    v_s.tipo_sesion, v_nivel, v_s.fecha_clase,
    (p_respuesta ->> 'canal_entrada')::cp_canal, v_modo,
    (p_respuesta ->> 'asistencia')::cp_asistencia,
    nullif(p_respuesta ->> 'motivo_inasistencia', ''),
    (p_respuesta ->> 'csat')::smallint,
    nullif(p_respuesta ->> 'distintiva_codigo', ''),
    (nullif(p_respuesta ->> 'distintiva_banda', ''))::cp_banda,
    coalesce((select array_agg(x) from jsonb_array_elements_text(p_respuesta -> 'chips') x), '{}'),
    nullif(btrim(p_respuesta ->> 'texto_mantener'), ''),
    nullif(btrim(p_respuesta ->> 'texto_cambiar'), ''),
    (p_respuesta ->> 'segundos_para_responder')::integer,
    round((extract(epoch from now() - v_s.abierta_en) / 3600)::numeric, 2),
    p_es_prueba or v_s.es_prueba
  ) returning id into v_id;

  if v_modo <> 'anonimo' then
    if p_identidad is null or coalesce(btrim(p_identidad ->> 'nombre'), '') = '' then
      raise exception 'Falta tu nombre.';
    end if;
    insert into cp_respondentes (respuesta_id, ghl_contact_id, nombre, email, telefono, nivel)
    values (v_id, nullif(p_identidad ->> 'ghl_contact_id', ''), btrim(p_identidad ->> 'nombre'),
            nullif(btrim(p_identidad ->> 'email'), ''), nullif(btrim(p_identidad ->> 'telefono'), ''),
            (p_identidad ->> 'nivel')::smallint);
  end if;
  if v_modo = 'contacto' then
    if p_contacto is null then raise exception 'Falta el motivo del contacto.'; end if;
    insert into cp_contactos (respuesta_id, motivo, canal_preferido, mensaje)
    values (v_id, p_contacto ->> 'motivo', p_contacto ->> 'canal_preferido',
            nullif(btrim(p_contacto ->> 'mensaje'), ''));
  end if;
  return v_id;
end $$;

revoke all on function cp_registrar_respuesta(uuid, text, jsonb, jsonb, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function cp_registrar_respuesta(uuid, text, jsonb, jsonb, jsonb, boolean) to service_role;

-- Cantidad de respuestas por sesión (para el panel; respeta RLS de cp_sesiones).
create or replace function cp_conteo_respuestas(p_sesion_ids uuid[])
returns table (sesion_id uuid, respuestas bigint)
language sql stable security definer set search_path = public as $$
  select r.sesion_id, count(*) from cp_respuestas r
  where r.sesion_id = any (p_sesion_ids) and (cp_es_coach() or cp_es_mi_sesion(r.sesion_id))
  group by r.sesion_id
$$;
revoke all on function cp_conteo_respuestas(uuid[]) from public, anon;
grant execute on function cp_conteo_respuestas(uuid[]) to authenticated;

-- 4. Permisos y RLS ---------------------------------------------------------------
revoke all on cp_respuestas, cp_respondentes, cp_contactos, cp_respuestas_dedupe from anon, authenticated;
grant select on cp_respuestas to authenticated;

alter table cp_respuestas enable row level security;
alter table cp_respondentes enable row level security;
alter table cp_contactos enable row level security;
alter table cp_respuestas_dedupe enable row level security;

-- El mentor lee las respuestas (sin identidad) de las sesiones que dio; el coach, todas.
-- Cinturón y buzón: solo el coach.
drop policy if exists "cp_respuestas: propias o coach" on cp_respuestas;
create policy "cp_respuestas: propias o coach" on cp_respuestas for select to authenticated
  using (cp_es_coach() or (sesion_id is not null and cp_es_mi_sesion(sesion_id)));

-- cp_respondentes, cp_contactos y cp_respuestas_dedupe: sin políticas para authenticated.
