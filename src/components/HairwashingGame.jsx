import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './HairwashingGame.css'
import { markGameCompleted, GAME_IDS } from '../utils/gameCompletion'

// Import layered hair assets (Body + Hair states)
import bodyBase from '../assets/hairbrushing_game/hair/Body.png'
import hairMessyUncleaned from '../assets/hairbrushing_game/hair/Messy_uncleaned.png'
import hairUntangledUncleaned from '../assets/hairbrushing_game/hair/Untangled_Uncleaned.png'
import hairWetUncleaned from '../assets/hairbrushing_game/hair/Wet_uncleaned.png'
import hairWetClean from '../assets/hairbrushing_game/hair/Wet_CleanHair.png'
import hairSemiWetClean from '../assets/hairbrushing_game/hair/SemiWet_CleanHeir.png'
import hairDryClean from '../assets/hairbrushing_game/hair/Dry_CleanHair.png'

// Import tool assets
import hairbrush from '../assets/hairbrushing_game/hairbrush.png'
import showerhead from '../assets/hairbrushing_game/showerhead.png'
import shampoo from '../assets/hairbrushing_game/shampoo.png'
import scalpMassager from '../assets/hairbrushing_game/scalp massager.png'
import towel from '../assets/hairbrushing_game/towel.png'
import hairDryer from '../assets/hairbrushing_game/hair dryer.png'

// Import sounds (reuse existing sounds)
import successSfx from '../assets/sounds/success-sound.wav'
import goodJobSfx from '../assets/sounds/good-job.wav'

// Game steps - Updated flow
const STEPS = {
  BRUSH: 0,      // Messy_uncleaned -> Untangled_Uncleaned (hairbrush erases)
  WET: 1,        // Untangled_Uncleaned -> Wet_uncleaned (first rinse)
  SHAMPOO: 2,    // Apply white shampoo blob
  SCRUB: 3,      // Scalp massager creates lathering bubbles
  RINSE: 4,      // Wet_uncleaned -> Wet_CleanHair (rinse foam away)
  TOWEL: 5,      // Wet_CleanHair -> SemiWet_CleanHeir
  BLOWDRY: 6,    // SemiWet_CleanHeir -> Dry_CleanHair
  COMPLETE: 7    // Game complete
}

// Step configuration with proper hair transitions
const STEP_CONFIG = {
  [STEPS.BRUSH]: {
    title: 'Step 1: Detangle',
    subtitle: 'Drag the brush across the hair to detangle it!',
    tool: 'brush',
    targetPercent: 100,
    useImageMask: true,
    topHairImage: hairMessyUncleaned,      // Messy hair on top (to be erased)
    bottomHairImage: hairUntangledUncleaned // Untangled hair revealed
  },
  [STEPS.WET]: {
    title: 'Step 2: Wet Hair',
    subtitle: 'Use the showerhead to wet the hair!',
    tool: 'showerhead',
    targetPercent: 100,
    useImageMask: true,
    topHairImage: hairUntangledUncleaned,  // Dry untangled on top
    bottomHairImage: hairWetUncleaned      // Wet uncleaned revealed
  },
  [STEPS.SHAMPOO]: {
    title: 'Step 3: Apply Shampoo',
    subtitle: 'Drag the shampoo bottle to apply it!',
    tool: 'shampoo',
    targetPercent: 100,
    useImageMask: false,
    currentHairImage: hairWetUncleaned,
    showShampooBlob: true
  },
  [STEPS.SCRUB]: {
    title: 'Step 4: Lather',
    subtitle: 'Use the scalp massager to lather the shampoo!',
    tool: 'massager',
    targetPercent: 100,
    useImageMask: false,
    currentHairImage: hairWetUncleaned,
    createBubbles: true
  },
  [STEPS.RINSE]: {
    title: 'Step 5: Rinse',
    subtitle: 'Rinse away all the foam!',
    tool: 'showerhead',
    targetPercent: 100,
    useImageMask: true,
    topHairImage: hairWetUncleaned,    // Wet uncleaned with foam
    bottomHairImage: hairWetClean      // Clean wet hair revealed
  },
  [STEPS.TOWEL]: {
    title: 'Step 6: Towel Dry',
    subtitle: 'Pat dry with the towel!',
    tool: 'towel',
    targetPercent: 100,
    useImageMask: true,
    topHairImage: hairWetClean,        // Wet clean on top
    bottomHairImage: hairSemiWetClean  // Semi-wet revealed
  },
  [STEPS.BLOWDRY]: {
    title: 'Step 7: Blow Dry',
    subtitle: 'Finish drying with the hair dryer!',
    tool: 'blowdryer',
    targetPercent: 100,
    useImageMask: true,
    topHairImage: hairSemiWetClean,    // Semi-wet on top
    bottomHairImage: hairDryClean      // Fully dry revealed
  }
}

// Tool sizes for cursor
const TOOL_SIZES = {
  brush: { width: 80, height: 160 },
  showerhead: { width: 100, height: 140 },
  shampoo: { width: 70, height: 140 },
  massager: { width: 90, height: 90 },
  towel: { width: 120, height: 80 },
  blowdryer: { width: 100, height: 100 }
}

// Brush radius for erasing
const BRUSH_RADIUS = 35
const TIME_LIMIT = 120 // 2 minutes in seconds

export default function HairwashingGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEPS.BRUSH)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [showSuccess, setShowSuccess] = useState(false)
  const [finalComplete, setFinalComplete] = useState(false)
  const [hearts, setHearts] = useState([])
  const [waterDrops, setWaterDrops] = useState([])
  const [foamBubbles, setFoamBubbles] = useState([])
  const [persistentFoam, setPersistentFoam] = useState([]) // Foam that stays until rinsed
  const [gameStartTime, setGameStartTime] = useState(null)
  const [timer, setTimer] = useState(TIME_LIMIT) // Countdown from 2 minutes
  const [timeUp, setTimeUp] = useState(false)
  const [shampooApplied, setShampooApplied] = useState(false)
  const [shampooBlob, setShampooBlob] = useState(null) // Position of shampoo blob
  const [topImageLoaded, setTopImageLoaded] = useState(false)
  const [stepComplete, setStepComplete] = useState(false) // Current step is done, waiting for player to pick next
  const [wrongChoice, setWrongChoice] = useState(false) // Show wrong choice feedback
  const [showHint, setShowHint] = useState(false) // Show hint for which tool to use next
  const [wrongChoiceCount, setWrongChoiceCount] = useState(0) // Track wrong tool attempts
  const [hintUsedCount, setHintUsedCount] = useState(0) // Track hint usage

  // Canvas refs for masking
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const maskDataRef = useRef(null)
  const totalPixelsRef = useRef(0)
  const clearedPixelsRef = useRef(0)
  const heartIdRef = useRef(0)
  const dropIdRef = useRef(0)
  const bubbleIdRef = useRef(0)
  const timerIntervalRef = useRef(null)
  const topImageRef = useRef(null)
  const originalMaskRef = useRef(null) // Store original hair mask for hit detection

  // Get current step config
  const currentConfig = STEP_CONFIG[step] || {}

  // Get current tool image
  const getToolImage = () => {
    switch (currentConfig.tool) {
      case 'brush': return hairbrush
      case 'showerhead': return showerhead
      case 'shampoo': return shampoo
      case 'massager': return scalpMassager
      case 'towel': return towel
      case 'blowdryer': return hairDryer
      default: return null
    }
  }

  // Initialize timer
  useEffect(() => {
    if (!gameStartTime) {
      setGameStartTime(Date.now())
    }

    timerIntervalRef.current = setInterval(() => {
      // Stop timer if game is complete, time is up, or player finished
      if (gameStartTime && step !== STEPS.COMPLETE && !timeUp && !finalComplete) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
        const remaining = Math.max(0, TIME_LIMIT - elapsed)
        setTimer(remaining)

        // Check if time is up
        if (remaining <= 0) {
          setTimeUp(true)
        }
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [gameStartTime, step, finalComplete])

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Initialize canvas mask for current step
  const initializeMask = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // For image-based masking (most steps now use this)
    if (currentConfig.useImageMask && currentConfig.topHairImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        topImageRef.current = img

        // Draw image with object-fit: cover logic (matching CSS)
        const imgAspect = img.width / img.height
        const canvasAspect = canvas.width / canvas.height

        let drawWidth, drawHeight, drawX, drawY

        if (imgAspect > canvasAspect) {
          // Image is wider than canvas - fit by height, crop sides
          drawHeight = canvas.height
          drawWidth = img.width * (canvas.height / img.height)
          drawX = (canvas.width - drawWidth) / 2
          drawY = 0
        } else {
          // Image is taller than canvas - fit by width, crop top/bottom
          drawWidth = canvas.width
          drawHeight = img.height * (canvas.width / img.width)
          drawX = 0
          // object-position: center top - align to top
          drawY = 0
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

        // Calculate total NON-TRANSPARENT pixels (only hair pixels count)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let opaquePixelCount = 0
        // Sample every 4th pixel for performance (same as progress check)
        for (let i = 3; i < imageData.data.length; i += 16) {
          if (imageData.data[i] >= 128) {
            opaquePixelCount++
          }
        }
        totalPixelsRef.current = opaquePixelCount // Only count pixels with actual hair
        clearedPixelsRef.current = 0

        // Store original mask for hit detection (so particles only spawn over hair)
        originalMaskRef.current = {
          data: imageData.data,
          width: canvas.width,
          height: canvas.height
        }

        setTopImageLoaded(true)
      }
      img.src = currentConfig.topHairImage
    } else {
      // For non-mask steps (shampoo, scrub)
      totalPixelsRef.current = 0
      clearedPixelsRef.current = 0
      setTopImageLoaded(true)
    }

    setProgress(0)
  }, [step, currentConfig.useImageMask, currentConfig.topHairImage])

  // Initialize mask when step changes
  useEffect(() => {
    if (step !== STEPS.COMPLETE) {
      initializeMask()
    }
  }, [step, initializeMask])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (step !== STEPS.COMPLETE) {
        initializeMask()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [step, initializeMask])

  // Check if a canvas position is over a non-transparent hair pixel (using original mask)
  const isOverHairPixel = useCallback((canvasX, canvasY) => {
    const mask = originalMaskRef.current
    if (!mask || !mask.data) return true // If no mask, allow effects

    const x = Math.floor(canvasX)
    const y = Math.floor(canvasY)

    // Bounds check
    if (x < 0 || x >= mask.width || y < 0 || y >= mask.height) return false

    // Check alpha value at this position in the original mask
    const pixelIndex = (y * mask.width + x) * 4
    const alpha = mask.data[pixelIndex + 3]

    return alpha >= 50 // Return true if original pixel was visible
  }, [])

  // Spawn hearts/effects - only over hair area
  const spawnEffects = useCallback((x, y) => {
    // Only spawn effects if over hair pixels
    if (!isOverHairPixel(x, y)) return

    // Spawn heart
    if (Math.random() > 0.7) {
      const newHeart = {
        id: heartIdRef.current++,
        x: x + (Math.random() - 0.5) * 40,
        y: y,
        emoji: ['❤️', '💖', '💕', '✨'][Math.floor(Math.random() * 4)]
      }
      setHearts(prev => [...prev, newHeart])
      setTimeout(() => {
        setHearts(prev => prev.filter(h => h.id !== newHeart.id))
      }, 1000)
    }

    // Spawn water drops for wet/rinse steps
    if (currentConfig.tool === 'showerhead' && Math.random() > 0.5) {
      const newDrop = {
        id: dropIdRef.current++,
        x: x + (Math.random() - 0.5) * 60,
        y: y
      }
      setWaterDrops(prev => [...prev, newDrop])
      setTimeout(() => {
        setWaterDrops(prev => prev.filter(d => d.id !== newDrop.id))
      }, 800)
    }

    // Spawn foam bubbles for scrub step - these persist until rinse
    if (step === STEPS.SCRUB) {
      // Always spawn animated bubbles
      const newBubble = {
        id: bubbleIdRef.current++,
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 50,
        size: 10 + Math.random() * 20
      }
      // Add to temporary animation bubbles
      setFoamBubbles(prev => [...prev, newBubble])
      setTimeout(() => {
        setFoamBubbles(prev => prev.filter(b => b.id !== newBubble.id))
      }, 1500)

      // Add persistent bubbles (stays until rinsed) - limit to 200 for performance
      setPersistentFoam(prev => {
        if (prev.length >= 200) return prev // Cap at 200 bubbles for performance

        const numBubbles = 1 + Math.floor(Math.random() * 2) // 1-2 bubbles per interaction
        const newPersistentBubbles = []
        for (let i = 0; i < numBubbles; i++) {
          newPersistentBubbles.push({
            id: bubbleIdRef.current++,
            x: x + (Math.random() - 0.5) * 150, // Wider spread (150px)
            y: y + (Math.random() - 0.5) * 150, // Wider spread (150px)
            size: 12 + Math.random() * 20 // Sizes 12-32px
          })
        }
        return [...prev, ...newPersistentBubbles]
      })
    }

    // During rinse step, remove foam bubbles near the cursor
    if (step === STEPS.RINSE) {
      setPersistentFoam(prev => prev.filter(bubble => {
        const distance = Math.sqrt(
          Math.pow(bubble.x - x, 2) + Math.pow(bubble.y - y, 2)
        )
        return distance > 60 // Remove bubbles within 60px radius
      }))
    }
  }, [step, currentConfig.tool, isOverHairPixel])

  // Erase at position (for scrubbing/rinsing mechanics)
  const eraseAt = useCallback((x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return 0

    const ctx = canvas.getContext('2d')
    if (!ctx) return 0

    const rect = canvas.getBoundingClientRect()
    const canvasX = x - rect.left
    const canvasY = y - rect.top

    // Check bounds
    if (canvasX < 0 || canvasX > canvas.width || canvasY < 0 || canvasY > canvas.height) {
      return progress
    }

    // Use composite operation to erase
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, BRUSH_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Calculate progress: count remaining opaque pixels vs initial count
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let remainingOpaque = 0
    // Sample every 4th pixel for performance (same sampling as initialization)
    for (let i = 3; i < imageData.data.length; i += 16) {
      if (imageData.data[i] >= 128) {
        remainingOpaque++
      }
    }

    // Progress = percentage of original hair pixels that have been erased
    const initialOpaque = totalPixelsRef.current
    const erasedPixels = initialOpaque - remainingOpaque
    const newProgress = initialOpaque > 0 ? Math.min(100, Math.round((erasedPixels / initialOpaque) * 100)) : 0
    setProgress(newProgress)

    // Spawn visual effects
    spawnEffects(canvasX, canvasY)

    return newProgress
  }, [progress, spawnEffects])

  // Handle step completion - mark as done but don't auto-advance
  const markStepDone = useCallback(() => {
    // Play success sound
    const audio = new Audio(successSfx)
    audio.play().catch(() => { })

    // Mark step as complete
    setStepComplete(true)
    setDragging(false)

    // Handle step-specific cleanup
    if (step === STEPS.SHAMPOO) {
      setShampooApplied(true)
    }
    if (step === STEPS.SCRUB) {
      setShampooBlob(null)
    }
    if (step === STEPS.RINSE) {
      setPersistentFoam([])
    }

    // Check for game completion (last step)
    if (step === STEPS.BLOWDRY) {
      setFinalComplete(true)
      setShowSuccess(true)
      markGameCompleted(GAME_IDS.HAIRWASHING)

      // Play good job sound
      const goodJobAudio = new Audio(goodJobSfx)
      goodJobAudio.play().catch(() => { })
    }
  }, [step])

  // Get the next expected step
  const getNextStep = useCallback(() => {
    if (step >= STEPS.BLOWDRY) return STEPS.COMPLETE
    return step + 1
  }, [step])

  // Get the name of the next tool to use
  const getNextToolName = useCallback(() => {
    const nextStep = stepComplete ? getNextStep() : step
    switch (nextStep) {
      case STEPS.BRUSH: return 'Hairbrush'
      case STEPS.WET: return 'Showerhead'
      case STEPS.SHAMPOO: return 'Shampoo'
      case STEPS.SCRUB: return 'Scalp Massager'
      case STEPS.RINSE: return 'Showerhead'
      case STEPS.TOWEL: return 'Towel'
      case STEPS.BLOWDRY: return 'Blowdryer'
      default: return ''
    }
  }, [step, stepComplete, getNextStep])

  // Handle clicking on a tool in the toolbar
  const handleToolClick = useCallback((targetStep) => {
    // Clear wrong choice feedback
    setWrongChoice(false)

    // If current step is not complete, can't switch
    if (!stepComplete && targetStep !== step) {
      // Show wrong choice - they need to finish current step first
      setWrongChoice(true)
      setWrongChoiceCount(prev => prev + 1) // Track wrong choice
      setTimeout(() => setWrongChoice(false), 1000)
      return
    }

    // If step is complete, check if they picked the correct next step
    if (stepComplete) {
      const nextStep = getNextStep()

      if (targetStep === nextStep) {
        // Correct choice! Move to next step
        setStep(nextStep)
        setProgress(0)
        setStepComplete(false)
        setHearts([])
        setWaterDrops([])
        setFoamBubbles([])
      } else {
        // Wrong choice!
        setWrongChoice(true)
        setWrongChoiceCount(prev => prev + 1) // Track wrong choice
        setTimeout(() => setWrongChoice(false), 1000)
      }
      return
    }

    // If clicking current step (already on it), do nothing
    if (targetStep === step) return

  }, [step, stepComplete, getNextStep])

  // Check progress and mark step as done (but don't auto-advance)
  useEffect(() => {
    if (progress >= currentConfig.targetPercent && step !== STEPS.COMPLETE && !stepComplete) {
      // Small delay before marking complete
      const timeout = setTimeout(markStepDone, 300)
      return () => clearTimeout(timeout)
    }
  }, [progress, currentConfig.targetPercent, step, stepComplete, markStepDone])

  // Handle special steps (shampoo application)
  const handleShampooStep = useCallback((x, y) => {
    if (step === STEPS.SHAMPOO && dragging) {
      // Only count if over hair area
      if (!isOverHairPixel(x, y)) return

      // Place shampoo blob on hair
      if (!shampooBlob) {
        setShampooBlob({ x: x, y: y })
      }
      // Shampoo just needs to be dragged over hair
      setProgress(prev => Math.min(100, prev + 2))
    }
  }, [step, dragging, shampooBlob, isOverHairPixel])

  // Handle scrub step (creates foam)
  const handleScrubStep = useCallback((x, y) => {
    if (step === STEPS.SCRUB && dragging) {
      // Only count if over hair area
      if (!isOverHairPixel(x, y)) return

      // Scrubbing increases foam and progress
      setProgress(prev => Math.min(100, prev + 0.5))
      spawnEffects(x, y)
    }
  }, [step, dragging, spawnEffects, isOverHairPixel])

  // Pointer event handlers
  const handlePointerDown = (e) => {
    if (step === STEPS.COMPLETE) return

    e.preventDefault()
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })

    // For steps with image mask or overlay, start erasing
    if (currentConfig.useImageMask || currentConfig.overlayColor) {
      eraseAt(e.clientX, e.clientY)
    }
  }

  const handlePointerMove = (e) => {
    if (step === STEPS.COMPLETE) return

    setCursorPos({ x: e.clientX, y: e.clientY })

    if (dragging) {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const isOverHair = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      )

      if (isOverHair) {
        const localX = e.clientX - rect.left
        const localY = e.clientY - rect.top

        if (currentConfig.useImageMask) {
          // Steps with image mask use eraser mechanic
          eraseAt(e.clientX, e.clientY)

          // During rinse step, also remove foam bubbles
          if (step === STEPS.RINSE) {
            setPersistentFoam(prev => prev.filter(bubble => {
              const distance = Math.sqrt(
                Math.pow(bubble.x - localX, 2) + Math.pow(bubble.y - localY, 2)
              )
              return distance > 50 // Remove bubbles within 50px radius
            }))
          }
        } else if (step === STEPS.SHAMPOO) {
          // Shampoo step - place blob
          handleShampooStep(localX, localY)
        } else if (step === STEPS.SCRUB) {
          // Scrub step creates foam
          handleScrubStep(localX, localY)
        }
      }
    }
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  // Get current hair image based on step (for the bottom layer revealed during masking)
  const getHairImage = () => {
    // For image mask steps, show the bottom (revealed) hair image
    if (currentConfig.useImageMask && currentConfig.bottomHairImage) {
      return currentConfig.bottomHairImage
    }
    // For non-mask steps (shampoo, scrub), use currentHairImage
    if (currentConfig.currentHairImage) {
      return currentConfig.currentHairImage
    }
    // Fallback based on step
    if (step === STEPS.COMPLETE) return hairDryClean
    return hairMessyUncleaned
  }

  // Tool positions
  const tools = [
    { id: 'brush', img: hairbrush, active: step === STEPS.BRUSH },
    { id: 'showerhead', img: showerhead, active: step === STEPS.WET || step === STEPS.RINSE },
    { id: 'shampoo', img: shampoo, active: step === STEPS.SHAMPOO },
    { id: 'massager', img: scalpMassager, active: step === STEPS.SCRUB },
    { id: 'towel', img: towel, active: step === STEPS.TOWEL },
  ]

  // Calculate points based on performance
  const calculatePoints = () => {
    const basePoints = 100 // Base points for completing the game
    const timeBonus = Math.floor(timer * 2) // 2 points per second remaining
    const wrongToolPenalty = wrongChoiceCount * 10 // -10 points per wrong tool
    const hintPenalty = hintUsedCount * 15 // -15 points per hint used
    const totalPoints = Math.max(0, basePoints + timeBonus - wrongToolPenalty - hintPenalty)
    return { basePoints, timeBonus, wrongToolPenalty, hintPenalty, totalPoints }
  }

  // Get star rating based on points
  const getStarRating = (totalPoints) => {
    if (totalPoints >= 200) return 3 // 3 stars for 200+ points
    if (totalPoints >= 150) return 2 // 2 stars for 150+ points
    return 1 // 1 star for completing
  }

  // Render success overlay
  if (showSuccess) {
    const { basePoints, timeBonus, wrongToolPenalty, hintPenalty, totalPoints } = calculatePoints()
    const stars = getStarRating(totalPoints)

    return (
      <div className="hairwashing-game">
        <div className="success-overlay">
          <div className="backdrop" />
          <div className="success-content">
            <div className="success-icon">🎉</div>
            <h1>Great Job!</h1>
            <p>You completed the hair washing routine!</p>

            <div className="points-section">
              <div className="star-rating">
                {[1, 2, 3].map((star) => (
                  <span key={star} className={`star ${star <= stars ? 'earned' : 'empty'}`}>
                    ⭐
                  </span>
                ))}
              </div>
              <div className="points-breakdown">
                <div className="points-row">
                  <span>Completion:</span>
                  <span className="points-positive">+{basePoints} pts</span>
                </div>
                <div className="points-row">
                  <span>Time Bonus:</span>
                  <span className="points-positive">+{timeBonus} pts</span>
                </div>
                {wrongToolPenalty > 0 && (
                  <div className="points-row penalty">
                    <span>Wrong Tools ({wrongChoiceCount}x):</span>
                    <span className="points-negative">-{wrongToolPenalty} pts</span>
                  </div>
                )}
                {hintPenalty > 0 && (
                  <div className="points-row penalty">
                    <span>Hints Used ({hintUsedCount}x):</span>
                    <span className="points-negative">-{hintPenalty} pts</span>
                  </div>
                )}
                <div className="points-total">
                  <span>Total:</span>
                  <span className="total-value">{totalPoints} pts</span>
                </div>
              </div>
            </div>

            <p className="time-display">Time: {formatTime(timer)}</p>
            <div className="sparkles">✨ 💖 ✨</div>

            <div className="success-buttons">
              <button
                className="menu-button"
                onClick={() => navigate('/')}
              >
                🏠 Main Menu
              </button>
              <button
                className="retry-button"
                onClick={() => {
                  // Reset all game state
                  setStep(STEPS.BRUSH)
                  setProgress(0)
                  setDragging(false)
                  setShowSuccess(false)
                  setFinalComplete(false)
                  setHearts([])
                  setWaterDrops([])
                  setFoamBubbles([])
                  setPersistentFoam([])
                  setGameStartTime(Date.now())
                  setTimer(TIME_LIMIT)
                  setTimeUp(false)
                  setShampooApplied(false)
                  setShampooBlob(null)
                  setStepComplete(false)
                  setWrongChoice(false)
                  setShowHint(false)
                  setWrongChoiceCount(0)
                  setHintUsedCount(0)
                }}
              >
                🔄 Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render game over overlay when time is up
  if (timeUp) {
    const handleRetry = () => {
      // Reset all game state
      setStep(STEPS.BRUSH)
      setProgress(0)
      setDragging(false)
      setShowSuccess(false)
      setFinalComplete(false)
      setHearts([])
      setWaterDrops([])
      setFoamBubbles([])
      setPersistentFoam([])
      setGameStartTime(Date.now())
      setTimer(TIME_LIMIT)
      setTimeUp(false)
      setShampooApplied(false)
      setShampooBlob(null)
      setStepComplete(false)
      setWrongChoice(false)
      setShowHint(false)
      setWrongChoiceCount(0)
      setHintUsedCount(0)
    }

    return (
      <div className="hairwashing-game">
        <div className="success-overlay game-over">
          <div className="backdrop" />
          <div className="success-content">
            <div className="success-icon">⏰</div>
            <h1>Time's Up!</h1>
            <p>You ran out of time!</p>
            <p className="step-reached">You reached: {currentConfig.title || 'Step 1'}</p>
            <button className="retry-button" onClick={handleRetry}>
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`hairwashing-game ${dragging ? 'dragging-active' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Top header with step info and progress */}
      <div className={`game-header ${wrongChoice ? 'wrong-choice' : ''} ${stepComplete ? 'step-done' : ''}`}>
        <div className="step-info">
          <h2 className="step-title">{currentConfig.title}</h2>
          <p className="step-subtitle">
            {stepComplete && !finalComplete
              ? '✅ Done! Now choose the next tool!'
              : currentConfig.subtitle}
          </p>
        </div>
        <div className="progress-section">
          {wrongChoice && (
            <div className="wrong-feedback">❌ Wrong tool!</div>
          )}
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${stepComplete ? 'complete' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Main game area */}
      <div className="game-area">
        {/* Hair image container - centered and smaller */}
        <div
          ref={containerRef}
          className="hair-container"
          onPointerDown={handlePointerDown}
        >
          {/* Layer 1: Body base (always visible) */}
          <img
            src={bodyBase}
            alt="Body"
            className="body-base-image"
            draggable={false}
          />

          {/* Layer 2: Hair image (revealed state) */}
          <img
            src={getHairImage()}
            alt="Hair"
            className="hair-image"
            draggable={false}
          />

          {/* Layer 3: Canvas overlay for masking (hair being erased) */}
          <canvas
            ref={canvasRef}
            className="mask-canvas"
          />

          {/* Layer 4: Shampoo blob (appears during shampoo step) */}
          {shampooBlob && (step === STEPS.SHAMPOO || step === STEPS.SCRUB) && (
            <div
              className="shampoo-blob"
              style={{
                left: shampooBlob.x,
                top: shampooBlob.y
              }}
            />
          )}

          {/* Layer 5: Foam bubbles overlay for scrub and rinse steps */}
          {(step === STEPS.SCRUB || step === STEPS.RINSE) && (
            <div className="foam-overlay">
              {/* Animated bubbles (temporary) */}
              {foamBubbles.map(bubble => (
                <div
                  key={bubble.id}
                  className="foam-bubble animated"
                  style={{
                    left: bubble.x,
                    top: bubble.y,
                    width: bubble.size,
                    height: bubble.size
                  }}
                />
              ))}
              {/* Persistent foam bubbles (stay until rinsed) */}
              {persistentFoam.map(bubble => (
                <div
                  key={bubble.id}
                  className="foam-bubble persistent"
                  style={{
                    left: bubble.x,
                    top: bubble.y,
                    width: bubble.size,
                    height: bubble.size
                  }}
                />
              ))}
            </div>
          )}

          {/* Hearts */}
          {hearts.map(heart => (
            <div
              key={heart.id}
              className="heart-particle"
              style={{ left: heart.x, top: heart.y }}
            >
              {heart.emoji}
            </div>
          ))}

          {/* Water drops */}
          {waterDrops.map(drop => (
            <div
              key={drop.id}
              className="water-drop"
              style={{ left: drop.x, top: drop.y }}
            >
              💧
            </div>
          ))}

          {/* Floating tools positioned around the hair */}
          {/* Showerhead - top left */}
          <div className={`floating-tool-item showerhead-pos ${step === STEPS.WET || step === STEPS.RINSE ? 'active' : ''}`}>
            <img src={showerhead} alt="Showerhead" />
          </div>

          {/* Scalp massager - top right */}
          <div className={`floating-tool-item massager-pos ${step === STEPS.SCRUB ? 'active' : ''}`}>
            <img src={scalpMassager} alt="Scalp Massager" />
          </div>

          {/* Shampoo bottle - left side */}
          <div className={`floating-tool-item shampoo-pos ${step === STEPS.SHAMPOO ? 'active' : ''}`}>
            <img src={shampoo} alt="Shampoo" />
          </div>

          {/* Hairbrush - right side (on hair) */}
          <div className={`floating-tool-item brush-pos ${step === STEPS.BRUSH ? 'active' : ''}`}>
            <img src={hairbrush} alt="Hairbrush" />
          </div>

          {/* Hair dryer - bottom right */}
          <div className={`floating-tool-item blowdryer-pos ${step === STEPS.BLOWDRY ? 'active' : ''}`}>
            <img src={hairDryer} alt="Hair Dryer" />
          </div>

          {/* Towel - bottom right */}
          <div className={`floating-tool-item towel-pos ${step === STEPS.TOWEL ? 'active' : ''}`}>
            <img src={towel} alt="Towel" />
          </div>
        </div>

      </div>

      {/* Toolbar header with hint and timer */}
      <div className="toolbar-header">
        <button
          className={`hint-btn ${showHint ? 'active' : ''}`}
          onClick={() => {
            if (!showHint) {
              setHintUsedCount(prev => prev + 1) // Track hint usage
            }
            setShowHint(true)
            setTimeout(() => setShowHint(false), 3000) // Auto-close after 3 seconds
          }}
        >
          💡 {showHint && <span className="hint-text">Use: {getNextToolName()}</span>}
        </button>
        <div className={`timer-display ${timer <= 30 ? 'warning' : ''} ${timer <= 10 || timeUp ? 'critical' : ''}`}>
          <span>⏱️ {formatTime(timer)}</span>
        </div>
      </div>

      {/* Step indicators toolbar - 6 unique tools */}
      <div className="step-indicators bottom-toolbar">
        <div className="toolbar-scroll-container">
          <div
            className={`step-item clickable ${step >= STEPS.BRUSH ? 'completed' : ''} ${step === STEPS.BRUSH ? 'active' : ''}`}
            onClick={() => handleToolClick(STEPS.BRUSH)}
          >
            <img src={hairbrush} alt="Hairbrush" className="step-icon-img" />
            <span className="step-label">Hairbrush</span>
          </div>
          <div
            className={`step-item clickable ${step >= STEPS.WET ? 'completed' : ''} ${step === STEPS.WET || step === STEPS.RINSE ? 'active' : ''}`}
            onClick={() => step < STEPS.SHAMPOO ? handleToolClick(STEPS.WET) : handleToolClick(STEPS.RINSE)}
          >
            <img src={showerhead} alt="Showerhead" className="step-icon-img" />
            <span className="step-label">Showerhead</span>
          </div>
          <div
            className={`step-item clickable ${step >= STEPS.SHAMPOO ? 'completed' : ''} ${step === STEPS.SHAMPOO ? 'active' : ''}`}
            onClick={() => handleToolClick(STEPS.SHAMPOO)}
          >
            <img src={shampoo} alt="Shampoo" className="step-icon-img" />
            <span className="step-label">Shampoo</span>
          </div>
          <div
            className={`step-item clickable ${step >= STEPS.SCRUB ? 'completed' : ''} ${step === STEPS.SCRUB ? 'active' : ''}`}
            onClick={() => handleToolClick(STEPS.SCRUB)}
          >
            <img src={scalpMassager} alt="Scalp Massager" className="step-icon-img" />
            <span className="step-label">Scalp Massager</span>
          </div>
          <div
            className={`step-item clickable ${step >= STEPS.TOWEL ? 'completed' : ''} ${step === STEPS.TOWEL ? 'active' : ''}`}
            onClick={() => handleToolClick(STEPS.TOWEL)}
          >
            <img src={towel} alt="Towel" className="step-icon-img" />
            <span className="step-label">Towel</span>
          </div>
          <div
            className={`step-item clickable ${step >= STEPS.BLOWDRY ? 'completed' : ''} ${step === STEPS.BLOWDRY ? 'active' : ''}`}
            onClick={() => handleToolClick(STEPS.BLOWDRY)}
          >
            <img src={hairDryer} alt="Blowdryer" className="step-icon-img" />
            <span className="step-label">Blowdryer</span>
          </div>
        </div>
      </div>

      {/* Floating tool cursor when dragging */}
      {dragging && getToolImage() && (
        <img
          src={getToolImage()}
          alt="Tool"
          className="cursor-tool"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: TOOL_SIZES[currentConfig.tool]?.width || 80,
            height: TOOL_SIZES[currentConfig.tool]?.height || 80
          }}
        />
      )}
    </div>
  )
}
