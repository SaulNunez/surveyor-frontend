import { db } from '../libs/db';
import { sql } from 'drizzle-orm';

export async function setup() {
  try {
    console.log('Initializing test database schema...');
    
    await db.execute(sql`
      DROP TABLE IF EXISTS responses CASCADE;
      DROP TABLE IF EXISTS attempts CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS surveys CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS clients CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    await db.execute(sql`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password varchar(255) NOT NULL
      );

      CREATE TABLE clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_name varchar(255) NOT NULL,
        client_description text NOT NULL,
        client_secret varchar(255),
        redirect_uris text[] NOT NULL DEFAULT '{}'::text[],
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE refresh_tokens (
        id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        token varchar(255) NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expiry_date timestamp NOT NULL,
        client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE
      );

      CREATE TABLE surveys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(255) NOT NULL,
        description text NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        text text NOT NULL,
        question_type varchar(50) NOT NULL,
        options text[],
        positive_label text,
        negative_label text
      );

      CREATE TABLE attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        started_at timestamp DEFAULT now() NOT NULL,
        completed_at timestamp
      );

      CREATE TABLE responses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        response_type varchar(50) NOT NULL,
        response text,
        selected_option integer,
        choice boolean,
        rating integer
      );
    `);
    
    console.log('Test database schema initialized.');
  } catch (error) {
    console.error('Failed to initialize test database schema:', error);
    throw error;
  }
}
