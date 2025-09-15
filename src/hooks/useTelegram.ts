import { useEffect, useState } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface WebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    start_param?: string
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: {
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
    hint_color?: string
    bg_color?: string
    text_color?: string
  }
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  ready: () => void
  expand: () => void
  close: () => void
  MainButton: {
    text: string
    color: string
    textColor: string
    isVisible: boolean
    isProgressVisible: boolean
    isActive: boolean
    setText: (text: string) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
    setParams: (params: any) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  BackButton: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: WebApp
    }
  }
}

export const useTelegram = () => {
  const [webApp, setWebApp] = useState<WebApp | null>(null)
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Check if we're in Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      
      // Initialize Telegram WebApp
      tg.ready()
      tg.expand()
      
      // Set theme
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark')
      }
      
      setWebApp(tg)
      setUser(tg.initDataUnsafe.user || null)
      setStartParam(tg.initDataUnsafe.start_param || null)
      setIsReady(true)
    } else {
      // Fallback for testing outside Telegram
      console.log('Running outside Telegram WebApp - using mock data')
      // Better mock data for testing
      setUser({
        id: 123456789,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en'
      })
      setIsReady(true)
    }
  }, [])

  return {
    webApp,
    user,
    startParam,
    isReady
  }
}