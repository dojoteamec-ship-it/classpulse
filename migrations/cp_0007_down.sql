-- Reversión de cp_0007. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
drop table if exists cp_acciones;
drop function if exists cp_acciones_antes_de_guardar();
drop function if exists cp_medir_accion(uuid);
drop function if exists cp_medir(text, uuid, uuid, cp_tipo_sesion, date, date, boolean);
drop type if exists cp_estado_pdca;
