-- Reversión de cp_0008. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'cp_retencion';
  end if;
end $$;
drop function if exists cp_estado_cumplimiento();
drop function if exists cp_borrar_alumno(text, date, text, boolean);
drop table if exists cp_solicitudes_borrado;
drop function if exists cp_anonimizar_vencidas();
drop function if exists cp_registrar_buzon(text, cp_modo_identidad, jsonb, jsonb, boolean);
delete from cp_respuestas where encuesta = 'buzon';
