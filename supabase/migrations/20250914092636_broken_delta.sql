/*
  # Add Tasks Management System

  1. New Tables
    - `tasks`
      - `id` (text, primary key) - task identifier
      - `title` (text) - task display title  
      - `description` (text, nullable) - task description
      - `reward_amount` (numeric, default 0) - reward for completion
      - `task_type` (text) - type of task (ad_task, follow_channel, etc)
      - `is_active` (boolean, default true) - whether task is active
      - `max_attempts` (integer, default 10) - max attempts per reset period
      - `reset_hours` (integer, default 3) - hours until attempts reset
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `tasks` table
    - Add policy for service role to manage tasks
    - Add policy for authenticated users to read active tasks

  3. Functions
    - `validate_task_id` - validates task exists and is active
    - `process_ad_task_completion` - atomic task completion processing
    - `get_user_referrals` - get user referrals with details
    - `get_user_task_attempts` - get user task attempts
    - `get_user_withdrawals` - get user withdrawals
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

-- Policies for tasks
CREATE POLICY "Service role can manage tasks"
  ON tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read active tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default tasks
INSERT INTO tasks (id, title, description, reward_amount, task_type, is_active, max_attempts, reset_hours) VALUES
  ('task1', 'Complete Task 1', 'Visit advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task2', 'Complete Task 2', 'Visit advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task3', 'Complete Task 3', 'Visit advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('task4', 'Complete Task 4', 'Visit advertisement and earn rewards', 0.003, 'ad_task', true, 10, 3),
  ('bearappcom', 'Follow Our Channel', 'Follow @bearappcom on Telegram', 0.01, 'follow_channel', true, 1, 24)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  task_type = EXCLUDED.task_type,
  is_active = EXCLUDED.is_active,
  max_attempts = EXCLUDED.max_attempts,
  reset_hours = EXCLUDED.reset_hours,
  updated_at = now();

-- Function to validate task ID
CREATE OR REPLACE FUNCTION validate_task_id(p_task_id text, p_task_type text)
RETURNS TABLE(is_valid boolean, reward_amount numeric, max_attempts integer, reset_hours integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.is_active as is_valid,
    t.reward_amount,
    t.max_attempts,
    t.reset_hours
  FROM tasks t
  WHERE t.id = p_task_id 
    AND t.task_type = p_task_type
    AND t.is_active = true;
END;
$$;

-- Function to process ad task completion atomically
CREATE OR REPLACE FUNCTION process_ad_task_completion(
  p_user_id uuid,
  p_task_type text,
  p_task_id text,
  p_reward_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
  v_current_attempts integer := 0;
  v_reset_time timestamptz;
  v_referrer_id uuid;
  v_commission numeric;
BEGIN
  -- Get current user balance
  SELECT balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id;
  
  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Handle task attempts
  INSERT INTO task_attempts (
    user_id, task_type, task_id, attempts_count, last_attempt_at, reset_at
  ) VALUES (
    p_user_id, p_task_type, p_task_id, 1, now(), now() + interval '3 hours'
  )
  ON CONFLICT (user_id, task_type, task_id) DO UPDATE SET
    attempts_count = CASE 
      WHEN now() > task_attempts.reset_at THEN 1
      ELSE task_attempts.attempts_count + 1
    END,
    last_attempt_at = now(),
    reset_at = CASE
      WHEN now() > task_attempts.reset_at THEN now() + interval '3 hours'
      ELSE task_attempts.reset_at
    END;

  -- Update user balance
  UPDATE users 
  SET balance = balance + p_reward_amount,
      updated_at = now()
  WHERE id = p_user_id;

  -- Handle referral commission
  SELECT referrer_id INTO v_referrer_id
  FROM referrals
  WHERE referred_id = p_user_id;

  IF v_referrer_id IS NOT NULL THEN
    v_commission := p_reward_amount * 0.1; -- 10% commission
    
    UPDATE referrals
    SET commission_amount = commission_amount + v_commission
    WHERE referrer_id = v_referrer_id AND referred_id = p_user_id;
    
    UPDATE users
    SET balance = balance + v_commission
    WHERE id = v_referrer_id;
  END IF;
END;
$$;

-- Function to get user referrals
CREATE OR REPLACE FUNCTION get_user_referrals(p_telegram_id text)
RETURNS TABLE(
  id uuid,
  referred jsonb,
  commission_amount numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    jsonb_build_object(
      'id', ru.id,
      'first_name', ru.first_name,
      'last_name', ru.last_name,
      'username', ru.username
    ) as referred,
    r.commission_amount,
    r.created_at
  FROM referrals r
  JOIN users u ON u.id = r.referrer_id
  JOIN users ru ON ru.id = r.referred_id
  WHERE u.telegram_id = p_telegram_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Function to get user task attempts
CREATE OR REPLACE FUNCTION get_user_task_attempts(p_telegram_id text)
RETURNS TABLE(
  task_id text,
  task_type text,
  attempts_count integer,
  last_attempt_at timestamptz,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.task_id,
    ta.task_type,
    ta.attempts_count,
    ta.last_attempt_at,
    ta.reset_at
  FROM task_attempts ta
  JOIN users u ON u.id = ta.user_id
  WHERE u.telegram_id = p_telegram_id;
END;
$$;

-- Function to get user withdrawals
CREATE OR REPLACE FUNCTION get_user_withdrawals(p_telegram_id text)
RETURNS TABLE(
  id uuid,
  amount numeric,
  method text,
  status text,
  created_at timestamptz,
  processed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.amount,
    w.method,
    w.status,
    w.created_at,
    w.processed_at
  FROM withdrawals w
  JOIN users u ON u.id = w.user_id
  WHERE u.telegram_id = p_telegram_id
  ORDER BY w.created_at DESC;
END;
$$;