insert into public.missions (id, xp, prerequisite_ids, sort_order, requires_code_evidence, track) values
  ('wf-semantic-profile', 25, '{}', 20, true, 'frontend'),
  ('wf-responsive-card', 30, '{wf-semantic-profile}', 21, true, 'frontend'),
  ('wf-accessible-form', 35, '{wf-responsive-card}', 22, true, 'frontend'),
  ('wf-theme-toggle', 35, '{wf-accessible-form}', 23, true, 'frontend'),
  ('wf-task-list', 40, '{wf-theme-toggle}', 24, true, 'frontend'),
  ('wf-mini-project', 60, '{wf-task-list}', 25, true, 'frontend')
on conflict (id) do update set xp = excluded.xp, prerequisite_ids = excluded.prerequisite_ids, sort_order = excluded.sort_order, requires_code_evidence = excluded.requires_code_evidence, track = excluded.track;
