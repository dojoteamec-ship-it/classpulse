-- Fase 8 · Buzón, retención de 24 meses, borrado a pedido, cumplimiento y admin por rol.
-- Todo se deshace al final (raise exception 'PRUEBAS_OK').
do $$
declare
  u_m1 text; u_coach text; u_adm text; m2 uuid; b_anon uuid; b_nombre uuid; r_vieja uuid; n int;
  hoy date := (now() at time zone 'America/Guayaquil')::date;
begin
  select auth_user_id::text into u_m1 from mentores where email = 'classpulse.prueba.mentor1@example.com';
  select auth_user_id::text into u_coach from mentores where email = 'classpulse.prueba.coach@example.com';
  select auth_user_id::text into u_adm from mentores where email = 'classpulse.prueba.admin@example.com';
  select id into m2 from mentores where email = 'classpulse.prueba.mentor2@example.com';

  -- Buzón: solo service role; R4 anónima sin contacto; R1 con contacto.
  set local role anon;
  begin perform cp_registrar_buzon('hola hola', 'anonimo'); raise exception 'FALLA: anon escribe en el buzón directo';
  exception when insufficient_privilege then null; end;
  reset role;
  set local role service_role;
  b_anon := cp_registrar_buzon('Quiero cancelar mi suscripción', 'anonimo', null, null, true);
  b_nombre := cp_registrar_buzon('Tengo un problema con el pago', 'contacto',
    '{"nombre":"Alumno Buzon","email":"buzon.prueba@example.com"}', '{"motivo":"pagos_accesos","canal_preferido":"correo"}', true);
  begin perform cp_registrar_buzon('  ', 'anonimo'); raise exception 'FALLA: buzón vacío';
  exception when raise_exception then null; end;
  reset role;
  if not exists (select 1 from cp_alertas where respuesta_id = b_anon and regla = 'R4' and not contacto_posible) then raise exception 'FALLA: R4 del buzón'; end if;
  if not exists (select 1 from cp_alertas where respuesta_id = b_nombre and regla = 'R1') then raise exception 'FALLA: R1 del buzón'; end if;

  -- Mentor: no lee el buzón ni administra.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_m1, true);
  if (select count(*) from cp_respuestas where id in (b_anon, b_nombre)) <> 0 then raise exception 'FALLA: mentor lee el buzón'; end if;
  begin perform cp_borrar_alumno('buzon.prueba@example.com', hoy); raise exception 'FALLA: mentor borra alumnos';
  exception when insufficient_privilege then null; end;
  if (select count(*) from cp_estado_cumplimiento()) <> 0 then raise exception 'FALLA: mentor ve cumplimiento'; end if;
  begin insert into cp_config (clave, valor) values ('x_prueba', '1'); raise exception 'FALLA: mentor escribe config';
  exception when insufficient_privilege then null; end;
  reset role;

  -- Coach: lee el buzón; no borra alumnos ni cambia la configuración.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_coach, true);
  if (select count(*) from cp_respuestas where id in (b_anon, b_nombre)) <> 2 then raise exception 'FALLA: coach no lee el buzón'; end if;
  begin perform cp_borrar_alumno('buzon.prueba@example.com', hoy); raise exception 'FALLA: coach borra alumnos';
  exception when insufficient_privilege then null; end;
  update cp_config set valor = '99' where clave = 'muestra_minima';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FALLA: coach cambia config'; end if;
  reset role;

  -- Retención: una identidad de hace 25 meses se borra; la respuesta queda.
  r_vieja := b_nombre;
  update cp_respuestas set creado_en = now() - interval '25 months' where id = r_vieja;
  n := cp_anonimizar_vencidas();
  if n < 1 or exists (select 1 from cp_respondentes where respuesta_id = r_vieja) or exists (select 1 from cp_contactos where respuesta_id = r_vieja) then
    raise exception 'FALLA: retención';
  end if;
  if not exists (select 1 from cp_respuestas where id = r_vieja) then raise exception 'FALLA: la retención borró la respuesta'; end if;
  if not exists (select 1 from cp_auditoria where accion = 'retencion_anonimizar') then raise exception 'FALLA: retención sin auditoría'; end if;

  -- Borrado a pedido: super admin, por correo; la constancia no guarda el identificador.
  set local role service_role;
  b_nombre := cp_registrar_buzon('Otro mensaje', 'nombre', '{"nombre":"Alumno Borrar","email":"Borrar.Prueba@example.com","telefono":"+593 99 123 4567"}', null, true);
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u_adm, true);
  begin perform cp_borrar_alumno('x', hoy); raise exception 'FALLA: identificador corto';
  exception when raise_exception then null; end;
  begin perform cp_borrar_alumno('borrar.prueba@example.com', hoy + 1); raise exception 'FALLA: fecha futura';
  exception when raise_exception then null; end;
  n := cp_borrar_alumno('borrar.prueba@example.com', hoy - 2, 'Pedido por correo', true);
  if n <> 1 then raise exception 'FALLA: borrado a pedido'; end if;
  if (select vence_en from cp_solicitudes_borrado where es_prueba order by completada_en desc limit 1) <> hoy + 13 then raise exception 'FALLA: plazo de 15 días'; end if;
  if exists (select 1 from cp_solicitudes_borrado s where s.notas like '%@%') then raise exception 'FALLA: la constancia guarda el correo'; end if;
  if (select anonimas_con_identidad from cp_estado_cumplimiento()) <> 0 then raise exception 'FALLA: anónimas con identidad'; end if;
  if (select meses_retencion from cp_estado_cumplimiento()) <> 24 then raise exception 'FALLA: meses de retención'; end if;
  -- El super admin sí gestiona configuración, Grupos y asignaciones.
  update cp_config set valor = '15' where clave = 'muestra_minima';
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no cambia config'; end if;
  update cp_grupos set enviar_correo = false where slug = 'amarillo';
  get diagnostics n = row_count; if n <> 1 then raise exception 'FALLA: super admin no cambia Grupos'; end if;
  insert into cp_mentor_grupos (mentor_id, grupo_id) select m2, id from cp_grupos where slug = 'verde' on conflict do nothing;
  reset role;
  if exists (select 1 from cp_respondentes where respuesta_id = b_nombre) then raise exception 'FALLA: la identidad sobrevive al borrado'; end if;

  raise exception 'PRUEBAS_OK';
end $$;
