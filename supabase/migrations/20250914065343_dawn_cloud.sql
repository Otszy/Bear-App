/*
  # Add Tasks Management Table

  1. New Tables
    - `tasks`
      - `id` (text, primary key) - Task identifier
      - `title` (text) - Task display title
      - `description` (text) - Task description
      - `reward_amount` (numeric) - Reward amount for completion
      - `task_type` (text) - Type of task (ad_task, follow_channel, etc)
      - `is_active` (boolean) - Whether task is currently active
      - `max_attempts` (integer) - Maximum attempts per reset period
      - `reset_hours` (integer) - Hours until attempts reset
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `tasks` table
    - Add policy for service role to manage tasks
    - Add policy for authenticated users to read active tasks

  3. Initial Data
    - Insert default ad tasks
    - Insert follow channel task
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  reward_amount numeric NOT NULL DEFAULT 0,
  task_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  max_attempts integer NOT NULL DEFAULT 10,
  reset_hours integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  -- Service role can manage all tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Service role can manage tasks'
  ) THEN
    CREATE POLICY "Service role can manage tasks"
      ON tasks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Authenticated users can read active tasks
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Users can read active tasks'
  ) THEN
    CREATE POLICY "Users can read active tasks"
      ON tasks
      FOR SELECT
      TO authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Insert default tasks
INSERT INTO tasks (id, title, description, reward_amount, task_type, is_active, max_attempts, reset_hours) VALUES
  ('task1', 'Complete Task 1', 'Watch advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task2', 'Complete Task 2', 'Watch advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task3', 'Complete Task 3', 'Watch advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task4', 'Complete Task 4', 'Watch advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('bearappcom', 'Follow Our Channel', 'Follow @bearappcom on Telegram', 0.01, 'follow_channel', true, 1, 24)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Create function to get active tasks
CREATE OR REPLACE FUNCTION get_active_tasks()
RETURNS TABLE (
  id text,
  title text,
  description text,
  reward_amount numeric,
  task_type text,
  max_attempts integer,
  reset_hours integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT t.id, t.title, t.description, t.reward_amount, t.task_type, t.max_attempts, t.reset_hours
  FROM tasks t
  WHERE t.is_active = true
  ORDER BY t.created_at;
$$;

-- Create function to validate task
CREATE OR REPLACE FUNCTION validate_task_id(p_task_id text, p_task_type text)
RETURNS TABLE (
  is_valid boolean,
  reward_amount numeric,
  max_attempts integer,
  reset_hours integer
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (t.id IS NOT NULL AND t.is_active = true) as is_valid,
    COALESCE(t.reward_amount, 0) as reward_amount,
    COALESCE(t.max_attempts, 10) as max_attempts,
    COALESCE(t.reset_hours, 3) as reset_hours
  FROM tasks t
  WHERE t.id = p_task_id AND t.task_type = p_task_type
  LIMIT 1;
$$;