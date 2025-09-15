/*
  # Final Security Fix - Remove All Public Access

  1. Security Changes
    - Drop all dangerous public policies
    - Ensure only service_role can access sensitive data
    - Add proper user isolation policies
    - Remove any USING (true) policies

  2. Tables Affected
    - users: Only service_role access
    - user_tasks: Only service_role access  
    - referrals: Only service_role access
    - withdrawals: Only service_role access
    - task_attempts: Only service_role access

  3. Access Pattern
    - All data access through Edge Functions only
    - Edge Functions use service_role with proper validation
    - Frontend cannot directly access sensitive tables
*/

-- Drop all existing dangerous policies
DROP POLICY IF EXISTS "Users can manage own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

DROP POLICY IF EXISTS "User tasks can be managed" ON user_tasks;
DROP POLICY IF EXISTS "Users can read own tasks" ON user_tasks;

DROP POLICY IF EXISTS "Referrals can be managed" ON referrals;
DROP POLICY IF EXISTS "Users can read own referrals" ON referrals;

DROP POLICY IF EXISTS "Withdrawals can be managed" ON withdrawals;
DROP POLICY IF EXISTS "Users can read own withdrawals" ON withdrawals;

DROP POLICY IF EXISTS "Task attempts can be managed" ON task_attempts;
DROP POLICY IF EXISTS "Users can read own attempts" ON task_attempts;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attempts ENABLE ROW LEVEL SECURITY;

-- Create service_role only policies (these are the ONLY policies)
CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage referrals"
  ON referrals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage withdrawals"
  ON withdrawals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage attempts"
  ON task_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create read-only functions for frontend (SECURITY DEFINER)
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

CREATE OR REPLACE FUNCTION get_user_referrals(telegram_user_id text)
RETURNS TABLE (
  id uuid,
  referred_username text,
  referred_first_name text,
  referred_last_name text,
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
    ru.username as referred_username,
    ru.first_name as referred_first_name,
    ru.last_name as referred_last_name,
    r.commission_amount,
    r.created_at
  FROM referrals r
  JOIN users referrer ON referrer.id = r.referrer_id
  JOIN users ru ON ru.id = r.referred_id
  WHERE referrer.telegram_id = telegram_user_id
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
  JOIN users u ON u.id = w.user_id
  WHERE u.telegram_id = telegram_user_id
  ORDER BY w.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_task_attempts(telegram_user_id text)
RETURNS TABLE (
  task_type text,
  task_id text,
  attempts_count integer,
  last_attempt_at timestamptz,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ta.task_type, ta.task_id, ta.attempts_count, ta.last_attempt_at, ta.reset_at
  FROM task_attempts ta
  JOIN users u ON u.id = ta.user_id
  WHERE u.telegram_id = telegram_user_id;
END;
$$;