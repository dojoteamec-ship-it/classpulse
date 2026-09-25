-- Fase 3 · Respuestas, identidad, contacto y deduplicación, por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  m1 uuid; m2 uuid; coach uuid; g_am uuid; g_na uuid;
  u_m1 text; u_m2 text; u_coach text;
  s1 uuid; s2 uuid; r_anon uuid; r_nombre uuid; r_contacto uuid; r_falta uuid; n int;
  hoy date := (now() at time zone 'America/Guayaquil')::date;
  base jsonb := '{"canal_entrada":"personal","asistencia":"en_vivo","csat":5,
                  "distintiva_codigo":"lo_principal","distintiva_banda":"amarilla",
                  "chips":["explico_claro","buen_ritmo"],"texto_mantener":"Los ejemplos",
                  "segundos_para_responder":42}';
begin
  -- Independiente de las pruebas E2E: cierra las sesiones de prueba abiertas (se deshace al final).
  update cp_sesiones set estado = 'cerrada', cerrada_en = now() where es_prueba and estado = 'abierta';
  select id into m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select id into m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';
  select id into coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select id into g_am from cp_grupos where slug = 'amarillo';
  select id into g_na from cp_grupos where slug = 'naranja';
  select auth_user_id::text into u_m1 from mentores where id = m1;
  select auth_user_id::text into u_m2 from mentores where id = m2;
  select auth_user_id::text into u_coach from mentores where id = coach;

  -- Sesiones de mentor1 (Amarillo) y mentor2 (Naranja).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  s1 := cp_abrir_sesion(g_am, 'kata', hoy);
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m2, true);
  s2 := cp_abrir_sesion(g_na, 'mondo', hoy);
  reset role;

  -- Nadie más que la service role registra respuestas.
  set local role anon;
  begin perform cp_registrar_respuesta(s1, 'f:aaaaaaaaaaaa', base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: anon registra directo';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_respuestas; raise exception 'FALLA: anon lee respuestas';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  begin perform cp_registrar_respuesta(s1, 'f:aaaaaaaaaaaa', base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: mentor registra directo';
  exception when insufficient_privilege then null; end;
  reset role;

  set local role service_role;
  -- Anónima por enlace personal: no guarda identidad.
  r_anon := cp_registrar_respuesta(s1, 'c:xZB5m9rMiJ4dz7Ekusib', base || '{"modo_identidad":"anonimo"}');
  -- El mismo contacto no responde dos veces la misma sesión.
  begin perform cp_registrar_respuesta(s1, 'c:xZB5m9rMiJ4dz7Ekusib', base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: duplicada por contacto';
  exception when raise_exception then
    if sqlerrm not like 'Ya respondiste%' then raise; end if;
  end;
  -- Con nombre por enlace general.
  r_nombre := cp_registrar_respuesta(s1, 'f:11111111-2222-3333-4444-555555555555',
    base || '{"modo_identidad":"nombre","canal_entrada":"general","csat":2,"chips":["poco_claro"]}',
    '{"nombre":"Alumno Prueba","email":"alumno.prueba@example.com"}');
  -- Con pedido de contacto; no asistió.
  r_contacto := cp_registrar_respuesta(s1, 'c:PruebaContacto0000001',
    '{"canal_entrada":"personal","asistencia":"no_asistio","motivo_inasistencia":"horario","modo_identidad":"contacto"}',
    '{"nombre":"Otro Alumno","ghl_contact_id":"PruebaContacto0000001","nivel":1}',
    '{"motivo":"pagos_accesos","canal_preferido":"whatsapp","mensaje":"No puedo entrar"}');
  -- Con nombre, pero sin nombre: falla y no deja rastro.
  begin perform cp_registrar_respuesta(s1, 'f:99999999-2222-3333-4444-555555555555',
      base || '{"modo_identidad":"nombre"}', '{"nombre":"  "}');
    raise exception 'FALLA: identidad vacía';
  exception when raise_exception then
    if sqlerrm <> 'Falta tu nombre.' then raise; end if;
  end;
  -- Reglas de la encuesta: sin csat cuando asistió → falla.
  begin perform cp_registrar_respuesta(s1, 'f:88888888-2222-3333-4444-555555555555',
      '{"canal_entrada":"general","asistencia":"en_vivo","modo_identidad":"anonimo"}');
    raise exception 'FALLA: respuesta sin csat';
  exception when check_violation then null; end;
  -- Sesión cerrada: no recibe respuestas.
  perform cp_registrar_respuesta(s2, 'f:77777777-2222-3333-4444-555555555555', base || '{"modo_identidad":"anonimo"}');
  reset role;
  update cp_sesiones set abierta_en = now() - interval '25 hours', cierra_en = now() - interval '1 hour' where id = s2;
  perform cp_cerrar_vencidas();
  set local role service_role;
  begin perform cp_registrar_respuesta(s2, 'f:66666666-2222-3333-4444-555555555555', base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: sesión cerrada recibe respuestas';
  exception when raise_exception then
    if sqlerrm not like 'Esta clase ya no%' then raise; end if;
  end;
  reset role;

  -- En la base: anónima sin identidad; hash sin enlace a la respuesta; datos de la sesión.
  if exists (select 1 from cp_respondentes where respuesta_id = r_anon) then raise exception 'FALLA: anónima con identidad'; end if;
  if (select count(*) from cp_respondentes where respuesta_id in (r_nombre, r_contacto)) <> 2 then raise exception 'FALLA: falta identidad'; end if;
  if (select count(*) from cp_contactos where respuesta_id = r_contacto) <> 1 then raise exception 'FALLA: falta contacto'; end if;
  if (select count(*) from cp_respuestas where sesion_id = s1) <> 3 then raise exception 'FALLA: conteo de respuestas'; end if;
  if (select count(*) from cp_respuestas_dedupe where sesion_id = s1) <> 3 then raise exception 'FALLA: la fallida dejó hash'; end if;
  if exists (select 1 from cp_respuestas_dedupe where hash like '%xZB5%') then raise exception 'FALLA: hash legible'; end if;
  if (select tipo_sesion::text || nivel || fecha_clase from cp_respuestas where id = r_anon) <> 'kata1' || hoy then raise exception 'FALLA: datos de la sesión'; end if;
  if not (select es_prueba from cp_respuestas where id = r_anon) then raise exception 'FALLA: sin es_prueba'; end if;
  if (select horas_desde_apertura from cp_respuestas where id = r_anon) is null then raise exception 'FALLA: horas desde apertura'; end if;
  if exists (select 1 from cp_respuestas_dedupe where sesion_id = s2) and exists (select 1 from cp_sesion_sales where sesion_id = s2) then
    raise exception 'FALLA: la sal sobrevive';
  end if;

  -- Mentor1: lee sus respuestas, no la identidad ni el contacto ni los hashes.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_respuestas where sesion_id = s1) <> 3 then raise exception 'FALLA: mentor no ve sus respuestas'; end if;
  if (select count(*) from cp_respuestas where sesion_id = s2) <> 0 then raise exception 'FALLA: mentor ve respuestas ajenas'; end if;
  begin perform 1 from cp_respondentes; raise exception 'FALLA: mentor lee identidades';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_contactos; raise exception 'FALLA: mentor lee contactos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_respuestas_dedupe; raise exception 'FALLA: mentor lee hashes';
  exception when insufficient_privilege then null; end;
  if (select respuestas from cp_conteo_respuestas(array[s1, s2]) where sesion_id = s1) <> 3 then raise exception 'FALLA: conteo propio'; end if;
  if exists (select 1 from cp_conteo_respuestas(array[s2])) then raise exception 'FALLA: conteo ajeno'; end if;
  reset role;

  -- Coach: todas las respuestas; identidades solo por funciones auditadas (Fase 6).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_respuestas where sesion_id in (s1, s2)) <> 4 then raise exception 'FALLA: coach no ve todas'; end if;
  begin perform 1 from cp_respondentes; raise exception 'FALLA: coach lee identidades sin auditoría';
  exception when insufficient_privilege then null; end;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
