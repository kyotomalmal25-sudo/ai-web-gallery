-- AI Works / Supabase Database + RLS
-- Run this file in Supabase Dashboard > SQL Editor.

create table if not exists public.ai_works_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ai_works_admins enable row level security;
revoke all on table public.ai_works_admins from anon, authenticated;

create or replace function public.is_ai_works_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ai_works_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_ai_works_admin() from public;
grant execute on function public.is_ai_works_admin() to authenticated;

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ai text not null check (ai in ('GPT', 'Claude', 'Gemini', 'Grok', 'Qwen', 'その他')),
  model text not null,
  date date not null,
  type text not null default 'WEB WORK',
  prompt text not null default '',
  memo text not null default '',
  other_category text check (other_category is null or other_category in ('Kimi', 'Gemma', 'Other')),
  html_url text not null,
  html_path text,
  html_name text not null default 'index.html',
  html_media_type text not null default 'text/html',
  thumbnail_url text not null default '',
  thumbnail_path text,
  thumbnail_name text,
  thumbnail_media_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists works_set_updated_at on public.works;
create trigger works_set_updated_at
before update on public.works
for each row execute function public.set_updated_at();

alter table public.works enable row level security;
revoke all on table public.works from anon, authenticated;
grant select on table public.works to anon, authenticated;
grant insert, update, delete on table public.works to authenticated;

drop policy if exists "Public can read works" on public.works;
create policy "Public can read works"
on public.works for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert works" on public.works;
create policy "Admins can insert works"
on public.works for insert
to authenticated
with check ((select public.is_ai_works_admin()));

drop policy if exists "Admins can update works" on public.works;
create policy "Admins can update works"
on public.works for update
to authenticated
using ((select public.is_ai_works_admin()))
with check ((select public.is_ai_works_admin()));

drop policy if exists "Admins can delete works" on public.works;
create policy "Admins can delete works"
on public.works for delete
to authenticated
using ((select public.is_ai_works_admin()));

-- Create a PUBLIC bucket named "ai-works" in Storage before using these policies.
drop policy if exists "Admins can read ai-works objects" on storage.objects;
create policy "Admins can read ai-works objects"
on storage.objects for select
to authenticated
using (bucket_id = 'ai-works' and (select public.is_ai_works_admin()));

drop policy if exists "Admins can upload ai-works objects" on storage.objects;
create policy "Admins can upload ai-works objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'ai-works' and (select public.is_ai_works_admin()));

drop policy if exists "Admins can update ai-works objects" on storage.objects;
create policy "Admins can update ai-works objects"
on storage.objects for update
to authenticated
using (bucket_id = 'ai-works' and (select public.is_ai_works_admin()))
with check (bucket_id = 'ai-works' and (select public.is_ai_works_admin()));

drop policy if exists "Admins can delete ai-works objects" on storage.objects;
create policy "Admins can delete ai-works objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'ai-works' and (select public.is_ai_works_admin()));

-- After creating the Auth user, replace the UUID and run this separately:
-- insert into public.ai_works_admins (user_id) values ('AUTH_USER_UUID');
