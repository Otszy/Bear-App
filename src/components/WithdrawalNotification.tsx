import React, { useEffect, useState } from 'react'
import { CheckCircle, Send, Sparkles, TrendingUp, DollarSign, Clock, Zap } from 'lucide-react'

interface WithdrawalNotificationProps {
  show: boolean
  amount: number
  method: string
  onClose: () => void
}

export const WithdrawalNotification: React.FC<WithdrawalNotificationProps> = ({ 
  show, 
  amount, 
  method, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Animation sequence
      const stepTimer = setInterval(() => {
        setStep(prev => (prev + 1) % 3)
      }, 1000)
      
      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          onClose()
        }, 500)
      }, 4000)

      return () => {
        clearTimeout(timer)
        clearInterval(stepTimer)
      }
    }
  }, [show, onClose])

  if (!isVisible) return null

  const getMethodIcon = () => {
    switch (method.toLowerCase()) {
      case 'dana': return '💳'
      case 'gopay': return '🏦'
      case 'bank': return '🏛️'
      case 'usdt': return '₿'
      default: return '💰'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Animated Backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-500 ${
          isAnimating 
            ? 'bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-indigo-900/80 backdrop-blur-lg' 
            : 'bg-black/20'
        }`}
        onClick={() => {
          setIsAnimating(false)
          setTimeout(() => {
            setIsVisible(false)
            onClose()
          }, 500)
        }}
      />
      
      {/* Main Notification Card */}
      <div 
        className={`relative transform transition-all duration-700 ${
          isAnimating 
            ? 'scale-100 opacity-100 rotate-0 translate-y-0' 
            : 'scale-75 opacity-0 rotate-12 translate-y-8'
        }`}
      >
        {/* Outer Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-60 animate-pulse" />
        
        {/* Card Container */}
        <div className="relative bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-3xl p-8 shadow-2xl border border-white/50 backdrop-blur-sm max-w-sm w-full">
          
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute top-4 left-6 w-2 h-2 bg-blue-400 rounded-full animate-bounce opacity-60" />
            <div className="absolute top-8 right-8 w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-300 opacity-60" />
            <div className="absolute bottom-8 left-4 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-700 opacity-60" />
            <div className="absolute bottom-6 right-6 w-1 h-1 bg-indigo-400 rounded-full animate-bounce delay-1000 opacity-60" />
          </div>

          {/* Header Icon with Animation */}
          <div className="relative mb-6 flex justify-center">
            <div className={`relative transition-all duration-1000 ${
              step === 0 ? 'scale-100' : step === 1 ? 'scale-110' : 'scale-105'
            }`}>
              {/* Icon Background */}
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                <Send size={40} className="text-white relative z-10" />
              </div>
              
              {/* Floating Success Badge */}
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-spin-slow shadow-lg">
                <CheckCircle size={20} className="text-white" />
              </div>
              
              {/* Pulsing Ring */}
              <div className="absolute inset-0 border-4 border-green-400/30 rounded-full animate-ping" />
            </div>
          </div>

          {/* Title with Gradient */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              🎉 Withdrawal Submitted!
            </h2>
            <p className="text-gray-600 text-sm">Your request is being processed</p>
          </div>

          {/* Amount Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-2 text-4xl">💰</div>
              <div className="absolute bottom-2 right-2 text-2xl">✨</div>
            </div>
            
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <DollarSign size={24} className="text-white" />
                </div>
                <span className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  ${amount.toFixed(3)}
                </span>
              </div>
              
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <span className="text-2xl">{getMethodIcon()}</span>
                <span className="font-semibold capitalize">{method}</span>
              </div>
            </div>
          </div>

          {/* Status Steps */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center space-x-3 text-green-600">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium">Request submitted</span>
            </div>
            
            <div className={`flex items-center space-x-3 transition-all duration-500 ${
              step >= 1 ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                step >= 1 ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                <Clock size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium">Processing payment</span>
              {step >= 1 && <Zap size={16} className="text-blue-500 animate-pulse" />}
            </div>
            
            <div className={`flex items-center space-x-3 transition-all duration-500 ${
              step >= 2 ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${
                step >= 2 ? 'bg-purple-500' : 'bg-gray-300'
              }`}>
                <TrendingUp size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium">Funds will arrive soon</span>
              {step >= 2 && <Sparkles size={16} className="text-purple-500 animate-pulse" />}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              setIsAnimating(false)
              setTimeout(() => {
                setIsVisible(false)
                onClose()
              }, 500)
            }}
            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 relative overflow-hidden"
          >
            {/* Button Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
            <span className="relative z-10 flex items-center justify-center space-x-2">
              <span>Got it! 🚀</span>
            </span>
          </button>
          
          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            You'll receive a notification when the transfer is complete
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  )
}