-- Reversión de cp_0005. Borra solo objetos cp_ (y sus datos). No toca ClassVote.
drop table if exists cp_aprobaciones;
drop function if exists cp_referencia_academia(date, boolean);
