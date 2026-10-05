-- Secure GSC OAuth credential storage in Supabase Vault.
create or replace function public.store_gsc_credentials(
  p_workspace_id uuid,
  p_client_id text,
  p_client_secret text,
  p_refresh_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_name text;
  v_secret_id uuid;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_user
      and m.role in ('owner','editor')
  ) then
    raise exception 'Owner or editor role required';
  end if;
  if coalesce(length(p_client_id),0) < 8
     or coalesce(length(p_client_secret),0) < 8
     or coalesce(length(p_refresh_token),0) < 8 then
    raise exception 'Incomplete GSC credentials';
  end if;

  v_name := 'index:gsc:' || p_workspace_id::text || ':client_id';
  select id into v_secret_id from vault.secrets where name = v_name;
  if v_secret_id is null then
    perform vault.create_secret(p_client_id,v_name,'INDEX Google OAuth client id',null);
  else
    perform vault.update_secret(v_secret_id,p_client_id,null,null,null);
  end if;

  v_name := 'index:gsc:' || p_workspace_id::text || ':client_secret';
  select id into v_secret_id from vault.secrets where name = v_name;
  if v_secret_id is null then
    perform vault.create_secret(p_client_secret,v_name,'INDEX Google OAuth client secret',null);
  else
    perform vault.update_secret(v_secret_id,p_client_secret,null,null,null);
  end if;

  v_name := 'index:gsc:' || p_workspace_id::text || ':refresh_token';
  select id into v_secret_id from vault.secrets where name = v_name;
  if v_secret_id is null then
    perform vault.create_secret(p_refresh_token,v_name,'INDEX Google Search Console refresh token',null);
  else
    perform vault.update_secret(v_secret_id,p_refresh_token,null,null,null);
  end if;

  insert into public.integrations(workspace_id,provider,status,last_synced_at)
  values(p_workspace_id,'gsc','connected',null)
  on conflict(workspace_id,provider)
  do update set status='connected';
end;
$$;

revoke all on function public.store_gsc_credentials(uuid,text,text,text) from public;
grant execute on function public.store_gsc_credentials(uuid,text,text,text) to authenticated;

create or replace function public.service_gsc_credentials(p_workspace_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'client_id', max(decrypted_secret) filter (where name = 'index:gsc:' || p_workspace_id::text || ':client_id'),
    'client_secret', max(decrypted_secret) filter (where name = 'index:gsc:' || p_workspace_id::text || ':client_secret'),
    'refresh_token', max(decrypted_secret) filter (where name = 'index:gsc:' || p_workspace_id::text || ':refresh_token')
  )
  from vault.decrypted_secrets
  where name in (
    'index:gsc:' || p_workspace_id::text || ':client_id',
    'index:gsc:' || p_workspace_id::text || ':client_secret',
    'index:gsc:' || p_workspace_id::text || ':refresh_token'
  );
$$;

revoke all on function public.service_gsc_credentials(uuid) from public;
revoke all on function public.service_gsc_credentials(uuid) from anon;
revoke all on function public.service_gsc_credentials(uuid) from authenticated;
grant execute on function public.service_gsc_credentials(uuid) to service_role;

create or replace function public.disconnect_gsc(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_user
      and m.role = 'owner'
  ) then
    raise exception 'Owner role required';
  end if;

  delete from vault.secrets
  where name in (
    'index:gsc:' || p_workspace_id::text || ':client_id',
    'index:gsc:' || p_workspace_id::text || ':client_secret',
    'index:gsc:' || p_workspace_id::text || ':refresh_token'
  );

  insert into public.integrations(workspace_id,provider,status,last_synced_at)
  values(p_workspace_id,'gsc','disconnected',null)
  on conflict(workspace_id,provider)
  do update set status='disconnected',last_synced_at=null,property_id=null;
end;
$$;

revoke all on function public.disconnect_gsc(uuid) from public;
grant execute on function public.disconnect_gsc(uuid) to authenticated;
