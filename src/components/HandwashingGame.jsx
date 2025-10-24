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
    "Dry hands thoroughly with a single use towel",
    "Use towel to turn off faucet",
    "Your hands are now safe"
  ]

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedBoxes, setSelectedBoxes] = useState([])
  const [choices, setChoices] = useState([])
  const [gameComplete, setGameComplete] = useState(false)

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
  }, [currentStep])

  const handleBoxClick = (boxIndex, isCorrect) => {
    // Don't allow clicking the same box twice
    if (selectedBoxes.includes(boxIndex)) return
    
    // Add this box to selected boxes
    setSelectedBoxes(prev => [...prev, boxIndex])
    
    if (isCorrect) {
      setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1)
        } else {
          setGameComplete(true)
        }
      }, 1000)
    }
    // For wrong answers, we just add them to the selected list and keep them red
  }

  const resetGame = () => {
    setCurrentStep(0)
    setSelectedBoxes([])
    setGameComplete(false)
  }

  if (gameComplete) {
    return (
      <div className="game-complete">
        <h2>🎉 Congratulations!</h2>
        <p>You've completed all handwashing steps correctly!</p>
        <button onClick={resetGame} className="reset-button">
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="handwashing-game">
      <div className="game-header">
        <h2>Step {currentStep + 1} of {steps.length}</h2>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="game-layout">
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
    </div>
  )
}

export default HandwashingGame
