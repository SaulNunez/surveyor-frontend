import { pgTable, uuid, text, varchar, timestamp, boolean, integer, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { generateSurveyPublicId, SURVEY_PUBLIC_ID_LENGTH } from './publicId';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
});

// Clients Table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientDescription: text('client_description').notNull(),
  clientSecret: varchar('client_secret', { length: 255 }),
  redirectUris: text('redirect_uris').array().notNull().default(sql`'{}'::text[]`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// Refresh Tokens Table
export const refreshTokens = pgTable('refresh_tokens', {
  id: bigint('id', { mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  token: varchar('token', { length: 255 }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiryDate: timestamp('expiry_date').notNull(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
});

// Surveys Table
export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  // The identifier the survey is known by outside the database — six base64url
  // characters, short enough to share. Every foreign key still points at `id`;
  // `publicId` is what appears in URLs and in the wire types, so the uuid never
  // leaves the server. Services take the public id and resolve it here.
  publicId: varchar('public_id', { length: SURVEY_PUBLIC_ID_LENGTH })
    .notNull()
    .unique()
    .$defaultFn(generateSurveyPublicId),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// Questions Table (stores all question subclasses using single-table inheritance)
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  questionType: varchar('question_type', { length: 50 }).notNull(), // 'open-ended', 'multiple-choice', 'binary-choice', 'likert-scale'
  
  // Multiple Choice fields
  options: text('options').array(),
  
  // Binary / Likert Choice fields
  positiveLabel: text('positive_label'),
  negativeLabel: text('negative_label'),
});

// Attempts Table
export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  surveyId: uuid('survey_id')
    .notNull()
    .references(() => surveys.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  // A user may accumulate any number of completed attempts at a survey, but
  // only ever one in progress. Enforced here so concurrent saves cannot each
  // decide to start their own attempt.
  uniqueIndex('attempts_one_in_progress_per_user_survey')
    .on(table.surveyId, table.userId)
    .where(sql`${table.completedAt} is null`),
]);

// Responses Table (stores all response subclasses using single-table inheritance)
export const responses = pgTable('responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  attemptId: uuid('attempt_id')
    .notNull()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  responseType: varchar('response_type', { length: 50 }).notNull(), // 'open-ended', 'multiple-choice', 'binary-choice', 'likert-scale'
  
  // Open Ended field
  response: text('response'),
  
  // Multiple Choice field
  selectedOption: integer('selected_option'),
  
  // Binary Choice field
  choice: boolean('choice'),
  
  // Likert Scale field
  rating: integer('rating'),
}, (table) => [
  // One response per question per attempt. This is the arbiter for the upsert
  // in `saveResponse`, so concurrent saves of the same answer collapse into
  // one row instead of racing.
  uniqueIndex('responses_attempt_question_unique')
    .on(table.attemptId, table.questionId),
]);

// AI-generated summaries of the open-ended answers to a question. Kept out of
// `questions` because a summary is derived data with its own provenance
// (which provider and model produced it, over how many answers, and when),
// and because regenerating one must not touch the question itself.
export const questionSummaries = pgTable('question_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  responseCount: integer('response_count').notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
}, (table) => [
  // At most one summary per question. This is the arbiter for the upsert in
  // `generateSummaryForQuestion`, so two owners hitting Regenerate at once
  // collapse into one row instead of racing.
  uniqueIndex('question_summaries_question_unique')
    .on(table.questionId),
]);
