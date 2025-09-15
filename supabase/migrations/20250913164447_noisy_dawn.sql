/*
  # Update Referral System to 10% Commission

  1. Changes
    - Update referral system to use percentage-based commission
    - Add commission tracking
    - Update existing referral records

  2. Security
    - Maintain existing RLS policies
    - Add proper indexing for performance
*/

-- Add commission amount column to referrals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals' AND column_name = 'commission_amount'
  ) THEN
    ALTER TABLE referrals ADD COLUMN commission_amount numeric DEFAULT 0.01;
  END IF;
END $$;

-- Update existing referrals to have commission amount
UPDATE referrals 
SET commission_amount = 0.01 
WHERE commission_amount = 0 OR commission_amount IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_commission 
ON referrals(referrer_id, commission_amount);

-- Add constraint to ensure positive commission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'referrals' AND constraint_name = 'referrals_commission_check'
  ) THEN
    ALTER TABLE referrals ADD CONSTRAINT referrals_commission_check 
    CHECK (commission_amount >= 0);
  END IF;
END $$;