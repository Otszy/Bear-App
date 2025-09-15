import React, { useState, useEffect } from 'react'
import { Copy, Users, DollarSign, Gift, UserPlus, TrendingUp, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../contexts/UserContext'
import { useTelegram } from '../hooks/useTelegram'

export const ReferralPage: React.FC = () => {
  const { user } = useUser()
  const { webApp } = useTelegram()
  const [referrals, setReferrals] = useState<any[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      fetchReferrals()
    }
  }, [user])

  const fetchReferrals = async () => {
    if (!user) return

    try {
      // Prepare initData
      let initDataToSend = ''
      if (window.Telegram?.WebApp?.initData) {
        initDataToSend = window.Telegram.WebApp.initData
      } else {
        initDataToSend = `user=${encodeURIComponent(JSON.stringify({id: user.telegram_id, first_name: user.first_name}))}&auth_date=${Math.floor(Date.now()/1000)}&hash=mock_hash_for_testing`
      }
      
      const { data, error } = await supabase.functions.invoke('get-referrals', {
        body: { 
          initData: initDataToSend
        }
      })

      if (error) throw error

      if (data.success && data.referrals) {
        setReferrals(data.referrals)
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
      // For testing, set empty referrals
      setReferrals([])
    }
  }

  const getReferralLink = () => {
    return `https://t.me/bearappcom_bot?start=ref_${user?.telegram_id}`
  }

  const copyReferralLink = () => {
    const link = getReferralLink()
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      webApp?.HapticFeedback.notificationOccurred('success')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading referrals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-800 p-4 pb-32">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Referral Program
          </h1>
          
          {/* Balance Card for Referral Page */}
          <div className="relative bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 p-[2px] rounded-2xl mb-6">
            <div className="bg-white backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Your Balance</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    ${user.balance.toFixed(3)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2 text-blue-600">
                <Gift size={16} />
                <span className="text-sm">Invite friends to earn more!</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <UserPlus className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Invite Friends</h2>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2 mb-3">
              <Star className="text-blue-500" size={20} />
              <h3 className="font-semibold text-gray-800">How it works:</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Share your referral link with friends</li>
              <li>• When they join using your link, you both get rewards</li>
              <li>• Earn <span className="text-blue-600 font-semibold">10% commission</span> from their task earnings</li>
              <li>• No limit on referrals!</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3 font-medium">Your referral link:</p>
            <div className="flex items-stretch space-x-2">
              <input
                type="text"
                value={getReferralLink()}
                readOnly
                className="flex-1 bg-white border border-blue-300 text-gray-800 px-3 py-3 rounded-lg text-sm min-w-0"
              />
              <button
                onClick={copyReferralLink}
                className={`px-4 py-3 rounded-lg font-medium transition-colors flex-shrink-0 ${
                  copied
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-blue-500/25 transform hover:scale-105'
                }`}
              >
                {copied ? '✓' : <Copy size={16} />}
              </button>
            </div>
          </div>

          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{referrals.length}</p>
                  <p className="text-sm text-gray-600">Friends Invited</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Your Referrals</h2>
          </div>
          {referrals.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Users size={40} className="text-blue-500" />
              </div>
              <p className="text-lg font-medium mb-2">No referrals yet</p>
              <p className="text-sm text-gray-500">Start inviting friends to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div key={referral.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {referral.referred.first_name} {referral.referred.last_name}
                      </p>
                      {referral.referred.username && (
                        <p className="text-sm text-gray-600">@{referral.referred.username}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                      +${(referral.commission_amount || 0).toFixed(6)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}