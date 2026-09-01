create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  level text not null default 'Fresher' check (level in ('Fresher', 'Mid', 'Senior', 'Expert')),
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id text primary key,
  xp integer not null check (xp > 0),
  prerequisite_ids text[] not null default '{}',
  sort_order integer not null unique
);

create table public.mission_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id text not null references public.missions(id),
  answer text not null check (length(trim(answer)) > 0),
  reflection text not null check (length(trim(reflection)) > 0),
  awarded_xp integer not null check (awarded_xp > 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create index mission_attempts_user_id_idx on public.mission_attempts(user_id);

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_attempts enable row level security;

revoke all on public.profiles, public.missions, public.mission_attempts from anon, authenticated;
grant select on public.profiles, public.missions, public.mission_attempts to authenticated;

create policy "Users read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Authenticated users read missions" on public.missions for select to authenticated using (true);
create policy "Users read their own attempts" on public.mission_attempts for select to authenticated using ((select auth.uid()) = user_id);

create function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create function public.complete_mission(p_mission_id text, p_answer text, p_reflection text)
returns table(total_xp integer, level text, completed_at timestamptz, awarded_xp integer)
language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  selected_mission public.missions%rowtype;
  inserted_attempt public.mission_attempts%rowtype;
  updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then raise exception 'You must be signed in to complete a mission'; end if;
  if length(trim(p_answer)) = 0 or length(trim(p_reflection)) = 0 then raise exception 'Answer and self-review are required'; end if;

  select * into selected_mission from public.missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;
  if exists (
    select 1 from unnest(selected_mission.prerequisite_ids) prerequisite_id
    where not exists (select 1 from public.mission_attempts a where a.user_id = current_user_id and a.mission_id = prerequisite_id)
  ) then raise exception 'Complete all mission prerequisites first'; end if;

  insert into public.mission_attempts (user_id, mission_id, answer, reflection, awarded_xp)
  values (current_user_id, p_mission_id, trim(p_answer), trim(p_reflection), selected_mission.xp)
  on conflict (user_id, mission_id) do nothing returning * into inserted_attempt;
  if not found then raise exception 'This mission has already been completed'; end if;

  update public.profiles as profile
  set total_xp = profile.total_xp + selected_mission.xp,
      level = case
        when profile.total_xp + selected_mission.xp >= 1500 then 'Expert'
        when profile.total_xp + selected_mission.xp >= 750 then 'Senior'
        when profile.total_xp + selected_mission.xp >= 250 then 'Mid'
        else 'Fresher'
      end,
      updated_at = now()
  where profile.id = current_user_id returning * into updated_profile;

  return query select updated_profile.total_xp, updated_profile.level, inserted_attempt.completed_at, inserted_attempt.awarded_xp;
end;
$$;

create function public.mark_legacy_imported()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  update public.profiles set imported_at = coalesce(imported_at, now()), updated_at = now() where id = auth.uid();
end;
$$;

revoke all on function public.complete_mission(text, text, text) from public;
revoke all on function public.mark_legacy_imported() from public;
grant execute on function public.complete_mission(text, text, text), public.mark_legacy_imported() to authenticated;

insert into public.missions (id, xp, prerequisite_ids, sort_order) values
  ('fe-state-tracing', 40, '{}', 1), ('fe-semantic-form', 50, '{fe-state-tracing}', 2), ('fe-hydration-debug', 80, '{fe-semantic-form}', 3), ('fe-accessible-filter', 100, '{fe-hydration-debug}', 4), ('fe-dashboard-design', 160, '{fe-accessible-filter}', 5), ('fe-incident-recovery', 240, '{fe-dashboard-design}', 6),
  ('be-error-contract', 50, '{}', 7), ('be-indexed-pagination', 100, '{be-error-contract}', 8), ('be-xp-idempotency', 120, '{be-indexed-pagination}', 9), ('be-outbox-retries', 170, '{be-xp-idempotency}', 10), ('be-threat-model', 240, '{be-outbox-retries}', 11),
  ('fs-feature-slice', 60, '{}', 12), ('fs-resilient-submit', 120, '{fs-feature-slice}', 13), ('fs-mission-contract', 180, '{fs-resilient-submit,fe-dashboard-design,be-xp-idempotency}', 14), ('fs-rollout-rollback', 260, '{fs-mission-contract}', 15);
