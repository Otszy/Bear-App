import React, { useState } from 'react'
import { UserProvider } from './contexts/UserContext'
import { Navigation } from './components/Navigation'
import { HomePage } from './components/HomePage'
import { TasksPage } from './components/TasksPage'
import { ReferralPage } from './components/ReferralPage'
import { WalletPage } from './components/WalletPage'

function App() {
  const [activeTab, setActiveTab] = useState('home')

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage setActiveTab={setActiveTab} />
      case 'tasks':
        return <TasksPage />
      case 'referral':
        return <ReferralPage />
      case 'wallet':
        return <WalletPage />
      default:
        return <HomePage setActiveTab={setActiveTab} />
    }
  }

  return (
    <UserProvider>
      <div className="bg-gray-900 min-h-screen">
        {renderActiveTab()}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </UserProvider>
  )
}

export default App