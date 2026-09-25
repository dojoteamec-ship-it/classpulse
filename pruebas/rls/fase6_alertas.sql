-- Fase 6 · Reglas R1 a R5 y R7, horas hábiles, bandeja, identidad auditada y seguimiento.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  u_m1 text; u_coach text; u_adm text; g_am uuid; g_na uuid; s1 uuid; s2 uuid;
  r_anon uuid; r_nombre uuid; r_contacto uuid; r_r5a uuid; r_r5b uuid; r_nps uuid; a uuid; n int;
  hoy date := (now() at time zone 'America/Guayaquil')::date;
  clase jsonb := '{"canal_entrada":"personal","asistencia":"en_vivo","distintiva_codigo":"me_perdi","distintiva_banda":"roja"}';
  audit_antes bigint;
begin
  update cp_sesiones set estado = 'cerrada', cerrada_en = now() where es_prueba and estado = 'abierta';
  select auth_user_id::text into u_m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select auth_user_id::text into u_coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select auth_user_id::text into u_adm from mentores where email = 'classpulse.prueba.admin@example.com';
  select id into g_am from cp_grupos where slug = 'amarillo';
  select id into g_na from cp_grupos where slug = 'naranja';

  -- Horas hábiles (lunes a viernes, 09:00 a 18:00, Ecuador).
  if cp_sumar_horas_habiles('2026-09-25 17:00-05', 24) <> '2026-09-30 14:00-05' then
    raise exception 'FALLA: 24 h hábiles desde viernes 17:00 = %', cp_sumar_horas_habiles('2026-09-25 17:00-05', 24);
  end if;
  if cp_sumar_horas_habiles('2026-09-26 10:00-05', 2) <> '2026-09-28 11:00-05' then raise exception 'FALLA: sábado'; end if;
  if cp_sumar_horas_habiles('2026-09-28 20:00-05', 48) <> '2026-10-06 12:00-05' then
    raise exception 'FALLA: 48 h hábiles = %', cp_sumar_horas_habiles('2026-09-28 20:00-05', 48);
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  s1 := cp_abrir_sesion(g_am, 'kata', hoy);
  s2 := cp_abrir_sesion(g_am, 'mondo', hoy);
  reset role;

  set local role service_role;
  -- Anónima con nota 1 y palabra clave con otra grafía → R4 sin contacto; sin R2.
  r_anon := cp_registrar_respuesta(s1, 'f:bbbbbbbb-0000-0000-0000-000000000001',
    clase || '{"csat":1,"modo_identidad":"anonimo","texto_cambiar":"Quiero la DEVOLUCION de mi dinero"}');
  -- Con nombre y nota 2 → R2 (y es la primera en rojo del alumno R5).
  r_r5a := cp_registrar_respuesta(s1, 'c:AlumnoR5prueba000001', clase || '{"csat":2,"modo_identidad":"nombre"}',
    '{"nombre":"Alumno R5","ghl_contact_id":"AlumnoR5prueba000001"}');
  -- El mismo alumno, otra sesión, otra vez en rojo → R5 (y R2 porque csat 2).
  r_r5b := cp_registrar_respuesta(s2, 'c:AlumnoR5prueba000001',
    '{"canal_entrada":"personal","asistencia":"en_vivo","csat":2,"distintiva_codigo":"no_alcanzo","distintiva_banda":"roja","modo_identidad":"nombre"}',
    '{"nombre":"Alumno R5","ghl_contact_id":"AlumnoR5prueba000001"}');
  -- Pedido de contacto → R1.
  r_contacto := cp_registrar_respuesta(s1, 'f:bbbbbbbb-0000-0000-0000-000000000003', clase || '{"csat":4,"distintiva_banda":"amarilla","modo_identidad":"contacto"}',
    '{"nombre":"Alumno Contacto","email":"contacto.prueba@example.com"}', '{"motivo":"otro","canal_preferido":"correo"}');
  -- Detractor de NPS con nombre → R3 con 48 h.
  r_nps := cp_registrar_cinturon('AlumnoNpsPrueba00001', 2::smallint,
    '{"nps":3,"nes":"faltan_mejoras","modo_identidad":"nombre"}', '{"nombre":"Alumno Nps","ghl_contact_id":"AlumnoNpsPrueba00001"}', null, true);
  set constraints all immediate;
  reset role;

  if (select count(*) from cp_alertas where respuesta_id = r_anon) <> 1 then raise exception 'FALLA: anónima debe tener solo R4'; end if;
  select id into a from cp_alertas where respuesta_id = r_anon and regla = 'R4';
  if a is null then raise exception 'FALLA: R4 con otra grafía'; end if;
  if (select contacto_posible or vence_en is not null from cp_alertas where id = a) then raise exception 'FALLA: R4 anónima con contacto o SLA'; end if;
  if not exists (select 1 from cp_alertas where respuesta_id = r_r5a and regla = 'R2' and gravedad = 'media' and vence_en is not null) then raise exception 'FALLA: R2'; end if;
  if exists (select 1 from cp_alertas where respuesta_id = r_r5a and regla = 'R5') then raise exception 'FALLA: R5 en la primera'; end if;
  if not exists (select 1 from cp_alertas where respuesta_id = r_r5b and regla = 'R5') then raise exception 'FALLA: R5'; end if;
  if not exists (select 1 from cp_alertas where respuesta_id = r_contacto and regla = 'R1' and gravedad = 'alta' and contacto_posible) then raise exception 'FALLA: R1'; end if;
  if exists (select 1 from cp_alertas where respuesta_id = r_contacto and regla = 'R2') then raise exception 'FALLA: R2 con nota 4'; end if;
  if (select vence_en from cp_alertas where respuesta_id = r_nps and regla = 'R3') <> cp_sumar_horas_habiles((select creado_en from cp_alertas where respuesta_id = r_nps and regla = 'R3'), 48) then
    raise exception 'FALLA: R3 con 48 h hábiles';
  end if;
  if exists (select 1 from cp_alertas where respuesta_id in (r_anon, r_r5a, r_r5b, r_contacto, r_nps) and not es_prueba) then raise exception 'FALLA: alertas sin es_prueba'; end if;

  -- R7: 15 respuestas con nota 3 en las sesiones del mentor 1.
  set local role service_role;
  for i in 1..15 loop
    perform cp_registrar_respuesta(s1, 'f:cccccccc-0000-0000-0000-' || lpad(i::text, 12, '0'), clase || '{"csat":3,"modo_identidad":"anonimo"}');
  end loop;
  reset role;
  n := cp_revisar_r7();
  if not exists (select 1 from cp_alertas where regla = 'R7' and gravedad = 'kaizen' and es_prueba
                 and mentor_id = (select id from mentores where email = 'classpulse.prueba.mentor1@example.com')) then
    raise exception 'FALLA: R7';
  end if;
  if cp_revisar_r7() <> 0 then raise exception 'FALLA: R7 duplicada'; end if;

  -- anon y mentor: nada.
  set local role anon;
  begin perform * from cp_bandeja(true); raise exception 'FALLA: anon ve la bandeja';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_bandeja(true)) <> 0 then raise exception 'FALLA: mentor ve la bandeja'; end if;
  if (select count(*) from cp_alertas) <> 0 then raise exception 'FALLA: mentor lee alertas'; end if;
  begin perform * from cp_ver_identidad(r_r5a); raise exception 'FALLA: mentor ve identidades';
  exception when insufficient_privilege then null; end;
  begin perform cp_actualizar_alerta(a, 'descartada'); raise exception 'FALLA: mentor gestiona alertas';
  exception when insufficient_privilege then null; end;
  if (select count(*) from cp_alumnos_en_riesgo(true)) <> 0 then raise exception 'FALLA: mentor ve alumnos en riesgo'; end if;
  reset role;

  -- Coach: bandeja sin identidades ni R7; identidad con auditoría; seguimiento.
  select count(*) into audit_antes from cp_auditoria;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_bandeja(true) where respuesta_id in (r_anon, r_r5a, r_r5b, r_contacto, r_nps)) < 6 then raise exception 'FALLA: coach no ve las alertas'; end if;
  if exists (select 1 from cp_bandeja(true) where regla = 'R7') then raise exception 'FALLA: coach ve R7'; end if;
  if exists (select 1 from cp_bandeja(false) where respuesta_id = r_anon) then raise exception 'FALLA: prueba en la bandeja real'; end if;
  if (select nombre from cp_ver_identidad(r_r5a)) <> 'Alumno R5' then raise exception 'FALLA: identidad'; end if;
  if (select count(*) from cp_ver_identidad(r_anon)) <> 0 then raise exception 'FALLA: anónima con identidad'; end if;
  if (select count(*) from cp_historial_alumno(r_r5b)) <> 2 then raise exception 'FALLA: historial del alumno'; end if;
  if not exists (select 1 from cp_alumnos_en_riesgo(true) where alertas >= 2) then raise exception 'FALLA: alumnos en riesgo'; end if;
  select id into a from cp_alertas where respuesta_id = r_contacto and regla = 'R1';
  perform cp_actualizar_alerta(a, 'en_contacto', 'Le escribí por correo.');
  perform cp_actualizar_alerta(a, 'resuelta', 'Resuelto.');
  reset role;
  if (select count(*) from cp_auditoria where id > 0) - audit_antes < 4 then raise exception 'FALLA: sin auditoría de identidad y seguimiento'; end if;
  if not exists (select 1 from cp_auditoria where accion = 'ver_identidad' and objeto = 'respuesta:' || r_r5a) then raise exception 'FALLA: auditoría de identidad'; end if;
  if (select primer_contacto_en is null or resuelta_en is null or jsonb_array_length(notas) <> 2 or estado <> 'resuelta' from cp_alertas where id = a) then
    raise exception 'FALLA: seguimiento de la alerta';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select en_plazo from cp_metricas_sla(now() - interval '1 day', true)) < 1 then raise exception 'FALLA: métricas de SLA'; end if;
  reset role;

  -- Super admin: ve R7.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  if not exists (select 1 from cp_bandeja(true) where regla = 'R7') then raise exception 'FALLA: super admin no ve R7'; end if;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
