begin;

alter table public.sites
  add column if not exists onboarding_mode text not null default 'connect' check(onboarding_mode in ('create','connect')),
  add column if not exists platform text not null default 'other' check(platform in ('nextjs','wordpress','static','webflow','other')),
  add column if not exists hosting_provider text,
  add column if not exists repo_url text,
  add column if not exists cms_url text,
  add column if not exists build_status text not null default 'connected' check(build_status in ('planned','provisioning','connected','live','blocked')),
  add column if not exists publisher_status text not null default 'not_configured' check(publisher_status in ('not_configured','ready','blocked')),
  add column if not exists notes text not null default '';

create table if not exists public.site_network_edges(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  source_site_id uuid not null,
  target_site_id uuid not null,
  relation text not null default 'supports' check(relation='supports'),
  anchor_text text not null default '',
  target_path text not null default '/',
  status text not null default 'planned' check(status in ('planned','active','paused')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(source_site_id,workspace_id) references public.sites(id,workspace_id) on delete cascade,
  foreign key(target_site_id,workspace_id) references public.sites(id,workspace_id) on delete cascade,
  check(source_site_id <> target_site_id),
  unique(workspace_id,source_site_id,target_site_id)
);

create index if not exists site_network_edges_workspace_idx on public.site_network_edges(workspace_id);
create index if not exists site_network_edges_source_idx on public.site_network_edges(source_site_id);
create index if not exists site_network_edges_target_idx on public.site_network_edges(target_site_id);

alter table public.site_network_edges enable row level security;
grant select,insert,update,delete on public.site_network_edges to authenticated;

create policy site_network_edges_read on public.site_network_edges
  for select to authenticated
  using(exists(select 1 from public.workspace_members m where m.workspace_id=site_network_edges.workspace_id and m.user_id=(select auth.uid())));
create policy site_network_edges_insert on public.site_network_edges
  for insert to authenticated
  with check(exists(select 1 from public.workspace_members m where m.workspace_id=site_network_edges.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')));
create policy site_network_edges_update on public.site_network_edges
  for update to authenticated
  using(exists(select 1 from public.workspace_members m where m.workspace_id=site_network_edges.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')))
  with check(exists(select 1 from public.workspace_members m where m.workspace_id=site_network_edges.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')));
create policy site_network_edges_delete on public.site_network_edges
  for delete to authenticated
  using(exists(select 1 from public.workspace_members m where m.workspace_id=site_network_edges.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor')));

create or replace function public.validate_site_network_edge() returns trigger
language plpgsql security invoker set search_path=''
as $$
declare source_tier int; target_tier int;
begin
  select tier into source_tier from public.sites where id=new.source_site_id and workspace_id=new.workspace_id;
  select tier into target_tier from public.sites where id=new.target_site_id and workspace_id=new.workspace_id;
  if source_tier is null or target_tier is null then
    raise exception 'Network edge sites must belong to the same workspace';
  end if;
  if source_tier <> target_tier + 1 then
    raise exception 'Tier network edges must move one level toward Tier 1';
  end if;
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function public.validate_site_network_edge() from public;
create trigger site_network_edges_validate before insert or update on public.site_network_edges
for each row execute function public.validate_site_network_edge();

commit;
