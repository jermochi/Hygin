import { useState, useEffect, useRef, useCallback } from 'react'
import './HandwashingGame.css'
import videoSrc from '../assets/new-handwashing.mp4'
import { markGameCompleted, GAME_IDS } from '../utils/gameCompletion'
import { getTierLabel, getTierClass } from '../utils/scoreTier'
import { updateScore } from '../utils/scoreManager'
import { useGameFlow } from '../context/GameFlowContext'

const STEP_END_TIMES = [2.22, 7.09, 12.8, 14.9, 20.9, 26.4, 33.2]
const STEP_TEXTS = [
  'Apply enough soap to cover all hand surfaces',
  'Rub hands palm to palm',
  'Right palm over left dorsum with interlaced fingers and vice versa',
  'Palm to palm with fingers interlaced',
  'Rotational rubbing of left thumb clasped in right palm and vice versa',
  'Rotational rubbing of the right hand fingernails on the left palm and vice versa',
  'Rinse hands with water',
  'Dry hands thoroughly with a single use towel'
]
const PER_STEP_POINTS = 100 / STEP_TEXTS.length

const buildSegments = (duration) => {
  const ends = [...STEP_END_TIMES, duration ?? null]
  let previousEnd = 0
  return ends.map((end) => {
    const segment = [previousEnd, end]
    if (end != null) {
      previousEnd = end
    }
    return segment
  })
}

const HandwashingGame = () => {
  const steps = STEP_TEXTS

  const [currentStep, setCurrentStep] = useState(0)
  const [selectedBoxes, setSelectedBoxes] = useState([])
  const [choiceFlash, setChoiceFlash] = useState(['idle', 'idle', 'idle', 'idle'])
  const [choices, setChoices] = useState([])
  const [gameComplete, setGameComplete] = useState(false)
  const [stepResolved, setStepResolved] = useState(false)
  const [segmentEnd, setSegmentEnd] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)
  const [segments, setSegments] = useState(() => buildSegments(null))
  const [wrongChoiceCount, setWrongChoiceCount] = useState(0)
  const [stepWrongCount, setStepWrongCount] = useState(0)
  const [score, setScore] = useState(0)
  const [penaltyPoints, setPenaltyPoints] = useState(0)

  const videoRef = useRef(null)
  const segmentCompleteCallbackRef = useRef(null)
  const flashTimeoutRef = useRef(null)

  const generateChoices = useCallback((stepIndex) => {
    const correctAnswer = steps[stepIndex]
    const otherSteps = steps.filter((_, index) => index !== stepIndex)
    const shuffledOthers = otherSteps.sort(() => Math.random() - 0.5)
    const wrongAnswers = shuffledOthers.slice(0, 3)
    const allAnswers = [correctAnswer, ...wrongAnswers]
    const shuffled = allAnswers.sort(() => Math.random() - 0.5)
    return shuffled.map((answer, index) => ({
      text: answer,
      isCorrect: answer === correctAnswer,
      index
    }))
  }, [steps])

  useEffect(() => {
    setChoices(generateChoices(currentStep))
    setSelectedBoxes([])
    setChoiceFlash(['idle', 'idle', 'idle', 'idle'])
    setStepResolved(false)
  }, [currentStep, generateChoices])

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || null)
    }
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    if (video.readyState >= 1) {
      handleLoadedMetadata()
    }
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
  }, [])

  // Clean up pending flash timers on unmount
  useEffect(() => () => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setSegments(buildSegments(videoDuration))
  }, [videoDuration])

  const playSegmentForIndex = (index, onComplete) => {
    const video = videoRef.current
    if (!video) return
    const [start, end] = segments[index] || []
    if (start == null) return
    try {
      video.currentTime = start
      // Slight speed boost for steps 3, 5, and 7 (1-based) to keep total under ~30s
      if ([2, 4, 6].includes(index)) {
        video.playbackRate = 1.15
      } else {
        video.playbackRate = 1.0
      }
      const effectiveEnd = end ?? video.duration ?? null
      segmentCompleteCallbackRef.current = onComplete || null
      if (effectiveEnd != null) {
        setSegmentEnd(effectiveEnd)
      } else if (onComplete) {
        const handleEnded = () => {
          video.removeEventListener('ended', handleEnded)
          segmentCompleteCallbackRef.current = null
          onComplete()
        }
        video.addEventListener('ended', handleEnded)
      }
      video.play().catch(() => { })
    } catch { }
  }

  const handleBoxClick = (boxIndex, isCorrect) => {
    if (gameComplete || stepResolved) return
    if (selectedBoxes.includes(boxIndex)) return

    // flash the chosen box
    setChoiceFlash((prev) => prev.map((state, idx) => (idx === boxIndex ? (isCorrect ? 'correct' : 'incorrect') : 'idle')))
    setSelectedBoxes((prev) => [...prev, boxIndex])
    setStepResolved(true)

    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)

    flashTimeoutRef.current = setTimeout(() => {
      setChoiceFlash(['idle', 'idle', 'idle', 'idle'])
      setSelectedBoxes([])

      if (isCorrect) {
        setScore((s) => s + PER_STEP_POINTS)
        setStepWrongCount(0)
        const isLast = currentStep === steps.length - 1

        if (isLast) {
          // Show scoreboard immediately on last step
          setGameComplete(true)
          // Play the segment in background without callback
          playSegmentForIndex(currentStep, null)
        } else {
          playSegmentForIndex(currentStep, null)
          setCurrentStep((prev) => prev + 1)
        }
      } else {
        setWrongChoiceCount((prev) => prev + 1)
        const penalties = [7, 5, 3]
        const penalty = penalties[Math.min(stepWrongCount, penalties.length - 1)]
        setPenaltyPoints((p) => p + penalty)
        setScore((s) => Math.max(0, s - penalty))
        setStepWrongCount((count) => count + 1)
        setStepResolved(false)
      }
    }, 500)
  }

  const resetGame = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }
    setCurrentStep(0)
    setSelectedBoxes([])
    setChoiceFlash(['idle', 'idle', 'idle', 'idle'])
    setGameComplete(false)
    setStepResolved(false)
    setWrongChoiceCount(0)
    setStepWrongCount(0)
    setScore(0)
    setPenaltyPoints(0)
    setSegmentEnd(null)
    segmentCompleteCallbackRef.current = null
    const video = videoRef.current
    if (video) {
      video.pause()
      video.currentTime = 0
    }
  }, [])

  useEffect(() => {
    if (gameComplete) {
      markGameCompleted(GAME_IDS.HANDWASHING)
      window.dispatchEvent(new Event('gameCompleted'))

      // Save score to database (game1 = Hand Washing)
      const finalScore = Math.max(0, Math.round(score))
      updateScore(1, finalScore).catch(err => {
        console.error('Failed to save score:', err)
      })
    }
  }, [gameComplete, score])

  const calculatePoints = () => {
    const stepPointsMax = PER_STEP_POINTS * steps.length
    const totalPoints = Math.max(0, Math.round(score))
    const totalPenalty = Math.round(penaltyPoints)
    return { stepPointsMax: Math.round(stepPointsMax), totalPenalty, totalPoints }
  }

  const getStarRating = (totalPoints) => {
    if (totalPoints >= 90) return 3
    if (totalPoints >= 70) return 2
    return 1
  }

  const { stepPointsMax, totalPenalty, totalPoints } = calculatePoints()
  const stars = getStarRating(totalPoints)
  const tierLabel = getTierLabel(totalPoints)
  const tierClass = getTierClass(totalPoints)

  return (
    <div className="handwashing-game">
      <div className="status-row">
        <div className="status-banner">Step {currentStep + 1} of {steps.length}</div>
        <div className="status-banner neutral">Mistakes: {wrongChoiceCount}</div>
      </div>
      <div className={`stage-row ${gameComplete ? 'blurred' : ''}`}>
        <div className="game-header">
          <div className="video-stage">
            <video
              ref={videoRef}
              className="bg-video"
              src={videoSrc}
              muted
              playsInline
              preload="metadata"
              controls={false}
            />
          </div>
        </div>
        <div className="choices-panel">
          <div
            className={`choice-box square ${choiceFlash[0] === 'correct' ? 'correct' : choiceFlash[0] === 'incorrect' ? 'incorrect' : ''}`}
            onClick={() => handleBoxClick(0, choices[0]?.isCorrect)}
          >
            {choices[0]?.text}
          </div>
          <div
            className={`choice-box square ${choiceFlash[1] === 'correct' ? 'correct' : choiceFlash[1] === 'incorrect' ? 'incorrect' : ''}`}
            onClick={() => handleBoxClick(1, choices[1]?.isCorrect)}
          >
            {choices[1]?.text}
          </div>
          <div
            className={`choice-box square ${choiceFlash[2] === 'correct' ? 'correct' : choiceFlash[2] === 'incorrect' ? 'incorrect' : ''}`}
            onClick={() => handleBoxClick(2, choices[2]?.isCorrect)}
          >
            {choices[2]?.text}
          </div>
          <div
            className={`choice-box square ${choiceFlash[3] === 'correct' ? 'correct' : choiceFlash[3] === 'incorrect' ? 'incorrect' : ''}`}
            onClick={() => handleBoxClick(3, choices[3]?.isCorrect)}
          >
            {choices[3]?.text}
          </div>
        </div>
      </div>
      {gameComplete && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title congratulations-title">CONGRATULATIONS!</div>
            <div className="intro-title congratulations-subtitle">Wash your hands regularly</div>

            {/* Final Score Display */}
            <div className="final-score-container">
              <div className="final-score-label">Final Score</div>
              <div className="final-score-value">{totalPoints}</div>
            </div>

            {/* Tier Display */}
            <div className={`tier-badge ${tierClass}`}>Tier: {tierLabel}</div>

            {/* Stats Display */}
            <div className="game-stats-container">
              <div className="stat-item stat-success">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-label">Steps Completed</div>
                  <div className="stat-value">{steps.length}</div>
                </div>
              </div>

              <div className="stat-item stat-failed">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <div className="stat-label">Mistakes</div>
                  <div className="stat-value">{wrongChoiceCount}</div>
                </div>
              </div>

              <div className="stat-item stat-time">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <div className="stat-label">Total Score</div>
                  <div className="stat-value">{totalPoints}</div>
                </div>
              </div>
            </div>

            <div className="congratulations-buttons">
              <button className="continue-btn" onClick={() => window.location.href = '/'}>Main Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HandwashingGame
