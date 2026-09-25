-- Reversión de cp_0006. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('cp_recalcular_sla', 'cp_revisar_r7');
  end if;
end $$;
drop trigger if exists cp_respuestas_alertas on cp_respuestas;
drop trigger if exists cp_respondentes_alertas on cp_respondentes;
drop trigger if exists cp_contactos_alertas on cp_contactos;
drop function if exists cp_metricas_sla(timestamptz, boolean);
drop function if exists cp_actualizar_alerta(uuid, cp_alerta_estado, text);
drop function if exists cp_alumnos_en_riesgo(boolean);
drop function if exists cp_historial_alumno(uuid);
drop function if exists cp_ver_identidad(uuid);
drop function if exists cp_bandeja(boolean);
drop function if exists cp_recalcular_sla();
drop function if exists cp_revisar_r7();
drop function if exists cp_tras_respuesta_anonima();
drop function if exists cp_tras_respuesta();
drop function if exists cp_evaluar_alertas(uuid);
drop function if exists cp_normalizar(text);
drop function if exists cp_sumar_horas_habiles(timestamptz, numeric);
delete from cp_alertas where respuesta_id is not null or regla = 'R7';
drop index if exists cp_alertas_respuesta_regla_idx;
alter table cp_alertas drop column if exists actualizado_en;
alter table cp_alertas drop column if exists notas;
alter table cp_alertas drop column if exists contacto_posible;
alter table cp_alertas drop column if exists respuesta_id;
