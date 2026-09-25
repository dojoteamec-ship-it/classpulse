-- Solo local: simula las cuentas de prueba en auth.users (el trigger de
-- ClassVote crea su fila en mentores) y las cuentas reales de Santi y Mike.
insert into auth.users (id, email, raw_user_meta_data) values
  ('207b4777-2b61-45b7-a026-c436bd66e2b6', 'santiago.jimenez.ec@gmail.com', '{"nombre":"Santiago Jiménez"}'),
  ('4e2cf961-7e19-483c-9bba-8f1d1f2c4586', 'dojo.team.ec@gmail.com', '{"nombre":"Dojo Team"}'),
  ('00000000-0000-4000-8000-00000000c001', 'classpulse.prueba.mentor1@example.com', '{"nombre":"PRUEBA CP Mentor Uno"}'),
  ('00000000-0000-4000-8000-00000000c002', 'classpulse.prueba.mentor2@example.com', '{"nombre":"PRUEBA CP Mentor Dos"}'),
  ('00000000-0000-4000-8000-00000000c003', 'classpulse.prueba.coach@example.com', '{"nombre":"PRUEBA CP Coach"}'),
  ('00000000-0000-4000-8000-00000000c004', 'classpulse.prueba.admin@example.com', '{"nombre":"PRUEBA CP Super Admin"}'),
  ('00000000-0000-4000-8000-00000000c005', 'classpulse.prueba.sinacceso@example.com', '{"nombre":"PRUEBA CP Sin Acceso"}')
on conflict (id) do nothing;
