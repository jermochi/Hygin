import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Thumbnail from './Thumbnail'
import characterImage from '../assets/character.png'
import './LandingPage.css'
import logo from '../assets/logo.png'
import logoSvg from '../assets/logo-dark.png'
import MedalDisplay from './MedalDisplay'
import HygieneFallingIcons from './HygieneFallingIcons'
import { getCurrentPlayer, completeGameSession } from '../utils/scoreManager'
import { getTierLabel } from '../utils/scoreTier'
import { useGameFlow } from '../context/GameFlowContext'

const LandingPage = () => {
  const navigate = useNavigate()
  const { startGameFlow, getCurrentGamePath } = useGameFlow()
  const [playerName, setPlayerName] = useState('')
  const [showCelebration, setShowCelebration] = useState(false)
  const [allGamesComplete, setAllGamesComplete] = useState(false)
  const [playerScores, setPlayerScores] = useState(null)

  const handlePlayClick = () => {
    startGameFlow()
    navigate('/hairwashing')
  }

  useEffect(() => {
    const loadPlayerInfo = async () => {
      const player = await getCurrentPlayer()
      if (player) {
        setPlayerName(player.name)

        // Check if all games are completed
        const gamesCompleted = [
          player.game1_score > 0,
          player.game2_score > 0,
          player.game3_score > 0
        ].filter(Boolean).length

        // If all 3 games completed and haven't shown celebration yet
        if (gamesCompleted === 3 && !allGamesComplete) {
          setAllGamesComplete(true)
          setPlayerScores({
            game1: player.game1_score,
            game2: player.game2_score,
            game3: player.game3_score,
            total: player.game1_score + player.game2_score + player.game3_score
          })
          // Small delay before showing celebration
          setTimeout(() => {
            setShowCelebration(true)
          }, 500)
        }
      }
    }
    loadPlayerInfo()

    // Listen for game completion events
    const handleGameComplete = () => {
      loadPlayerInfo()
    }
    window.addEventListener('gameCompleted', handleGameComplete)

    return () => {
      window.removeEventListener('gameCompleted', handleGameComplete)
    }
  }, [allGamesComplete])

  const handleViewLeaderboard = async () => {
    // Complete the session and navigate to leaderboard
    setShowCelebration(false)
    const result = await completeGameSession()

    if (result) {
      navigate('/leaderboard')
    } else {
      alert('Failed to save your score. Please try again.')
    }
  }

  return (
    <div className="landing-page">
      <HygieneFallingIcons />
      <header className="header">
        <div className="logo">
          <img src={logo} alt="Hygin Logo" className="logo-image" />
        </div>
        <div className="header-right">
          {playerName && <div className="player-name">Welcome, {playerName}! 👋</div>}
          <MedalDisplay />
        </div>
      </header>

      <main className="main-content">
        <div className="left-section">
          <div className="logo-and-play">
            <div className="svg-logo">
              <img src={logoSvg} alt="Hygin logo" className="title-logo" />
            </div>
            <div className="action-buttons">
              <button className="play-button" onClick={handlePlayClick}>
                <span className="play-icon">▶</span>
                <span className="play-text">PLAY</span>
              </button>
              <button className="leaderboard-button" onClick={() => navigate('/leaderboard')}>
                <span className="leaderboard-icon">🏆</span>
                <span className="leaderboard-text">Rankings</span>
              </button>
            </div>
          </div>
          <p className="description">
            Hygienix is an engaging, web-based gamification platform designed to teach essential hygiene practices to children in Grades 3-6. The game transforms daily routines into a fun, interactive experience by using game elements like points, levels, and challenges. Players learn about and are motivated to practice key hygiene habits, specifically handwashing, tooth brushing, and hair washing, with the goal of building lifelong healthy behaviors.
          </p>
        </div>

        <div className="right-section">
          <div className="model-container">
            <img src={characterImage} alt="Character" className="character-image" />

            <div className="thumbnails">
              <Thumbnail
                type="hairwashing"
                position="hair"
                icon="🛁"
                label="Hair Washing"
              />
              <Thumbnail
                type="toothbrushing"
                position="mouth"
                icon="🦷"
                label="Tooth Brushing"
              />
              <Thumbnail
                type="handwashing"
                position="hands"
                icon="🧼"
                label="Hand Washing"
              />
            </div>
          </div>
        </div>
      </main >

      {/* Celebration modal when all games are complete */}
      {
        showCelebration && playerScores && (
          <div className="celebration-overlay">
            {/* Blurred background with landing page */}
            <div className="celebration-backdrop">
              <HygieneFallingIcons />
              <div className="backdrop-content">
                <img src={characterImage} alt="" className="backdrop-character" />
              </div>
            </div>

            <div className="celebration-card">
              <div className="celebration-icon">🎉</div>
              <h1 className="celebration-title">Congratulations, {playerName}!</h1>
              <p className="celebration-message">
                You've completed all 3 hygiene games! 🥇
              </p>

              {/* Overall Performance */}
              <div className="overall-tier-container">
                <div className="overall-tier-label">Overall Performance</div>
                <div className={`overall-tier-badge ${getTierLabel(playerScores.total / 3).toLowerCase()}`}>
                  {getTierLabel(playerScores.total / 3)}
                </div>
                <div className="overall-score">{playerScores.total} Total Points</div>
              </div>

              {/* Individual Game Scores */}
              <div className="game-scores-grid">
                <div className="game-score-item">
                  <div className="game-score-icon">🧼</div>
                  <div className="game-score-details">
                    <div className="game-score-name">Hand Washing</div>
                    <div className="game-score-value">{playerScores.game1} pts</div>
                    <div className={`game-tier-badge ${getTierLabel(playerScores.game1).toLowerCase()}`}>
                      {getTierLabel(playerScores.game1)}
                    </div>
                  </div>
                </div>

                <div className="game-score-item">
                  <div className="game-score-icon">🦷</div>
                  <div className="game-score-details">
                    <div className="game-score-name">Tooth Brushing</div>
                    <div className="game-score-value">{playerScores.game2} pts</div>
                    <div className={`game-tier-badge ${getTierLabel(playerScores.game2).toLowerCase()}`}>
                      {getTierLabel(playerScores.game2)}
                    </div>
                  </div>
                </div>

                <div className="game-score-item">
                  <div className="game-score-icon">🛁</div>
                  <div className="game-score-details">
                    <div className="game-score-name">Hair Washing</div>
                    <div className="game-score-value">{playerScores.game3} pts</div>
                    <div className={`game-tier-badge ${getTierLabel(playerScores.game3).toLowerCase()}`}>
                      {getTierLabel(playerScores.game3)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="celebration-buttons">
                <button className="celebration-btn primary" onClick={handleViewLeaderboard}>
                  View Leaderboard 🏆
                </button>
                <button className="celebration-btn secondary" onClick={() => setShowCelebration(false)}>
                  Continue Playing
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}

export default LandingPage
