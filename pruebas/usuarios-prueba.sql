-- Accesos de las cuentas de prueba (local y producción). Idempotente.
-- Las cuentas se crean antes en Auth (en producción, con la API de Auth).
-- Solo escribe en tablas cp_.
insert into cp_acceso (mentor_id, rol, es_prueba)
select m.id, v.rol::cp_rol, true
from (values
  ('classpulse.prueba.mentor1@example.com', 'mentor'),
  ('classpulse.prueba.mentor2@example.com', 'mentor'),
  ('classpulse.prueba.coach@example.com', 'coach'),
  ('classpulse.prueba.admin@example.com', 'super_admin')
) as v (email, rol)
join mentores m on m.email = v.email
on conflict (mentor_id) do update set rol = excluded.rol, es_prueba = true;

insert into cp_mentor_grupos (mentor_id, grupo_id)
select m.id, g.id
from (values
  ('classpulse.prueba.mentor1@example.com', 'amarillo'),
  ('classpulse.prueba.mentor2@example.com', 'naranja')
) as v (email, slug)
join mentores m on m.email = v.email
join cp_grupos g on g.slug = v.slug
on conflict do nothing;
