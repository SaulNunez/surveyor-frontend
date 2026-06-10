import { pgTable, uuid, text, varchar, timestamp, boolean, integer, bigint } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
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
});

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
});
