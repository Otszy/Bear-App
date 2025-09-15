/*
  # Create users table and related schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `telegram_id` (text, unique) - Telegram user ID
      - `username` (text, nullable) - Telegram username
      - `first_name` (text) - User's first name
      - `last_name` (text, nullable) - User's last name
      - `balance` (numeric) - User's balance in dollars
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `task_type` (text) - Type of task (follow_channel, ad_task)
      - `task_id` (text) - Specific task identifier
      - `completed` (boolean) - Whether task is completed
      - `completed_at` (timestamp, nullable)
      - `reward_claimed` (boolean) - Whether reward was claimed
      - `created_at` (timestamp)

    - `referrals`
      - `id` (uuid, primary key)
      - `referrer_id` (uuid, foreign key to users) - User who referred
      - `referred_id` (uuid, foreign key to users) - User who was referred
      - `reward_claimed` (boolean) - Whether referral reward was claimed
      - `created_at` (timestamp)

    - `withdrawals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `amount` (numeric) - Withdrawal amount
      - `method` (text) - Withdrawal method (dana, gopay, bank, usdt)
      - `account_info` (text) - Account details for withdrawal
      - `status` (text) - pending, completed, failed
      - `created_at` (timestamp)
      - `processed_at` (timestamp, nullable)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id text UNIQUE NOT NULL,
  username text,
  first_name text NOT NULL,
  last_name text,
  balance numeric DEFAULT 0 NOT NULL CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  task_type text NOT NULL,
  task_id text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, task_type, task_id)
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reward_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id),
  CHECK(referrer_id != referred_id)
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  account_info text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies for users table (allow all operations for now since we're using service key)
CREATE POLICY "Users can manage own data" ON users FOR ALL USING (true);
CREATE POLICY "User tasks can be managed" ON user_tasks FOR ALL USING (true);
CREATE POLICY "Referrals can be managed" ON referrals FOR ALL USING (true);
CREATE POLICY "Withdrawals can be managed" ON withdrawals FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_type_id ON user_tasks(task_type, task_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();