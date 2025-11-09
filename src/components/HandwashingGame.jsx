import { useState, useEffect, useRef } from 'react'
import './HandwashingGame.css'
import videoSrc from '../assets/handwashing.mp4'
import { markGameCompleted, GAME_IDS } from '../utils/gameCompletion'

const HandwashingGame = () => {
  const steps = [
    "Wet hands with water",
    "Apply enough soap to cover all hand surfaces", 
    "Rub hands palm to palm",
    "Right palm over left dorsum with interlaced fingers and vice versa",
    "Palm to palm with fingers interlaced",
    "Backs of fingers to opposing palms with fingers interlocked",
    "Rotational rubbing of left thumb clasped in right palm and vice versa",
    "Rotational rubbing, backwards and forwards with clasped fingers of right hand in left palm and vice versa",
    "Rinse hands with water",
    "Dry hands thoroughly with a single use towel",
    "Use towel to turn off faucet"
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedBoxes, setSelectedBoxes] = useState([])
  const [choices, setChoices] = useState([])
  const [gameComplete, setGameComplete] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [stepResolved, setStepResolved] = useState(false)
  const videoRef = useRef(null)
  const [segmentEnd, setSegmentEnd] = useState(null)
  const segmentCompleteCallbackRef = useRef(null)

  // Video segments in seconds for each step index (0..10)
  const segments = [
    [0, 5],    // step 0
    [5, 10],   // step 1
    [11, 15],  // step 2
    [15, 20],  // step 3
    [21, 24],  // step 4
    [27, 33],  // step 5
    [34, 40],  // step 6
    [41, 49],  // step 7
    [50, 53],  // step 8
    [56, 60],  // step 9
    [62, 64]   // step 10
  ]

  const generateChoices = (stepIndex) => {
    const correctAnswer = steps[stepIndex]
    
    // Get all other steps except the current one
    const otherSteps = steps.filter((_, index) => index !== stepIndex)
    
    // Randomly select 3 wrong answers from all other steps
    const shuffledOthers = otherSteps.sort(() => Math.random() - 0.5)
    const wrongAnswers = shuffledOthers.slice(0, 3)
    
    // Shuffle the final answers (correct + 3 wrong)
    const allAnswers = [correctAnswer, ...wrongAnswers]
    const shuffled = allAnswers.sort(() => Math.random() - 0.5)
    
    return shuffled.map((answer, index) => ({
      text: answer,
      isCorrect: answer === correctAnswer,
      index
    }))
  }

  // Generate choices when step changes
  useEffect(() => {
    setChoices(generateChoices(currentStep))
    setSelectedBoxes([])
    setStepResolved(false)
  }, [currentStep])

  // Pause video automatically at the end of the current segment
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = () => {
      if (segmentEnd != null && video.currentTime >= segmentEnd - 0.05) {
        video.pause()
        setSegmentEnd(null)
        const cb = segmentCompleteCallbackRef.current
        segmentCompleteCallbackRef.current = null
        if (cb) cb()
      }
    }
    video.addEventListener('timeupdate', onTimeUpdate)
    return () => video.removeEventListener('timeupdate', onTimeUpdate)
  }, [segmentEnd])

  const playSegmentForIndex = (index, onComplete) => {
    const video = videoRef.current
    if (!video) return
    const [start, end] = segments[index] || []
    if (start == null || end == null) return
    try {
      video.currentTime = start
      setSegmentEnd(end)
      segmentCompleteCallbackRef.current = onComplete || null
      video.play().catch(() => {})
    } catch {}
  }

  const handleBoxClick = (boxIndex, isCorrect) => {
    if (gameOver || stepResolved) return
    // Don't allow clicking the same box twice
    if (selectedBoxes.includes(boxIndex)) return
    
    // Add this box to selected boxes
    setSelectedBoxes(prev => [...prev, boxIndex])
    
    if (isCorrect) {
      // Lock further input for this step immediately
      setStepResolved(true)
      // Play the segment corresponding to the step just answered
      const isLast = currentStep === steps.length - 1
      playSegmentForIndex(currentStep, () => {
        if (isLast) {
          setGameComplete(true)
        }
      })
      // Immediately advance to next step (or stay if last, overlay will show on complete)
      if (!isLast) {
        setCurrentStep(currentStep + 1)
      }
    } else {
      // Wrong answer: increment germ count and check for game over
      setWrongCount(prev => {
        const next = prev + 1
        if (next >= 3) {
          setGameOver(true)
          // Auto restart after brief delay
          setTimeout(() => {
            resetGame()
          }, 1500)
        }
        return next
      })
    }
    // For wrong answers, we just add them to the selected list and keep them red
  }

  const resetGame = () => {
    setCurrentStep(0)
    setSelectedBoxes([])
    setGameComplete(false)
    setWrongCount(0)
    setGameOver(false)
  }

  // Mark game as completed when gameComplete becomes true
  useEffect(() => {
    if (gameComplete) {
      markGameCompleted(GAME_IDS.HANDWASHING)
      // Dispatch custom event to update medal display
      window.dispatchEvent(new Event('gameCompleted'))
    }
  }, [gameComplete])

  // We now show completion as an overlay instead of a full replace

  return (
    <div className="handwashing-game">
      <div className="status-row">
        <div className="status-banner">Step {currentStep} of {steps.length - 1}</div>
        <div className="germs inline">
          {[0,1,2].map((i) => (
            <span key={i} className={`germ ${i < wrongCount ? 'active' : ''}`} aria-label="germ" role="img">🦠</span>
          ))}
        </div>
      </div>
      <div className={`stage-row ${(gameOver || gameComplete) ? 'blurred' : ''}`}>
        <div className={`game-header ${(gameOver || gameComplete) ? 'blurred' : ''}`}>
          <div className="video-stage">
            <video ref={videoRef} className="bg-video" src={videoSrc} muted playsInline preload="metadata" />
          </div>
        </div>
        <div className="choices-panel">
          <div 
            className={`choice-box square ${selectedBoxes.includes(0) ? (choices[0]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(0, choices[0]?.isCorrect)}
          >
            {choices[0]?.text}
          </div>
          <div 
            className={`choice-box square ${selectedBoxes.includes(1) ? (choices[1]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(1, choices[1]?.isCorrect)}
          >
            {choices[1]?.text}
          </div>
          <div 
            className={`choice-box square ${selectedBoxes.includes(2) ? (choices[2]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(2, choices[2]?.isCorrect)}
          >
            {choices[2]?.text}
          </div>
          <div 
            className={`choice-box square ${selectedBoxes.includes(3) ? (choices[3]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(3, choices[3]?.isCorrect)}
          >
            {choices[3]?.text}
          </div>
        </div>
      </div>
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-text">GAME OVER</div>
          <div className="game-over-sub">Restarting…</div>
        </div>
      )}
      {gameComplete && (
        <div className="celebration-overlay">
          <div className="celebration-text">YOUR HANDS ARE NOW SAFE</div>
          <div className="celebration-sub">Great job completing all steps!</div>
          <button onClick={resetGame} className="reset-button">Play Again</button>
        </div>
      )}
    </div>
  )
}

export default HandwashingGame
