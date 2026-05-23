create table if not exists access_log (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  path         text not null,
  granted      boolean not null default false,
  attempted_at timestamptz not null default now()
);

alter table access_log enable row level security;

create policy "insert own attempt"
  on access_log for insert
  with check (auth.uid() = user_id);

create policy "super_admin reads all"
  on access_log for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and clearance_level >= 10
    )
  );
