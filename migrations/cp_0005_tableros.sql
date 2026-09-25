-- cp_0005 · Fase 5: tableros.
--
-- * cp_referencia_academia: CSAT medio semanal de la academia por tipo de sesión, solo
--   agregado (sin mentores ni sesiones). Es la línea de referencia del tablero del mentor.
-- * cp_aprobaciones: tasa de aprobación por Rango (carga manual o CSV en la v1), para la
--   vista de programa del super admin.
--
-- Idempotente. Reversión: cp_0005_down.sql.

create or replace function cp_referencia_academia(p_desde date, p_prueba boolean default false)
returns table (tipo_sesion cp_tipo_sesion, semana date, csat numeric, n bigint)
language sql stable security definer set search_path = public as $$
  select r.tipo_sesion,
         (r.fecha_clase - ((extract(isodow from r.fecha_clase)::int - 1)))::date as semana,
         round(avg(r.csat), 2), count(*)
  from cp_respuestas r
  where cp_tiene_acceso() and r.encuesta = 'clase' and r.csat is not null
    and r.fecha_clase >= p_desde and r.es_prueba = p_prueba
  group by 1, 2
$$;
revoke all on function cp_referencia_academia(date, boolean) from public, anon;
grant execute on function cp_referencia_academia(date, boolean) to authenticated;

create table if not exists cp_aprobaciones (
  id uuid primary key default gen_random_uuid(),
  nivel smallint not null check (nivel between 0 and 6),
  rango text not null check (char_length(rango) between 1 and 80),
  -- Primer día del mes al que corresponde el dato.
  periodo date not null check (extract(day from periodo) = 1),
  presentados integer not null check (presentados >= 0),
  aprobados integer not null check (aprobados between 0 and presentados),
  es_prueba boolean not null default false,
  actualizado_en timestamptz not null default now(),
  unique (nivel, rango, periodo, es_prueba)
);

revoke all on cp_aprobaciones from anon, authenticated;
grant select, insert, update, delete on cp_aprobaciones to authenticated;
alter table cp_aprobaciones enable row level security;

drop policy if exists "cp_aprobaciones: coach lee" on cp_aprobaciones;
create policy "cp_aprobaciones: coach lee" on cp_aprobaciones for select to authenticated
  using (cp_es_coach());
drop policy if exists "cp_aprobaciones: super admin escribe" on cp_aprobaciones;
create policy "cp_aprobaciones: super admin escribe" on cp_aprobaciones for all to authenticated
  using (cp_es_super_admin()) with check (cp_es_super_admin());
