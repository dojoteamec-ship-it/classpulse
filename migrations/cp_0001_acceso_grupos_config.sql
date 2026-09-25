-- cp_0001 · Fase 1: acceso, Grupos, horarios, configuración y auditoría.
--
-- Reglas de convivencia con ClassVote (plan, sección 7.2):
--   * Todo lo nuevo lleva el prefijo cp_. No se modifica ningún objeto de ClassVote.
--   * ClassPulse solo LEE mentores, cinturones y auth.users.
--   * El rol en ClassPulse vive en cp_acceso y depende solo de cp_acceso.activo
--     (no de mentores.estado ni de mentores.rol).
--   * anon no tiene permiso directo sobre ninguna tabla cp_. Las páginas públicas
--     leen por funciones security definer que devuelven solo columnas seguras.
--
-- Idempotente: se puede correr más de una vez. Reversión: cp_0001_down.sql.

-- 1. Tipos ----------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'cp_rol') then
    create type cp_rol as enum ('mentor', 'coach', 'super_admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_grupo_tipo') then
    create type cp_grupo_tipo as enum ('cinturon', 'cliente');
  end if;
  if not exists (select 1 from pg_type where typname = 'cp_tipo_sesion') then
    create type cp_tipo_sesion as enum ('kata', 'mondo', 'randori', 'shinsa', 'practica_cliente');
  end if;
end $$;

-- 2. Tablas ---------------------------------------------------------------------
create table if not exists cp_acceso (
  mentor_id uuid primary key references mentores (id) on delete cascade,
  rol cp_rol not null default 'mentor',
  activo boolean not null default true,
  -- Cuentas de prueba: quedan fuera de tableros y directorios.
  es_prueba boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table if not exists cp_grupos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+(-[a-z0-9_]+)*$'),
  nombre text not null check (char_length(nombre) between 2 and 80),
  tipo cp_grupo_tipo not null,
  cinturon_id text references cinturones (id),
  nivel smallint check (nivel between 0 and 6),
  -- Grupos de clientes: tag de GHL que valida el enlace personal.
  tag_ghl text,
  orden smallint not null default 0,
  activo boolean not null default true,
  -- Interruptor de correo por Grupo (apagado por defecto).
  enviar_correo boolean not null default false,
  check ((tipo = 'cinturon') = (cinturon_id is not null and nivel is not null))
);

create table if not exists cp_mentor_grupos (
  mentor_id uuid not null references mentores (id) on delete cascade,
  grupo_id uuid not null references cp_grupos (id) on delete cascade,
  primary key (mentor_id, grupo_id)
);

-- Franjas fijas de clase (red de seguridad R6). semana: todas, A o B, con la
-- semana A de referencia en cp_config.semana_a_referencia.
create table if not exists cp_horarios (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references cp_grupos (id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_local time not null,
  semana text not null default 'todas' check (semana in ('todas', 'A', 'B')),
  tipo_sesion cp_tipo_sesion,
  activo boolean not null default true,
  unique (grupo_id, dia_semana, hora_local, semana)
);

create table if not exists cp_config (
  clave text primary key check (clave ~ '^[a-z0-9_]+$'),
  valor jsonb,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references mentores (id) on delete set null
);

create table if not exists cp_auditoria (
  id bigint generated always as identity primary key,
  usuario uuid references mentores (id) on delete set null,
  accion text not null,
  objeto text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);
create index if not exists cp_auditoria_creado_en_idx on cp_auditoria (creado_en desc);
create index if not exists cp_mentor_grupos_grupo_idx on cp_mentor_grupos (grupo_id);
create index if not exists cp_horarios_grupo_idx on cp_horarios (grupo_id);

-- 3. Funciones de permisos (concentran la lógica, como es_admin en ClassVote) ---
create or replace function cp_mi_mentor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from mentores where auth_user_id = auth.uid()
$$;

-- Rol activo del usuario en ClassPulse, o null si no tiene acceso.
create or replace function cp_mi_rol() returns cp_rol
language sql stable security definer set search_path = public as $$
  select a.rol from cp_acceso a
  join mentores m on m.id = a.mentor_id
  where m.auth_user_id = auth.uid() and a.activo
$$;

create or replace function cp_tiene_acceso() returns boolean
language sql stable security definer set search_path = public as $$
  select cp_mi_rol() is not null
$$;

-- Coach o super admin: ven identidades, alertas y todos los Grupos.
create or replace function cp_es_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(cp_mi_rol() in ('coach', 'super_admin'), false)
$$;

create or replace function cp_es_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(cp_mi_rol() = 'super_admin', false)
$$;

-- ¿Puede abrir sesiones en el Grupo? Coach y super admin en cualquiera; un
-- mentor activo solo en los Grupos asignados en cp_mentor_grupos.
create or replace function cp_puede_abrir(p_grupo_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select cp_es_coach() or exists (
    select 1 from cp_mentor_grupos mg
    where mg.grupo_id = p_grupo_id and mg.mentor_id = cp_mi_mentor_id() and cp_tiene_acceso()
  )
$$;

-- Directorio de personas con acceso: nombre para todos los roles (co-mentores,
-- tableros); correo y estado solo para el super admin. mentores tiene RLS de
-- ClassVote (solo la fila propia), por eso se expone con esta función.
create or replace function cp_directorio()
returns table (mentor_id uuid, nombre text, email text, rol cp_rol, activo boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.nombre,
         case when cp_es_super_admin() then m.email end,
         a.rol, a.activo
  from cp_acceso a join mentores m on m.id = a.mentor_id
  where cp_tiene_acceso() and (a.activo or cp_es_super_admin())
  order by m.nombre
$$;

-- Cuentas de ClassVote que el super admin puede habilitar en ClassPulse.
create or replace function cp_cuentas_classvote()
returns table (mentor_id uuid, nombre text, email text, estado_classvote text)
language sql stable security definer set search_path = public as $$
  select m.id, m.nombre, m.email, m.estado::text
  from mentores m
  where cp_es_super_admin()
  order by m.nombre
$$;

-- Registro de auditoría (quién vio o cambió qué). Solo coach y super admin.
create or replace function cp_auditar(p_accion text, p_objeto text, p_detalle jsonb default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not cp_es_coach() then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  insert into cp_auditoria (usuario, accion, objeto, detalle)
  values (cp_mi_mentor_id(), p_accion, p_objeto, p_detalle);
end $$;

revoke all on function cp_mi_mentor_id(), cp_mi_rol(), cp_tiene_acceso(), cp_es_coach(),
  cp_es_super_admin(), cp_puede_abrir(uuid), cp_directorio(), cp_cuentas_classvote(),
  cp_auditar(text, text, jsonb) from public, anon;
grant execute on function cp_mi_mentor_id(), cp_mi_rol(), cp_tiene_acceso(), cp_es_coach(),
  cp_es_super_admin(), cp_puede_abrir(uuid), cp_directorio(), cp_cuentas_classvote(),
  cp_auditar(text, text, jsonb) to authenticated;

-- 4. Permisos de tabla (anon: nada) --------------------------------------------
revoke all on cp_acceso, cp_grupos, cp_mentor_grupos, cp_horarios, cp_config, cp_auditoria
  from anon, authenticated;
grant select on cp_acceso, cp_grupos, cp_mentor_grupos, cp_horarios, cp_config, cp_auditoria
  to authenticated;
grant insert, update, delete on cp_acceso, cp_mentor_grupos, cp_horarios to authenticated;
grant update (nombre, activo, enviar_correo, tag_ghl, orden) on cp_grupos to authenticated;
grant insert, update on cp_config to authenticated;

alter table cp_acceso enable row level security;
alter table cp_grupos enable row level security;
alter table cp_mentor_grupos enable row level security;
alter table cp_horarios enable row level security;
alter table cp_config enable row level security;
alter table cp_auditoria enable row level security;

-- 5. Políticas ------------------------------------------------------------------
drop policy if exists "cp_acceso: propia o coach" on cp_acceso;
create policy "cp_acceso: propia o coach" on cp_acceso for select to authenticated
  using (mentor_id = cp_mi_mentor_id() or cp_es_coach());
-- El super admin no puede cambiarse a sí mismo, para no quedarse sin acceso.
drop policy if exists "cp_acceso: super admin inserta" on cp_acceso;
create policy "cp_acceso: super admin inserta" on cp_acceso for insert to authenticated
  with check (cp_es_super_admin() and mentor_id <> cp_mi_mentor_id());
drop policy if exists "cp_acceso: super admin actualiza" on cp_acceso;
create policy "cp_acceso: super admin actualiza" on cp_acceso for update to authenticated
  using (cp_es_super_admin() and mentor_id <> cp_mi_mentor_id())
  with check (cp_es_super_admin() and mentor_id <> cp_mi_mentor_id());
drop policy if exists "cp_acceso: super admin borra" on cp_acceso;
create policy "cp_acceso: super admin borra" on cp_acceso for delete to authenticated
  using (cp_es_super_admin() and mentor_id <> cp_mi_mentor_id());

drop policy if exists "cp_grupos: con acceso" on cp_grupos;
create policy "cp_grupos: con acceso" on cp_grupos for select to authenticated
  using (cp_tiene_acceso());
drop policy if exists "cp_grupos: super admin actualiza" on cp_grupos;
create policy "cp_grupos: super admin actualiza" on cp_grupos for update to authenticated
  using (cp_es_super_admin()) with check (cp_es_super_admin());

drop policy if exists "cp_mentor_grupos: propias o coach" on cp_mentor_grupos;
create policy "cp_mentor_grupos: propias o coach" on cp_mentor_grupos for select to authenticated
  using ((mentor_id = cp_mi_mentor_id() and cp_tiene_acceso()) or cp_es_coach());
drop policy if exists "cp_mentor_grupos: super admin asigna" on cp_mentor_grupos;
create policy "cp_mentor_grupos: super admin asigna" on cp_mentor_grupos for insert to authenticated
  with check (cp_es_super_admin());
drop policy if exists "cp_mentor_grupos: super admin quita" on cp_mentor_grupos;
create policy "cp_mentor_grupos: super admin quita" on cp_mentor_grupos for delete to authenticated
  using (cp_es_super_admin());

drop policy if exists "cp_horarios: con acceso" on cp_horarios;
create policy "cp_horarios: con acceso" on cp_horarios for select to authenticated
  using (cp_tiene_acceso());
drop policy if exists "cp_horarios: super admin gestiona" on cp_horarios;
create policy "cp_horarios: super admin gestiona" on cp_horarios for all to authenticated
  using (cp_es_super_admin()) with check (cp_es_super_admin());

drop policy if exists "cp_config: coach lee" on cp_config;
create policy "cp_config: coach lee" on cp_config for select to authenticated
  using (cp_es_coach());
drop policy if exists "cp_config: super admin inserta" on cp_config;
create policy "cp_config: super admin inserta" on cp_config for insert to authenticated
  with check (cp_es_super_admin());
drop policy if exists "cp_config: super admin actualiza" on cp_config;
create policy "cp_config: super admin actualiza" on cp_config for update to authenticated
  using (cp_es_super_admin()) with check (cp_es_super_admin());

drop policy if exists "cp_auditoria: super admin lee" on cp_auditoria;
create policy "cp_auditoria: super admin lee" on cp_auditoria for select to authenticated
  using (cp_es_super_admin());

-- 6. Datos iniciales -----------------------------------------------------------
-- 9 Grupos: los 7 Cinturones (Blanco incluido) y los 2 Grupos de clientes.
-- Los nombres no llevan raya porque los ve el alumno.
insert into cp_grupos (slug, nombre, tipo, cinturon_id, nivel, tag_ghl, orden) values
  ('blanco',   'Cinturón Blanco · Nivel 0',   'cinturon', 'nivel_0', 0, null, 0),
  ('amarillo', 'Cinturón Amarillo · Nivel 1', 'cinturon', 'nivel_1', 1, null, 1),
  ('naranja',  'Cinturón Naranja · Nivel 2',  'cinturon', 'nivel_2', 2, null, 2),
  ('verde',    'Cinturón Verde · Nivel 3',    'cinturon', 'nivel_3', 3, null, 3),
  ('azul',     'Cinturón Azul · Nivel 4',     'cinturon', 'nivel_4', 4, null, 4),
  ('marron',   'Cinturón Marrón · Nivel 5',   'cinturon', 'nivel_5', 5, null, 5),
  ('negro',    'Cinturón Negro · Nivel 6',    'cinturon', 'nivel_6', 6, null, 6),
  ('comunidad-ronin',   'Comunidad Ronin',   'cliente', null, null, 'practica_oyente_dojo', 7),
  ('comunidad-anahata', 'Comunidad Anahata', 'cliente', null, null, 'practica_oyente_anahata', 8)
on conflict (slug) do nothing;

-- Cronograma del Informe de Clases en Vivo v2 (sección 4). Hora de Ecuador.
-- 0 = domingo … 6 = sábado. Blanco y los Grupos de clientes no tienen franja fija.
insert into cp_horarios (grupo_id, dia_semana, hora_local, semana, tipo_sesion)
select g.id, h.dia, h.hora::time, h.semana, h.tipo::cp_tipo_sesion
from (values
  ('naranja',  0, '18:00', 'todas', null),
  ('negro',    0, '19:00', 'todas', null),
  ('verde',    1, '18:00', 'todas', null),
  ('azul',     1, '19:00', 'todas', 'randori'),
  ('amarillo', 2, '18:00', 'todas', null),
  ('marron',   2, '19:00', 'todas', null),
  ('naranja',  3, '18:00', 'todas', null),
  ('azul',     3, '19:00', 'todas', 'mondo'),
  ('verde',    4, '18:00', 'A',     null),
  ('negro',    4, '18:00', 'B',     'shinsa'),
  ('amarillo', 4, '19:00', 'todas', null)
) as h (slug, dia, hora, semana, tipo)
join cp_grupos g on g.slug = h.slug
on conflict (grupo_id, dia_semana, hora_local, semana) do nothing;

-- Configuración editable desde /admin. Las metas son la propuesta de la
-- sección 4.1 del plan (Santi confirma).
insert into cp_config (clave, valor) values
  ('semana_a_referencia', '"2026-09-28"'),
  -- Clave del campo personalizado de GHL con el nivel del alumno. Hoy no existe
  -- en GHL (verificado por API); mientras sea null, el enlace personal acepta
  -- al contacto como identificado y lo deja elegir entre las sesiones abiertas.
  ('ghl_campo_nivel', 'null'),
  -- Contacto de GHL que recibe el resumen diario (Mike).
  ('ghl_contacto_resumen', 'null'),
  ('horario_habil', '{"dias": [1, 2, 3, 4, 5], "inicio": "09:00", "fin": "18:00", "zona": "America/Guayaquil"}'),
  ('sla_horas', '{"R1": 24, "R2": 24, "R3": 48, "R4": 24, "R5": 24, "R8": 48}'),
  ('palabras_clave', '["reembolso", "devolución", "cancelar", "estafa", "abandonar", "no entiendo nada", "no puedo entrar"]'),
  ('muestra_minima', '15'),
  ('r7', '{"csat_minimo": 3.8, "n_minimo": 15, "dias": 30}'),
  ('correo_intervalo_horas', '48'),
  ('retencion_identidad_meses', '24'),
  ('metas', '{"csat_medio": 4.3, "top2": 0.8, "bottom2": 0.05, "distintiva_roja": 0.15, "nps": null, "nes_top2": 0.7, "ces": 5.5, "tasa_respuesta": 0.4, "sla_cumplimiento": 0.9}')
on conflict (clave) do nothing;

-- Accesos iniciales (las cuentas ya existen en ClassVote).
insert into cp_acceso (mentor_id, rol)
select id, 'super_admin' from mentores where email = 'santiago.jimenez.ec@gmail.com'
on conflict (mentor_id) do nothing;
insert into cp_acceso (mentor_id, rol)
select id, 'coach' from mentores where email = 'dojo.team.ec@gmail.com'
on conflict (mentor_id) do nothing;

-- Santi da el Randori de Azul (lunes 19:00): asignado a Azul.
insert into cp_mentor_grupos (mentor_id, grupo_id)
select m.id, g.id from mentores m, cp_grupos g
where m.email = 'santiago.jimenez.ec@gmail.com' and g.slug = 'azul'
on conflict do nothing;

-- Verificación:
--   select slug, nombre, activo, enviar_correo from cp_grupos order by orden;
--   select m.email, a.rol, a.activo from cp_acceso a join mentores m on m.id = a.mentor_id;
