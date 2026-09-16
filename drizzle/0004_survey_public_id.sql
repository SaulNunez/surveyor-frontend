-- Surveys gain a six-character base64url public id, which is what URLs carry
-- from here on. The uuid primary key stays as-is: every foreign key still
-- points at it, and it simply stops being exposed.
--
-- Added nullable first so existing rows can be backfilled before the column is
-- made NOT NULL and unique.
ALTER TABLE "surveys" ADD COLUMN "public_id" varchar(6);--> statement-breakpoint

-- Backfill. base64 of a random md5 digest, with base64's two URL-unsafe
-- characters swapped for the base64url ones, matches what the application
-- generates — and avoids depending on pgcrypto for gen_random_bytes. Six
-- characters can collide, so each row draws until it finds a free code.
DO $$
DECLARE
  survey_row record;
  candidate varchar(6);
BEGIN
  FOR survey_row IN SELECT "id" FROM "surveys" WHERE "public_id" IS NULL LOOP
    LOOP
      candidate := substr(
        translate(
          encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'base64'),
          '+/', '-_'
        ),
        1, 6
      );
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "surveys" WHERE "public_id" = candidate);
    END LOOP;

    UPDATE "surveys" SET "public_id" = candidate WHERE "id" = survey_row."id";
  END LOOP;
END $$;--> statement-breakpoint

ALTER TABLE "surveys" ALTER COLUMN "public_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_public_id_unique" UNIQUE("public_id");
