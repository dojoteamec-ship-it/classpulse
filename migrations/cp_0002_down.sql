-- Reversión de cp_0002. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('cp_cerrar_sesiones', 'cp_revisar_r6');
  end if;
end $$;
drop table if exists cp_alertas;
drop table if exists cp_sesion_sales;
drop table if exists cp_sesion_mentores;
drop table if exists cp_sesiones;
drop function if exists cp_sesiones_abiertas(text, boolean);
drop function if exists cp_revisar_r6(timestamptz);
drop function if exists cp_cerrar_vencidas();
drop function if exists cp_cerrar_sesion(uuid);
drop function if exists cp_abrir_sesion(uuid, cp_tipo_sesion, date, uuid[], text, uuid);
drop function if exists cp_semana_ab(date);
drop function if exists cp_es_mi_sesion(uuid);
drop type if exists cp_gravedad;
drop type if exists cp_alerta_estado;
drop type if exists cp_sesion_estado;
