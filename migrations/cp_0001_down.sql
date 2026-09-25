-- Reversión de cp_0001. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
-- Correr solo si se quiere desinstalar ClassPulse por completo desde esta fase.
drop function if exists cp_auditar(text, text, jsonb);
drop function if exists cp_cuentas_classvote();
drop function if exists cp_directorio();
drop function if exists cp_puede_abrir(uuid);
drop table if exists cp_auditoria;
drop table if exists cp_config;
drop table if exists cp_horarios;
drop table if exists cp_mentor_grupos;
drop table if exists cp_grupos;
drop table if exists cp_acceso;
drop function if exists cp_es_super_admin();
drop function if exists cp_es_coach();
drop function if exists cp_tiene_acceso();
drop function if exists cp_mi_rol();
drop function if exists cp_mi_mentor_id();
drop type if exists cp_tipo_sesion;
drop type if exists cp_grupo_tipo;
drop type if exists cp_rol;
