import { createClient } from '@supabase/supabase-js'

// Supabase credentials - safe for frontend
const supabaseUrl = 'https://ibvufpvorhzndmixsiym.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidnVmcHZvcmh6bmRtaXhzaXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MDEzNTEsImV4cCI6MjA3MzI3NzM1MX0.tHmCxuxlYpaD0K7Kz6-GniesKg0FlnX0ldgbMnilc1I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          telegram_id: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          telegram_id?: string
          username?: string | null
          first_name?: string | null
          last_name?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_tasks: {
        Row: {
          id: string
          user_id: string
          task_type: string
          task_id: string
          completed: boolean
          completed_at: string | null
          reward_claimed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_type: string
          task_id: string
          completed?: boolean
          completed_at?: string | null
          reward_claimed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_type?: string
          task_id?: string
          completed?: boolean
          completed_at?: string | null
          reward_claimed?: boolean
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string
          reward_claimed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id: string
          reward_claimed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string
          reward_claimed?: boolean
          created_at?: string
        }
      }
      withdrawals: {
        Row: {
          id: string
          user_id: string
          amount: number
          method: string
          account_info: string
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          method: string
          account_info: string
          status?: string
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          method?: string
          account_info?: string
          status?: string
          created_at?: string
          processed_at?: string | null
        }
      }
      task_attempts: {
        Row: {
          id: string
          user_id: string
          task_type: string
          task_id: string
          attempts_count: number
          last_attempt_at: string
          reset_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_type: string
          task_id: string
          attempts_count?: number
          last_attempt_at?: string
          reset_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_type?: string
          task_id?: string
          attempts_count?: number
          last_attempt_at?: string
          reset_at?: string
          created_at?: string
        }
      }
    }
  }
}