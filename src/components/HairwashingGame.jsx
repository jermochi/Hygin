import React, { useState, useRef, useEffect, useCallback } from 'react'
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
  const [shampooBlob, setShampooBlob] = useState(null) // Position of shampoo blob
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

    // For image-based masking (most steps now use this)
    if (currentConfig.useImageMask && currentConfig.topHairImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        topImageRef.current = img
        // Draw the top hair image on canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Calculate total pixels for progress
        totalPixelsRef.current = canvas.width * canvas.height
        clearedPixelsRef.current = 0
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

      // Clear shampoo blob after scrub step completes
      if (step === STEPS.SCRUB) {
        setShampooBlob(null)
      }

      // Clear persistent foam after rinse step completes
      if (step === STEPS.RINSE) {
        setPersistentFoam([])
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
  const handleShampooStep = useCallback((x, y) => {
    if (step === STEPS.SHAMPOO && dragging) {
      // Place shampoo blob on hair
      if (!shampooBlob) {
        setShampooBlob({ x: x, y: y })
      }
      // Shampoo just needs to be dragged over hair
      setProgress(prev => Math.min(100, prev + 2))
    }
  }, [step, dragging, shampooBlob])

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

        {/* Hint button - bottom left */}
        <div className="hint-btn">💡</div>

        {/* Timer - bottom right */}
        <div className="timer-display">
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
