-- Fase 5 · Referencia de la academia (solo agregados) y aprobaciones por Rango, por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  u_m1 text; u_m2 text; u_coach text; u_adm text; g_am uuid; g_na uuid; s1 uuid; s2 uuid;
  hoy date := (now() at time zone 'America/Guayaquil')::date;
  base jsonb := '{"canal_entrada":"general","asistencia":"en_vivo","distintiva_codigo":"lo_principal","distintiva_banda":"amarilla","modo_identidad":"anonimo"}';
begin
  update cp_sesiones set estado = 'cerrada', cerrada_en = now() where es_prueba and estado = 'abierta';
  select auth_user_id::text into u_m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select auth_user_id::text into u_m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';
  select auth_user_id::text into u_coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select auth_user_id::text into u_adm from mentores where email = 'classpulse.prueba.admin@example.com';
  select id into g_am from cp_grupos where slug = 'amarillo';
  select id into g_na from cp_grupos where slug = 'naranja';

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  s1 := cp_abrir_sesion(g_am, 'kata', hoy);
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m2, true);
  s2 := cp_abrir_sesion(g_na, 'kata', hoy);
  reset role;
  set local role service_role;
  perform cp_registrar_respuesta(s1, 'f:aaaaaaaa-0000-0000-0000-000000000001', base || '{"csat":5}');
  perform cp_registrar_respuesta(s2, 'f:aaaaaaaa-0000-0000-0000-000000000002', base || '{"csat":1}');
  reset role;

  set local role anon;
  begin perform * from cp_referencia_academia(hoy - 90, true); raise exception 'FALLA: anon lee la referencia';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Mentor 1: su fila (5) por RLS; la referencia agrega a la academia (5 y 1 = 3) sin exponer sesiones.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select avg(csat) from cp_respuestas where sesion_id in (s1, s2)) <> 5 then raise exception 'FALLA: mentor ve respuestas ajenas'; end if;
  if (select csat from cp_referencia_academia(hoy - 90, true) where tipo_sesion = 'kata' and semana <= hoy order by semana desc limit 1) is null then
    raise exception 'FALLA: sin referencia';
  end if;
  if not exists (select 1 from cp_referencia_academia(hoy - 90, true) where tipo_sesion = 'kata' and n >= 2) then raise exception 'FALLA: la referencia no agrega a la academia'; end if;
  if (select count(*) from cp_aprobaciones) <> 0 then raise exception 'FALLA: mentor lee aprobaciones'; end if;
  begin insert into cp_aprobaciones (nivel, rango, periodo, presentados, aprobados) values (1, 'Rango 1', '2000-01-01', 10, 8);
    raise exception 'FALLA: mentor carga aprobaciones';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Super admin carga; coach lee pero no escribe.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  insert into cp_aprobaciones (nivel, rango, periodo, presentados, aprobados, es_prueba) values (1, 'Rango 1', '2000-01-01', 10, 8, true);
  begin insert into cp_aprobaciones (nivel, rango, periodo, presentados, aprobados) values (1, 'Rango 2', '2000-01-01', 5, 8);
    raise exception 'FALLA: más aprobados que presentados';
  exception when check_violation then null; end;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_aprobaciones where rango = 'Rango 1' and periodo = '2000-01-01') <> 1 then raise exception 'FALLA: coach no lee aprobaciones'; end if;
  begin insert into cp_aprobaciones (nivel, rango, periodo, presentados, aprobados) values (2, 'Rango 1', '2000-01-01', 10, 8);
    raise exception 'FALLA: coach carga aprobaciones';
  exception when insufficient_privilege then null; end;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
