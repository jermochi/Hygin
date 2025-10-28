import { useState, useEffect } from 'react'
import './HandwashingGame.css'

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
    "Use towel to turn off faucet"
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedBoxes, setSelectedBoxes] = useState([])
  const [choices, setChoices] = useState([])
  const [gameComplete, setGameComplete] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [stepResolved, setStepResolved] = useState(false)

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

  const handleBoxClick = (boxIndex, isCorrect) => {
    if (gameOver || stepResolved) return
    // Don't allow clicking the same box twice
    if (selectedBoxes.includes(boxIndex)) return
    
    // Add this box to selected boxes
    setSelectedBoxes(prev => [...prev, boxIndex])
    
    if (isCorrect) {
      // Lock further input for this step immediately
      setStepResolved(true)
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1)
        } else {
          setGameComplete(true)
        }
      }, 1000)
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

  // We now show completion as an overlay instead of a full replace

  return (
    <div className="handwashing-game">
      <div className={`game-header ${(gameOver || gameComplete) ? 'blurred' : ''}`}>
        <h2>Step {currentStep + 1} of {steps.length}</h2>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
        <div className="germs">
          {[0,1,2].map((i) => (
            <span key={i} className={`germ ${i < wrongCount ? 'active' : ''}`} aria-label="germ" role="img">🦠</span>
          ))}
        </div>
      </div>

      <div className={`game-layout ${(gameOver || gameComplete) ? 'blurred' : ''}`}>
        <div className="choice-boxes">
          <div 
            className={`choice-box ${selectedBoxes.includes(0) ? (choices[0]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(0, choices[0]?.isCorrect)}
          >
            {choices[0]?.text}
          </div>
          
          <div 
            className={`choice-box ${selectedBoxes.includes(1) ? (choices[1]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(1, choices[1]?.isCorrect)}
          >
            {choices[1]?.text}
          </div>
          
          <div 
            className={`choice-box ${selectedBoxes.includes(2) ? (choices[2]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
            onClick={() => handleBoxClick(2, choices[2]?.isCorrect)}
          >
            {choices[2]?.text}
          </div>
          
          <div 
            className={`choice-box ${selectedBoxes.includes(3) ? (choices[3]?.isCorrect ? 'correct' : 'incorrect') : ''}`}
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
