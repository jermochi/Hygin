import { useState, useEffect } from 'react'
import { getMedalStatus } from '../utils/gameCompletion'
import bronzeMedal from '../assets/bronze-medal.png'
import silverMedal from '../assets/silver-medal.png'
import goldMedal from '../assets/gold-medal.png'
import './MedalDisplay.css'

const MedalDisplay = () => {
  const [medalStatus, setMedalStatus] = useState({ bronze: false, silver: false, gold: false })

  useEffect(() => {
    // Update medal status on mount and when storage changes
    const updateMedals = () => {
      setMedalStatus(getMedalStatus())
    }

    updateMedals()

    // Listen for storage changes (in case another tab completes a game)
    const handleStorageChange = (e) => {
      if (e.key === 'hygin_game_completions') {
        updateMedals()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom event for same-tab updates
    window.addEventListener('gameCompleted', updateMedals)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('gameCompleted', updateMedals)
    }
  }, [])

  return (
    <div className="medal-display">
      <div className={`medal-item ${medalStatus.bronze ? 'earned' : 'unearned'}`}>
        <img 
          src={bronzeMedal} 
          alt="Bronze Medal" 
          className="medal-image"
          title={medalStatus.bronze ? "Bronze Medal - Earned!" : "Bronze Medal - Complete 1 game to earn"}
        />
      </div>
      <div className={`medal-item ${medalStatus.silver ? 'earned' : 'unearned'}`}>
        <img 
          src={silverMedal} 
          alt="Silver Medal" 
          className="medal-image"
          title={medalStatus.silver ? "Silver Medal - Earned!" : "Silver Medal - Complete 2 different games to earn"}
        />
      </div>
      <div className={`medal-item ${medalStatus.gold ? 'earned' : 'unearned'}`}>
        <img 
          src={goldMedal} 
          alt="Gold Medal" 
          className="medal-image"
          title={medalStatus.gold ? "Gold Medal - Earned!" : "Gold Medal - Complete all 3 games to earn"}
        />
      </div>
    </div>
  )
}

export default MedalDisplay

