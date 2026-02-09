-- Migration 15: Relax notes insert policy to only enforce ownership via USING clause

-- Drop the existing insert policy so we can replace it
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;

-- Recreate the policy that uses the folder/owner check in the USING clause
-- but allows any record that satisfies the ownership check to be inserted (WITH CHECK TRUE).
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  WITH CHECK (
    auth.uid() = profile_id
    AND folder_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM folders
      WHERE folders.id = folder_id
        AND folders.profile_id = auth.uid()
    )
  );
