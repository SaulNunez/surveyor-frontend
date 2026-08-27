-- Existing data may already violate the constraints below, since nothing
-- previously prevented concurrent saves from creating duplicates. Collapse
-- those rows before the indexes are built, or index creation fails.

-- Duplicate in-progress attempts: keep the one carrying the most answers
-- (ties broken by most recently started). Deleting the others cascades to
-- their responses.
DELETE FROM "attempts" WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "attempts"."id",
			row_number() OVER (
				PARTITION BY "attempts"."survey_id", "attempts"."user_id"
				ORDER BY (
					SELECT count(*) FROM "responses"
					WHERE "responses"."attempt_id" = "attempts"."id"
				) DESC, "attempts"."started_at" DESC, "attempts"."id" DESC
			) AS rn
		FROM "attempts"
		WHERE "attempts"."completed_at" IS NULL
	) ranked WHERE ranked.rn > 1
);--> statement-breakpoint

-- Duplicate answers to the same question within one attempt: keep one.
-- Duplicates arise from concurrent saves of the same answer, so which row
-- survives does not matter as long as the choice is deterministic.
DELETE FROM "responses" WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id", row_number() OVER (
			PARTITION BY "attempt_id", "question_id" ORDER BY "id" DESC
		) AS rn
		FROM "responses"
	) ranked WHERE ranked.rn > 1
);--> statement-breakpoint

CREATE UNIQUE INDEX "attempts_one_in_progress_per_user_survey" ON "attempts" USING btree ("survey_id","user_id") WHERE "attempts"."completed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "responses_attempt_question_unique" ON "responses" USING btree ("attempt_id","question_id");
