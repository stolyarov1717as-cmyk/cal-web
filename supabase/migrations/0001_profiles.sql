-- =====================================================================
-- Миграция: таблица profiles + RLS + автозаполнение при регистрации
-- =====================================================================
-- Как применить:
--   1. Открыть Supabase Dashboard -> ваш проект -> SQL Editor.
--   2. Нажать "New query", вставить ВЕСЬ этот файл целиком.
--   3. Нажать "Run". Скрипт идемпотентен — можно запускать повторно.
--   4. Внизу есть проверочные SELECT-ы: посмотрите вкладку Results.
--
-- Что делает скрипт:
--   - создаёт таблицу public.profiles, привязанную к auth.users по id;
--   - включает Row Level Security и политики "только своё" (CRUD);
--   - вешает триггер на auth.users, чтобы при регистрации автоматически
--     создавалась строка в profiles;
--   - выполняет backfill: если пользователи уже есть в auth.users,
--     создаёт для них профили.
-- =====================================================================


-- 1. Таблица профилей --------------------------------------------------
create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Дополнительные данные о пользователе сверх auth.users. Связь 1:1 по id.';


-- 2. Row Level Security ------------------------------------------------
alter table public.profiles enable row level security;

-- SELECT: пользователь видит только свою строку.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- INSERT: можно создать строку только со своим id.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- UPDATE: можно менять только свою строку, и id менять нельзя.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- DELETE: можно удалить только свою строку.
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = id);


-- 3. Триггер: автосоздание профиля при регистрации --------------------
-- security definer: функция выполняется с правами владельца, что нужно
-- для записи в public.profiles в обход RLS из контекста auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 4. Backfill: профили для уже существующих пользователей -------------
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
where u.email is not null
on conflict (id) do nothing;


-- 5. Проверка ---------------------------------------------------------
-- Должно вернуть строки, если в проекте уже есть пользователи.
select id, email, created_at
from public.profiles
order by created_at desc
limit 10;

-- Должно показать 4 политики: select / insert / update / delete.
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;

-- Должно показать триггер on_auth_user_created на таблице auth.users.
select tgname, tgrelid::regclass as table_name
from pg_trigger
where tgname = 'on_auth_user_created';
