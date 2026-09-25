-- Fase 7 · Acciones PDCA, métricas antes y después, alcance por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  m1 uuid; m2 uuid; u_m1 text; u_m2 text; u_coach text; u_adm text; g_am uuid; s_antes uuid; s_despues uuid;
  acc uuid; acc2 uuid; n int; hoy date := (now() at time zone 'America/Guayaquil')::date; a jsonb; d jsonb;
  base jsonb := '{"canal_entrada":"general","asistencia":"en_vivo","distintiva_codigo":"se_que_corregir","distintiva_banda":"amarilla","modo_identidad":"anonimo"}';
begin
  update cp_sesiones set estado = 'cerrada', cerrada_en = now() where es_prueba and estado = 'abierta';
  select id, auth_user_id::text into m1, u_m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select id, auth_user_id::text into m2, u_m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';
  select auth_user_id::text into u_coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select auth_user_id::text into u_adm from mentores where email = 'classpulse.prueba.admin@example.com';
  -- Marrón y Shinsa: sin datos de las pruebas E2E.
  select id into g_am from cp_grupos where slug = 'marron';

  -- Antes: 3 respuestas con nota 2 hace 3 días. Después: 2 respuestas con nota 5 hoy.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  s_antes := cp_abrir_sesion(g_am, 'shinsa', hoy - 3, '{}', null, m1);
  s_despues := cp_abrir_sesion(g_am, 'shinsa', hoy, '{}', null, m1);
  reset role;
  set local role service_role;
  for i in 1..3 loop perform cp_registrar_respuesta(s_antes, 'f:dddddddd-0000-0000-0000-00000000000' || i, base || '{"csat":2}'); end loop;
  for i in 1..2 loop perform cp_registrar_respuesta(s_despues, 'f:eeeeeeee-0000-0000-0000-00000000000' || i, base || '{"csat":5}'); end loop;
  reset role;

  -- Coach crea la acción (inicio hoy) para mentor1 en Kata de Amarillo.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  insert into cp_acciones (grupo_id, mentor_id, tipo_sesion, problema, porques, accion, responsable, fecha_compromiso, metrica, fecha_inicio, ventana_dias, publicar, es_prueba)
  values (g_am, m1, 'shinsa', 'Los alumnos se pierden en la Shinsa', '["Va muy rápido","No hay pausa para dudas"]',
          'Pausa de dudas cada 15 minutos', 'Mentor Uno', hoy + 14, 'csat_medio', hoy, 30, true, true)
  returning id into acc;
  select antes, despues into a, d from cp_medir_accion(acc);
  if (a ->> 'valor')::numeric <> 2 or (a ->> 'n')::int <> 3 then raise exception 'FALLA: métrica antes %', a; end if;
  if (d ->> 'valor')::numeric <> 5 or (d ->> 'n')::int <> 2 then raise exception 'FALLA: métrica después %', d; end if;
  if (select metrica_antes from cp_acciones where id = acc) is not null then raise exception 'FALLA: congelada en Planificar'; end if;
  update cp_acciones set estado = 'verificar' where id = acc;
  if (select (metrica_antes ->> 'valor')::numeric from cp_acciones where id = acc) <> 2 then raise exception 'FALLA: no se congeló al verificar'; end if;
  insert into cp_acciones (grupo_id, mentor_id, problema, accion, es_prueba) values (g_am, m2, 'Otro problema', 'Otra acción', true) returning id into acc2;
  begin delete from cp_acciones where id = acc2; get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: el coach borra'; end if; end;
  reset role;

  -- Mentor1: lee la suya, no la del mentor2; no crea ni edita.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_acciones where id in (acc, acc2)) <> 1 then raise exception 'FALLA: alcance del mentor'; end if;
  if (select count(*) from cp_medir_accion(acc2)) <> 0 then raise exception 'FALLA: mentor mide acción ajena'; end if;
  begin insert into cp_acciones (problema, accion) values ('xxx', 'yyy'); raise exception 'FALLA: mentor crea acciones';
  exception when insufficient_privilege then null; end;
  update cp_acciones set estado = 'descartar' where id = acc;
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: mentor edita acciones'; end if;
  reset role;

  set local role anon;
  begin perform 1 from cp_acciones; raise exception 'FALLA: anon lee acciones';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Super admin borra.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  delete from cp_acciones where id = acc2;
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no borra'; end if;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
