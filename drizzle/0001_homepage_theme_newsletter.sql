-- Homepage / theme / newsletter upgrade.
-- Idempotent: safe to run more than once. Equivalent to `npx drizzle-kit push` for these changes.

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "image_url" text;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "href" text;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "source" text DEFAULT 'website' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_email_unique" ON "newsletter_subscribers" USING btree ("email");
