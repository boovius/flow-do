-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists dos (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  title        text        not null,
  time_unit    text        not null check (time_unit in ('today', 'week', 'month', 'season', 'year', 'multi_year')),
  completed    boolean     not null default false,
  completed_at timestamptz,
  days_in_unit integer     not null default 0,  -- staleness: days in this unit without completion
  flow_count   integer     not null default 0,  -- how many times this do has flowed up
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Row Level Security
alter table dos enable row level security;

create policy "Users can view their own dos"
  on dos for select using (auth.uid() = user_id);

create policy "Users can create their own dos"
  on dos for insert with check (auth.uid() = user_id);

create policy "Users can update their own dos"
  on dos for update using (auth.uid() = user_id);

create policy "Users can delete their own dos"
  on dos for delete using (auth.uid() = user_id);

-- Auto-update updated_at on row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger dos_updated_at
  before update on dos
  for each row execute function update_updated_at();
