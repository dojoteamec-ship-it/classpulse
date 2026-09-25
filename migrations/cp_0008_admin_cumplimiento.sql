-- cp_0008 · Fase 8: buzón abierto, retención de 24 meses, borrado a pedido y auditoría.
--
-- * Buzón (/buzon): un texto libre y la elección de identidad. Pasa por las mismas reglas de
--   alerta (R1 y R4 por los triggers de cp_0006). Solo el coach lo lee.
-- * Retención (LOPDP): la identidad (cp_respondentes y cp_contactos) se borra sola a los
--   cp_config.retencion_identidad_meses (24). Las respuestas quedan anónimas.
-- * Borrado a pedido del alumno (plazo de 15 días): cp_borrar_alumno borra su identidad y deja
--   constancia en cp_solicitudes_borrado sin guardar el identificador.
-- * Todo queda en cp_auditoria.
--
-- Idempotente. Reversión: cp_0008_down.sql.

-- 1. Buzón -------------------------------------------------------------------------------
create or replace function cp_registrar_buzon(
  p_texto text,
  p_modo cp_modo_identidad,
  p_identidad jsonb default null,
  p_contacto jsonb default null,
  p_es_prueba boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(char_length(btrim(p_texto)), 0) < 3 or char_length(p_texto) > 2000 then
    raise exception 'Escribe tu mensaje (máximo 2000 caracteres).';
  end if;
  insert into cp_respuestas (encuesta, version_encuesta, canal_entrada, modo_identidad, detalle, es_prueba)
  values ('buzon', 1, 'general', p_modo, jsonb_build_object('texto', btrim(p_texto)), p_es_prueba)
  returning id into v_id;
  perform cp_guardar_identidad(v_id, p_modo, p_identidad, p_contacto);
  return v_id;
end $$;
revoke all on function cp_registrar_buzon(text, cp_modo_identidad, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function cp_registrar_buzon(text, cp_modo_identidad, jsonb, jsonb, boolean) to service_role;

-- 2. Retención de la identidad -----------------------------------------------------------
create or replace function cp_anonimizar_vencidas() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_meses integer := coalesce((select (valor #>> '{}')::integer from cp_config where clave = 'retencion_identidad_meses'), 24);
  n integer;
begin
  with viejas as (
    select id from cp_respuestas where creado_en < now() - make_interval(months => v_meses)
  ), c as (
    delete from cp_contactos where respuesta_id in (select id from viejas) returning 1
  ), x as (
    delete from cp_respondentes where respuesta_id in (select id from viejas) returning 1
  )
  select count(*) into n from x;
  if n > 0 then
    insert into cp_auditoria (usuario, accion, objeto, detalle)
    values (null, 'retencion_anonimizar', 'cp_respondentes', jsonb_build_object('registros', n, 'meses', v_meses));
  end if;
  return n;
end $$;
revoke all on function cp_anonimizar_vencidas() from public, anon, authenticated;

-- 3. Borrado a pedido del alumno -----------------------------------------------------------
create table if not exists cp_solicitudes_borrado (
  id uuid primary key default gen_random_uuid(),
  -- No se guarda el identificador del alumno: solo fechas y resultado.
  recibida_en date not null,
  vence_en date not null,
  completada_en timestamptz,
  registros integer not null default 0,
  atendida_por uuid references mentores (id) on delete set null,
  notas text check (char_length(notas) <= 500),
  es_prueba boolean not null default false
);

-- Borra la identidad de un alumno (por contact_id de GHL, correo o teléfono). Solo super admin.
create or replace function cp_borrar_alumno(p_identificador text, p_recibida date, p_notas text default null, p_es_prueba boolean default false)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v text := btrim(coalesce(p_identificador, ''));
  n integer;
begin
  if not cp_es_super_admin() then raise exception 'sin permiso' using errcode = '42501'; end if;
  if char_length(v) < 5 then raise exception 'Escribe el contact_id, el correo o el teléfono del alumno.'; end if;
  if p_recibida is null or p_recibida > (now() at time zone 'America/Guayaquil')::date then
    raise exception 'La fecha en que se recibió el pedido no es válida.';
  end if;
  with objetivo as (
    select respuesta_id from cp_respondentes
    where ghl_contact_id = v or lower(email) = lower(v)
       or (telefono is not null and regexp_replace(telefono, '\D', '', 'g') = regexp_replace(v, '\D', '', 'g') and char_length(regexp_replace(v, '\D', '', 'g')) >= 7)
  ), c as (
    delete from cp_contactos where respuesta_id in (select respuesta_id from objetivo) returning 1
  ), x as (
    delete from cp_respondentes where respuesta_id in (select respuesta_id from objetivo) returning 1
  )
  select count(*) into n from x;
  -- Sus alertas dejan de permitir contacto.
  update cp_alertas set contacto_posible = false
  where respuesta_id is not null and not exists (select 1 from cp_respondentes r where r.respuesta_id = cp_alertas.respuesta_id)
    and contacto_posible;
  insert into cp_solicitudes_borrado (recibida_en, vence_en, completada_en, registros, atendida_por, notas, es_prueba)
  values (p_recibida, p_recibida + 15, now(), n, cp_mi_mentor_id(), left(p_notas, 500), p_es_prueba);
  perform cp_auditar('borrado_a_pedido', 'cp_respondentes', jsonb_build_object('registros', n, 'recibida_en', p_recibida));
  return n;
end $$;
revoke all on function cp_borrar_alumno(text, date, text, boolean) from public, anon, authenticated;
grant execute on function cp_borrar_alumno(text, date, text, boolean) to authenticated;

revoke all on cp_solicitudes_borrado from anon, authenticated;
grant select on cp_solicitudes_borrado to authenticated;
alter table cp_solicitudes_borrado enable row level security;
drop policy if exists "cp_solicitudes_borrado: super admin lee" on cp_solicitudes_borrado;
create policy "cp_solicitudes_borrado: super admin lee" on cp_solicitudes_borrado for select to authenticated
  using (cp_es_super_admin());

-- 4. Checklist de la LOPDP (verificaciones en vivo) ------------------------------------------
create or replace function cp_estado_cumplimiento()
returns table (anonimas_con_identidad bigint, identidades_vencidas bigint, vistas_auditadas bigint,
               solicitudes_fuera_de_plazo bigint, cron_retencion boolean, meses_retencion integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_meses integer := coalesce((select (valor #>> '{}')::integer from cp_config where clave = 'retencion_identidad_meses'), 24);
  v_cron boolean := false;
begin
  if not cp_es_super_admin() then return; end if;
  -- cron.job solo existe con pg_cron (en producción); en local se informa false.
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select exists (select 1 from cron.job where jobname = 'cp_retencion' and active) into v_cron;
  end if;
  return query select
    (select count(*) from cp_respuestas r join cp_respondentes x on x.respuesta_id = r.id where r.modo_identidad = 'anonimo'),
    (select count(*) from cp_respondentes x join cp_respuestas r on r.id = x.respuesta_id
      where r.creado_en < now() - make_interval(months => v_meses)),
    (select count(*) from cp_auditoria where accion in ('ver_identidad', 'ver_historial')),
    (select count(*) from cp_solicitudes_borrado where completada_en is null and vence_en < (now() at time zone 'America/Guayaquil')::date),
    v_cron,
    v_meses;
end $$;
revoke all on function cp_estado_cumplimiento() from public, anon, authenticated;
grant execute on function cp_estado_cumplimiento() to authenticated;

-- 5. pg_cron: retención diaria a las 02:00 de Ecuador (07:00 UTC) -----------------------------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('cp_retencion', '0 7 * * *', 'select public.cp_anonimizar_vencidas()');
  end if;
end $$;
