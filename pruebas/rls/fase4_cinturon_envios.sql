-- Fase 4 · Encuesta de Cinturón, pimienta, envíos y permisos por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  u_m1 text; u_coach text; u_adm text; r1 uuid; r2 uuid; n int;
  base jsonb := '{"nps":9,"nes":"efectivo","aplicacion":"cliente_paga","dificultad":3,"ces":6,
                  "clientes_activos":"2_4","rango_top":"Rango 2","texto_cambio_nivel":"Más práctica",
                  "segundos_para_responder":95}';
begin
  select auth_user_id::text into u_m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select auth_user_id::text into u_coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select auth_user_id::text into u_adm from mentores where email = 'classpulse.prueba.admin@example.com';

  set local role anon;
  begin perform cp_registrar_cinturon('PruebaCinturon000001', 1::smallint, base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: anon registra Cinturón';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_secretos; raise exception 'FALLA: anon lee secretos';
  exception when insufficient_privilege then null; end;
  reset role;

  set local role service_role;
  r1 := cp_registrar_cinturon('PruebaCinturon000001', 1::smallint, base || '{"modo_identidad":"anonimo"}', null, null, true);
  begin perform cp_registrar_cinturon('PruebaCinturon000001', 1::smallint, base || '{"modo_identidad":"nombre"}', '{"nombre":"X"}', null, true);
    raise exception 'FALLA: Cinturón duplicado';
  exception when raise_exception then
    if sqlerrm not like 'Ya respondiste la encuesta de este Cinturón%' then raise; end if;
  end;
  -- Otro nivel, mismo contacto: sí puede; con nombre y contacto (detractor).
  r2 := cp_registrar_cinturon('PruebaCinturon000001', 2::smallint,
    base || '{"modo_identidad":"contacto","nps":4}', '{"nombre":"Alumno Nps","ghl_contact_id":"PruebaCinturon000001","nivel":2}',
    '{"motivo":"mi_avance","canal_preferido":"llamada"}', true);
  begin perform cp_registrar_cinturon('PruebaCinturon000002', 9::smallint, base || '{"modo_identidad":"anonimo"}');
    raise exception 'FALLA: nivel inexistente';
  exception when raise_exception then null; end;
  begin perform cp_registrar_cinturon('PruebaCinturon000003', 3::smallint, '{"modo_identidad":"anonimo","nes":"efectivo"}');
    raise exception 'FALLA: Cinturón sin nps';
  exception when check_violation then null; end;
  insert into cp_envios (ghl_contact_id, estado, es_prueba) values ('PruebaCinturon000001', 'enviado', true);
  reset role;

  if exists (select 1 from cp_respondentes where respuesta_id = r1) then raise exception 'FALLA: anónima con identidad'; end if;
  if (select count(*) from cp_contactos where respuesta_id = r2) <> 1 then raise exception 'FALLA: contacto de Cinturón'; end if;
  if (select nivel from cp_respuestas where id = r2) <> 2 or (select grupo_id from cp_respuestas where id = r2) <> (select id from cp_grupos where slug = 'naranja') then
    raise exception 'FALLA: nivel o Grupo de Cinturón';
  end if;
  if exists (select 1 from cp_cinturon_dedupe where hash like '%Prueba%') then raise exception 'FALLA: hash legible'; end if;

  -- Mentor: no ve Cinturón (solo coach), ni envíos, ni secretos.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_respuestas where id in (r1, r2)) <> 0 then raise exception 'FALLA: mentor ve NPS de Cinturón'; end if;
  if (select count(*) from cp_envios) <> 0 then raise exception 'FALLA: mentor ve envíos'; end if;
  begin perform 1 from cp_secretos; raise exception 'FALLA: mentor lee secretos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_cinturon_dedupe; raise exception 'FALLA: mentor lee hashes';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Coach: ve el NPS, no los envíos (llevan contact_id).
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_respuestas where id in (r1, r2)) <> 2 then raise exception 'FALLA: coach no ve NPS'; end if;
  if (select count(*) from cp_envios) <> 0 then raise exception 'FALLA: coach ve envíos'; end if;
  reset role;

  -- Super admin: ve los envíos.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  if (select count(*) from cp_envios where ghl_contact_id = 'PruebaCinturon000001') <> 1 then raise exception 'FALLA: super admin no ve envíos'; end if;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
