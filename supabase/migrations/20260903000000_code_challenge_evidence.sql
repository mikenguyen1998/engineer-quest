alter table public.missions add column requires_code_evidence boolean not null default false;
alter table public.mission_attempts
  add column repository_url text,
  add column demo_url text,
  add column test_result text,
  add column ai_feedback text;

update public.missions set requires_code_evidence = true
where id in ('fe-semantic-form', 'fe-accessible-filter', 'be-error-contract', 'fs-resilient-submit');

create or replace function public.complete_mission(p_mission_id text, p_answer text, p_reflection text)
returns table(total_xp integer, level text, completed_at timestamptz, awarded_xp integer)
language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); selected_mission public.missions%rowtype; inserted_attempt public.mission_attempts%rowtype; updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then raise exception 'You must be signed in to complete a mission'; end if;
  if length(trim(p_answer)) = 0 or length(trim(p_reflection)) = 0 then raise exception 'Answer and self-review are required'; end if;
  select * into selected_mission from public.missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;
  insert into public.mission_attempts (user_id, mission_id, answer, reflection, awarded_xp) values (current_user_id, p_mission_id, trim(p_answer), trim(p_reflection), selected_mission.xp) on conflict (user_id, mission_id) do nothing returning * into inserted_attempt;
  if not found then raise exception 'This mission has already been completed'; end if;
  update public.profiles as profile set total_xp = profile.total_xp + selected_mission.xp, level = case when profile.total_xp + selected_mission.xp >= 1500 then 'Expert' when profile.total_xp + selected_mission.xp >= 750 then 'Senior' when profile.total_xp + selected_mission.xp >= 250 then 'Mid' else 'Fresher' end, updated_at = now() where profile.id = current_user_id returning * into updated_profile;
  return query select updated_profile.total_xp, updated_profile.level, inserted_attempt.completed_at, inserted_attempt.awarded_xp;
end; $$;

create function public.submit_challenge(p_mission_id text, p_answer text, p_reflection text, p_repository_url text default null, p_demo_url text default null, p_test_result text default null, p_ai_feedback text default null)
returns table(total_xp integer, level text, completed_at timestamptz, awarded_xp integer)
language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); selected_mission public.missions%rowtype; inserted_attempt public.mission_attempts%rowtype; updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then raise exception 'You must be signed in to submit a challenge'; end if;
  if length(trim(p_answer)) = 0 or length(trim(p_reflection)) = 0 then raise exception 'Answer and self-review are required'; end if;
  select * into selected_mission from public.missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;
  if selected_mission.requires_code_evidence and (p_repository_url is null or length(trim(p_repository_url)) = 0 or p_test_result is null or length(trim(p_test_result)) = 0) then raise exception 'This code challenge requires a repository link and test result'; end if;
  insert into public.mission_attempts (user_id, mission_id, answer, reflection, awarded_xp, repository_url, demo_url, test_result, ai_feedback)
  values (current_user_id, p_mission_id, trim(p_answer), trim(p_reflection), selected_mission.xp, nullif(trim(p_repository_url), ''), nullif(trim(p_demo_url), ''), nullif(trim(p_test_result), ''), nullif(trim(p_ai_feedback), ''))
  on conflict (user_id, mission_id) do nothing returning * into inserted_attempt;
  if not found then raise exception 'This challenge has already been submitted'; end if;
  update public.profiles as profile set total_xp = profile.total_xp + selected_mission.xp, level = case when profile.total_xp + selected_mission.xp >= 1500 then 'Expert' when profile.total_xp + selected_mission.xp >= 750 then 'Senior' when profile.total_xp + selected_mission.xp >= 250 then 'Mid' else 'Fresher' end, updated_at = now() where profile.id = current_user_id returning * into updated_profile;
  return query select updated_profile.total_xp, updated_profile.level, inserted_attempt.completed_at, inserted_attempt.awarded_xp;
end; $$;

revoke all on function public.submit_challenge(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_challenge(text, text, text, text, text, text, text) to authenticated;
