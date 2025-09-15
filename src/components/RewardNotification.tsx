import React, { useEffect, useState } from 'react'
import { DollarSign, Sparkles, TrendingUp, Gift } from 'lucide-react'

interface RewardNotificationProps {
  show: boolean
  amount: number
  onClose: () => void
}

export const RewardNotification: React.FC<RewardNotificationProps> = ({ show, amount, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          onClose()
        }, 300)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => {
          setIsAnimating(false)
          setTimeout(() => {
            setIsVisible(false)
            onClose()
          }, 300)
        }}
      />
      
      {/* Notification Card */}
      <div 
        className={`relative bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-1 rounded-3xl shadow-2xl transform transition-all duration-500 ${
          isAnimating 
            ? 'scale-100 opacity-100 rotate-0' 
            : 'scale-75 opacity-0 rotate-12'
        }`}
      >
        <div className="bg-white rounded-3xl p-8 text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-8 h-8 bg-green-400 rounded-full animate-pulse" />
            <div className="absolute top-8 right-6 w-4 h-4 bg-emerald-400 rounded-full animate-pulse delay-300" />
            <div className="absolute bottom-6 left-8 w-6 h-6 bg-teal-400 rounded-full animate-pulse delay-700" />
            <div className="absolute bottom-4 right-4 w-3 h-3 bg-green-500 rounded-full animate-pulse delay-1000" />
          </div>

          {/* Success Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <Gift size={40} className="text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-spin">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            🎉 Reward Earned!
          </h2>
          
          {/* Amount */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
              <DollarSign size={24} className="text-white" />
            </div>
            <span className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
              +${amount.toFixed(3)}
            </span>
          </div>

          {/* Success Message */}
          <p className="text-gray-600 mb-6">
            Great job! Your reward has been added to your balance.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center space-x-2 text-green-600 mb-6">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">Keep earning more rewards!</span>
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              setIsAnimating(false)
              setTimeout(() => {
                setIsVisible(false)
                onClose()
              }, 300)
            }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
          >
            Awesome! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}