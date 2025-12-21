import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef, useContext } from 'react'
import LandingPage from './components/LandingPage'
import GamePage from './components/GamePage'
import './App.css'
import './App.css'
import bgMusic from './assets/sounds/bg-music.wav'
import { useHoverSound } from './utils/useHoverSound'
import { AudioSettingsProvider } from './context/AudioSettingsProvider'
import { AudioSettingsContext } from './context/AudioSettingsContext'

// Inner component that uses useLocation (must be inside Router)
function AppInner() {
  const { isMuted, toggleMute } = useContext(AudioSettingsContext);
  const location = useLocation();

  // Check if we're on a game page (hide mute button in-game)
  const isGamePage = ['/handwashing', '/hairwashing', '/toothbrushing'].includes(location.pathname);

  return (
    <div className="app">
      {!isGamePage && (
        <button className="mute-button" onClick={toggleMute}>
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/handwashing" element={<GamePage gameType="Hand Washing" />} />
        <Route path="/hairwashing" element={<GamePage gameType="Hair Washing" />} />
        <Route path="/toothbrushing" element={<GamePage gameType="Tooth Brushing" />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const { registerAudio, unregisterAudio } = useContext(AudioSettingsContext);
  const audioRef = useRef(null);

  // Initialize hover sound
  useHoverSound();
  //testcommebnt
  useEffect(() => {
    audioRef.current = new Audio(bgMusic);
    audioRef.current.loop = true;

    // Register this audio element with the context
    registerAudio(audioRef.current);

    const startAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.log('Playback failed:', err));
        // Remove the event listeners once the audio starts
        ['click', 'touchstart', 'keydown'].forEach(event =>
          document.removeEventListener(event, startAudio)
        );
      }
    };

    // Add event listeners for user interaction
    ['click', 'touchstart', 'keydown'].forEach(event =>
      document.addEventListener(event, startAudio)
    );

    return () => {
      // Cleanup event listeners
      ['click', 'touchstart', 'keydown'].forEach(event =>
        document.removeEventListener(event, startAudio)
      );
      if (audioRef.current) {
        audioRef.current.pause();
        unregisterAudio(audioRef.current);
        audioRef.current = null;
      }
    };
  }, [registerAudio, unregisterAudio]);

  return (
    <Router>
      <AppInner />
    </Router>
  );
}

function App() {
  return (
    <AudioSettingsProvider>
      <AppContent />
    </AudioSettingsProvider>
  )
}

export default App