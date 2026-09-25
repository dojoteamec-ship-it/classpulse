-- Migración deliberadamente inválida: el verificador debe rechazar cada línea.
alter table mentores add column x int;
create policy "p" on cinturones for select using (true);
update mentores set estado = 'activo';
delete from votos;
create index cp_idx on temas (id);
grant select on mentores to anon;
drop table if exists cp_a, ciclos_semanales;
create trigger cp_t after insert on auth.users for each row execute function cp_f();
select cron.schedule('classvote-x', '* * * * *', $$select 1$$);
create or replace function crear_mentor_desde_auth() returns trigger language plpgsql as $$ begin insert into mentores values (1); return new; end $$;
alter default privileges in schema public grant all on tables to anon;
alter publication supabase_realtime add table cp_x;
