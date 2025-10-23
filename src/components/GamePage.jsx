import { Link } from 'react-router-dom'
import './GamePage.css'

const GamePage = ({ gameType }) => {
  return (
    <div className="game-page">
      <header className="game-header">
        <Link to="/" className="back-button">← Back to Home</Link>
        <div className="logo">logo</div>
      </header>
      
      <main className="game-content">
        <div className="game-container">
          <h1 className="game-title">{gameType} Game</h1>
          <div className="game-placeholder">
            <p>This is the {gameType.toLowerCase()} game screen.</p>
            <p>Game content will be implemented here.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default GamePage
