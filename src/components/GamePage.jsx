import { Link } from 'react-router-dom'
import './GamePage.css'
import logo from '../assets/logo.png'
import HandwashingGame from './HandwashingGame'
import ToothbrushGame from './ToothbrushGame'
import HairwashingGame from './HairwashingGame'

const GamePage = ({ gameType }) => {
  return (
    <div className="game-page">
      <header className="game-header">
        <Link to="/" className="back-button">
          <span className="back-icon">←</span>
          <span className="back-text">Back to Menu</span>
        </Link>
      </header>

      <main className="game-content">
        {gameType === "Hand Washing" && <HandwashingGame />}
        {gameType === "Tooth Brushing" && <ToothbrushGame />}
        {gameType === "Hair Washing" && <HairwashingGame />}
        {!['Hand Washing', 'Tooth Brushing', 'Hair Washing'].includes(gameType) && (
          <div className="game-container">
            <h1 className="game-title">{gameType} Game</h1>
            <div className="game-placeholder">
              <p>This is the {gameType.toLowerCase()} game screen.</p>
              <p>Game content will be implemented here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default GamePage
