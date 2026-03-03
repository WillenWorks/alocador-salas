-- Blueprint Brutalista — migração Supabase (JSONB por usuário)

begin;

create table if not exists public.app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
before update on public.app_data
for each row execute function public.set_updated_at();

alter table public.app_data enable row level security;

drop policy if exists "app_data_select_own" on public.app_data;
create policy "app_data_select_own"
  on public.app_data
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "app_data_insert_own" on public.app_data;
create policy "app_data_insert_own"
  on public.app_data
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "app_data_update_own" on public.app_data;
create policy "app_data_update_own"
  on public.app_data
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
