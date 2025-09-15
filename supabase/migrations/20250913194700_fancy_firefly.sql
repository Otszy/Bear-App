/*
  # Fix RLS Policies for Security

  1. Security Updates
    - Remove overly permissive policies
    - Add proper authentication checks
    - Restrict access to authenticated users only
    - Add row-level security for user data isolation

  2. Tables Updated
    - users: Only allow users to access their own data
    - user_tasks: Users can only see/modify their own tasks
    - referrals: Users can only see referrals they're involved in
    - withdrawals: Users can only see their own withdrawals
    - task_attempts: Users can only see their own attempts
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage own data" ON users;
DROP POLICY IF EXISTS "User tasks can be managed" ON user_tasks;
DROP POLICY IF EXISTS "Referrals can be managed" ON referrals;
DROP POLICY IF EXISTS "Withdrawals can be managed" ON withdrawals;
DROP POLICY IF EXISTS "Task attempts can be managed" ON task_attempts;

-- Create secure policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = telegram_id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = telegram_id)
  WITH CHECK (auth.uid()::text = telegram_id);

-- Service role can manage all users (for edge functions)
CREATE POLICY "Service role can manage users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create secure policies for user_tasks table
CREATE POLICY "Users can read own tasks"
  ON user_tasks
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE telegram_id = auth.uid()::text
  ));

CREATE POLICY "Service role can manage tasks"
  ON user_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create secure policies for referrals table
CREATE POLICY "Users can read own referrals"
  ON referrals
  FOR SELECT
  TO authenticated
  USING (
    referrer_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text) OR
    referred_id IN (SELECT id FROM users WHERE telegram_id = auth.uid()::text)
  );

CREATE POLICY "Service role can manage referrals"
  ON referrals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create secure policies for withdrawals table
CREATE POLICY "Users can read own withdrawals"
  ON withdrawals
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE telegram_id = auth.uid()::text
  ));

CREATE POLICY "Service role can manage withdrawals"
  ON withdrawals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create secure policies for task_attempts table
CREATE POLICY "Users can read own attempts"
  ON task_attempts
  FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT id FROM users WHERE telegram_id = auth.uid()::text
  ));

CREATE POLICY "Service role can manage attempts"
  ON task_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create stored procedure for atomic task completion
CREATE OR REPLACE FUNCTION process_ad_task_completion(
  p_user_id UUID,
  p_task_type TEXT,
  p_task_id TEXT,
  p_reward_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_referral_record RECORD;
  v_commission NUMERIC;
BEGIN
  -- Update user balance
  UPDATE users 
  SET balance = balance + p_reward_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Handle referral commission
  SELECT referrer_id, commission_amount INTO v_referral_record
  FROM referrals 
  WHERE referred_id = p_user_id;

  IF FOUND THEN
    v_commission := p_reward_amount * 0.1; -- 10% commission
    
    -- Update referral commission
    UPDATE referrals 
    SET commission_amount = commission_amount + v_commission
    WHERE referred_id = p_user_id;
    
    -- Give commission to referrer
    UPDATE users 
    SET balance = balance + v_commission
    WHERE id = v_referral_record.referrer_id;
  END IF;

  -- Update task attempts
  INSERT INTO task_attempts (
    user_id, task_type, task_id, attempts_count, 
    last_attempt_at, reset_at
  ) VALUES (
    p_user_id, p_task_type, p_task_id, 1,
    NOW(), NOW() + INTERVAL '3 hours'
  )
  ON CONFLICT (user_id, task_type, task_id) 
  DO UPDATE SET
    attempts_count = CASE 
      WHEN task_attempts.reset_at > NOW() THEN task_attempts.attempts_count + 1
      ELSE 1
    END,
    last_attempt_at = NOW(),
    reset_at = CASE
      WHEN task_attempts.reset_at > NOW() THEN task_attempts.reset_at
      ELSE NOW() + INTERVAL '3 hours'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;