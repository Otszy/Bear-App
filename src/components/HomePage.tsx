import React, { useState, useEffect } from 'react'
import { ExternalLink, Users, DollarSign, Sparkles, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useTelegram } from '../hooks/useTelegram'
import { RewardNotification } from './RewardNotification'

interface HomePageProps {
  setActiveTab: (tab: string) => void
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTab }) => {
  const { user, updateBalance, refreshUser } = useUser()
  const { webApp } = useTelegram()
  const [followCompleted, setFollowCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showReward, setShowReward] = useState(false)
  const [rewardAmount, setRewardAmount] = useState(0)

  useEffect(() => {
    if (user) {
      checkFollowTask()
    }
  }, [user])

  const checkFollowTask = async () => {
    if (!user) return

    const { data } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('task_type', 'follow_channel')
      .eq('task_id', 'bearappcom')
      .single()

    if (data && data.completed) {
      setFollowCompleted(true)
    }
  }

  const handleFollowChannel = async () => {
    if (!user || followCompleted) return

    setLoading(true)
    
    try {
      // Open Telegram channel
      window.open('https://t.me/bearappcom', '_blank')
      
      // Give user some time to follow
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Prepare initData
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        initDataToSend = `user=${encodeURIComponent(JSON.stringify({id: user.telegram_id, first_name: user.first_name}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      // Call server-side validation
      const { data, error } = await supabase.functions.invoke('validate-follow-task', {
        body: { 
          channelUsername: 'bearappcom',
          taskType: 'follow_channel',
          initData: initDataToSend
        }
      })

      if (error) throw error

      if (data.success) {
        setFollowCompleted(true)
        updateBalance(data.newBalance ?? user.balance + (data.reward ?? 0.01))
        setRewardAmount(data.reward ?? 0.01)
        setShowReward(true)
        webApp?.HapticFeedback.notificationOccurred('success')
        await refreshUser()
      } else {
        throw new Error(data.error || 'Follow task validation failed')
      }
    } catch (error) {
      console.error('Error completing follow task:', error)
      webApp?.HapticFeedback.notificationOccurred('error')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-800 p-4 pb-32">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Welcome to BearApp
          </h1>
          
          {/* Modern Balance Card */}
          <div className="relative bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 p-[2px] rounded-2xl mb-6">
            <div className="bg-white backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    ${user.balance.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <TrendingUp size={16} />
                <span className="text-sm">Keep earning rewards!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Main Task</h2>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                  <ExternalLink size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Follow Our Channel</h3>
                  <p className="text-sm text-gray-600">Join @bearappcom</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                +$0.01
              </div>
            </div>
            <button
              onClick={handleFollowChannel}
              disabled={followCompleted || loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                followCompleted
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white cursor-not-allowed shadow-lg transform scale-105'
                  : loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 active:scale-95'
              }`}
            >
              {followCompleted ? '✓ Completed' : loading ? 'Processing...' : 'Follow Channel'}
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 shadow-lg">
          <button
            onClick={() => setActiveTab('referral')}
            className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
          >
            <div className="p-1 bg-white/20 rounded-lg">
              <Users size={20} />
            </div>
            <span className="text-lg">Invite Friends</span>
          </button>
          <p className="text-sm text-gray-600 text-center mt-3">
            Earn rewards by inviting your friends!
          </p>
        </div>
      </div>
      
      <RewardNotification 
        show={showReward}
        amount={rewardAmount}
        onClose={() => setShowReward(false)}
      />
    </div>
  )
}