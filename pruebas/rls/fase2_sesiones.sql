-- Fase 2 · Sesiones, co-mentores, sal, cierre automático y regla R6, por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  m1 uuid; m2 uuid; coach uuid; adm uuid; g_am uuid; g_na uuid; g_ro uuid;
  u_m1 text; u_m2 text; u_coach text;
  s1 uuid; s2 uuid; n int; hoy date := (now() at time zone 'America/Guayaquil')::date;
  ayer date; ok boolean;
begin
  -- Independiente de las pruebas E2E: cierra las sesiones de prueba abiertas (se deshace al final).
  update cp_sesiones set estado = 'cerrada', cerrada_en = now() where es_prueba and estado = 'abierta';
  select id into m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select id into m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';
  select id into coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select id into adm from mentores where email = 'classpulse.prueba.admin@example.com';
  select id into g_am from cp_grupos where slug = 'amarillo';
  select id into g_na from cp_grupos where slug = 'naranja';
  select id into g_ro from cp_grupos where slug = 'comunidad-ronin';
  select auth_user_id::text into u_m1 from mentores where id = m1;
  select auth_user_id::text into u_m2 from mentores where id = m2;
  select auth_user_id::text into u_coach from mentores where id = coach;
  ayer := hoy - 1;

  -- anon: sin tablas; solo la función del enlace general.
  set local role anon;
  begin perform 1 from cp_sesiones; raise exception 'FALLA: anon lee cp_sesiones';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_sesion_sales; raise exception 'FALLA: anon lee la sal';
  exception when insufficient_privilege then null; end;
  begin perform cp_abrir_sesion(g_am, 'kata', hoy); raise exception 'FALLA: anon abre sesiones';
  exception when insufficient_privilege then null; end;
  perform * from cp_sesiones_abiertas('amarillo');
  reset role;

  -- Mentor 1 abre Kata en Amarillo con mentor 2 de co-mentor.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  s1 := cp_abrir_sesion(g_am, 'kata', hoy, array[m2], 'Rango 3');
  if (select count(*) from cp_sesiones where id = s1) <> 1 then raise exception 'FALLA: mentor1 no ve su sesión'; end if;
  if (select count(*) from cp_sesion_mentores where sesion_id = s1) <> 2 then raise exception 'FALLA: faltan co-mentores'; end if;
  if not (select es_prueba from cp_sesiones where id = s1) then raise exception 'FALLA: sesión de cuenta de prueba sin es_prueba'; end if;
  begin perform 1 from cp_sesion_sales; raise exception 'FALLA: mentor lee la sal';
  exception when insufficient_privilege then null; end;
  begin perform cp_abrir_sesion(g_am, 'kata', hoy); raise exception 'FALLA: sesión duplicada';
  exception when raise_exception then null; end;
  begin perform cp_abrir_sesion(g_na, 'kata', hoy); raise exception 'FALLA: mentor1 abre Naranja';
  exception when insufficient_privilege then null; end;
  begin perform cp_abrir_sesion(g_am, 'practica_cliente', hoy); raise exception 'FALLA: tipo de cliente en un Cinturón';
  exception when raise_exception then null; end;
  begin perform cp_abrir_sesion(g_am, 'mondo', hoy + 1); raise exception 'FALLA: fecha futura';
  exception when raise_exception then null; end;
  begin perform cp_abrir_sesion(g_am, 'mondo', hoy - 4); raise exception 'FALLA: fecha muy vieja';
  exception when raise_exception then null; end;
  begin perform cp_abrir_sesion(g_am, 'mondo', hoy, '{}', null, m2); raise exception 'FALLA: mentor abre en nombre de otro';
  exception when insufficient_privilege then null; end;
  begin insert into cp_sesiones (grupo_id, tipo_sesion, fecha_clase, abierta_por) values (g_am, 'mondo', hoy, m1);
    raise exception 'FALLA: insert directo en cp_sesiones';
  exception when insufficient_privilege then null; end;
  begin update cp_sesiones set cierra_en = now() + interval '9 days' where id = s1; raise exception 'FALLA: update directo';
  exception when insufficient_privilege then null; end;
  if (select count(*) from cp_alertas) <> 0 then raise exception 'FALLA: mentor lee alertas'; end if;
  begin perform cp_cerrar_vencidas(); raise exception 'FALLA: mentor ejecuta el cron';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Mentor 2 (co-mentor) ve la sesión; no ve otras.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m2, true);
  if (select count(*) from cp_sesiones where id = s1) <> 1 then raise exception 'FALLA: co-mentor no ve la sesión'; end if;
  s2 := cp_abrir_sesion(g_na, 'mondo', hoy);
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_sesiones where id = s2) <> 0 then raise exception 'FALLA: mentor1 ve sesión ajena'; end if;
  begin perform cp_cerrar_sesion(s2); raise exception 'FALLA: mentor1 cierra sesión ajena';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Coach: ve todo, abre en nombre de un mentor y cierra.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_sesiones where id in (s1, s2)) <> 2 then raise exception 'FALLA: coach no ve todas'; end if;
  perform cp_abrir_sesion(g_ro, 'practica_cliente', hoy, '{}', null, m1);
  if (select mentor_id from cp_sesion_mentores sm join cp_sesiones s on s.id = sm.sesion_id
      where s.grupo_id = g_ro and sm.principal and s.fecha_clase = hoy) <> m1 then
    raise exception 'FALLA: principal en nombre de otro';
  end if;
  perform cp_cerrar_sesion(s2);
  if (select estado from cp_sesiones where id = s2) <> 'cerrada' then raise exception 'FALLA: coach no cierra'; end if;
  reset role;
  if exists (select 1 from cp_sesion_sales where sesion_id = s2) then raise exception 'FALLA: la sal sobrevive al cierre'; end if;

  -- Enlace general: sin las de prueba por defecto; con ?prueba=1 aparecen.
  set local role anon;
  if (select count(*) from cp_sesiones_abiertas('amarillo') where id = s1) <> 0 then raise exception 'FALLA: prueba visible al público'; end if;
  if (select count(*) from cp_sesiones_abiertas('amarillo', true) where id = s1) <> 1 then raise exception 'FALLA: prueba no visible con ?prueba=1'; end if;
  if (select mentores from cp_sesiones_abiertas('amarillo', true) where id = s1) not like '%y%' then raise exception 'FALLA: sin nombres de mentores'; end if;
  if (select count(*) from cp_sesiones_abiertas('naranja', true) where id = s2) <> 0 then raise exception 'FALLA: sesión cerrada visible'; end if;
  reset role;

  -- Cierre automático a las 24 h.
  update cp_sesiones set abierta_en = now() - interval '25 hours', cierra_en = now() - interval '1 hour' where id = s1;
  n := cp_cerrar_vencidas();
  if n < 1 or (select estado from cp_sesiones where id = s1) <> 'cerrada' then raise exception 'FALLA: no cierra a las 24 h'; end if;
  if exists (select 1 from cp_sesion_sales where sesion_id = s1) then raise exception 'FALLA: la sal sobrevive al cron'; end if;

  -- R6: franja de ayer a las 10:00 en Amarillo, con un mentor real asignado.
  update cp_acceso set es_prueba = false where mentor_id = m1;
  insert into cp_horarios (grupo_id, dia_semana, hora_local, semana)
  values (g_am, extract(dow from ayer), '10:00', 'todas');
  n := cp_revisar_r6((ayer + time '11:00') at time zone 'America/Guayaquil');
  if exists (select 1 from cp_alertas where grupo_id = g_am and fecha_clase = ayer) then raise exception 'FALLA: R6 antes de 2 h'; end if;
  n := cp_revisar_r6((ayer + time '12:30') at time zone 'America/Guayaquil');
  if (select count(*) from cp_alertas where regla = 'R6' and grupo_id = g_am and fecha_clase = ayer) <> 1 then raise exception 'FALLA: R6 no se generó'; end if;
  n := cp_revisar_r6((ayer + time '13:00') at time zone 'America/Guayaquil');
  if (select count(*) from cp_alertas where regla = 'R6' and grupo_id = g_am and fecha_clase = ayer) <> 1 then raise exception 'FALLA: R6 duplicada'; end if;
  if (select count(*) from cp_alertas where regla = 'R6' and grupo_id = g_na) <> 0 then raise exception 'FALLA: R6 en Grupo sin mentor real'; end if;

  -- El mentor lo ve como aviso para el coach, no para él; al abrir la sesión se resuelve.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_alertas where regla = 'R6' and grupo_id = g_am) <> 1 then raise exception 'FALLA: coach no ve R6'; end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  perform cp_abrir_sesion(g_am, 'mondo', ayer);
  reset role;
  if (select estado from cp_alertas where regla = 'R6' and grupo_id = g_am and fecha_clase = ayer) <> 'resuelta' then
    raise exception 'FALLA: R6 no se resuelve al abrir la sesión';
  end if;

  -- Semana A/B: la referencia es semana A; 7 días después, B.
  if cp_semana_ab(date '2026-09-28') <> 'A' or cp_semana_ab(date '2026-10-05') <> 'B'
     or cp_semana_ab(date '2026-09-21') <> 'B' or cp_semana_ab(date '2026-10-15') <> 'A' then
    raise exception 'FALLA: semana A/B';
  end if;

  raise exception 'PRUEBAS_OK';
end $$;
