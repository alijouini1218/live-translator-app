-- Live Translator Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_lang text,
  target_lang text not null,
  mode text not null check (mode in ('live', 'ptt')),
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_ms bigint,
  characters int default 0,
  cost_cents int default 0,
  created_at timestamptz default now()
);

-- Create transcripts table
create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  t0_ms int not null,
  t1_ms int not null,
  source_text text,
  target_text text,
  created_at timestamptz default now()
);

-- Enable RLS (Row Level Security)
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.transcripts enable row level security;

-- Create RLS policies for profiles
create policy if not exists "Users can view own profile"
on public.profiles for select using (auth.uid() = id);

create policy if not exists "Users can update own profile"
on public.profiles for update using (auth.uid() = id);

create policy if not exists "Users can insert own profile"
on public.profiles for insert with check (auth.uid() = id);

-- Create RLS policies for sessions
create policy if not exists "Users can manage own sessions"
on public.sessions for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Create RLS policies for transcripts
create policy if not exists "Users can manage own transcripts"
on public.transcripts for all using (
  exists (
    select 1 from public.sessions s 
    where s.id = session_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.sessions s 
    where s.id = session_id and s.user_id = auth.uid()
  )
);

-- Create indexes for better performance
create index if not exists idx_profiles_id on public.profiles(id);
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_created_at on public.sessions(created_at);
create index if not exists idx_transcripts_session_id on public.transcripts(session_id);

-- Create function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at trigger to profiles
drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Create view for session statistics
create or replace view public.session_stats as
select 
  user_id,
  count(*) as total_sessions,
  sum(duration_ms) as total_duration_ms,
  sum(characters) as total_characters,
  sum(cost_cents) as total_cost_cents,
  avg(duration_ms) as avg_duration_ms,
  count(case when mode = 'live' then 1 end) as live_sessions,
  count(case when mode = 'ptt' then 1 end) as ptt_sessions
from public.sessions
where ended_at is not null
group by user_id;

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;