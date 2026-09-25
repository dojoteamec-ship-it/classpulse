-- Shim mínimo de Supabase para probar migraciones en un Postgres local
-- (mismo enfoque que ClassVote, docs/06). No se corre en producción.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
-- Igual que Supabase: lee el sub del JWT desde la configuración de la sesión.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase da estos privilegios por defecto a las tablas nuevas de public;
-- por eso cada migración cp_ revoca explícitamente lo que no corresponde.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create publication supabase_realtime;
