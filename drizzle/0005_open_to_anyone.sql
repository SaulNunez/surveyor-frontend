-- Anonymous accounts, and surveys that accept them.
--
-- A guest account is a `users` row with no email and no password, identified
-- only by its uuid. Registering later fills the credentials in on that same
-- row, so the attempts and responses it already carries move with it.
--
-- Nothing is backfilled, and nothing can be invalidated by this migration:
-- every existing `users` row has both credentials set, so the new CHECK holds
-- by construction, and relaxing NOT NULL cannot break a row that is already
-- populated. Existing surveys take `false` from the column default, which is
-- exactly the intended "everything that exists today stays closed".
--
-- Rolling deploys are safe in both directions: code from before this migration
-- always writes both credentials, so it satisfies the CHECK.
--
-- `ADD COLUMN ... DEFAULT ... NOT NULL` is metadata-only on PG11+, but
-- `ADD CONSTRAINT ... CHECK` takes ACCESS EXCLUSIVE and scans `users` to
-- validate it. That is instant at this size; on a large table, split it into
-- `ADD CONSTRAINT ... NOT VALID` followed by `VALIDATE CONSTRAINT`.

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "open_to_anyone" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_anonymous_or_credentialed" CHECK (("users"."email" is null and "users"."password" is null)
     or ("users"."email" is not null and "users"."password" is not null));