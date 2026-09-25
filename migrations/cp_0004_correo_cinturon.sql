-- cp_0004 · Fase 4: registro de correos por GHL y encuesta de Cinturón (NPS relacional).
--
-- * cp_envios: un registro por correo intentado (enviado, omitido o con error). Sirve para
--   la tasa de respuesta y para el límite de 1 correo por alumno cada 48 h.
-- * La encuesta de Cinturón (plan 3.3) usa columnas nuevas de cp_respuestas.
-- * Deduplicación por contacto y nivel con una «pimienta» secreta (cp_secretos, solo service
--   role). Sin la pimienta, el hash no se puede vincular con un contact_id.
--
-- Idempotente. Reversión: cp_0004_down.sql.

-- 1. Encuesta de Cinturón en cp_respuestas ----------------------------------------
alter table cp_respuestas add column if not exists nps smallint check (nps between 0 and 10);
alter table cp_respuestas add column if not exists nes text check (nes ~ '^[a-z_]{2,40}$');
alter table cp_respuestas add column if not exists aplicacion text check (aplicacion ~ '^[a-z_]{2,40}$');
alter table cp_respuestas add column if not exists dificultad smallint check (dificultad between 1 and 5);
alter table cp_respuestas add column if not exists ces smallint check (ces between 1 and 7);
alter table cp_respuestas add column if not exists clientes_activos text check (clientes_activos ~ '^[a-z0-9_]{1,20}$');
alter table cp_respuestas add column if not exists rango_top text check (char_length(rango_top) <= 80);
alter table cp_respuestas add column if not exists texto_cambio_nivel text check (char_length(texto_cambio_nivel) <= 1000);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cp_respuestas_cinturon_completa') then
    alter table cp_respuestas add constraint cp_respuestas_cinturon_completa
      check (encuesta <> 'cinturon' or (nps is not null and nes is not null and nivel is not null));
  end if;
end $$;

-- 2. Secretos y deduplicación de Cinturón -------------------------------------------
create table if not exists cp_secretos (
  clave text primary key,
  valor text not null
);
insert into cp_secretos (clave, valor)
values ('pimienta_cinturon', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (clave) do nothing;

create table if not exists cp_cinturon_dedupe (
  nivel smallint not null,
  hash text not null,
  primary key (nivel, hash)
);

-- 3. Registro de correos -------------------------------------------------------------
create table if not exists cp_envios (
  id bigint generated always as identity primary key,
  sesion_id uuid references cp_sesiones (id) on delete set null,
  tipo text not null default 'sesion' check (tipo in ('sesion', 'resumen')),
  ghl_contact_id text not null,
  estado text not null check (estado in ('enviado', 'omitido', 'error')),
  detalle text,
  es_prueba boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists cp_envios_contacto_idx on cp_envios (ghl_contact_id, creado_en desc);
create index if not exists cp_envios_sesion_idx on cp_envios (sesion_id);

-- 4. Guardado de identidad y contacto (compartido por las encuestas) ---------------------
create or replace function cp_guardar_identidad(
  p_respuesta_id uuid, p_modo cp_modo_identidad, p_identidad jsonb, p_contacto jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_modo <> 'anonimo' then
    if p_identidad is null or coalesce(btrim(p_identidad ->> 'nombre'), '') = '' then
      raise exception 'Falta tu nombre.';
    end if;
    insert into cp_respondentes (respuesta_id, ghl_contact_id, nombre, email, telefono, nivel)
    values (p_respuesta_id, nullif(p_identidad ->> 'ghl_contact_id', ''), btrim(p_identidad ->> 'nombre'),
            nullif(btrim(p_identidad ->> 'email'), ''), nullif(btrim(p_identidad ->> 'telefono'), ''),
            (p_identidad ->> 'nivel')::smallint);
  end if;
  if p_modo = 'contacto' then
    if p_contacto is null then raise exception 'Falta el motivo del contacto.'; end if;
    insert into cp_contactos (respuesta_id, motivo, canal_preferido, mensaje)
    values (p_respuesta_id, p_contacto ->> 'motivo', p_contacto ->> 'canal_preferido',
            nullif(btrim(p_contacto ->> 'mensaje'), ''));
  end if;
end $$;

-- 5. Registro de la encuesta de Cinturón (solo service role) ----------------------------
create or replace function cp_registrar_cinturon(
  p_contact_id text,
  p_nivel smallint,
  p_respuesta jsonb,
  p_identidad jsonb default null,
  p_contacto jsonb default null,
  p_es_prueba boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_grupo uuid;
  v_pimienta text;
  v_modo cp_modo_identidad := (p_respuesta ->> 'modo_identidad')::cp_modo_identidad;
  v_id uuid;
begin
  if p_contact_id is null or p_contact_id !~ '^[A-Za-z0-9]{10,40}$' then
    raise exception 'Enlace inválido.';
  end if;
  select id into v_grupo from cp_grupos where tipo = 'cinturon' and nivel = p_nivel;
  if v_grupo is null then raise exception 'Ese Cinturón no existe.'; end if;
  select valor into v_pimienta from cp_secretos where clave = 'pimienta_cinturon';

  insert into cp_cinturon_dedupe (nivel, hash)
  values (p_nivel, encode(sha256(convert_to(p_contact_id || ':' || p_nivel || ':' || v_pimienta, 'UTF8')), 'hex'))
  on conflict do nothing;
  if not found then raise exception 'Ya respondiste la encuesta de este Cinturón. ¡Gracias!'; end if;

  insert into cp_respuestas (
    encuesta, version_encuesta, grupo_id, nivel, canal_entrada, modo_identidad,
    nps, nes, aplicacion, dificultad, ces, clientes_activos, rango_top, texto_cambio_nivel,
    segundos_para_responder, es_prueba
  ) values (
    'cinturon', coalesce((p_respuesta ->> 'version_encuesta')::smallint, 1), v_grupo, p_nivel,
    'personal', v_modo,
    (p_respuesta ->> 'nps')::smallint, p_respuesta ->> 'nes', nullif(p_respuesta ->> 'aplicacion', ''),
    (p_respuesta ->> 'dificultad')::smallint, (p_respuesta ->> 'ces')::smallint,
    nullif(p_respuesta ->> 'clientes_activos', ''), nullif(btrim(p_respuesta ->> 'rango_top'), ''),
    nullif(btrim(p_respuesta ->> 'texto_cambio_nivel'), ''),
    (p_respuesta ->> 'segundos_para_responder')::integer, p_es_prueba
  ) returning id into v_id;

  perform cp_guardar_identidad(v_id, v_modo, p_identidad, p_contacto);
  return v_id;
end $$;

-- La encuesta de clase pasa a usar el guardado compartido (mismo comportamiento).
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

  perform cp_guardar_identidad(v_id, v_modo, p_identidad, p_contacto);
  return v_id;
end $$;

revoke all on function cp_guardar_identidad(uuid, cp_modo_identidad, jsonb, jsonb) from public, anon, authenticated;
revoke all on function cp_registrar_cinturon(text, smallint, jsonb, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function cp_registrar_cinturon(text, smallint, jsonb, jsonb, jsonb, boolean) to service_role;

-- 6. Permisos y RLS ---------------------------------------------------------------
revoke all on cp_secretos, cp_cinturon_dedupe, cp_envios from anon, authenticated;
grant select on cp_envios to authenticated;
alter table cp_secretos enable row level security;
alter table cp_cinturon_dedupe enable row level security;
alter table cp_envios enable row level security;

-- Los envíos llevan el contact_id: solo el super admin los lee.
drop policy if exists "cp_envios: super admin lee" on cp_envios;
create policy "cp_envios: super admin lee" on cp_envios for select to authenticated
  using (cp_es_super_admin());

-- 7. Configuración ------------------------------------------------------------------
-- Rangos de cada nivel para la pregunta 7 de la encuesta de Cinturón. Vacío = texto libre.
insert into cp_config (clave, valor) values ('rangos_por_nivel', '{}') on conflict (clave) do nothing;
