-- =====================================================
-- STORAGE POLICIES FOR ALL BUCKETS
-- Grants full access to authenticated users

-- Clean previous policies (if any)
drop policy if exists "vault-documents full access" on storage.objects;
drop policy if exists "recipe-images full access" on storage.objects;
drop policy if exists "recipe-audio full access" on storage.objects;
drop policy if exists "recipe-thumbnails full access" on storage.objects;


-- =====================================================
-- VAULT-DOCUMENTS
-- =====================================================

create policy "vault-documents full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'vault-documents')
with check (bucket_id = 'vault-documents');


-- =====================================================
-- RECIPE-IMAGES
-- =====================================================

create policy "recipe-images full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-images')
with check (bucket_id = 'recipe-images');


-- =====================================================
-- RECIPE-AUDIO
-- =====================================================

create policy "recipe-audio full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-audio')
with check (bucket_id = 'recipe-audio');


-- =====================================================
-- RECIPE-THUMBNAILS
-- =====================================================

create policy "recipe-thumbnails full access"
on storage.objects
for all
to authenticated
using (bucket_id = 'recipe-thumbnails')
with check (bucket_id = 'recipe-thumbnails');

