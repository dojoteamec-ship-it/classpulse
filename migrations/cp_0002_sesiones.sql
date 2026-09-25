-- cp_0002 · Fase 2: sesiones de feedback, co-mentores, cierre a las 24 h y regla R6.
--
-- * El mentor abre la sesión desde su panel (D2). Coach y super admin pueden
--   abrirla en nombre de un mentor (plan 9.6).
-- * La sal de anonimato vive en cp_sesion_sales, sin permisos para nadie más que
--   la service role, y se borra al cerrar la sesión (plan 7.4).
-- * cp_alertas nace aquí con lo necesario para R6; la Fase 6 la completa.
-- * pg_cron: cerrar sesiones vencidas cada 5 min y revisar R6 cada 15 min.
--
-- Idempotente. Reversión: cp_0002_down.sql.

-- 1. Tipos ----------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cp_sesion_estado') then
    create type cp_sesion_estado as enum ('abierta', 'cerrada');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_alerta_estado') then
    create type cp_alerta_estado as enum ('nueva', 'en_contacto', 'resuelta', 'descartada');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_gravedad') then
    create type cp_gravedad as enum ('alta', 'media', 'operativa', 'kaizen');
  end if;
end $$;

-- 2. Tablas ---------------------------------------------------------------------
create table if not exists cp_sesiones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references cp_grupos (id),
  tipo_sesion cp_tipo_sesion not null,
  -- Fecha local de Ecuador de la clase.
  fecha_clase date not null,
  rango text check (char_length(rango) <= 80),
  abierta_por uuid not null references mentores (id),
  abierta_en timestamptz not null default now(),
  cierra_en timestamptz not null default now() + interval '24 hours',
  estado cp_sesion_estado not null default 'abierta',
  cerrada_en timestamptz,
  correos_enviados integer not null default 0,
  es_prueba boolean not null default false,
  check (cierra_en > abierta_en)
);
create index if not exists cp_sesiones_grupo_fecha_idx on cp_sesiones (grupo_id, fecha_clase desc);
create index if not exists cp_sesiones_abiertas_idx on cp_sesiones (cierra_en) where estado = 'abierta';

-- Quién dio la clase. principal = el mentor titular; los demás son co-mentores.
create table if not exists cp_sesion_mentores (
  sesion_id uuid not null references cp_sesiones (id) on delete cascade,
  mentor_id uuid not null references mentores (id),
  principal boolean not null default false,
  primary key (sesion_id, mentor_id)
);
create index if not exists cp_sesion_mentores_mentor_idx on cp_sesion_mentores (mentor_id);

-- Sal para deduplicar el enlace personal sin romper el anonimato. Solo la
-- service role la lee; se borra al cerrar la sesión.
create table if not exists cp_sesion_sales (
  sesion_id uuid primary key references cp_sesiones (id) on delete cascade,
  sal text not null default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
);

-- Bandeja de Mike. La Fase 6 agrega respuesta, SLA y seguimiento.
create table if not exists cp_alertas (
  id uuid primary key default gen_random_uuid(),
  regla text not null check (regla ~ '^R[0-9]$'),
  gravedad cp_gravedad not null,
  estado cp_alerta_estado not null default 'nueva',
  grupo_id uuid references cp_grupos (id) on delete set null,
  sesion_id uuid references cp_sesiones (id) on delete set null,
  mentor_id uuid references mentores (id) on delete set null,
  fecha_clase date,
  hora_local time,
  resumen text,
  -- Evita duplicados de reglas automáticas (por ejemplo R6:<horario>:<fecha>).
  clave_unica text unique,
  creado_en timestamptz not null default now(),
  vence_en timestamptz,
  primer_contacto_en timestamptz,
  resuelta_en timestamptz,
  es_prueba boolean not null default false
);
create index if not exists cp_alertas_estado_idx on cp_alertas (estado, creado_en desc);

-- 3. Funciones ------------------------------------------------------------------
-- ¿El usuario dio (o abrió) esta sesión? Evita recursión entre políticas.
create or replace function cp_es_mi_sesion(p_sesion_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cp_tiene_acceso() and exists (
    select 1 from cp_sesiones s
    where s.id = p_sesion_id
      and (s.abierta_por = cp_mi_mentor_id()
        or exists (select 1 from cp_sesion_mentores sm
                   where sm.sesion_id = s.id and sm.mentor_id = cp_mi_mentor_id()))
  )
$$;

-- Semana A o B según cp_config.semana_a_referencia (un lunes de semana A).
create or replace function cp_semana_ab(p_fecha date) returns text
language sql stable security definer set search_path = public as $$
  select case when ((floor((p_fecha - ref)::numeric / 7)::int % 2) + 2) % 2 = 0 then 'A' else 'B' end
  from (select coalesce((select (valor #>> '{}')::date from cp_config where clave = 'semana_a_referencia'),
                        date '2026-09-28') as ref) r
$$;

-- Abre una sesión. p_principal: null = quien abre. Solo coach y super admin
-- abren en nombre de otro. Devuelve el id de la sesión.
create or replace function cp_abrir_sesion(
  p_grupo_id uuid,
  p_tipo cp_tipo_sesion,
  p_fecha date,
  p_co_mentores uuid[] default '{}',
  p_rango text default null,
  p_principal uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_yo uuid := cp_mi_mentor_id();
  v_principal uuid := coalesce(p_principal, cp_mi_mentor_id());
  v_grupo cp_grupos;
  v_hoy date := (now() at time zone 'America/Guayaquil')::date;
  v_co uuid[];
  v_prueba boolean;
  v_id uuid;
begin
  if not cp_tiene_acceso() then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  select * into v_grupo from cp_grupos where id = p_grupo_id and activo;
  if v_grupo.id is null then raise exception 'El Grupo no existe o está inactivo.'; end if;
  if not cp_puede_abrir(p_grupo_id) then
    raise exception 'No puedes abrir sesiones en este Grupo.' using errcode = '42501';
  end if;
  if v_principal <> v_yo and not cp_es_coach() then
    raise exception 'Solo el coach puede abrir una sesión en nombre de otro mentor.' using errcode = '42501';
  end if;
  if not exists (select 1 from cp_acceso where mentor_id = v_principal and activo) then
    raise exception 'El mentor principal no tiene acceso a ClassPulse.';
  end if;
  if (v_grupo.tipo = 'cliente') <> (p_tipo = 'practica_cliente') then
    raise exception 'Ese tipo de sesión no corresponde a este Grupo.';
  end if;
  if p_fecha is null or p_fecha > v_hoy or p_fecha < v_hoy - 3 then
    raise exception 'La fecha de la clase debe ser de hoy o de los últimos 3 días.';
  end if;

  select coalesce(array_agg(distinct c), '{}') into v_co
  from unnest(coalesce(p_co_mentores, '{}')) c where c <> v_principal;
  if cardinality(v_co) > 3 then raise exception 'Máximo 3 co-mentores.'; end if;
  if exists (select 1 from unnest(v_co) c
             where not exists (select 1 from cp_acceso a where a.mentor_id = c and a.activo)) then
    raise exception 'Un co-mentor no tiene acceso a ClassPulse.';
  end if;

  if exists (select 1 from cp_sesiones
             where grupo_id = p_grupo_id and tipo_sesion = p_tipo and fecha_clase = p_fecha
               and estado = 'abierta') then
    raise exception 'Ya hay una sesión abierta de ese tipo para esta clase.';
  end if;

  -- Una sesión es de prueba si la abre o la da una cuenta de prueba.
  select coalesce(bool_or(es_prueba), false) into v_prueba
  from cp_acceso where mentor_id = any (array[v_yo, v_principal] || v_co);

  insert into cp_sesiones (grupo_id, tipo_sesion, fecha_clase, rango, abierta_por, es_prueba)
  values (p_grupo_id, p_tipo, p_fecha, nullif(btrim(p_rango), ''), v_yo, v_prueba)
  returning id into v_id;
  insert into cp_sesion_mentores (sesion_id, mentor_id, principal) values (v_id, v_principal, true);
  insert into cp_sesion_mentores (sesion_id, mentor_id)
  select v_id, c from unnest(v_co) c;
  insert into cp_sesion_sales (sesion_id) values (v_id);

  -- Si había un aviso R6 por esta clase, queda resuelto.
  if not v_prueba then
    update cp_alertas set estado = 'resuelta', resuelta_en = now(), sesion_id = v_id
    where regla = 'R6' and grupo_id = p_grupo_id and fecha_clase = p_fecha and estado = 'nueva';
  end if;
  return v_id;
end $$;

-- Cierre manual: quien la abrió, quien la dio, o el coach.
create or replace function cp_cerrar_sesion(p_sesion_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (cp_es_coach() or cp_es_mi_sesion(p_sesion_id)) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  update cp_sesiones set estado = 'cerrada', cerrada_en = now()
  where id = p_sesion_id and estado = 'abierta';
  delete from cp_sesion_sales where sesion_id = p_sesion_id;
end $$;

-- Cron: cierra las sesiones vencidas y borra su sal.
create or replace function cp_cerrar_vencidas() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with c as (
    update cp_sesiones set estado = 'cerrada', cerrada_en = now()
    where estado = 'abierta' and cierra_en <= now()
    returning id
  )
  select count(*) into n from c;
  delete from cp_sesion_sales ss using cp_sesiones s
  where s.id = ss.sesion_id and s.estado = 'cerrada';
  return n;
end $$;

-- Cron: regla R6. Una franja del cronograma que pasó hace 2 h o más (y hace
-- menos de 26 h) sin sesión abierta genera un aviso operativo. Solo en Grupos
-- con al menos un mentor real asignado; las sesiones de prueba no cuentan.
create or replace function cp_revisar_r6(p_ahora timestamptz default now()) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := p_ahora at time zone 'America/Guayaquil';
  n integer;
begin
  with franjas as (
    select h.id as horario_id, h.grupo_id, h.hora_local, d::date as fecha, g.nombre
    from cp_horarios h
    join cp_grupos g on g.id = h.grupo_id and g.activo
    cross join generate_series(v_local::date - 1, v_local::date, interval '1 day') d
    where h.activo
      and extract(dow from d) = h.dia_semana
      and (h.semana = 'todas' or h.semana = cp_semana_ab(d::date))
      and d::date + h.hora_local + interval '2 hours' <= v_local
      and d::date + h.hora_local + interval '26 hours' > v_local
      and exists (select 1 from cp_mentor_grupos mg
                  join cp_acceso a on a.mentor_id = mg.mentor_id and a.activo and not a.es_prueba
                  where mg.grupo_id = g.id)
      and not exists (select 1 from cp_sesiones s
                      where s.grupo_id = h.grupo_id and s.fecha_clase = d::date and not s.es_prueba)
  ), nuevas as (
    insert into cp_alertas (regla, gravedad, grupo_id, fecha_clase, hora_local, resumen, clave_unica)
    select 'R6', 'operativa', f.grupo_id, f.fecha, f.hora_local,
           'Clase de ' || f.nombre || ' sin feedback abierto 2 horas después.',
           'R6:' || f.horario_id || ':' || f.fecha
    from franjas f
    on conflict (clave_unica) do nothing
    returning 1
  )
  select count(*) into n from nuevas;
  return n;
end $$;

-- Enlace general (/g/<grupo>): sesiones abiertas del Grupo, sin datos
-- sensibles. Las de prueba solo aparecen si se piden (?prueba=1).
create or replace function cp_sesiones_abiertas(p_slug text, p_incluir_prueba boolean default false)
returns table (id uuid, grupo_nombre text, grupo_slug text, tipo_sesion cp_tipo_sesion,
               fecha_clase date, cierra_en timestamptz, mentores text, es_prueba boolean)
language sql stable security definer set search_path = public as $$
  select s.id, g.nombre, g.slug, s.tipo_sesion, s.fecha_clase, s.cierra_en,
         (select string_agg(split_part(m.nombre, ' ', 1), ' y ' order by sm.principal desc, m.nombre)
          from cp_sesion_mentores sm join mentores m on m.id = sm.mentor_id
          where sm.sesion_id = s.id),
         s.es_prueba
  from cp_sesiones s join cp_grupos g on g.id = s.grupo_id
  where g.slug = p_slug and g.activo and s.estado = 'abierta' and s.cierra_en > now()
    and (p_incluir_prueba or not s.es_prueba)
  order by s.abierta_en desc
$$;

revoke all on function cp_es_mi_sesion(uuid), cp_semana_ab(date),
  cp_abrir_sesion(uuid, cp_tipo_sesion, date, uuid[], text, uuid), cp_cerrar_sesion(uuid),
  cp_cerrar_vencidas(), cp_revisar_r6(timestamptz), cp_sesiones_abiertas(text, boolean)
  from public, anon, authenticated;
grant execute on function cp_es_mi_sesion(uuid), cp_semana_ab(date),
  cp_abrir_sesion(uuid, cp_tipo_sesion, date, uuid[], text, uuid), cp_cerrar_sesion(uuid)
  to authenticated;
grant execute on function cp_sesiones_abiertas(text, boolean) to anon, authenticated;

-- 4. Permisos y RLS ---------------------------------------------------------------
-- Escritura solo por las funciones de arriba.
revoke all on cp_sesiones, cp_sesion_mentores, cp_sesion_sales, cp_alertas from anon, authenticated;
grant select on cp_sesiones, cp_sesion_mentores, cp_alertas to authenticated;

alter table cp_sesiones enable row level security;
alter table cp_sesion_mentores enable row level security;
alter table cp_sesion_sales enable row level security;
alter table cp_alertas enable row level security;

drop policy if exists "cp_sesiones: propias o coach" on cp_sesiones;
create policy "cp_sesiones: propias o coach" on cp_sesiones for select to authenticated
  using (cp_es_coach() or cp_es_mi_sesion(id));

drop policy if exists "cp_sesion_mentores: propias o coach" on cp_sesion_mentores;
create policy "cp_sesion_mentores: propias o coach" on cp_sesion_mentores for select to authenticated
  using (cp_es_coach() or cp_es_mi_sesion(sesion_id));

-- R7 (desempeño de un mentor) es solo para el super admin.
drop policy if exists "cp_alertas: coach lee" on cp_alertas;
create policy "cp_alertas: coach lee" on cp_alertas for select to authenticated
  using (cp_es_coach() and (regla <> 'R7' or cp_es_super_admin()));

-- 5. pg_cron (solo si la extensión existe; en local no está) ------------------------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('cp_cerrar_sesiones', '*/5 * * * *', 'select public.cp_cerrar_vencidas()');
    perform cron.schedule('cp_revisar_r6', '*/15 * * * *', 'select public.cp_revisar_r6()');
  end if;
end $$;

-- Verificación:
--   select jobname, schedule from cron.job where jobname like 'cp_%';
--   select count(*) from cp_sesiones;
