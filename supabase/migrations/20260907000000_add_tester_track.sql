alter table public.profiles add column tester_xp integer not null default 0 check (tester_xp >= 0);

alter table public.missions drop constraint missions_track_check;
alter table public.missions add constraint missions_track_check check (track in ('frontend', 'backend', 'fullstack', 'tester'));

insert into public.missions (id, xp, prerequisite_ids, sort_order, requires_code_evidence, track) values
  ('qa-risk-based-testing', 50, '{}', 16, false, 'tester'),
  ('qa-validation-harness', 120, '{qa-risk-based-testing}', 17, true, 'tester'),
  ('qa-test-strategy', 190, '{qa-validation-harness}', 18, false, 'tester'),
  ('qa-regression-review', 260, '{qa-test-strategy}', 19, false, 'tester');

create or replace function public.award_track_xp()
returns trigger language plpgsql security definer set search_path = public as $$
declare mission_track text;
begin
  select track into mission_track from public.missions where id = new.mission_id;
  update public.profiles
  set frontend_xp = frontend_xp + case when mission_track = 'frontend' then new.awarded_xp else 0 end,
      backend_xp = backend_xp + case when mission_track = 'backend' then new.awarded_xp else 0 end,
      fullstack_xp = fullstack_xp + case when mission_track = 'fullstack' then new.awarded_xp else 0 end,
      tester_xp = tester_xp + case when mission_track = 'tester' then new.awarded_xp else 0 end
  where id = new.user_id;
  return new;
end;
$$;
