-- Reviewable editorial proposals; publishing is a separate, provider-backed action.
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  site_id uuid not null,
  title text not null check (length(title) between 5 and 240),
  rationale text not null check (length(rationale) between 10 and 4000),
  target_keyword text,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  source text not null default 'manual' check (source in ('manual', 'measured_gsc')),
  fingerprint text,
  status text not null default 'proposed' check (status in ('proposed','approved','rejected')),
  created_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (site_id,workspace_id) references public.sites(id,workspace_id) on delete cascade,
  unique (id,workspace_id),
  unique (workspace_id,fingerprint)
);
create index proposals_workspace_status_idx on public.proposals(workspace_id,status,created_at desc);
alter table public.proposals enable row level security;
create policy proposals_read on public.proposals for select to authenticated using (
  exists(select 1 from public.workspace_members m where m.workspace_id=proposals.workspace_id and m.user_id=(select auth.uid()))
);
create policy proposals_insert on public.proposals for insert to authenticated with check (
  status='proposed' and source='manual' and fingerprint is null and created_by=(select auth.uid()) and
  exists(select 1 from public.workspace_members m where m.workspace_id=proposals.workspace_id and m.user_id=(select auth.uid()) and m.role in ('owner','editor'))
);
create policy proposals_decide on public.proposals for update to authenticated using (
  status='proposed' and exists(select 1 from public.workspace_members m where m.workspace_id=proposals.workspace_id and m.user_id=(select auth.uid()) and m.role='owner')
) with check (
  status in ('approved','rejected') and decided_by=(select auth.uid()) and decided_at is not null and
  exists(select 1 from public.workspace_members m where m.workspace_id=proposals.workspace_id and m.user_id=(select auth.uid()) and m.role='owner')
);
grant select,insert on public.proposals to authenticated;
grant update(status,decided_by,decision_note,decided_at) on public.proposals to authenticated;
alter table public.content_items add column proposal_id uuid;
alter table public.content_items add constraint content_proposal_workspace_fk foreign key (proposal_id,workspace_id) references public.proposals(id,workspace_id);
create unique index content_items_proposal_once on public.content_items(proposal_id) where proposal_id is not null;
create policy content_requires_approval on public.content_items as restrictive for insert to authenticated with check (
  proposal_id is null or exists(select 1 from public.proposals p where p.id=proposal_id and p.workspace_id=content_items.workspace_id and p.site_id=content_items.site_id and p.status='approved')
);
