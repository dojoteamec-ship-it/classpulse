-- cp_0006 · Fase 6: alertas R1 a R7, SLA en horas hábiles y bandeja de Mike.
--
-- * Las reglas R1 a R5 se evalúan en la misma transacción que guarda la respuesta
--   (cp_evaluar_alertas). R6 ya existe (cp_0002). R7 corre una vez al día.
-- * El SLA se calcula en horas hábiles (cp_config.horario_habil, hora de Ecuador).
-- * El coach nunca lee cp_respondentes directo: cp_ver_identidad y cp_historial_alumno
--   devuelven la identidad y dejan registro en cp_auditoria.
-- * Ninguna alerta genera acciones automáticas sobre el alumno (LOPDP, art. 20): solo avisa.
--
-- Idempotente. Reversión: cp_0006_down.sql.

-- 1. Columnas nuevas de cp_alertas -------------------------------------------------
alter table cp_alertas add column if not exists respuesta_id uuid references cp_respuestas (id) on delete cascade;
-- false cuando la respuesta es anónima: Mike ve el texto, pero no a quién contactar.
alter table cp_alertas add column if not exists contacto_posible boolean not null default false;
alter table cp_alertas add column if not exists notas jsonb not null default '[]';
alter table cp_alertas add column if not exists actualizado_en timestamptz not null default now();
create unique index if not exists cp_alertas_respuesta_regla_idx on cp_alertas (respuesta_id, regla) where respuesta_id is not null;

-- 2. Horas hábiles ---------------------------------------------------------------------
-- Suma p_horas hábiles a p_desde según cp_config.horario_habil
-- ({"dias":[1..5], "inicio":"09:00", "fin":"18:00", "zona":"America/Guayaquil"}).
create or replace function cp_sumar_horas_habiles(p_desde timestamptz, p_horas numeric)
returns timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  h jsonb := coalesce((select valor from cp_config where clave = 'horario_habil'),
                      '{"dias":[1,2,3,4,5],"inicio":"09:00","fin":"18:00","zona":"America/Guayaquil"}');
  v_zona text := coalesce(h ->> 'zona', 'America/Guayaquil');
  v_inicio time := (h ->> 'inicio')::time;
  v_fin time := (h ->> 'fin')::time;
  v_local timestamp := p_desde at time zone v_zona;
  v_resto interval := make_interval(secs => p_horas * 3600);
  v_dia date := v_local::date;
  v_desde timestamp;
  v_hasta timestamp;
begin
  if p_horas is null or p_horas <= 0 then return p_desde; end if;
  for i in 0..400 loop
    if (h -> 'dias') @> to_jsonb(extract(isodow from v_dia)::int) then
      v_desde := greatest(v_local, v_dia + v_inicio);
      v_hasta := v_dia + v_fin;
      if v_desde < v_hasta then
        if v_desde + v_resto <= v_hasta then
          return (v_desde + v_resto) at time zone v_zona;
        end if;
        v_resto := v_resto - (v_hasta - v_desde);
      end if;
    end if;
    v_dia := v_dia + 1;
    v_local := v_dia::timestamp;
  end loop;
  return p_desde + make_interval(secs => p_horas * 3600);
end $$;

-- Texto normalizado para buscar palabras clave (minúsculas y sin tildes).
create or replace function cp_normalizar(p text) returns text
language sql immutable as $$
  select translate(lower(coalesce(p, '')), 'áéíóúüñ', 'aeiouun')
$$;

-- 3. Evaluación de R1 a R5 para una respuesta ----------------------------------------
create or replace function cp_evaluar_alertas(p_respuesta_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  r cp_respuestas;
  v_ident cp_respondentes;
  v_sla jsonb := coalesce((select valor from cp_config where clave = 'sla_horas'), '{}');
  v_claves jsonb := coalesce((select valor from cp_config where clave = 'palabras_clave'), '[]');
  v_texto text;
  v_palabra text;
  v_anterior cp_respuestas;
  v_n integer := 0;
  v_contexto text;
begin
  select * into r from cp_respuestas where id = p_respuesta_id;
  if r.id is null then return 0; end if;
  select * into v_ident from cp_respondentes where respuesta_id = r.id;
  v_contexto := case r.encuesta when 'clase' then 'clase' when 'cinturon' then 'encuesta de Cinturón' else 'buzón' end;

  -- R1: pidió contacto.
  if exists (select 1 from cp_contactos where respuesta_id = r.id) then
    insert into cp_alertas (regla, gravedad, respuesta_id, grupo_id, sesion_id, fecha_clase, resumen, vence_en, contacto_posible, es_prueba)
    values ('R1', 'alta', r.id, r.grupo_id, r.sesion_id, r.fecha_clase, 'Pidió que Mike lo contacte (' || v_contexto || ').',
            cp_sumar_horas_habiles(now(), coalesce((v_sla ->> 'R1')::numeric, 24)), true, r.es_prueba)
    on conflict (respuesta_id, regla) where respuesta_id is not null do nothing;
    v_n := v_n + 1;
  end if;

  -- R2: csat 1 o 2 con identidad.
  if r.csat <= 2 and v_ident.respuesta_id is not null then
    insert into cp_alertas (regla, gravedad, respuesta_id, grupo_id, sesion_id, fecha_clase, resumen, vence_en, contacto_posible, es_prueba)
    values ('R2', 'media', r.id, r.grupo_id, r.sesion_id, r.fecha_clase, 'Calificó la clase con ' || r.csat || ' de 5.',
            cp_sumar_horas_habiles(now(), coalesce((v_sla ->> 'R2')::numeric, 24)), true, r.es_prueba)
    on conflict (respuesta_id, regla) where respuesta_id is not null do nothing;
    v_n := v_n + 1;
  end if;

  -- R3: detractor de NPS con identidad.
  if r.nps between 0 and 6 and v_ident.respuesta_id is not null then
    insert into cp_alertas (regla, gravedad, respuesta_id, grupo_id, resumen, vence_en, contacto_posible, es_prueba)
    values ('R3', 'media', r.id, r.grupo_id, 'NPS de ' || r.nps || ' al aprobar el Nivel ' || r.nivel || '.',
            cp_sumar_horas_habiles(now(), coalesce((v_sla ->> 'R3')::numeric, 48)), true, r.es_prueba)
    on conflict (respuesta_id, regla) where respuesta_id is not null do nothing;
    v_n := v_n + 1;
  end if;

  -- R4: palabras clave en cualquier texto. Anónima: aviso sin contacto y sin SLA.
  v_texto := cp_normalizar(concat_ws(' ', r.texto_mantener, r.texto_cambiar, r.texto_cambio_nivel, r.detalle ->> 'texto',
                                     (select mensaje from cp_contactos where respuesta_id = r.id)));
  for v_palabra in select jsonb_array_elements_text(v_claves) loop
    if v_texto like '%' || cp_normalizar(v_palabra) || '%' then
      insert into cp_alertas (regla, gravedad, respuesta_id, grupo_id, sesion_id, fecha_clase, resumen, vence_en, contacto_posible, es_prueba)
      values ('R4', 'alta', r.id, r.grupo_id, r.sesion_id, r.fecha_clase,
              'El texto menciona «' || v_palabra || '»' || case when v_ident.respuesta_id is null then ' (anónimo: sin posibilidad de contacto).' else '.' end,
              case when v_ident.respuesta_id is null then null else cp_sumar_horas_habiles(now(), coalesce((v_sla ->> 'R4')::numeric, 24)) end,
              v_ident.respuesta_id is not null, r.es_prueba)
      on conflict (respuesta_id, regla) where respuesta_id is not null do nothing;
      v_n := v_n + 1;
      exit;
    end if;
  end loop;

  -- R5: el mismo alumno identificado deja 2 respuestas de clase seguidas con rojo o csat <= 2.
  if r.encuesta = 'clase' and v_ident.respuesta_id is not null and (r.distintiva_banda = 'roja' or r.csat <= 2) then
    select a.* into v_anterior
    from cp_respuestas a join cp_respondentes x on x.respuesta_id = a.id
    where a.encuesta = 'clase' and a.id <> r.id and a.creado_en <= r.creado_en
      and ((v_ident.ghl_contact_id is not null and x.ghl_contact_id = v_ident.ghl_contact_id)
        or (v_ident.email is not null and lower(x.email) = lower(v_ident.email)))
    order by a.creado_en desc limit 1;
    if v_anterior.id is not null and (v_anterior.distintiva_banda = 'roja' or v_anterior.csat <= 2) then
      insert into cp_alertas (regla, gravedad, respuesta_id, grupo_id, sesion_id, fecha_clase, resumen, vence_en, contacto_posible, es_prueba)
      values ('R5', 'media', r.id, r.grupo_id, r.sesion_id, r.fecha_clase, 'Segunda respuesta seguida en rojo o con nota baja.',
              cp_sumar_horas_habiles(now(), coalesce((v_sla ->> 'R5')::numeric, 24)), true, r.es_prueba)
      on conflict (respuesta_id, regla) where respuesta_id is not null do nothing;
      v_n := v_n + 1;
    end if;
  end if;
  return v_n;
end $$;

-- Disparadores: la identidad y el contacto se guardan después de la respuesta, dentro de
-- la misma función de registro. Cada inserción vuelve a evaluar (sin duplicar) y solo ve
-- las respuestas anteriores del alumno, lo que mantiene correcta la regla R5.
create or replace function cp_tras_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform cp_evaluar_alertas(new.respuesta_id);
  return null;
end $$;

-- Una respuesta anónima se evalúa al insertarse; una identificada, al guardar su
-- identidad y su contacto (las reglas no se duplican gracias al índice único).
create or replace function cp_tras_respuesta_anonima() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.modo_identidad = 'anonimo' then perform cp_evaluar_alertas(new.id); end if;
  return null;
end $$;

drop trigger if exists cp_respuestas_alertas on cp_respuestas;
create trigger cp_respuestas_alertas after insert on cp_respuestas
  for each row execute function cp_tras_respuesta_anonima();
drop trigger if exists cp_respondentes_alertas on cp_respondentes;
create trigger cp_respondentes_alertas after insert on cp_respondentes
  for each row execute function cp_tras_respuesta();
drop trigger if exists cp_contactos_alertas on cp_contactos;
create trigger cp_contactos_alertas after insert on cp_contactos
  for each row execute function cp_tras_respuesta();

-- 4. R7 y recálculo del SLA (cron) ----------------------------------------------------
-- R7: mentor con CSAT de los últimos N días < mínimo y n >= n_mínimo. Solo super admin.
create or replace function cp_revisar_r7() returns integer
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := coalesce((select valor from cp_config where clave = 'r7'), '{"dias":30,"n_minimo":15,"csat_minimo":3.8}');
  n integer;
begin
  with m as (
    select sm.mentor_id, r.tipo_sesion, round(avg(r.csat), 2) as csat, count(*) as total, bool_or(r.es_prueba) as prueba
    from cp_respuestas r join cp_sesion_mentores sm on sm.sesion_id = r.sesion_id
    where r.encuesta = 'clase' and r.csat is not null
      and r.creado_en >= now() - make_interval(days => (c ->> 'dias')::int)
    group by sm.mentor_id, r.tipo_sesion, r.es_prueba
  ), nuevas as (
    insert into cp_alertas (regla, gravedad, mentor_id, resumen, clave_unica, es_prueba)
    select 'R7', 'kaizen', m.mentor_id,
           'CSAT de ' || m.csat || ' en ' || m.tipo_sesion || ' (últimos ' || (c ->> 'dias') || ' días, n = ' || m.total || '). Va a una acción PDCA.',
           'R7:' || m.mentor_id || ':' || m.tipo_sesion || ':' || to_char(now(), 'YYYY-MM') || ':' || m.prueba,
           m.prueba
    from m
    where m.total >= (c ->> 'n_minimo')::int and m.csat < (c ->> 'csat_minimo')::numeric
    on conflict (clave_unica) do nothing
    returning 1
  )
  select count(*) into n from nuevas;
  return n;
end $$;

-- Recalcula el vencimiento de las alertas abiertas sin primer contacto (por si cambió el
-- horario hábil o el SLA en /admin).
create or replace function cp_recalcular_sla() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_sla jsonb := coalesce((select valor from cp_config where clave = 'sla_horas'), '{}');
  n integer;
begin
  update cp_alertas a
  set vence_en = cp_sumar_horas_habiles(a.creado_en, (v_sla ->> a.regla)::numeric)
  where a.estado = 'nueva' and a.primer_contacto_en is null and a.vence_en is not null
    and v_sla ? a.regla
    and a.vence_en is distinct from cp_sumar_horas_habiles(a.creado_en, (v_sla ->> a.regla)::numeric);
  get diagnostics n = row_count;
  return n;
end $$;

-- 5. Bandeja, identidad auditada y seguimiento ---------------------------------------
-- Bandeja sin identidades. R7 solo para el super admin.
create or replace function cp_bandeja(p_prueba boolean default false)
returns table (
  id uuid, regla text, gravedad cp_gravedad, estado cp_alerta_estado, creado_en timestamptz,
  vence_en timestamptz, primer_contacto_en timestamptz, resuelta_en timestamptz, resumen text,
  contacto_posible boolean, respuesta_id uuid, encuesta cp_encuesta, grupo text, grupo_slug text,
  tipo_sesion cp_tipo_sesion, fecha_clase date, csat smallint, nps smallint, nivel smallint,
  texto_mantener text, texto_cambiar text, texto_cambio_nivel text, texto_buzon text,
  mentor text, notas jsonb, hora_local time
)
language sql stable security definer set search_path = public as $$
  select a.id, a.regla, a.gravedad, a.estado, a.creado_en, a.vence_en, a.primer_contacto_en,
         a.resuelta_en, a.resumen, a.contacto_posible, a.respuesta_id, r.encuesta, g.nombre, g.slug,
         coalesce(r.tipo_sesion, s.tipo_sesion), coalesce(r.fecha_clase, a.fecha_clase), r.csat, r.nps,
         coalesce(r.nivel, g.nivel), r.texto_mantener, r.texto_cambiar, r.texto_cambio_nivel,
         r.detalle ->> 'texto', m.nombre, a.notas, a.hora_local
  from cp_alertas a
  left join cp_respuestas r on r.id = a.respuesta_id
  left join cp_grupos g on g.id = a.grupo_id
  left join cp_sesiones s on s.id = a.sesion_id
  left join mentores m on m.id = a.mentor_id
  where cp_es_coach() and (a.regla <> 'R7' or cp_es_super_admin()) and a.es_prueba = p_prueba
  order by case a.estado when 'nueva' then 0 when 'en_contacto' then 1 else 2 end,
           case a.gravedad when 'alta' then 0 when 'media' then 1 when 'kaizen' then 2 else 3 end,
           a.vence_en nulls last, a.creado_en desc
$$;

-- Identidad y pedido de contacto de una respuesta. Deja auditoría.
create or replace function cp_ver_identidad(p_respuesta_id uuid)
returns table (nombre text, email text, telefono text, ghl_contact_id text, nivel smallint,
               motivo text, canal_preferido text, mensaje text)
language plpgsql security definer set search_path = public as $$
begin
  if not cp_es_coach() then raise exception 'sin permiso' using errcode = '42501'; end if;
  perform cp_auditar('ver_identidad', 'respuesta:' || p_respuesta_id);
  return query
    select x.nombre, x.email, x.telefono, x.ghl_contact_id, x.nivel, c.motivo, c.canal_preferido, c.mensaje
    from cp_respondentes x left join cp_contactos c on c.respuesta_id = x.respuesta_id
    where x.respuesta_id = p_respuesta_id;
end $$;

-- Historial de respuestas del mismo alumno identificado. Deja auditoría.
create or replace function cp_historial_alumno(p_respuesta_id uuid)
returns table (respuesta_id uuid, creado_en timestamptz, encuesta cp_encuesta, grupo text,
               tipo_sesion cp_tipo_sesion, csat smallint, nps smallint, banda cp_banda,
               texto text, alertas bigint)
language plpgsql security definer set search_path = public as $$
declare v cp_respondentes;
begin
  if not cp_es_coach() then raise exception 'sin permiso' using errcode = '42501'; end if;
  select * into v from cp_respondentes where cp_respondentes.respuesta_id = p_respuesta_id;
  if v.respuesta_id is null then return; end if;
  perform cp_auditar('ver_historial', 'respuesta:' || p_respuesta_id);
  return query
    select r.id, r.creado_en, r.encuesta, g.nombre, r.tipo_sesion, r.csat, r.nps, r.distintiva_banda,
           concat_ws(' · ', r.texto_mantener, r.texto_cambiar, r.texto_cambio_nivel, r.detalle ->> 'texto'),
           (select count(*) from cp_alertas a where a.respuesta_id = r.id)
    from cp_respuestas r join cp_respondentes x on x.respuesta_id = r.id
    left join cp_grupos g on g.id = r.grupo_id
    where (v.ghl_contact_id is not null and x.ghl_contact_id = v.ghl_contact_id)
       or (v.email is not null and lower(x.email) = lower(v.email))
    order by r.creado_en desc;
end $$;

-- Alumnos identificados con 2 o más alertas en 90 días (sin nombre: se ve con auditoría).
create or replace function cp_alumnos_en_riesgo(p_prueba boolean default false)
returns table (respuesta_id uuid, alertas bigint, ultima timestamptz, reglas text)
language sql stable security definer set search_path = public as $$
  with a as (
    select coalesce(x.ghl_contact_id, lower(x.email), x.respuesta_id::text) as alumno,
           al.respuesta_id, al.regla, al.creado_en
    from cp_alertas al join cp_respondentes x on x.respuesta_id = al.respuesta_id
    where al.creado_en >= now() - interval '90 days' and al.es_prueba = p_prueba
  )
  select (array_agg(respuesta_id order by creado_en desc))[1], count(*), max(creado_en),
         string_agg(distinct regla, ', ' order by regla)
  from a where cp_es_coach()
  group by alumno having count(*) >= 2
  order by 2 desc, 3 desc
$$;

-- Cambio de estado y notas de seguimiento. El primer paso a «en contacto» (o a resuelta)
-- fija primer_contacto_en, que mide el tiempo hasta el contacto.
create or replace function cp_actualizar_alerta(p_id uuid, p_estado cp_alerta_estado, p_nota text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  if not cp_es_coach() then raise exception 'sin permiso' using errcode = '42501'; end if;
  if not exists (select 1 from cp_alertas where id = p_id and (regla <> 'R7' or cp_es_super_admin())) then
    raise exception 'sin permiso' using errcode = '42501';
  end if;
  select nombre into v_nombre from mentores where id = cp_mi_mentor_id();
  update cp_alertas set
    estado = p_estado,
    primer_contacto_en = case when primer_contacto_en is null and p_estado in ('en_contacto', 'resuelta') and contacto_posible
                              then now() else primer_contacto_en end,
    resuelta_en = case when p_estado in ('resuelta', 'descartada') then coalesce(resuelta_en, now()) else null end,
    notas = case when nullif(btrim(p_nota), '') is null then notas
                 else notas || jsonb_build_array(jsonb_build_object('autor', v_nombre, 'texto', left(btrim(p_nota), 2000), 'en', now())) end,
    actualizado_en = now()
  where id = p_id;
  perform cp_auditar('actualizar_alerta', 'alerta:' || p_id, jsonb_build_object('estado', p_estado));
end $$;

-- Métricas del circuito interno: cumplimiento del SLA y tiempo hasta el contacto.
create or replace function cp_metricas_sla(p_desde timestamptz, p_prueba boolean default false)
returns table (con_sla bigint, en_plazo bigint, vencidas_abiertas bigint, mediana_horas numeric, p90_horas numeric)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where vence_en is not null and (primer_contacto_en is not null or vence_en < now())),
         count(*) filter (where vence_en is not null and primer_contacto_en is not null and primer_contacto_en <= vence_en),
         count(*) filter (where vence_en < now() and primer_contacto_en is null and estado in ('nueva', 'en_contacto')),
         round((percentile_cont(0.5) within group (order by extract(epoch from primer_contacto_en - creado_en) / 3600)
                filter (where primer_contacto_en is not null))::numeric, 1),
         round((percentile_cont(0.9) within group (order by extract(epoch from primer_contacto_en - creado_en) / 3600)
                filter (where primer_contacto_en is not null))::numeric, 1)
  from cp_alertas
  where cp_es_coach() and creado_en >= p_desde and es_prueba = p_prueba and regla <> 'R7'
$$;

-- 6. Permisos -----------------------------------------------------------------------
revoke all on function cp_sumar_horas_habiles(timestamptz, numeric), cp_evaluar_alertas(uuid),
  cp_tras_respuesta(), cp_tras_respuesta_anonima(), cp_revisar_r7(), cp_recalcular_sla(),
  cp_bandeja(boolean), cp_ver_identidad(uuid), cp_historial_alumno(uuid), cp_alumnos_en_riesgo(boolean),
  cp_actualizar_alerta(uuid, cp_alerta_estado, text), cp_metricas_sla(timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function cp_bandeja(boolean), cp_ver_identidad(uuid), cp_historial_alumno(uuid),
  cp_alumnos_en_riesgo(boolean), cp_actualizar_alerta(uuid, cp_alerta_estado, text),
  cp_metricas_sla(timestamptz, boolean), cp_sumar_horas_habiles(timestamptz, numeric) to authenticated;
grant execute on function cp_bandeja(boolean), cp_metricas_sla(timestamptz, boolean) to service_role;

-- 7. pg_cron ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('cp_recalcular_sla', '*/5 * * * *', 'select public.cp_recalcular_sla()');
    -- 06:00 de Ecuador (11:00 UTC).
    perform cron.schedule('cp_revisar_r7', '0 11 * * *', 'select public.cp_revisar_r7()');
  end if;
end $$;
