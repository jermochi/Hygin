import { Link } from 'react-router-dom'
import './GamePage.css'
import logo from '../assets/logo.png'
import HandwashingGame from './HandwashingGame'

const GamePage = ({ gameType }) => {
  return (
    <div className="game-page">
      <header className="game-header">
        <Link to="/" className="logo-link">
          <img src={logo} alt="Hygin Logo" className="logo-image" />
        </Link>
      </header>
      
      <main className="game-content">
        {gameType === "Hand Washing" ? (
          <HandwashingGame />
        ) : (
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
