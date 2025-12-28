import { useState, useEffect } from 'react'
import { getCurrentPlayer } from '../utils/scoreManager'
import bronzeMedal from '../assets/bronze-medal.png'
import silverMedal from '../assets/silver-medal.png'
import goldMedal from '../assets/gold-medal.png'
import './MedalDisplay.css'

const MedalDisplay = () => {
  const [medalStatus, setMedalStatus] = useState({ bronze: false, silver: false, gold: false })

  useEffect(() => {
    const updateMedals = async () => {
      const player = await getCurrentPlayer()

      if (!player) {
        // No player found, all medals are locked
        setMedalStatus({ bronze: false, silver: false, gold: false })
        return
      }

      // Count how many games have been completed (score > 0)
      const gamesCompleted = [
        player.game1_score > 0,
        player.game2_score > 0,
        player.game3_score > 0
      ].filter(Boolean).length

      // Light up medals based on number of games completed
      setMedalStatus({
        bronze: gamesCompleted >= 1,  // 1+ games completed
        silver: gamesCompleted >= 2,  // 2+ games completed
        gold: gamesCompleted >= 3     // All 3 games completed
      })
    }

    updateMedals()

    // Listen for custom event when a game is completed
    window.addEventListener('gameCompleted', updateMedals)

    return () => {
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
          title={medalStatus.silver ? "Silver Medal - Earned!" : "Silver Medal - Complete 2 games to earn"}
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
