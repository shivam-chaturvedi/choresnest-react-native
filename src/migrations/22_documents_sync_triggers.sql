BEGIN;

-- Ensure profile_id is enforced and generated when missing, and updated_at/version stay in sync for manual edits.
ALTER TABLE public.documents
  ALTER COLUMN profile_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.documents_before_write_hook()
RETURNS trigger AS $$
DECLARE
  requester_id uuid;
BEGIN
  -- resolve the acting profile from the JWT if available
  BEGIN
    requester_id := auth.uid()::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    requester_id := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    IF NEW.profile_id IS NULL THEN
      IF requester_id IS NULL THEN
        RAISE EXCEPTION 'documents.profile_id cannot be null';
      END IF;
      NEW.profile_id := requester_id;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.deleted := COALESCE(NEW.deleted, false);
    NEW.version := COALESCE(NEW.version, 1);
  ELSE
    IF NEW.profile_id IS NULL THEN
      NEW.profile_id := COALESCE(OLD.profile_id, requester_id);
    END IF;
    NEW.version := COALESCE(NEW.version, COALESCE(OLD.version, 0)) + 1;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_before_write ON public.documents;
CREATE TRIGGER documents_before_write
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.documents_before_write_hook();

COMMIT;
