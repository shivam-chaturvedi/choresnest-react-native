


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."documents_upload_status" AS ENUM (
    'pending_upload',
    'uploading',
    'uploaded',
    'failed'
);


ALTER TYPE "public"."documents_upload_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."documents_before_write_hook"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."documents_before_write_hook"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."force_profile_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Only override if it's separate from what it should be (or missing)
  -- This enforces that a user can only write data for their own profile
  if auth.uid() is not null then
    new.profile_id := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."force_profile_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, name, active_profile_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    new.id -- Set active_profile_id to the user's own ID by default
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_lock" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false,
    "biometric_enabled" boolean DEFAULT false,
    "pin_hash" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."app_lock" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "has_completed_onboarding" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."app_settings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "month" "text" NOT NULL,
    "notification_id" "text",
    "alert_threshold_percent" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collection_recipes" (
    "id" "text" NOT NULL,
    "collection_id" "text",
    "recipe_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "profile_id" "uuid" NOT NULL
);

ALTER TABLE ONLY "public"."collection_recipes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."collection_recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."collections" REPLICA IDENTITY FULL;


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon" "text",
    "date" "text" NOT NULL,
    "expiry_date" "text",
    "member_id" "text",
    "shared_with_json" "text",
    "file_path" "text",
    "meta_json" "text",
    "notification_ids_json" "text",
    "reminder_days_before" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "local_uri" "text",
    "remote_path" "text",
    "upload_status" "public"."documents_upload_status" DEFAULT 'pending_upload'::"public"."documents_upload_status" NOT NULL,
    "upload_attempts" integer DEFAULT 0 NOT NULL,
    "last_upload_error" "text",
    "content_type" "text",
    "file_size" bigint,
    "checksum" "text"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "icon" "text",
    "date" "text" NOT NULL,
    "time" "text" NOT NULL,
    "end_time" "text",
    "end_date" "text",
    "member_id" "text",
    "location" "text",
    "description" "text",
    "notes" "text",
    "visibility" "text" DEFAULT 'default'::"text",
    "time_zone" "text",
    "is_recurring" boolean DEFAULT false,
    "recurrence_rule" "text",
    "recurrence_end_date" "text",
    "notification_id" "text",
    "reminder_offset_minutes" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."events" REPLICA IDENTITY FULL;


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."list_items" (
    "id" "text" NOT NULL,
    "list_id" "text",
    "name" "text" NOT NULL,
    "quantity" numeric DEFAULT 1,
    "unit" "text",
    "category" "text",
    "added_by_id" "text",
    "is_completed" boolean DEFAULT false,
    "purchased_at" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "profile_id" "uuid" NOT NULL,
    CONSTRAINT "list_items_list_id_not_empty" CHECK ((("list_id" IS NULL) OR (("list_id" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "list_id")) > 0))))
);

ALTER TABLE ONLY "public"."list_items" REPLICA IDENTITY FULL;


ALTER TABLE "public"."list_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lists" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."lists" REPLICA IDENTITY FULL;


ALTER TABLE "public"."lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_plans" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "date" "text" NOT NULL,
    "type" "text" NOT NULL,
    "recipe_id" "text",
    "is_cooked" boolean DEFAULT false,
    "notification_id" "text",
    "reminder_minutes_before" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."meal_plans" REPLICA IDENTITY FULL;


ALTER TABLE "public"."meal_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "symbol" "text" NOT NULL,
    "color" "text" NOT NULL,
    "role" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."members" REPLICA IDENTITY FULL;


ALTER TABLE "public"."members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notes" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "preview" "text",
    "tag" "text",
    "color" "text",
    "is_starred" boolean DEFAULT false,
    "folder_id" "text",
    "blocks_json" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "reminder_offset_minutes" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "is_guest" boolean DEFAULT false,
    "active_profile_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted" boolean DEFAULT false,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiet_hours" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT false,
    "start_hour" integer,
    "start_minute" integer,
    "end_hour" integer,
    "end_minute" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."quiet_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "prep_time" "text",
    "cook_time" "text",
    "servings" numeric,
    "difficulty" "text",
    "calories" "text",
    "image_path" "text",
    "is_saved" boolean DEFAULT false,
    "rating" numeric,
    "author" "text",
    "ingredients_json" "text",
    "instructions_json" "text",
    "tags_json" "text",
    "nutrition_json" "text",
    "audio_path" "text",
    "duration" numeric,
    "url" "text",
    "images_json" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL,
    "local_image_uris" "text",
    "local_audio_uri" "text",
    "remote_image_paths" "text",
    "remote_audio_path" "text",
    "upload_status" "text" DEFAULT 'uploaded'::"text",
    "upload_attempts" integer DEFAULT 0,
    "last_upload_error" "text",
    "image_checksums_json" "text",
    "audio_checksum" "text"
);

ALTER TABLE ONLY "public"."recipes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settings" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."settings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "due_display" "text",
    "date" "text" NOT NULL,
    "assignee_id" "text",
    "tab" "text",
    "notification_id" "text",
    "reminder_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."tasks" REPLICA IDENTITY FULL;


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "date" "text" NOT NULL,
    "icon" "text",
    "type" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "text" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "country_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."app_lock"
    ADD CONSTRAINT "app_lock_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collection_recipes"
    ADD CONSTRAINT "collection_recipes_collection_id_recipe_id_key" UNIQUE ("collection_id", "recipe_id");



ALTER TABLE ONLY "public"."collection_recipes"
    ADD CONSTRAINT "collection_recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."list_items"
    ADD CONSTRAINT "list_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lists"
    ADD CONSTRAINT "lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiet_hours"
    ADD CONSTRAINT "quiet_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_profile_id_key_unique" UNIQUE ("profile_id", "key");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_app_lock_profile_id" ON "public"."app_lock" USING "btree" ("profile_id");



CREATE INDEX "idx_app_lock_profile_updated_id" ON "public"."app_lock" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_app_settings_profile_id" ON "public"."app_settings" USING "btree" ("profile_id");



CREATE INDEX "idx_app_settings_profile_updated_id" ON "public"."app_settings" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_app_settings_sync_cursor" ON "public"."app_settings" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_budgets_category" ON "public"."budgets" USING "btree" ("category");



CREATE INDEX "idx_budgets_month" ON "public"."budgets" USING "btree" ("month");



CREATE INDEX "idx_budgets_profile_id" ON "public"."budgets" USING "btree" ("profile_id");



CREATE INDEX "idx_budgets_profile_updated_id" ON "public"."budgets" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_budgets_sync_cursor" ON "public"."budgets" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_collection_recipes_collection_id" ON "public"."collection_recipes" USING "btree" ("collection_id");



CREATE INDEX "idx_collection_recipes_profile_updated" ON "public"."collection_recipes" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_collection_recipes_profile_updated_id" ON "public"."collection_recipes" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_collection_recipes_recipe_id" ON "public"."collection_recipes" USING "btree" ("recipe_id");



CREATE INDEX "idx_collection_recipes_sync_cursor" ON "public"."collection_recipes" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_collections_profile_id" ON "public"."collections" USING "btree" ("profile_id");



CREATE INDEX "idx_collections_profile_updated" ON "public"."collections" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_collections_profile_updated_id" ON "public"."collections" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_collections_sync_cursor" ON "public"."collections" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_documents_date" ON "public"."documents" USING "btree" ("date");



CREATE INDEX "idx_documents_member_id" ON "public"."documents" USING "btree" ("member_id");



CREATE INDEX "idx_documents_profile_id" ON "public"."documents" USING "btree" ("profile_id");



CREATE INDEX "idx_documents_profile_updated" ON "public"."documents" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_documents_profile_updated_id" ON "public"."documents" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_documents_sync_cursor" ON "public"."documents" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_documents_type" ON "public"."documents" USING "btree" ("type");



CREATE INDEX "idx_events_date" ON "public"."events" USING "btree" ("date");



CREATE INDEX "idx_events_member_id" ON "public"."events" USING "btree" ("member_id");



CREATE INDEX "idx_events_profile_id" ON "public"."events" USING "btree" ("profile_id");



CREATE INDEX "idx_events_profile_updated_id" ON "public"."events" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_events_sync_cursor" ON "public"."events" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_folders_profile_id" ON "public"."folders" USING "btree" ("profile_id");



CREATE INDEX "idx_folders_profile_updated_id" ON "public"."folders" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_folders_sync_cursor" ON "public"."folders" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_list_items_added_by_id" ON "public"."list_items" USING "btree" ("added_by_id");



CREATE INDEX "idx_list_items_category" ON "public"."list_items" USING "btree" ("category");



CREATE INDEX "idx_list_items_list_id" ON "public"."list_items" USING "btree" ("list_id");



CREATE INDEX "idx_list_items_list_id_valid" ON "public"."list_items" USING "btree" ("list_id") WHERE (("list_id" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "list_id")) > 0));



CREATE INDEX "idx_list_items_profile_updated_id" ON "public"."list_items" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_list_items_sync_cursor" ON "public"."list_items" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_lists_profile_id" ON "public"."lists" USING "btree" ("profile_id");



CREATE INDEX "idx_lists_profile_updated_id" ON "public"."lists" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_lists_sync_cursor" ON "public"."lists" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_meal_plans_date" ON "public"."meal_plans" USING "btree" ("date");



CREATE INDEX "idx_meal_plans_profile_id" ON "public"."meal_plans" USING "btree" ("profile_id");



CREATE INDEX "idx_meal_plans_profile_updated_id" ON "public"."meal_plans" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_meal_plans_recipe_id" ON "public"."meal_plans" USING "btree" ("recipe_id");



CREATE INDEX "idx_meal_plans_sync_cursor" ON "public"."meal_plans" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_members_profile_id" ON "public"."members" USING "btree" ("profile_id");



CREATE INDEX "idx_members_profile_updated_id" ON "public"."members" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_members_sync_cursor" ON "public"."members" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_notes_folder_id" ON "public"."notes" USING "btree" ("folder_id");



CREATE INDEX "idx_notes_is_starred" ON "public"."notes" USING "btree" ("is_starred");



CREATE INDEX "idx_notes_profile_id" ON "public"."notes" USING "btree" ("profile_id");



CREATE INDEX "idx_notes_profile_updated_id" ON "public"."notes" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_notes_sync_cursor" ON "public"."notes" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_notes_updated_at" ON "public"."notes" USING "btree" ("updated_at");



CREATE INDEX "idx_notif_prefs_category" ON "public"."notification_preferences" USING "btree" ("category");



CREATE INDEX "idx_notif_prefs_profile_id" ON "public"."notification_preferences" USING "btree" ("profile_id");



CREATE INDEX "idx_notification_preferences_profile_updated_id" ON "public"."notification_preferences" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_notification_preferences_sync_cursor" ON "public"."notification_preferences" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_profiles_updated_id" ON "public"."profiles" USING "btree" ("updated_at", "id");



CREATE INDEX "idx_quiet_hours_profile_id" ON "public"."quiet_hours" USING "btree" ("profile_id");



CREATE INDEX "idx_quiet_hours_profile_updated_id" ON "public"."quiet_hours" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_quiet_hours_sync_cursor" ON "public"."quiet_hours" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_recipes_profile_id" ON "public"."recipes" USING "btree" ("profile_id");



CREATE INDEX "idx_recipes_profile_updated" ON "public"."recipes" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_recipes_profile_updated_id" ON "public"."recipes" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_recipes_sync_cursor" ON "public"."recipes" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_settings_key" ON "public"."settings" USING "btree" ("key");



CREATE INDEX "idx_settings_profile_id" ON "public"."settings" USING "btree" ("profile_id");



CREATE INDEX "idx_settings_profile_updated_id" ON "public"."settings" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_tasks_assignee_id" ON "public"."tasks" USING "btree" ("assignee_id");



CREATE INDEX "idx_tasks_date" ON "public"."tasks" USING "btree" ("date");



CREATE INDEX "idx_tasks_profile_id" ON "public"."tasks" USING "btree" ("profile_id");



CREATE INDEX "idx_tasks_profile_updated_id" ON "public"."tasks" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_sync_cursor" ON "public"."tasks" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_transactions_category" ON "public"."transactions" USING "btree" ("category");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("date");



CREATE INDEX "idx_transactions_profile_id" ON "public"."transactions" USING "btree" ("profile_id");



CREATE INDEX "idx_transactions_profile_updated_id" ON "public"."transactions" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_transactions_sync_cursor" ON "public"."transactions" USING "btree" ("profile_id", "updated_at");



CREATE INDEX "idx_transactions_type" ON "public"."transactions" USING "btree" ("type");



CREATE INDEX "idx_user_preferences_profile_id" ON "public"."user_preferences" USING "btree" ("profile_id");



CREATE INDEX "idx_user_preferences_profile_updated_id" ON "public"."user_preferences" USING "btree" ("profile_id", "updated_at", "id");



CREATE INDEX "idx_user_preferences_sync_cursor" ON "public"."user_preferences" USING "btree" ("profile_id", "updated_at");



CREATE OR REPLACE TRIGGER "documents_before_write" BEFORE INSERT OR UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "public"."documents_before_write_hook"();



CREATE OR REPLACE TRIGGER "force_profile_id_members" BEFORE INSERT OR UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."force_profile_id"();



CREATE OR REPLACE TRIGGER "force_profile_id_notes" BEFORE INSERT OR UPDATE ON "public"."notes" FOR EACH ROW EXECUTE FUNCTION "public"."force_profile_id"();



CREATE OR REPLACE TRIGGER "force_profile_id_settings" BEFORE INSERT OR UPDATE ON "public"."settings" FOR EACH ROW EXECUTE FUNCTION "public"."force_profile_id"();



ALTER TABLE ONLY "public"."app_lock"
    ADD CONSTRAINT "app_lock_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_recipes"
    ADD CONSTRAINT "collection_recipes_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_recipes"
    ADD CONSTRAINT "collection_recipes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collection_recipes"
    ADD CONSTRAINT "collection_recipes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."list_items"
    ADD CONSTRAINT "list_items_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."list_items"
    ADD CONSTRAINT "list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."list_items"
    ADD CONSTRAINT "list_items_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lists"
    ADD CONSTRAINT "lists_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plans"
    ADD CONSTRAINT "meal_plans_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."members"
    ADD CONSTRAINT "members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notes"
    ADD CONSTRAINT "notes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiet_hours"
    ADD CONSTRAINT "quiet_hours_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all inserts on notes" ON "public"."notes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all selects on notes" ON "public"."notes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all updates on notes" ON "public"."notes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Documents delete own" ON "public"."documents" FOR DELETE USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Documents insert own" ON "public"."documents" FOR INSERT WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Documents select own" ON "public"."documents" FOR SELECT USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Documents update own" ON "public"."documents" FOR UPDATE USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own app_lock" ON "public"."app_lock" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own app_settings" ON "public"."app_settings" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own budgets" ON "public"."budgets" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own collection_recipes" ON "public"."collection_recipes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_recipes"."collection_id") AND ("collections"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own collections" ON "public"."collections" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own documents" ON "public"."documents" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own events" ON "public"."events" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own folders" ON "public"."folders" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own list_items" ON "public"."list_items" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own lists" ON "public"."lists" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own meal_plans" ON "public"."meal_plans" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own members" ON "public"."members" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own notes" ON "public"."notes" FOR DELETE USING ((("auth"."uid"() = "profile_id") AND ("folder_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."folders"
  WHERE (("folders"."id" = "notes"."folder_id") AND ("folders"."profile_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete own notification_preferences" ON "public"."notification_preferences" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own quiet_hours" ON "public"."quiet_hours" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own recipes" ON "public"."recipes" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own settings" ON "public"."settings" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own tasks" ON "public"."tasks" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own transactions" ON "public"."transactions" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can delete own user_preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own app_lock" ON "public"."app_lock" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own app_settings" ON "public"."app_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own budgets" ON "public"."budgets" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own collection_recipes" ON "public"."collection_recipes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_recipes"."collection_id") AND ("collections"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own collections" ON "public"."collections" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own documents" ON "public"."documents" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own events" ON "public"."events" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own folders" ON "public"."folders" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own list_items" ON "public"."list_items" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own lists" ON "public"."lists" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own meal_plans" ON "public"."meal_plans" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own members" ON "public"."members" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own notification_preferences" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own quiet_hours" ON "public"."quiet_hours" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own recipes" ON "public"."recipes" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own settings" ON "public"."settings" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can insert own user_preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK ((("auth"."uid"() = "profile_id") AND ("profile_id" IS NOT NULL)));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own app_lock" ON "public"."app_lock" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own app_settings" ON "public"."app_settings" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own budgets" ON "public"."budgets" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own collection_recipes" ON "public"."collection_recipes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_recipes"."collection_id") AND ("collections"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own collections" ON "public"."collections" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own documents" ON "public"."documents" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own events" ON "public"."events" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own folders" ON "public"."folders" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own list_items" ON "public"."list_items" FOR UPDATE USING (("auth"."uid"() = "profile_id")) WITH CHECK (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own lists" ON "public"."lists" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own meal_plans" ON "public"."meal_plans" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own members" ON "public"."members" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own notification_preferences" ON "public"."notification_preferences" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own quiet_hours" ON "public"."quiet_hours" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own recipes" ON "public"."recipes" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own settings" ON "public"."settings" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own tasks" ON "public"."tasks" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own transactions" ON "public"."transactions" FOR UPDATE USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can update own user_preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "profile_id")) WITH CHECK ((("auth"."uid"() = "profile_id") AND ("profile_id" IS NOT NULL)));



CREATE POLICY "Users can view own app_lock" ON "public"."app_lock" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own app_settings" ON "public"."app_settings" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own budgets" ON "public"."budgets" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own collection_recipes" ON "public"."collection_recipes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."collections"
  WHERE (("collections"."id" = "collection_recipes"."collection_id") AND ("collections"."profile_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own collections" ON "public"."collections" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own documents" ON "public"."documents" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own events" ON "public"."events" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own folders" ON "public"."folders" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own list_items" ON "public"."list_items" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own lists" ON "public"."lists" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own meal_plans" ON "public"."meal_plans" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own members" ON "public"."members" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own notes" ON "public"."notes" FOR SELECT USING ((("auth"."uid"() = "profile_id") AND (EXISTS ( SELECT 1
   FROM "public"."folders"
  WHERE (("folders"."id" = "notes"."folder_id") AND ("folders"."profile_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own notification_preferences" ON "public"."notification_preferences" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own quiet_hours" ON "public"."quiet_hours" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own recipes" ON "public"."recipes" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own settings" ON "public"."settings" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own tasks" ON "public"."tasks" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own transactions" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "profile_id"));



CREATE POLICY "Users can view own user_preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "profile_id"));



ALTER TABLE "public"."app_lock" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collection_recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."list_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lists_allow_all" ON "public"."list_items" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "lists_allow_all" ON "public"."lists" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."meal_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiet_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."collection_recipes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."collections";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."documents";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."list_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."lists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."recipes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."documents_before_write_hook"() TO "anon";
GRANT ALL ON FUNCTION "public"."documents_before_write_hook"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."documents_before_write_hook"() TO "service_role";



GRANT ALL ON FUNCTION "public"."force_profile_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."force_profile_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."force_profile_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."app_lock" TO "anon";
GRANT ALL ON TABLE "public"."app_lock" TO "authenticated";
GRANT ALL ON TABLE "public"."app_lock" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON TABLE "public"."collection_recipes" TO "anon";
GRANT ALL ON TABLE "public"."collection_recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."collection_recipes" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."list_items" TO "anon";
GRANT ALL ON TABLE "public"."list_items" TO "authenticated";
GRANT ALL ON TABLE "public"."list_items" TO "service_role";



GRANT ALL ON TABLE "public"."lists" TO "anon";
GRANT ALL ON TABLE "public"."lists" TO "authenticated";
GRANT ALL ON TABLE "public"."lists" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plans" TO "anon";
GRANT ALL ON TABLE "public"."meal_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plans" TO "service_role";



GRANT ALL ON TABLE "public"."members" TO "anon";
GRANT ALL ON TABLE "public"."members" TO "authenticated";
GRANT ALL ON TABLE "public"."members" TO "service_role";



GRANT ALL ON TABLE "public"."notes" TO "anon";
GRANT ALL ON TABLE "public"."notes" TO "authenticated";
GRANT ALL ON TABLE "public"."notes" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."quiet_hours" TO "anon";
GRANT ALL ON TABLE "public"."quiet_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."quiet_hours" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































