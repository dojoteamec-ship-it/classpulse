-- cp_0007 · Fase 7: ciclo Kaizen (PDCA) y «Dijiste, hicimos».
--
-- * cp_acciones: problema (con enlace a los datos), 5 porqués, acción, responsable, fecha
--   compromiso, estado PDCA y casilla para publicar en «Dijiste, hicimos».
-- * Métrica antes y después calculada por la app (cp_medir): misma métrica y mismo alcance,
--   N días antes y N días después de la fecha de inicio. Se congela al pasar a Verificar o
--   Estandarizar.
-- * Alcance: el coach y el super admin gestionan todas; un mentor lee las suyas.
--
-- Idempotente. Reversión: cp_0007_down.sql.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'cp_estado_pdca') then
    create type cp_estado_pdca as enum ('planificar', 'hacer', 'verificar', 'estandarizar', 'descartar');
  end if;
end $$;

create table if not exists cp_acciones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid references cp_grupos (id) on delete set null,
  mentor_id uuid references mentores (id) on delete set null,
  tipo_sesion cp_tipo_sesion,
  problema text not null check (char_length(problema) between 3 and 1000),
  enlace_datos text check (char_length(enlace_datos) <= 500),
  porques jsonb not null default '[]' check (jsonb_typeof(porques) = 'array' and jsonb_array_length(porques) <= 5),
  accion text not null check (char_length(accion) between 3 and 1000),
  responsable text check (char_length(responsable) <= 120),
  fecha_compromiso date,
  estado cp_estado_pdca not null default 'planificar',
  -- Métrica que mide el efecto (plan 6): csat_medio, top2, bottom2, distintiva_roja o nps.
  metrica text not null default 'csat_medio' check (metrica in ('csat_medio', 'top2', 'bottom2', 'distintiva_roja', 'nps')),
  fecha_inicio date not null default ((now() at time zone 'America/Guayaquil')::date),
  ventana_dias smallint not null default 30 check (ventana_dias between 7 and 180),
  metrica_antes jsonb,
  metrica_despues jsonb,
  publicar boolean not null default false,
  alerta_id uuid references cp_alertas (id) on delete set null,
  creada_por uuid references mentores (id) on delete set null,
  es_prueba boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists cp_acciones_estado_idx on cp_acciones (estado, actualizado_en desc);
create index if not exists cp_acciones_mentor_idx on cp_acciones (mentor_id);

-- Mide una métrica en un alcance y rango. Solo agregados (valor y n).
create or replace function cp_medir(
  p_metrica text, p_grupo uuid, p_mentor uuid, p_tipo cp_tipo_sesion,
  p_desde date, p_hasta date, p_prueba boolean
) returns jsonb
language sql stable security definer set search_path = public as $$
  with r as (
    select r.* from cp_respuestas r
    where cp_tiene_acceso()
      and r.es_prueba = p_prueba
      and r.encuesta = case when p_metrica = 'nps' then 'cinturon'::cp_encuesta else 'clase'::cp_encuesta end
      and coalesce(r.fecha_clase, (r.creado_en at time zone 'America/Guayaquil')::date) between p_desde and p_hasta
      and (p_grupo is null or r.grupo_id = p_grupo)
      and (p_tipo is null or r.tipo_sesion = p_tipo)
      and (p_mentor is null or exists (select 1 from cp_sesion_mentores sm where sm.sesion_id = r.sesion_id and sm.mentor_id = p_mentor))
  )
  select case p_metrica
    when 'csat_medio' then jsonb_build_object('valor', round(avg(csat), 2), 'n', count(csat))
    when 'top2' then jsonb_build_object('valor', round(avg((csat >= 4)::int), 3), 'n', count(csat))
    when 'bottom2' then jsonb_build_object('valor', round(avg((csat <= 2)::int), 3), 'n', count(csat))
    when 'distintiva_roja' then jsonb_build_object(
      'valor', round(avg((distintiva_banda = 'roja')::int) filter (where distintiva_banda in ('roja', 'amarilla', 'verde')), 3),
      'n', count(*) filter (where distintiva_banda in ('roja', 'amarilla', 'verde')))
    when 'nps' then jsonb_build_object(
      'valor', round(100.0 * (count(*) filter (where nps >= 9) - count(*) filter (where nps <= 6)) / nullif(count(nps), 0)),
      'n', count(nps))
  end || jsonb_build_object('desde', p_desde, 'hasta', p_hasta)
  from r
$$;

-- Antes y después de una acción (en vivo o congelados).
create or replace function cp_medir_accion(p_id uuid)
returns table (antes jsonb, despues jsonb)
language sql stable security definer set search_path = public as $$
  select coalesce(a.metrica_antes, cp_medir(a.metrica, a.grupo_id, a.mentor_id, a.tipo_sesion,
                                            a.fecha_inicio - a.ventana_dias, a.fecha_inicio - 1, a.es_prueba)),
         coalesce(a.metrica_despues, cp_medir(a.metrica, a.grupo_id, a.mentor_id, a.tipo_sesion,
                                              a.fecha_inicio, least(a.fecha_inicio + a.ventana_dias - 1,
                                              (now() at time zone 'America/Guayaquil')::date), a.es_prueba))
  from cp_acciones a
  where a.id = p_id and (cp_es_coach() or (a.mentor_id = cp_mi_mentor_id() and cp_tiene_acceso()))
$$;

-- Al pasar a Verificar o Estandarizar se congelan las métricas; al volver atrás, se liberan.
create or replace function cp_acciones_antes_de_guardar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.actualizado_en := now();
  if new.estado in ('verificar', 'estandarizar') and (tg_op = 'INSERT' or old.estado not in ('verificar', 'estandarizar') or new.metrica_antes is null) then
    new.metrica_antes := cp_medir(new.metrica, new.grupo_id, new.mentor_id, new.tipo_sesion,
                                  new.fecha_inicio - new.ventana_dias, new.fecha_inicio - 1, new.es_prueba);
    new.metrica_despues := cp_medir(new.metrica, new.grupo_id, new.mentor_id, new.tipo_sesion,
                                    new.fecha_inicio, least(new.fecha_inicio + new.ventana_dias - 1,
                                    (now() at time zone 'America/Guayaquil')::date), new.es_prueba);
  elsif new.estado in ('planificar', 'hacer') then
    new.metrica_antes := null;
    new.metrica_despues := null;
  end if;
  return new;
end $$;

drop trigger if exists cp_acciones_guardar on cp_acciones;
create trigger cp_acciones_guardar before insert or update on cp_acciones
  for each row execute function cp_acciones_antes_de_guardar();

revoke all on function cp_medir(text, uuid, uuid, cp_tipo_sesion, date, date, boolean),
  cp_medir_accion(uuid), cp_acciones_antes_de_guardar() from public, anon, authenticated;
grant execute on function cp_medir(text, uuid, uuid, cp_tipo_sesion, date, date, boolean), cp_medir_accion(uuid) to authenticated;

revoke all on cp_acciones from anon, authenticated;
grant select, insert, update, delete on cp_acciones to authenticated;
alter table cp_acciones enable row level security;

drop policy if exists "cp_acciones: propias o coach" on cp_acciones;
create policy "cp_acciones: propias o coach" on cp_acciones for select to authenticated
  using (cp_es_coach() or (mentor_id = cp_mi_mentor_id() and cp_tiene_acceso()));
drop policy if exists "cp_acciones: coach crea" on cp_acciones;
create policy "cp_acciones: coach crea" on cp_acciones for insert to authenticated
  with check (cp_es_coach());
drop policy if exists "cp_acciones: coach edita" on cp_acciones;
create policy "cp_acciones: coach edita" on cp_acciones for update to authenticated
  using (cp_es_coach()) with check (cp_es_coach());
drop policy if exists "cp_acciones: super admin borra" on cp_acciones;
create policy "cp_acciones: super admin borra" on cp_acciones for delete to authenticated
  using (cp_es_super_admin());
