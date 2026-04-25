-- =====================================================================
-- Инициализация схемы: profiles + calculator_state + RLS + триггеры
-- =====================================================================
-- Применить:
--   1. Supabase Dashboard -> ваш проект -> SQL Editor -> New query.
--   2. Вставить ВЕСЬ этот файл -> нажать Run.
--   3. Скрипт идемпотентен — можно перезапускать.
--
-- Что создаёт скрипт:
--   - Таблица public.profiles — связь 1:1 с auth.users (id, email, created_at).
--   - Таблица public.calculator_state — последнее состояние калькулятора
--     для каждого пользователя.
--   - Row Level Security и политики "только своё" (CRUD) на обеих таблицах.
--   - Триггер автосоздания profiles при регистрации в auth.users.
--   - Триггер автообновления updated_at на calculator_state.
--   - Backfill profiles для уже существующих пользователей.
-- =====================================================================


-- =====================================================================
-- I. Таблица profiles
-- =====================================================================

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Дополнительные данные о пользователе сверх auth.users. Связь 1:1 по id.';

-- Базовые GRANT-привилегии (см. блок про calculator_state ниже).
grant select, insert, update, delete on public.profiles
  to anon, authenticated, service_role;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles
  for delete
  using (auth.uid() = id);


-- Триггер: автосоздание profiles при регистрации нового пользователя.
-- security definer нужен для записи в public из контекста auth.users.
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


-- Backfill: профили для уже существующих пользователей.
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
where u.email is not null
on conflict (id) do nothing;


-- =====================================================================
-- II. Таблица calculator_state
-- =====================================================================

create table if not exists public.calculator_state (
  user_id             uuid        primary key references auth.users(id) on delete cascade,
  display             text        not null default '0',
  accumulator         text,
  operator            text,
  waiting_for_operand boolean     not null default false,
  has_user_input      boolean     not null default false,
  last_operator       text,
  last_operand        text,
  updated_at          timestamptz not null default now()
);

comment on table public.calculator_state is
  'Последнее состояние калькулятора пользователя. 1 строка на пользователя.';

-- Базовые GRANT-привилегии. Без них клиент получит 42501 "permission denied"
-- ещё до проверки RLS (RLS работает поверх GRANT'ов, а не вместо них).
-- Для таблиц, созданных через dashboard UI, эти GRANT'ы иногда не
-- проставляются автоматически — поэтому проставляем явно.
grant select, insert, update, delete on public.calculator_state
  to anon, authenticated, service_role;

alter table public.calculator_state enable row level security;

drop policy if exists "calculator_state_select_own" on public.calculator_state;
create policy "calculator_state_select_own"
  on public.calculator_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "calculator_state_insert_own" on public.calculator_state;
create policy "calculator_state_insert_own"
  on public.calculator_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "calculator_state_update_own" on public.calculator_state;
create policy "calculator_state_update_own"
  on public.calculator_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calculator_state_delete_own" on public.calculator_state;
create policy "calculator_state_delete_own"
  on public.calculator_state
  for delete
  using (auth.uid() = user_id);


-- Триггер: автообновление updated_at при каждом UPDATE.
create or replace function public.set_calculator_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists calculator_state_set_updated_at on public.calculator_state;
create trigger calculator_state_set_updated_at
  before update on public.calculator_state
  for each row execute function public.set_calculator_state_updated_at();


-- =====================================================================
-- III. Проверка
-- =====================================================================
-- Supabase SQL Editor показывает в Results только последний SELECT —
-- это нормально. Чтобы увидеть остальные, выделите блок и нажмите Run.

-- Обе таблицы должны присутствовать.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'calculator_state')
order by table_name;

-- Должно быть 8 политик (по 4 на каждую таблицу).
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'calculator_state')
order by tablename, policyname;

-- Должно показать 2 триггера.
select tgname, tgrelid::regclass as table_name
from pg_trigger
where tgname in ('on_auth_user_created', 'calculator_state_set_updated_at')
order by tgname;
