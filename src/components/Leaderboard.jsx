import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../utils/scoreManager'
import HygieneFallingIcons from './HygieneFallingIcons'
import characterImage from '../assets/character.png'
import logoSvg from '../assets/logo-dark.png'
import './Leaderboard.css'

const Leaderboard = () => {
    const navigate = useNavigate()
    const [leaderboardData, setLeaderboardData] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchLeaderboard()
    }, [])

    const fetchLeaderboard = async () => {
        setIsLoading(true)
        const data = await getLeaderboard(10)
        setLeaderboardData(data)
        setIsLoading(false)
    }

    const handleStartNewSession = () => {
        navigate('/onboarding')
    }

    const getRankMedal = (rank) => {
        if (rank === 1) return '🥇'
        if (rank === 2) return '🥈'
        if (rank === 3) return '🥉'
        return `#${rank}`
    }

    return (
        <div className="leaderboard-container">
            {/* Blurred landing page background */}
            <div className="leaderboard-backdrop">
                <HygieneFallingIcons />
                <div className="backdrop-content">
                    <img src={logoSvg} alt="" className="backdrop-logo" />
                    <img src={characterImage} alt="" className="backdrop-character" />
                </div>
            </div>

            <div className="leaderboard-card">
                <h1 className="leaderboard-title">🏆 Hall of Fame 🏆</h1>
                <p className="leaderboard-subtitle">Top Hygiene Champions</p>

                <div className="leaderboard-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading leaderboard...</p>
                        </div>
                    ) : leaderboardData.length === 0 ? (
                        <div className="empty-state">
                            <p className="empty-icon">📊</p>
                            <p>No scores yet. Be the first champion!</p>
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboardData.map((entry, index) => (
                                <div
                                    key={index}
                                    className={`leaderboard-entry ${index < 3 ? 'top-three' : ''}`}
                                >
                                    <div className="entry-rank">{getRankMedal(index + 1)}</div>
                                    <div className="entry-name">{entry.name}</div>
                                    <div className="entry-score">{entry.total_score} pts</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="leaderboard-actions">
                    <button className="leaderboard-btn primary" onClick={handleStartNewSession}>
                        Start New Session
                    </button>
                    <button className="leaderboard-btn secondary" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Leaderboard
