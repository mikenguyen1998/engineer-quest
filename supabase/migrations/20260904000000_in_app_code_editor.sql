alter table public.mission_attempts
  add column html_code text,
  add column css_code text,
  add column javascript_code text;

create function public.submit_code_challenge(p_mission_id text, p_answer text, p_reflection text, p_html_code text, p_css_code text default null, p_javascript_code text default null, p_ai_feedback text default null)
returns table(total_xp integer, level text, completed_at timestamptz, awarded_xp integer)
language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); selected_mission public.missions%rowtype; inserted_attempt public.mission_attempts%rowtype; updated_profile public.profiles%rowtype;
begin
  if current_user_id is null then raise exception 'You must be signed in to submit a challenge'; end if;
  if length(trim(p_answer)) = 0 or length(trim(p_reflection)) = 0 then raise exception 'Answer and self-review are required'; end if;
  if length(trim(p_html_code)) = 0 or length(trim(p_javascript_code)) = 0 then raise exception 'HTML and JavaScript are required for this code challenge'; end if;
  select * into selected_mission from public.missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;
  insert into public.mission_attempts (user_id, mission_id, answer, reflection, awarded_xp, html_code, css_code, javascript_code, ai_feedback)
  values (current_user_id, p_mission_id, trim(p_answer), trim(p_reflection), selected_mission.xp, trim(p_html_code), nullif(trim(p_css_code), ''), trim(p_javascript_code), nullif(trim(p_ai_feedback), ''))
  on conflict (user_id, mission_id) do nothing returning * into inserted_attempt;
  if not found then raise exception 'This challenge has already been submitted'; end if;
  update public.profiles as profile set total_xp = profile.total_xp + selected_mission.xp, level = case when profile.total_xp + selected_mission.xp >= 1500 then 'Expert' when profile.total_xp + selected_mission.xp >= 750 then 'Senior' when profile.total_xp + selected_mission.xp >= 250 then 'Mid' else 'Fresher' end, updated_at = now() where profile.id = current_user_id returning * into updated_profile;
  return query select updated_profile.total_xp, updated_profile.level, inserted_attempt.completed_at, inserted_attempt.awarded_xp;
end; $$;

revoke all on function public.submit_code_challenge(text, text, text, text, text, text, text) from public;
grant execute on function public.submit_code_challenge(text, text, text, text, text, text, text) to authenticated;
