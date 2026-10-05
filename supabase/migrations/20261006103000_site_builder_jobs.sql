begin;

create table if not exists public.site_build_jobs(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  site_id uuid not null,
  status text not null default 'queued' check(status in ('queued','scaffolding','repo_ready','deploying','live','blocked','failed')),
  provider text not null default 'index',
  requested_by uuid references auth.users(id) on delete set null,
  repo_url text,
  deployment_url text,
  next_action text,
  last_error text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(site_id,workspace_id) references public.sites(id,workspace_id) on delete cascade
);

create index if not exists site_build_jobs_workspace_idx on public.site_build_jobs(workspace_id,created_at desc);
create index if not exists site_build_jobs_site_idx on public.site_build_jobs(site_id,created_at desc);

alter table public.site_build_jobs enable row level security;
grant select,insert,update on public.site_build_jobs to authenticated;

create policy site_build_jobs_read on public.site_build_jobs
  for select to authenticated
  using(exists(select 1 from public.workspace_members m where m.workspace_id=site_build_jobs.workspace_id and m.user_id=(select auth.uid())));

create policy site_build_jobs_insert on public.site_build_jobs
  for insert to authenticated
  with check(
    requested_by=(select auth.uid()) and
    exists(select 1 from public.workspace_members m where m.workspace_id=site_build_jobs.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor'))
  );

create policy site_build_jobs_update on public.site_build_jobs
  for update to authenticated
  using(exists(select 1 from public.workspace_members m where m.workspace_id=site_build_jobs.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')))
  with check(exists(select 1 from public.workspace_members m where m.workspace_id=site_build_jobs.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')));

create or replace function public.touch_site_build_job() returns trigger
language plpgsql security invoker set search_path=''
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function public.touch_site_build_job() from public;
create trigger site_build_jobs_touch before update on public.site_build_jobs
for each row execute function public.touch_site_build_job();

commit;
