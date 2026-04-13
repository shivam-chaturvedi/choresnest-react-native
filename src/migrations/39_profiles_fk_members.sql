-- Convert member-linked columns to uuid before pointing them at profiles
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_member_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE public.list_items DROP CONSTRAINT IF EXISTS list_items_added_by_id_fkey;
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_member_id_fkey;

UPDATE public.events
SET member_id = m.profile_id
FROM public.members m
WHERE public.events.member_id = m.id;

UPDATE public.events
SET member_id = NULL
WHERE member_id IS NOT NULL
  AND member_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.events
  ALTER COLUMN member_id TYPE uuid USING (NULLIF(member_id, '')::uuid);

UPDATE public.tasks
SET assignee_id = m.profile_id
FROM public.members m
WHERE public.tasks.assignee_id = m.id;

UPDATE public.tasks
SET assignee_id = NULL
WHERE assignee_id IS NOT NULL
  AND assignee_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.tasks
  ALTER COLUMN assignee_id TYPE uuid USING (NULLIF(assignee_id, '')::uuid);

UPDATE public.list_items
SET added_by_id = m.profile_id
FROM public.members m
WHERE public.list_items.added_by_id = m.id;

UPDATE public.list_items
SET added_by_id = NULL
WHERE added_by_id IS NOT NULL
  AND added_by_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.list_items
  ALTER COLUMN added_by_id TYPE uuid USING (NULLIF(added_by_id, '')::uuid);

UPDATE public.documents
SET member_id = m.profile_id
FROM public.members m
WHERE public.documents.member_id = m.id;

UPDATE public.documents
SET member_id = NULL
WHERE member_id IS NOT NULL
  AND member_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
ALTER TABLE public.documents
  ALTER COLUMN member_id TYPE uuid USING (NULLIF(member_id, '')::uuid);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_member_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.list_items DROP CONSTRAINT IF EXISTS list_items_added_by_id_fkey;
ALTER TABLE public.list_items
  ADD CONSTRAINT list_items_added_by_id_fkey FOREIGN KEY (added_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_member_id_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
