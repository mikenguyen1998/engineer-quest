alter table public.profiles
  add column frontend_xp integer not null default 0 check (frontend_xp >= 0),
  add column backend_xp integer not null default 0 check (backend_xp >= 0),
  add column fullstack_xp integer not null default 0 check (fullstack_xp >= 0);

alter table public.missions add column track text;
update public.missions set track = case
  when id like 'fe-%' then 'frontend'
  when id like 'be-%' then 'backend'
  when id like 'fs-%' then 'fullstack'
end;
alter table public.missions alter column track set not null;
alter table public.missions add constraint missions_track_check check (track in ('frontend', 'backend', 'fullstack'));

create function public.award_track_xp()
returns trigger language plpgsql security definer set search_path = public as $$
declare mission_track text;
begin
  select track into mission_track from public.missions where id = new.mission_id;
  update public.profiles
  set frontend_xp = frontend_xp + case when mission_track = 'frontend' then new.awarded_xp else 0 end,
      backend_xp = backend_xp + case when mission_track = 'backend' then new.awarded_xp else 0 end,
      fullstack_xp = fullstack_xp + case when mission_track = 'fullstack' then new.awarded_xp else 0 end
  where id = new.user_id;
  return new;
end;
$$;

create trigger mission_attempts_award_track_xp
  after insert on public.mission_attempts
  for each row execute procedure public.award_track_xp();

update public.profiles profile
set frontend_xp = coalesce((select sum(attempt.awarded_xp) from public.mission_attempts attempt join public.missions mission on mission.id = attempt.mission_id where attempt.user_id = profile.id and mission.track = 'frontend'), 0),
    backend_xp = coalesce((select sum(attempt.awarded_xp) from public.mission_attempts attempt join public.missions mission on mission.id = attempt.mission_id where attempt.user_id = profile.id and mission.track = 'backend'), 0),
    fullstack_xp = coalesce((select sum(attempt.awarded_xp) from public.mission_attempts attempt join public.missions mission on mission.id = attempt.mission_id where attempt.user_id = profile.id and mission.track = 'fullstack'), 0);
