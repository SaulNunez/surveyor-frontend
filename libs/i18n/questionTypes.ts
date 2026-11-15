import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";
import type { QuestionType } from "@/libs/models/frontend/question";

/**
 * The reader-facing name of each question type.
 *
 * Message descriptors rather than translated strings, so one map serves both
 * Server and Client Components: whoever renders it resolves the descriptor with
 * the catalog in hand (`i18n._(...)`). Previously these labels were derived from
 * the discriminant itself (`questionType.replace("-", " ")`), which no catalog
 * can reach.
 *
 * Adding a question type means adding it here too — the type is exhaustive, so
 * `npm run typecheck` will say so.
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, MessageDescriptor> = {
  "open-ended": msg`Open ended`,
  "multiple-choice": msg`Multiple choice`,
  "binary-choice": msg`Binary choice`,
  "likert-scale": msg`Likert scale`,
};
