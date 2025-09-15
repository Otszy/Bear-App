import React, { useState, useEffect } from 'react'
import { DollarSign, Send, Clock, CheckCircle, XCircle, Wallet, CreditCard, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useTelegram } from '../hooks/useTelegram'
import { WithdrawalNotification } from './WithdrawalNotification'

export const WalletPage: React.FC = () => {
  const { user, updateBalance, refreshUser } = useUser()
  const { webApp } = useTelegram()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('dana')
  const [accountInfo, setAccountInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [showWithdrawalNotification, setShowWithdrawalNotification] = useState(false)
  const [withdrawalData, setWithdrawalData] = useState({ amount: 0, method: '' })

  const withdrawalMethods = [
    { id: 'dana', label: 'DANA', placeholder: 'Enter DANA number' },
    { id: 'gopay', label: 'GoPay', placeholder: 'Enter GoPay number' },
    { id: 'bank', label: 'Bank Transfer', placeholder: 'Enter account number' },
    { id: 'usdt', label: 'USDT (Crypto)', placeholder: 'Enter USDT wallet address' }
  ]

  useEffect(() => {
    if (user) {
      fetchWithdrawals()
    }
  }, [user])

  const fetchWithdrawals = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.functions.invoke('get-withdrawals', {
        body: { 
          initData: window.Telegram?.WebApp?.initData || `user=${encodeURIComponent(JSON.stringify({id: 123456789, first_name: 'Test'}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
        }
      })

      if (error) throw error

      if (data.success && data.withdrawals) {
        setWithdrawals(data.withdrawals)
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      // For testing, set empty withdrawals
      setWithdrawals([])
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return

    const withdrawAmount = parseFloat(amount)
    if (!withdrawAmount || withdrawAmount <= 0) {
      webApp?.HapticFeedback.notificationOccurred('error')
      return
    }

    if (withdrawAmount > user.balance) {
      webApp?.HapticFeedback.notificationOccurred('error')
      alert('Insufficient balance')
      return
    }

    if (withdrawAmount < 0.01) {
      webApp?.HapticFeedback.notificationOccurred('error')
      alert('Minimum withdrawal amount is $0.01')
      return
    }

    if (!accountInfo.trim()) {
      webApp?.HapticFeedback.notificationOccurred('error')
      alert('Please enter account information')
      return
    }

    setLoading(true)

    try {
      // Prepare initData
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        initDataToSend = `user=${encodeURIComponent(JSON.stringify({id: user.telegram_id, first_name: user.first_name}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      // Call server-side withdrawal validation
      const { data, error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          amount: withdrawAmount,
          method: method,
          accountInfo: accountInfo.trim(),
          initData: initDataToSend
        }
      })

      if (error) throw error

      if (data.success) {
        updateBalance(data.newBalance ?? user.balance - withdrawAmount)
        webApp?.HapticFeedback.notificationOccurred('success')
        
        // Show custom notification
        setWithdrawalData({ amount: withdrawAmount, method: method })
        setShowWithdrawalNotification(true)
        
        await refreshUser()
        await fetchWithdrawals()
        
        // Reset form
        setAmount('')
        setAccountInfo('')
      } else {
        throw new Error(data.error || 'Withdrawal failed')
      }
    } catch (error) {
      console.error('Withdrawal error:', error)
      webApp?.HapticFeedback.notificationOccurred('error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />
      case 'failed':
        return <XCircle size={16} className="text-red-400" />
      default:
        return <Clock size={16} className="text-gray-400" />
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-800 p-4 pb-32">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Wallet
          </h1>
          
          {/* Premium Balance Card */}
          <div className="relative bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 p-[2px] rounded-2xl mb-6">
            <div className="bg-white backdrop-blur-sm rounded-2xl p-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <Wallet size={32} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                  <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    ${user.balance.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <TrendingUp size={16} />
                <span className="text-sm">Ready for withdrawal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 mb-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6 flex items-center space-x-2 text-gray-800">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
              <Send size={20} className="text-white" />
            </div>
            <span>Withdraw Funds</span>
          </h2>
          
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Amount ($)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                min="0.01"
                max={user.balance}
                placeholder="0.000"
                className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                required
              />
              <p className="text-xs text-gray-600 mt-2">
                Available: ${user.balance.toFixed(3)} • Min: $0.01
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Withdrawal Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              >
                {withdrawalMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Account Information
              </label>
              <input
                type="text"
                value={accountInfo}
                onChange={(e) => setAccountInfo(e.target.value)}
                placeholder={withdrawalMethods.find(m => m.id === method)?.placeholder}
                className="w-full bg-white border border-blue-300 rounded-xl px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105'
              }`}
            >
              {loading ? 'Processing...' : 'Submit Withdrawal'}
            </button>
          </form>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCard className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Withdrawal History</h2>
          </div>
          {withdrawals.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Send size={40} className="text-blue-500" />
              </div>
              <p className="text-lg font-medium">No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(withdrawal.status)}
                      <span className="font-semibold text-gray-800">${withdrawal.amount.toFixed(3)}</span>
                    </div>
                    <span className="text-sm text-gray-600 capitalize font-medium">
                      {withdrawal.method}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Status: <span className="capitalize">{withdrawal.status}</span></p>
                    <p>Date: {new Date(withdrawal.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <WithdrawalNotification 
        show={showWithdrawalNotification}
        amount={withdrawalData.amount}
        method={withdrawalData.method}
        onClose={() => setShowWithdrawalNotification(false)}
      />
    </div>
  )
}