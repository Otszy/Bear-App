import React from 'react'
import { Home, CheckSquare, Users, Wallet } from 'lucide-react'

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'referral', icon: Users, label: 'Referral' },
    { id: 'wallet', icon: Wallet, label: 'Wallet' }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${
              activeTab === tab.id
                ? 'text-blue-600 transform scale-105'
                : 'text-gray-500 hover:text-blue-500 hover:scale-105'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all duration-300 ${
              activeTab === tab.id 
                ? 'bg-blue-100 shadow-lg shadow-blue-500/25' 
                : 'bg-transparent hover:bg-blue-50'
            }`}>
              <tab.icon size={20} />
            </div>
            <span className="text-xs mt-1 font-medium truncate">{tab.label}</span>
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}