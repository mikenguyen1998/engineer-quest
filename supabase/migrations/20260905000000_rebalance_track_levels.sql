update public.missions set requires_code_evidence = false where id = 'be-error-contract';

create function public.set_profile_level()
returns trigger language plpgsql set search_path = public as $$
begin
  new.level := case
    when new.total_xp >= 1200 then 'Expert'
    when new.total_xp >= 600 then 'Senior'
    when new.total_xp >= 200 then 'Mid'
    else 'Fresher'
  end;
  return new;
end;
$$;

create trigger profiles_set_level
  before insert or update of total_xp on public.profiles
  for each row execute procedure public.set_profile_level();

update public.profiles set total_xp = total_xp;
