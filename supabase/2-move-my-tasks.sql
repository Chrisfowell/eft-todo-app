-- EFT To-Do: copy Christian's open tasks and contacts across from the Claude version.
-- Run this ONCE, AFTER you have signed up in the app for the first time
-- (it gives the tasks to the first account created).

with me as (select id from auth.users order by created_at limit 1)
insert into public.contacts (name, created_by)
select 'Mark Tootle', me.id from me
where not exists (select 1 from public.contacts where name = 'Mark Tootle');

with me as (select id from auth.users order by created_at limit 1)
insert into public.tasks (section, owner, title, type, job, priority, created_at)
select v.section, me.id, v.title, v.type, v.job, v.priority, v.created_at::timestamptz
from me, (values
  ('work', 'Substation 5 devices', 'other', 'Substation 5', 'high', '2026-11-16T11:23:37Z'),
  ('work', 'Take a download from the event log on J Block', 'service', 'J Block', 'normal', '2026-11-16T16:23:42Z'),
  ('work', 'Chase Paolo about breaking into Substation 9', 'other', 'Substation 9', 'normal', '2026-11-18T15:23:56Z')
) as v(section, title, type, job, priority, created_at)
where not exists (select 1 from public.tasks t where t.title = v.title);
