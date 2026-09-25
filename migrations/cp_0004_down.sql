-- Reversión de cp_0004. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
-- Borra también las respuestas de Cinturón (sus columnas desaparecen).
delete from cp_respuestas where encuesta = 'cinturon';
drop table if exists cp_envios;
drop table if exists cp_cinturon_dedupe;
drop table if exists cp_secretos;
alter table cp_respuestas drop constraint if exists cp_respuestas_cinturon_completa;
alter table cp_respuestas drop column if exists nps;
alter table cp_respuestas drop column if exists nes;
alter table cp_respuestas drop column if exists aplicacion;
alter table cp_respuestas drop column if exists dificultad;
alter table cp_respuestas drop column if exists ces;
alter table cp_respuestas drop column if exists clientes_activos;
alter table cp_respuestas drop column if exists rango_top;
alter table cp_respuestas drop column if exists texto_cambio_nivel;
delete from cp_config where clave = 'rangos_por_nivel';

-- cp_registrar_respuesta vuelve a su versión de cp_0003 (sin cp_guardar_identidad).
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

drop function if exists cp_registrar_cinturon(text, smallint, jsonb, jsonb, jsonb, boolean);
drop function if exists cp_guardar_identidad(uuid, cp_modo_identidad, jsonb, jsonb);
