-- Deterministic proposal generation from measured Google Search Console data.
create or replace function public.generate_gsc_proposals(p_workspace_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_connected boolean := false;
  v_metric_rows integer := 0;
  v_created integer := 0;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = p_workspace_id
      and m.user_id = v_user
      and m.role in ('owner','editor')
  ) then
    raise exception 'Owner or editor role required';
  end if;

  select exists (
    select 1
    from public.integrations i
    where i.workspace_id = p_workspace_id
      and i.provider = 'gsc'
      and i.status = 'connected'
  ) into v_connected;

  if not v_connected then
    return jsonb_build_object(
      'status','blocked',
      'reason','gsc_not_connected',
      'created',0
    );
  end if;

  select count(*)::integer
  into v_metric_rows
  from public.site_metrics_daily m
  where m.workspace_id = p_workspace_id
    and m.source = 'gsc'
    and m.date >= current_date - 27;

  if v_metric_rows = 0 then
    return jsonb_build_object(
      'status','blocked',
      'reason','no_measured_gsc_data',
      'created',0
    );
  end if;

  with measured as (
    select
      s.id as site_id,
      s.name,
      s.primary_keyword,
      coalesce(sum(m.impressions) filter (where m.date >= current_date - 13),0)::bigint as current_impressions,
      coalesce(sum(m.clicks) filter (where m.date >= current_date - 13),0)::bigint as current_clicks,
      coalesce(sum(m.impressions) filter (where m.date between current_date - 27 and current_date - 14),0)::bigint as previous_impressions,
      coalesce(sum(m.clicks) filter (where m.date between current_date - 27 and current_date - 14),0)::bigint as previous_clicks,
      round(
        (sum(m.avg_position * m.impressions) filter (where m.date >= current_date - 13)) /
        nullif(sum(m.impressions) filter (where m.date >= current_date - 13),0),
        2
      ) as current_position,
      round(
        (sum(m.avg_position * m.impressions) filter (where m.date between current_date - 27 and current_date - 14)) /
        nullif(sum(m.impressions) filter (where m.date between current_date - 27 and current_date - 14),0),
        2
      ) as previous_position
    from public.sites s
    join public.site_metrics_daily m
      on m.site_id = s.id
     and m.workspace_id = s.workspace_id
     and m.source = 'gsc'
     and m.date >= current_date - 27
    where s.workspace_id = p_workspace_id
      and not s.archived
    group by s.id,s.name,s.primary_keyword
  ), candidates as (
    select
      site_id,
      'position_decline'::text as rule,
      'Recover declining organic position for ' || name as title,
      format(
        'Measured Search Console average position worsened from %s to %s in the latest 14 days versus the prior 14 days. Review the affected queries and landing pages before editing content.',
        previous_position,
        current_position
      ) as rationale,
      nullif(primary_keyword,'') as target_keyword,
      jsonb_build_object(
        'rule','position_decline',
        'window_days',14,
        'current',jsonb_build_object('impressions',current_impressions,'clicks',current_clicks,'avg_position',current_position),
        'previous',jsonb_build_object('impressions',previous_impressions,'clicks',previous_clicks,'avg_position',previous_position)
      ) as evidence
    from measured
    where current_impressions >= 100
      and previous_impressions >= 100
      and current_position is not null
      and previous_position is not null
      and current_position - previous_position >= 2

    union all

    select
      site_id,
      'low_ctr'::text,
      'Improve organic CTR for ' || name,
      format(
        'Measured Search Console CTR is %s%% across %s impressions in the latest 14 days with average position %s. Review titles, descriptions, query intent and page alignment before drafting changes.',
        round((current_clicks::numeric / nullif(current_impressions,0)) * 100,2),
        current_impressions,
        current_position
      ),
      nullif(primary_keyword,''),
      jsonb_build_object(
        'rule','low_ctr',
        'window_days',14,
        'current',jsonb_build_object('impressions',current_impressions,'clicks',current_clicks,'ctr',round(current_clicks::numeric / nullif(current_impressions,0),4),'avg_position',current_position)
      )
    from measured
    where current_impressions >= 250
      and current_position between 3 and 20
      and current_clicks::numeric / nullif(current_impressions,0) < 0.02

    union all

    select
      site_id,
      'click_drop'::text,
      'Investigate organic click decline for ' || name,
      format(
        'Measured Search Console clicks fell from %s to %s in the latest 14 days versus the prior 14 days. Investigate query and landing-page changes before proposing content edits.',
        previous_clicks,
        current_clicks
      ),
      nullif(primary_keyword,''),
      jsonb_build_object(
        'rule','click_drop',
        'window_days',14,
        'current',jsonb_build_object('impressions',current_impressions,'clicks',current_clicks,'avg_position',current_position),
        'previous',jsonb_build_object('impressions',previous_impressions,'clicks',previous_clicks,'avg_position',previous_position)
      )
    from measured
    where previous_clicks >= 20
      and current_clicks <= floor(previous_clicks * 0.70)
  )
  insert into public.proposals(
    workspace_id,
    site_id,
    title,
    rationale,
    target_keyword,
    evidence,
    source,
    fingerprint,
    status,
    created_by
  )
  select
    p_workspace_id,
    c.site_id,
    c.title,
    c.rationale,
    c.target_keyword,
    c.evidence,
    'measured_gsc',
    md5(p_workspace_id::text || '|' || c.site_id::text || '|' || c.rule || '|' || date_trunc('week',current_date)::date::text),
    'proposed',
    v_user
  from candidates c
  on conflict (workspace_id,fingerprint) do nothing;

  get diagnostics v_created = row_count;

  return jsonb_build_object(
    'status','ok',
    'reason','measured_gsc_analysis_complete',
    'metric_rows',v_metric_rows,
    'created',v_created
  );
end;
$$;

revoke all on function public.generate_gsc_proposals(uuid) from public;
grant execute on function public.generate_gsc_proposals(uuid) to authenticated;
