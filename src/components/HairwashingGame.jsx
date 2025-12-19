import React, { useState, useRef, useEffect, useCallback } from 'react'
import './HairwashingGame.css'
import { markGameCompleted, GAME_IDS } from '../utils/gameCompletion'

// Import hair assets
import hairScruffy from '../assets/hairbrushing_game/hair_scruffy.jpg'
import hairClean from '../assets/hairbrushing_game/hair.jpg'
import hairWet from '../assets/hairbrushing_game/hair_wet.jpg'
import hairbrush from '../assets/hairbrushing_game/hairbrush.png'
import showerhead from '../assets/hairbrushing_game/showerhead.png'
import shampoo from '../assets/hairbrushing_game/shampoo.png'
import scalpMassager from '../assets/hairbrushing_game/scalp massager.png'
import towel from '../assets/hairbrushing_game/towel.png'

// Import sounds (reuse existing sounds)
import successSfx from '../assets/sounds/success-sound.wav'
import goodJobSfx from '../assets/sounds/good-job.wav'

// Game steps
const STEPS = {
  BRUSH: 0,      // Detangle with brush
  WET: 1,        // Wet with showerhead
  SHAMPOO: 2,    // Apply shampoo
  SCRUB: 3,      // Scrub with scalp massager (creates foam)
  RINSE: 4,      // Rinse the foam
  TOWEL: 5,      // Towel dry
  BLOWDRY: 6,    // Blow dry
  COMPLETE: 7    // Game complete
}

// Step configuration
const STEP_CONFIG = {
  [STEPS.BRUSH]: {
    title: 'Step 1: Detangle',
    subtitle: 'Drag the brush across the hair to detangle it!',
    tool: 'brush',
    targetPercent: 100,
    useImageMask: true,        // Uses image-based masking (scruffy -> clean)
    topImage: hairScruffy,     // Image on top (to be erased)
    bottomImage: hairClean     // Image revealed underneath
  },
  [STEPS.WET]: {
    title: 'Step 2: Wet Hair',
    subtitle: 'Use the showerhead to wet the hair!',
    tool: 'showerhead',
    targetPercent: 100,
    useImageMask: true,
    topImage: hairClean,       // Dry clean hair on top
    bottomImage: hairWet       // Wet hair revealed
  },
  [STEPS.SHAMPOO]: {
    title: 'Step 3: Apply Shampoo',
    subtitle: 'Drag the shampoo bottle to apply it!',
    tool: 'shampoo',
    targetPercent: 100,
    useImageMask: false,
    overlayColor: null
  },
  [STEPS.SCRUB]: {
    title: 'Step 4: Scrub',
    subtitle: 'Use the scalp massager to create foam!',
    tool: 'massager',
    targetPercent: 100,
    useImageMask: false,
    overlayColor: null
  },
  [STEPS.RINSE]: {
    title: 'Step 5: Rinse',
    subtitle: 'Rinse away all the foam!',
    tool: 'showerhead',
    targetPercent: 100,
    useImageMask: false,
    overlayColor: null // Using persistent foam bubbles instead
  },
  [STEPS.TOWEL]: {
    title: 'Step 6: Dry',
    subtitle: 'Pat dry with the towel!',
    tool: 'towel',
    targetPercent: 100,
    useImageMask: false,
    overlayColor: 'rgba(100, 150, 200, 0.3)' // Wet overlay
  },
  [STEPS.BLOWDRY]: {
    title: 'Step 7: Blow Dry',
    subtitle: 'Finish drying with the blow dryer!',
    tool: 'blowdryer',
    targetPercent: 100,
    useImageMask: false,
    overlayColor: 'rgba(100, 150, 200, 0.2)' // Slightly wet overlay
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
const BRUSH_RADIUS = 40

export default function HairwashingGame() {
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
  const [timer, setTimer] = useState(0)
  const [shampooApplied, setShampooApplied] = useState(false)
  const [topImageLoaded, setTopImageLoaded] = useState(false)

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
      case 'blowdryer': return null // Will use emoji or inline SVG
      default: return null
    }
  }

  // Initialize timer
  useEffect(() => {
    if (!gameStartTime) {
      setGameStartTime(Date.now())
    }

    timerIntervalRef.current = setInterval(() => {
      if (gameStartTime && step !== STEPS.COMPLETE) {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000)
        setTimer(elapsed)
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [gameStartTime, step])

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

    // For image-based masking (brush and wet steps)
    if (currentConfig.useImageMask && currentConfig.topImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        topImageRef.current = img
        // Draw the top image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Calculate total pixels in the hair mask area
        const maskWidth = canvas.width * (HAIR_MASK_BOUNDS.right - HAIR_MASK_BOUNDS.left)
        const maskHeight = canvas.height * (HAIR_MASK_BOUNDS.bottom - HAIR_MASK_BOUNDS.top)
        totalPixelsRef.current = maskWidth * maskHeight
        clearedPixelsRef.current = 0
        setTopImageLoaded(true)
      }
      img.src = currentConfig.topImage
    }
    // For color overlay masking (other steps)
    else if (currentConfig.overlayColor) {
      ctx.fillStyle = currentConfig.overlayColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      totalPixelsRef.current = canvas.width * canvas.height
      clearedPixelsRef.current = 0
      setTopImageLoaded(true)
    } else {
      totalPixelsRef.current = 0
      clearedPixelsRef.current = 0
      setTopImageLoaded(true)
    }

    setProgress(0)
  }, [step, currentConfig.useImageMask, currentConfig.topImage, currentConfig.overlayColor])

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

  // Spawn hearts/effects
  const spawnEffects = useCallback((x, y) => {
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
    if (step === STEPS.SCRUB && Math.random() > 0.4) {
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

      // Also add to persistent foam (stays until rinsed)
      const persistentBubble = {
        id: bubbleIdRef.current++,
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 80,
        size: 10 + Math.random() * 15 // Smaller bubbles (10-25px)
      }
      setPersistentFoam(prev => {
        // Limit to 40 persistent bubbles for better visual
        if (prev.length >= 40) return prev
        return [...prev, persistentBubble]
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
  }, [step, currentConfig.tool])

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

    // Calculate progress by counting transparent pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let transparentCount = 0
    // Sample every 4th pixel for performance
    for (let i = 3; i < imageData.data.length; i += 16) {
      if (imageData.data[i] < 128) {
        transparentCount++
      }
    }

    const sampledTotal = Math.floor(totalPixelsRef.current / 4)
    const newProgress = Math.min(100, Math.round((transparentCount / sampledTotal) * 100))
    setProgress(newProgress)

    // Spawn visual effects
    spawnEffects(canvasX, canvasY)

    return newProgress
  }, [progress, spawnEffects])

  // Handle step completion
  const completeStep = useCallback(() => {
    // Play success sound
    const audio = new Audio(successSfx)
    audio.play().catch(() => { })

    // Clear effects
    setHearts([])
    setWaterDrops([])
    setFoamBubbles([])

    // Move to next step
    if (step < STEPS.COMPLETE) {
      setStep(prev => prev + 1)
      setProgress(0)
      setDragging(false)

      if (step === STEPS.SHAMPOO) {
        setShampooApplied(true)
      }
    }

    // Check for game completion
    if (step === STEPS.BLOWDRY) {
      setFinalComplete(true)
      setShowSuccess(true)
      markGameCompleted(GAME_IDS.HAIRWASHING)

      // Play good job sound
      const goodJobAudio = new Audio(goodJobSfx)
      goodJobAudio.play().catch(() => { })
    }
  }, [step])

  // Handle clicking on a tool in the step indicators to switch to that step
  const handleToolClick = useCallback((targetStep) => {
    if (targetStep === step) return // Already on this step
    if (targetStep >= STEPS.COMPLETE) return // Can't click complete

    // Clear current effects
    setHearts([])
    setWaterDrops([])
    setFoamBubbles([])

    // Switch to the selected step
    setStep(targetStep)
    setProgress(0)
    setDragging(false)
  }, [step])

  // Check progress and complete step if needed
  useEffect(() => {
    if (progress >= currentConfig.targetPercent && step !== STEPS.COMPLETE) {
      // Small delay before completing
      const timeout = setTimeout(completeStep, 300)
      return () => clearTimeout(timeout)
    }
  }, [progress, currentConfig.targetPercent, step, completeStep])

  // Handle special steps (shampoo application)
  const handleShampooStep = useCallback(() => {
    if (step === STEPS.SHAMPOO && dragging) {
      // Shampoo just needs to be dragged over hair
      setProgress(prev => Math.min(100, prev + 2))
    }
  }, [step, dragging])

  // Handle scrub step (creates foam)
  const handleScrubStep = useCallback((x, y) => {
    if (step === STEPS.SCRUB && dragging) {
      // Scrubbing increases foam and progress
      setProgress(prev => Math.min(100, prev + 0.5))
      spawnEffects(x, y)
    }
  }, [step, dragging, spawnEffects])

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
        if (currentConfig.useImageMask || currentConfig.overlayColor) {
          // Steps with image mask or overlay use eraser mechanic
          eraseAt(e.clientX, e.clientY)
        } else if (step === STEPS.SHAMPOO) {
          // Shampoo step
          handleShampooStep()
        } else if (step === STEPS.SCRUB) {
          // Scrub step creates foam
          handleScrubStep(e.clientX - rect.left, e.clientY - rect.top)
        } else if (step === STEPS.RINSE) {
          // Rinse step - remove foam and update progress
          const localX = e.clientX - rect.left
          const localY = e.clientY - rect.top

          // Remove foam bubbles near cursor
          setPersistentFoam(prev => {
            const remaining = prev.filter(bubble => {
              const distance = Math.sqrt(
                Math.pow(bubble.x - localX, 2) + Math.pow(bubble.y - localY, 2)
              )
              return distance > 50 // Remove bubbles within 50px radius
            })

            // Calculate progress based on foam removed
            // If we started with foam, progress increases as foam is removed
            if (prev.length > remaining.length) {
              // Calculate new progress - if all foam gone, we're done
              const foamRemoved = prev.length - remaining.length
              setProgress(p => {
                const newProgress = Math.min(100, p + (foamRemoved * 5))
                return newProgress
              })
              // Spawn water drop effects
              spawnEffects(localX, localY)
            }

            return remaining
          })

          // Also increment progress slightly when dragging even without foam
          setProgress(p => Math.min(100, p + 0.3))
        }
      }
    }
  }

  const handlePointerUp = () => {
    setDragging(false)
  }

  // Get background image based on step (bottom layer for image mask steps)
  const getBackgroundImage = () => {
    // For image mask steps, show the bottom (revealed) image
    if (currentConfig.useImageMask && currentConfig.bottomImage) {
      return currentConfig.bottomImage
    }
    // For other steps, show appropriate hair state
    if (step === STEPS.SHAMPOO || step === STEPS.SCRUB || step === STEPS.RINSE) return hairWet
    if (step === STEPS.TOWEL || step === STEPS.BLOWDRY) return hairWet
    if (step === STEPS.COMPLETE) return hairClean
    return hairClean
  }

  // Tool positions
  const tools = [
    { id: 'brush', img: hairbrush, active: step === STEPS.BRUSH },
    { id: 'showerhead', img: showerhead, active: step === STEPS.WET || step === STEPS.RINSE },
    { id: 'shampoo', img: shampoo, active: step === STEPS.SHAMPOO },
    { id: 'massager', img: scalpMassager, active: step === STEPS.SCRUB },
    { id: 'towel', img: towel, active: step === STEPS.TOWEL },
  ]

  // Render success overlay
  if (showSuccess) {
    return (
      <div className="hairwashing-game">
        <div className="success-overlay">
          <div className="backdrop" />
          <div className="success-content">
            <div className="success-icon">🎉</div>
            <h1>Great Job!</h1>
            <p>You completed the hair washing routine!</p>
            <p className="time-display">Time: {formatTime(timer)}</p>
            <div className="sparkles">✨ 💖 ✨</div>
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
      <div className="game-header">
        <div className="step-info">
          <h2 className="step-title">{currentConfig.title}</h2>
          <p className="step-subtitle">{currentConfig.subtitle}</p>
        </div>
        <div className="progress-section">
          <div className="progress-bar-container">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{progress}%</span>
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
          {/* Background hair image */}
          <img
            src={getBackgroundImage()}
            alt="Hair"
            className="hair-image"
            draggable={false}
          />

          {/* Canvas overlay for masking */}
          <canvas
            ref={canvasRef}
            className="mask-canvas"
          />

          {/* Foam bubbles overlay for scrub and rinse steps */}
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

          {/* Blowdryer - bottom right */}
          <div className={`floating-tool-item blowdryer-pos ${step === STEPS.BLOWDRY ? 'active' : ''}`}>
            <span>💨</span>
          </div>

          {/* Towel - bottom right */}
          <div className={`floating-tool-item towel-pos ${step === STEPS.TOWEL ? 'active' : ''}`}>
            <img src={towel} alt="Towel" />
          </div>
        </div>

        {/* Hint button - bottom left */}
        <div className="hint-btn">💡</div>

        {/* Timer - bottom right */}
        <div className="timer-display">
          <span>⏱️ {formatTime(timer)}</span>
        </div>
      </div>

      {/* Step indicators toolbar - at bottom, tools in step order */}
      <div className="step-indicators bottom-toolbar">
        <div
          className={`step-dot clickable ${step >= STEPS.BRUSH ? 'completed' : ''} ${step === STEPS.BRUSH ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.BRUSH)}
          title="Step 1: Brush - Detangle hair"
        >
          <img src={hairbrush} alt="1" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.WET ? 'completed' : ''} ${step === STEPS.WET ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.WET)}
          title="Step 2: Showerhead - Wet hair"
        >
          <img src={showerhead} alt="2" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.SHAMPOO ? 'completed' : ''} ${step === STEPS.SHAMPOO ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.SHAMPOO)}
          title="Step 3: Shampoo - Apply shampoo"
        >
          <img src={shampoo} alt="3" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.SCRUB ? 'completed' : ''} ${step === STEPS.SCRUB ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.SCRUB)}
          title="Step 4: Massager - Scrub scalp"
        >
          <img src={scalpMassager} alt="4" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.RINSE ? 'completed' : ''} ${step === STEPS.RINSE ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.RINSE)}
          title="Step 5: Showerhead - Rinse foam"
        >
          <img src={showerhead} alt="5" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.TOWEL ? 'completed' : ''} ${step === STEPS.TOWEL ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.TOWEL)}
          title="Step 6: Towel - Dry hair"
        >
          <img src={towel} alt="6" />
        </div>
        <div
          className={`step-dot clickable ${step >= STEPS.BLOWDRY ? 'completed' : ''} ${step === STEPS.BLOWDRY ? 'active' : ''}`}
          onClick={() => handleToolClick(STEPS.BLOWDRY)}
          title="Step 7: Blow dryer - Finish drying"
        >
          <span>💨</span>
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

      {/* Floating blowdryer cursor */}
      {dragging && step === STEPS.BLOWDRY && (
        <div
          className="cursor-tool blowdryer-cursor"
          style={{
            left: cursorPos.x,
            top: cursorPos.y
          }}
        >
          💨🔥
        </div>
      )}
    </div>
  )
}
