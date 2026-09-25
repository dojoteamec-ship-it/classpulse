-- Reversión de cp_0003. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
drop table if exists cp_respuestas_dedupe;
drop table if exists cp_contactos;
drop table if exists cp_respondentes;
drop table if exists cp_respuestas;
drop function if exists cp_conteo_respuestas(uuid[]);
drop function if exists cp_registrar_respuesta(uuid, text, jsonb, jsonb, jsonb, boolean);
drop type if exists cp_banda;
drop type if exists cp_asistencia;
drop type if exists cp_canal;
drop type if exists cp_modo_identidad;
drop type if exists cp_encuesta;
