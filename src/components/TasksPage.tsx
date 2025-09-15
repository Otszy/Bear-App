import React, { useState, useEffect } from 'react'
import { ExternalLink, DollarSign, Zap, TrendingUp, Clock, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useTelegram } from '../hooks/useTelegram'
import { RewardNotification } from './RewardNotification'

export const TasksPage: React.FC = () => {
  const { user, updateBalance, refreshUser } = useUser()
  const { webApp } = useTelegram()
  const [taskAttempts, setTaskAttempts] = useState<Record<string, any>>({})
  const [loadingTasks, setLoadingTasks] = useState<string[]>([])
  const [showReward, setShowReward] = useState(false)
  const [rewardAmount, setRewardAmount] = useState(0)

  const adTasks = [
    { id: 'task1', title: 'Complete Task 1', url: 'https://otieu.com/4/9866420' },
    { id: 'task2', title: 'Complete Task 2', url: 'https://otieu.com/4/9866412' },
    { id: 'task3', title: 'Complete Task 3', url: 'https://otieu.com/4/9711438' },
    { id: 'task4', title: 'Complete Task 4', url: 'https://otieu.com/4/9866418' }
  ]

  useEffect(() => {
    if (user) {
      checkTaskAttempts()
    }
  }, [user])

  const checkTaskAttempts = async () => {
    if (!user) return

    console.log('Checking task attempts for user:', user.id)
    
    try {
      // Prepare initData
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        initDataToSend = `user=${encodeURIComponent(JSON.stringify({id: user.telegram_id, first_name: user.first_name}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      const { data, error } = await supabase.functions.invoke('get-task-attempts', {
        body: { 
          initData: initDataToSend
        }
      })

      if (error) throw error

      if (data.success && data.taskAttempts) {
        const attemptsMap: Record<string, any> = {}
        data.taskAttempts.forEach((attempt: any) => {
          attemptsMap[attempt.task_id] = attempt
        })
        console.log('Task attempts map:', attemptsMap)
        setTaskAttempts(attemptsMap)
      }
    } catch (error) {
      console.error('Error fetching task attempts:', error)
      // For testing, set empty attempts
      setTaskAttempts({})
    }
  }

  const canDoTask = (taskId: string) => {
    const attempt = taskAttempts[taskId]
    console.log(`Can do task ${taskId}:`, attempt)
    if (!attempt) return true
    
    const now = new Date()
    const resetTime = new Date(attempt.reset_at)
    console.log(`Task ${taskId} - Now: ${now}, Reset: ${resetTime}`)
    
    // If reset time has passed, user can do task again
    if (now > resetTime) {
      console.log(`Task ${taskId} - Reset time passed, can do task`)
      return true
    }
    
    // Check if user has attempts left
    const canDo = attempt.attempts_count < 10
    console.log(`Task ${taskId} - Attempts: ${attempt.attempts_count}/10, Can do: ${canDo}`)
    return canDo
  }

  const getRemainingAttempts = (taskId: string) => {
    const attempt = taskAttempts[taskId]
    console.log(`Getting remaining attempts for ${taskId}:`, attempt)
    if (!attempt) return 10
    
    const now = new Date()
    const resetTime = new Date(attempt.reset_at)
    
    // If reset time has passed, reset to 10
    if (now > resetTime) {
      console.log(`Task ${taskId} - Reset time passed, returning 10`)
      return 10
    }
    
    const remaining = Math.max(0, 10 - attempt.attempts_count)
    console.log(`Task ${taskId} - Remaining: ${remaining}`)
    return remaining
  }

  const getTimeUntilReset = (taskId: string) => {
    const attempt = taskAttempts[taskId]
    if (!attempt) return null
    
    const now = new Date()
    const resetTime = new Date(attempt.reset_at)
    
    if (now > resetTime) return null
    
    const diff = resetTime.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }
  const handleAdTask = async (taskId: string, url: string) => {
    if (!user || !canDoTask(taskId)) return

    console.log('=== STARTING AD TASK ===')
    console.log('Task ID:', taskId)
    console.log('Current task attempts before:', taskAttempts[taskId])

    setLoadingTasks(prev => [...prev, taskId])
    
    try {
      // Open ad URL
      window.open(url, '_blank')
      
      // Wait for user to complete the task
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      console.log('Calling validate-ad-task function...')
      
      // Prepare initData
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        initDataToSend = `user=${encodeURIComponent(JSON.stringify({id: user.telegram_id, first_name: user.first_name}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      // Call server-side validation
      const { data, error } = await supabase.functions.invoke('validate-ad-task', {
        body: { 
          taskId: taskId,
          taskType: 'ad_task',
          initData: initDataToSend
        }
      })

      console.log('Function response:', { data, error })

      if (error) throw error

      if (data.success) {
        updateBalance(data.newBalance ?? user.balance + (data.reward ?? 0.003))
        setRewardAmount(data.reward ?? 0.003)
        setShowReward(true)
        webApp?.HapticFeedback.notificationOccurred('success')
        
        console.log('Task completed successfully, refreshing data...')
        await refreshUser()
        
        // Wait a bit then refresh task attempts
        setTimeout(async () => {
          console.log('Refreshing task attempts after delay...')
          await checkTaskAttempts()
        }, 2000)
        
        // Triple check after longer delay
        setTimeout(async () => {
          console.log('Final refresh of task attempts...')
          await checkTaskAttempts()
        }, 4000)
      } else {
        throw new Error(data.error || 'Task validation failed')
      }
    } catch (error) {
      console.error('Error completing ad task:', error)
      webApp?.HapticFeedback.notificationOccurred('error')
    } finally {
      setLoadingTasks(prev => prev.filter(id => id !== taskId))
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-800 p-4 pb-32">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Tasks
          </h1>
          
          {/* Balance Card for Tasks Page */}
          <div className="relative bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 p-[2px] rounded-2xl mb-6">
            <div className="bg-white backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Balance</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    ${user.balance.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Zap size={16} />
                <span className="text-sm">Complete tasks to earn more!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-6">
            <Zap className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Advertisement Tasks</h2>
          </div>
          <div className="space-y-4">
            {adTasks.map((task) => (
              <div key={task.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                      <ExternalLink size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{task.title}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <RotateCcw size={12} />
                        <span>{getRemainingAttempts(task.id)}/10 attempts left</span>
                        {getTimeUntilReset(task.id) && (
                          <>
                            <Clock size={12} />
                            <span>Reset in {getTimeUntilReset(task.id)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                    +$0.003
                  </div>
                </div>
                <button
                  onClick={() => handleAdTask(task.id, task.url)}
                  disabled={!canDoTask(task.id) || loadingTasks.includes(task.id)}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    !canDoTask(task.id)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : loadingTasks.includes(task.id)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105'
                  }`}
                >
                  {!canDoTask(task.id)
                    ? getRemainingAttempts(task.id) === 0 
                      ? `Wait ${getTimeUntilReset(task.id)}`
                      : 'No attempts left'
                    : loadingTasks.includes(task.id) 
                    ? 'Processing...' 
                    : 'Start Task'}
                </button>
              </div>
            ))}
          </div>
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