/*
  # Fix Final Security Issues - Safe Migration
  
  1. Security Updates
    - Drop dangerous public policies if they exist
    - Ensure only service_role can manage sensitive data
    - Create policies only if they don't exist
  
  2. Database Functions
    - Add secure read-only functions for frontend
    - Use SECURITY DEFINER for controlled access
*/

-- Drop dangerous public policies if they exist
DO $$ 
BEGIN
  -- Drop public policies for users table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can manage own data') THEN
    DROP POLICY "Users can manage own data" ON users;
  END IF;
  
  -- Drop public policies for user_tasks table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tasks' AND policyname = 'User tasks can be managed') THEN
    DROP POLICY "User tasks can be managed" ON user_tasks;
  END IF;
  
  -- Drop public policies for referrals table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Referrals can be managed') THEN
    DROP POLICY "Referrals can be managed" ON referrals;
  END IF;
  
  -- Drop public policies for withdrawals table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Withdrawals can be managed') THEN
    DROP POLICY "Withdrawals can be managed" ON withdrawals;
  END IF;
  
  -- Drop public policies for task_attempts table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attempts' AND policyname = 'Task attempts can be managed') THEN
    DROP POLICY "Task attempts can be managed" ON task_attempts;
  END IF;
END $$;

-- Create service role policies only if they don't exist
DO $$ 
BEGIN
  -- Service role policy for users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Service role can manage users') THEN
    CREATE POLICY "Service role can manage users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  -- Service role policy for user_tasks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tasks' AND policyname = 'Service role can manage tasks') THEN
    CREATE POLICY "Service role can manage tasks" ON user_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  -- Service role policy for referrals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Service role can manage referrals') THEN
    CREATE POLICY "Service role can manage referrals" ON referrals FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  -- Service role policy for withdrawals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Service role can manage withdrawals') THEN
    CREATE POLICY "Service role can manage withdrawals" ON withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  -- Service role policy for task_attempts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attempts' AND policyname = 'Service role can manage attempts') THEN
    CREATE POLICY "Service role can manage attempts" ON task_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create limited read policies for authenticated users
DO $$ 
BEGIN
  -- Users can read own data
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can read own data') THEN
    CREATE POLICY "Users can read own data" ON users FOR SELECT TO authenticated USING (telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
  END IF;
  
  -- Users can read own tasks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_tasks' AND policyname = 'Users can read own tasks') THEN
    CREATE POLICY "Users can read own tasks" ON user_tasks FOR SELECT TO authenticated USING (
      user_id IN (
        SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      )
    );
  END IF;
  
  -- Users can read own referrals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'Users can read own referrals') THEN
    CREATE POLICY "Users can read own referrals" ON referrals FOR SELECT TO authenticated USING (
      referrer_id IN (
        SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      ) OR referred_id IN (
        SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      )
    );
  END IF;
  
  -- Users can read own withdrawals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Users can read own withdrawals') THEN
    CREATE POLICY "Users can read own withdrawals" ON withdrawals FOR SELECT TO authenticated USING (
      user_id IN (
        SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      )
    );
  END IF;
  
  -- Users can read own attempts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attempts' AND policyname = 'Users can read own attempts') THEN
    CREATE POLICY "Users can read own attempts" ON task_attempts FOR SELECT TO authenticated USING (
      user_id IN (
        SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')
      )
    );
  END IF;
END $$;

-- Create secure read-only functions for frontend
CREATE OR REPLACE FUNCTION get_user_profile(telegram_user_id text)
RETURNS TABLE (
  id uuid,
  telegram_id text,
  username text,
  first_name text,
  last_name text,
  balance numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.balance, u.created_at
  FROM users u
  WHERE u.telegram_id = telegram_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_task_attempts(telegram_user_id text)
RETURNS TABLE (
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
  SELECT ta.task_id, ta.task_type, ta.attempts_count, ta.last_attempt_at, ta.reset_at
  FROM task_attempts ta
  JOIN users u ON ta.user_id = u.id
  WHERE u.telegram_id = telegram_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_referrals(telegram_user_id text)
RETURNS TABLE (
  id uuid,
  referred_first_name text,
  referred_last_name text,
  referred_username text,
  commission_amount numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, ru.first_name, ru.last_name, ru.username, r.commission_amount, r.created_at
  FROM referrals r
  JOIN users u ON r.referrer_id = u.id
  JOIN users ru ON r.referred_id = ru.id
  WHERE u.telegram_id = telegram_user_id
  ORDER BY r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_withdrawals(telegram_user_id text)
RETURNS TABLE (
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
  SELECT w.id, w.amount, w.method, w.status, w.created_at, w.processed_at
  FROM withdrawals w
  JOIN users u ON w.user_id = u.id
  WHERE u.telegram_id = telegram_user_id
  ORDER BY w.created_at DESC;
END;
$$;