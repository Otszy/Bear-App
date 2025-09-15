import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, Database } from '../lib/supabase'
import { useTelegram } from '../hooks/useTelegram'

type User = Database['public']['Tables']['users']['Row']

interface UserContextType {
  user: User | null
  loading: boolean
  updateBalance: (newBalance: number) => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { user: telegramUser, startParam, isReady } = useTelegram()

  const refreshUser = async () => {
    if (!telegramUser || !isReady) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Prepare initData - use real data if available, mock for testing
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        // Mock initData for testing
        initDataToSend = `user=${encodeURIComponent(JSON.stringify(telegramUser))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      const { data, error } = await supabase.functions.invoke('get-profile', {
        body: { 
          initData: initDataToSend,
          startParam: startParam
        }
      })

      if (error) throw error

      if (data.success && data.profile) {
        setUser(data.profile)
      } else {
        throw new Error(data.error || 'Failed to get user profile')
      }
    } catch (error) {
      console.error('Error fetching/creating user:', error)
      // Create fallback user for testing or if function fails
      if (telegramUser) {
        setUser({
          id: 'test-user-id',
          telegram_id: telegramUser.id.toString(),
          username: telegramUser.username || null,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name || null,
          balance: 0.123,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance })
    }
  }

  useEffect(() => {
    if (telegramUser && isReady) {
      refreshUser()
    }
  }, [telegramUser, isReady])

  return (
    <UserContext.Provider value={{ user, loading, updateBalance, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}