/*
  # Add Task Attempts Tracking

  1. New Tables
    - `task_attempts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `task_type` (text)
      - `task_id` (text)
      - `attempts_count` (integer, default 0)
      - `last_attempt_at` (timestamp)
      - `reset_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `task_attempts` table
    - Add policy for users to manage their own task attempts

  3. Changes
    - Add tracking for task attempts with 3-hour cooldown
    - Maximum 10 attempts per task per 3-hour period
*/

CREATE TABLE IF NOT EXISTS task_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  task_id text NOT NULL,
  attempts_count integer DEFAULT 0,
  last_attempt_at timestamptz DEFAULT now(),
  reset_at timestamptz DEFAULT (now() + interval '3 hours'),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_type, task_id)
);

ALTER TABLE task_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own task attempts"
  ON task_attempts
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE INDEX IF NOT EXISTS idx_task_attempts_user_id ON task_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attempts_reset_at ON task_attempts(reset_at);
CREATE INDEX IF NOT EXISTS idx_task_attempts_type_id ON task_attempts(task_type, task_id);