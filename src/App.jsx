import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import GamePage from './components/GamePage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/handwashing" element={<GamePage gameType="Hand Washing" />} />
          <Route path="/hairwashing" element={<GamePage gameType="Hair Washing" />} />
          <Route path="/toothbrushing" element={<GamePage gameType="Tooth Brushing" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App