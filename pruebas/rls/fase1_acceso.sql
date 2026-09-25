-- Fase 1 · RLS de acceso, Grupos, horarios, configuración y auditoría, por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  m1 uuid; m2 uuid; coach uuid; adm uuid; sin uuid; n int; g_am uuid;
  u_m1 text; u_coach text; u_adm text; u_sin text;
begin
  select id into m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select id into m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';
  select id into coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select id into adm from mentores where email = 'classpulse.prueba.admin@example.com';
  select id into sin from mentores where email = 'classpulse.prueba.sinacceso@example.com';
  select id into g_am from cp_grupos where slug = 'amarillo';
  if m1 is null or m2 is null or coach is null or adm is null or sin is null then
    raise exception 'FALLA: faltan las cuentas de prueba';
  end if;
  -- Los auth_user_id se leen antes de cambiar de rol (mentores tiene RLS).
  select auth_user_id::text into u_m1 from mentores where id = m1;
  select auth_user_id::text into u_coach from mentores where id = coach;
  select auth_user_id::text into u_adm from mentores where id = adm;
  select auth_user_id::text into u_sin from mentores where id = sin;

  -- anon: nada de nada.
  set local role anon;
  begin perform 1 from cp_grupos; raise exception 'FALLA: anon lee cp_grupos';
  exception when insufficient_privilege then null; end;
  begin perform 1 from cp_acceso; raise exception 'FALLA: anon lee cp_acceso';
  exception when insufficient_privilege then null; end;
  begin perform cp_mi_rol(); raise exception 'FALLA: anon ejecuta cp_mi_rol';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Cuenta de ClassVote sin acceso a ClassPulse: no ve nada.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_sin, true);
  if cp_mi_rol() is not null then raise exception 'FALLA: sin acceso tiene rol'; end if;
  if (select count(*) from cp_grupos) <> 0 then raise exception 'FALLA: sin acceso ve Grupos'; end if;
  if (select count(*) from cp_directorio()) <> 0 then raise exception 'FALLA: sin acceso ve directorio'; end if;
  reset role;

  -- Mentor 1.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if cp_mi_rol() is distinct from 'mentor' then raise exception 'FALLA: mentor1 sin rol mentor'; end if;
  if (select count(*) from cp_grupos) <> 9 then raise exception 'FALLA: mentor no ve los 9 Grupos'; end if;
  if (select count(*) from cp_acceso) <> 1 then raise exception 'FALLA: mentor ve accesos ajenos'; end if;
  if (select count(*) from cp_mentor_grupos where mentor_id <> m1) <> 0 then raise exception 'FALLA: mentor ve asignaciones ajenas'; end if;
  if (select count(*) from cp_config) <> 0 then raise exception 'FALLA: mentor lee cp_config'; end if;
  if (select count(*) from cp_auditoria) <> 0 then raise exception 'FALLA: mentor lee auditoría'; end if;
  if exists (select 1 from cp_directorio() where email is not null) then raise exception 'FALLA: mentor ve correos'; end if;
  if (select count(*) from cp_cuentas_classvote()) <> 0 then raise exception 'FALLA: mentor lista cuentas de ClassVote'; end if;
  if not cp_puede_abrir(g_am) then raise exception 'FALLA: mentor1 no puede abrir Amarillo'; end if;
  if cp_puede_abrir((select id from cp_grupos where slug = 'naranja')) then raise exception 'FALLA: mentor1 abre Naranja'; end if;
  begin insert into cp_acceso (mentor_id, rol) values (sin, 'coach'); raise exception 'FALLA: mentor da accesos';
  exception when insufficient_privilege then null; end;
  update cp_acceso set rol = 'super_admin' where mentor_id = m1;
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: mentor se sube el rol'; end if;
  update cp_grupos set enviar_correo = true;
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: mentor cambia Grupos'; end if;
  begin insert into cp_mentor_grupos values (m1, (select id from cp_grupos where slug = 'negro')); raise exception 'FALLA: mentor se asigna Grupos';
  exception when insufficient_privilege then null; end;
  begin perform cp_auditar('x', 'y'); raise exception 'FALLA: mentor audita';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Coach: ve todo lo de lectura, no administra.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if not cp_es_coach() or cp_es_super_admin() then raise exception 'FALLA: roles del coach'; end if;
  if (select count(*) from cp_acceso) < 6 then raise exception 'FALLA: coach no ve accesos'; end if;
  if (select count(*) from cp_config) < 5 then raise exception 'FALLA: coach no lee config'; end if;
  if not cp_puede_abrir((select id from cp_grupos where slug = 'negro')) then raise exception 'FALLA: coach no abre en cualquier Grupo'; end if;
  if (select count(*) from cp_auditoria) <> 0 then raise exception 'FALLA: coach lee auditoría'; end if;
  perform cp_auditar('prueba', 'fase1');
  update cp_config set valor = '1' where clave = 'muestra_minima';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: coach cambia config'; end if;
  begin insert into cp_acceso (mentor_id, rol) values (sin, 'mentor'); raise exception 'FALLA: coach da accesos';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Super admin: administra, pero no se cambia a sí mismo.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  if not cp_es_super_admin() then raise exception 'FALLA: super admin sin rol'; end if;
  if (select count(*) from cp_auditoria where accion = 'prueba') <> 1 then raise exception 'FALLA: super admin no lee auditoría'; end if;
  if (select count(*) from cp_cuentas_classvote()) < 7 then raise exception 'FALLA: super admin no lista cuentas'; end if;
  if not exists (select 1 from cp_directorio() where email is not null) then raise exception 'FALLA: super admin no ve correos'; end if;
  insert into cp_acceso (mentor_id, rol) values (sin, 'mentor');
  update cp_acceso set activo = false where mentor_id = sin;
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no desactiva'; end if;
  update cp_acceso set rol = 'mentor' where mentor_id = adm;
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: super admin se cambia a sí mismo'; end if;
  update cp_grupos set enviar_correo = true where id = g_am;
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no cambia Grupos'; end if;
  begin update cp_grupos set slug = 'otro' where id = g_am; raise exception 'FALLA: se puede cambiar el slug';
  exception when insufficient_privilege then null; end;
  update cp_config set valor = '20' where clave = 'muestra_minima';
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no cambia config'; end if;
  insert into cp_mentor_grupos values (m2, g_am);
  delete from cp_mentor_grupos where mentor_id = m2 and grupo_id = g_am;
  reset role;

  -- La cuenta desactivada pierde el acceso.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_sin, true);
  if cp_tiene_acceso() then raise exception 'FALLA: cuenta desactivada conserva acceso'; end if;
  reset role;

  raise exception 'PRUEBAS_OK';
end $$;
