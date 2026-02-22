-- Migration 27: Add lists tables to supabase_realtime publication
-- Ensures that Supabase broadcasts realtime updates for lists, list_items, and list_categories

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'list_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE list_items;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'lists') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE lists;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'list_categories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE list_categories;
    END IF;
END $$;
