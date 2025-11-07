import React, { useState, useRef, useEffect, useCallback } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-no-toothpaste.png'
import toothbrushCursor from '../assets/toothbrush-toothpaste.png'
import toothpasteClose from '../assets/toothpaste-closed.png'
import toothpasteOpen from '../assets/toothpaste-open.png'
import goodJobImg from '../assets/goodjob.png'
import cleanMouth from '../assets/clean-mouth.png'
import shineImg from '../assets/shine.png'
import toothbrushBackview from '../assets/toothbrush-angle-b.png'
import germ1 from '../assets/1.png'
import germ2 from '../assets/2.png'
import germ3 from '../assets/3.png'
import germ4 from '../assets/4.png'
import germ5 from '../assets/5.png'
import germ6 from '../assets/6.png'
import germ7 from '../assets/7.png'
import germ8 from '../assets/8.png'

// Bristles hitbox portions (upper-right of brush head)
const BRISTLES_WIDTH_PORTION = 0.40
const BRISTLES_HEIGHT_PORTION = 0.55
const BRISTLES_TOP_OFFSET_PORTION = -0.30
// Step 1-specific bristles placement (place hitbox lower so it sits over the head)
const BRISTLES_WIDTH_PORTION_STEP1 = BRISTLES_WIDTH_PORTION
const BRISTLES_HEIGHT_PORTION_STEP1 = BRISTLES_HEIGHT_PORTION
const BRISTLES_TOP_OFFSET_PORTION_STEP1 = 0.25

// Step 1 configuration
const WIN_CONDITION_COUNT = 5 // How many germs to win                         
const FAILURE_WINDOW_MS = 3000 // Time to brush each germ
const INITIAL_SPAWN_DELAY_MS = 1000
const NEXT_SPAWN_DELAY_MS = 1000
const SUCCESS_CLEAR_DELAY_MS = 1200
const FAILURE_CLEAR_DELAY_MS = 600
const GERM_IMAGES = [germ1, germ2, germ3, germ4, germ5, germ6, germ7, germ8]
// How many brush direction-change strokes are required to remove a single germ
const GERM_STROKES_TO_REMOVE = 5
// Step-1 specific stroke requirement (keep step0 behavior unaffected)
const STEP1_GERM_STROKES = 5
const STEP2_GERM_STROKES = 5
// Where the cursor should attach to the floating toothbrush (percentages of width/height)
const BRUSH_HEAD_ANCHOR = { x: 0.85, y: 0.45 }
// Germ display / hitbox size (1/3 of previous 260px width)
const GERM_DISPLAY_SIZE = Math.round(260 / 3)

export default function ToothbrushGame() {
  const [step, setStep] = useState(0) // 0: apply paste, 1: brush teeth
  const [hasPaste, setHasPaste] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [overBristles, setOverBristles] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cleared, setCleared] = useState(false)

  // Step 1: Brushing state
  const [brushPos, setBrushPos] = useState({ x: 0, y: 0 })
  const [brushing, setBrushing] = useState(false)
  const [lastBrushY, setLastBrushY] = useState(null)
  const [brushDirection, setBrushDirection] = useState(null) // 'up' or 'down'
  const [showIntro, setShowIntro] = useState(false)
  const [showBrushHint, setShowBrushHint] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [hudGerms, setHudGerms] = useState(0)
  const [brushingActive, setBrushingActive] = useState(false)
  const [currentGerm, setCurrentGerm] = useState(null)
  const [brushedThisWindow, setBrushedThisWindow] = useState(false)
  const [shineEffects, setShineEffects] = useState([])
  // dynamic brush anchor so the pointer sits on the bristles center
  // dynamic brush anchor so the pointer sits on the bristles center
  const [brushAnchor, setBrushAnchor] = useState(BRUSH_HEAD_ANCHOR)
  const [successCount, setSuccessCount] = useState(0)
  const spawnTimersRef = useRef({ windowTimer: null, nextSpawnTimer: null })

  // Live refs to avoid stale state inside timeouts
  const hudGermsRef = useRef(hudGerms)
  const stepRef = useRef(step)
  const brushingActiveRef = useRef(brushingActive)
  const currentGermRef = useRef(currentGerm)
  const successCountRef = useRef(successCount)
  const brushedThisWindowRef = useRef(brushedThisWindow)
  const handleGermFailureRef = useRef(() => {})
  const brushHintTimeoutRef = useRef(null)
  const shineTimeoutsRef = useRef(new Map())
  const lastCircleAngleRef = useRef(null)
  const circleProgressRef = useRef(0)

  useEffect(() => { hudGermsRef.current = hudGerms }, [hudGerms])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { brushingActiveRef.current = brushingActive }, [brushingActive])
  useEffect(() => { currentGermRef.current = currentGerm }, [currentGerm])
  useEffect(() => { successCountRef.current = successCount }, [successCount])
  useEffect(() => { brushedThisWindowRef.current = brushedThisWindow }, [brushedThisWindow])

  useEffect(() => {
    return () => {
      if (brushHintTimeoutRef.current) {
        clearTimeout(brushHintTimeoutRef.current)
        brushHintTimeoutRef.current = null
      }
      if (shineTimeoutsRef.current.size) {
        shineTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
        shineTimeoutsRef.current.clear()
      }
    }
  }, [])

  useEffect(() => {
    if (step === 0) {
      if (brushHintTimeoutRef.current) {
        clearTimeout(brushHintTimeoutRef.current)
        brushHintTimeoutRef.current = null
      }
      setShowBrushHint(false)
      if (shineTimeoutsRef.current.size) {
        shineTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
        shineTimeoutsRef.current.clear()
      }
      setShineEffects([])
    }
  }, [step])

  // Update brush anchor (compute bristle center) when brush element or pointer moves
  useEffect(() => {
    const updateBristles = () => {
      if (!brushRef.current) return
      const rect = brushRef.current.getBoundingClientRect()
      // choose offsets depending on whether we're actively brushing (step 1) or not
      const topPortion = brushing ? BRISTLES_TOP_OFFSET_PORTION_STEP1 : BRISTLES_TOP_OFFSET_PORTION
      const widthPortion = brushing ? BRISTLES_WIDTH_PORTION_STEP1 : BRISTLES_WIDTH_PORTION
      const heightPortion = brushing ? BRISTLES_HEIGHT_PORTION_STEP1 : BRISTLES_HEIGHT_PORTION
      const top = rect.top + rect.height * topPortion
      const width = rect.width * widthPortion
      const left = rect.right - width

      // compute the center of the bristles and derive an anchor (fraction of image)
      const bristleCenterX = left + width / 2
      const bristleCenterY = top + (rect.height * heightPortion) / 2
      const anchorX = (bristleCenterX - rect.left) / rect.width
      const anchorY = (bristleCenterY - rect.top) / rect.height
      setBrushAnchor({ x: anchorX, y: anchorY })
    }

    updateBristles()
    window.addEventListener('resize', updateBristles)
    return () => window.removeEventListener('resize', updateBristles)
  }, [dragging, brushing, cursorPos.x, cursorPos.y, brushPos.x, brushPos.y])

  // Germ hitbox visual overlay removed — collision still uses germRef DOM rect when present.

  const brushRef = useRef(null)
  const containerRef = useRef(null)
  const headRef = useRef(null)
  const germRef = useRef(null)

  const clearFailureTimer = useCallback(() => {
    if (spawnTimersRef.current.windowTimer) {
      clearTimeout(spawnTimersRef.current.windowTimer)
      spawnTimersRef.current.windowTimer = null
    }
  }, [])

  const clearNextSpawnTimer = useCallback(() => {
    if (spawnTimersRef.current.nextSpawnTimer) {
      clearTimeout(spawnTimersRef.current.nextSpawnTimer)
      spawnTimersRef.current.nextSpawnTimer = null
    }
  }, [])

  const spawnGerm = useCallback(() => {
    // Only spawn if we don't have an active germ and conditions are met
    if (currentGermRef.current !== null || hudGermsRef.current >= 3 || successCountRef.current >= WIN_CONDITION_COUNT) {
      return
    }
    
    clearNextSpawnTimer()
    const pick = GERM_IMAGES[Math.floor(Math.random() * GERM_IMAGES.length)]

    let xPct = 50, yPct = 53
    if (headRef.current) {
      const r = headRef.current.getBoundingClientRect()
      const padX = r.width * 0.10
      const padY = r.height * 0.20
      const xAbs = r.left + padX + Math.random() * (r.width - 2 * padX)
      const yAbs = r.top + padY + Math.random() * (r.height - 2 * padY)
      xPct = ((xAbs - r.left) / r.width) * 100
      yPct = ((yAbs - r.top) / r.height) * 100
    }

    const newGerm = { id: Date.now(), img: pick, status: 'active', xPct, yPct, opacity: 1 }
    setCurrentGerm(newGerm)
    currentGermRef.current = newGerm
    setBrushedThisWindow(false)
    brushedThisWindowRef.current = false
    lastCircleAngleRef.current = null
    circleProgressRef.current = 0
    
    clearFailureTimer()
    spawnTimersRef.current.windowTimer = setTimeout(() => {
      const germ = currentGermRef.current
      if (!germ || germ.status !== 'active') return
      handleGermFailureRef.current?.()
    }, FAILURE_WINDOW_MS)
  }, [clearFailureTimer, clearNextSpawnTimer])

  const scheduleNextSpawn = useCallback((delayMs) => {
    clearNextSpawnTimer()
    spawnTimersRef.current.nextSpawnTimer = setTimeout(() => {
      spawnTimersRef.current.nextSpawnTimer = null
      if (
        (stepRef.current === 1 || stepRef.current === 2) &&
        brushingActiveRef.current &&
        currentGermRef.current === null &&
        hudGermsRef.current < 3 &&
        successCountRef.current < WIN_CONDITION_COUNT
      ) {
        spawnGerm()
      }
    }, delayMs)
  }, [clearNextSpawnTimer, spawnGerm])

  const spawnShineEffect = useCallback((germ) => {
    if (!germ) return
    const xPct = germ.xPct ?? 50
    const yPct = germ.yPct ?? 53
    const effectId = `${germ.id ?? 'germ'}-${Date.now()}`

    setShineEffects(prev => [...prev, { id: effectId, xPct, yPct }])

    if (shineTimeoutsRef.current.has(effectId)) {
      clearTimeout(shineTimeoutsRef.current.get(effectId))
    }

    const timeout = setTimeout(() => {
      setShineEffects(prev => prev.filter(effect => effect.id !== effectId))
      shineTimeoutsRef.current.delete(effectId)
    }, 1000)

    shineTimeoutsRef.current.set(effectId, timeout)
  }, [])

  const startBrushingPhase = useCallback((phaseStep) => {
    setShowIntro(false)
    if (brushHintTimeoutRef.current) {
      clearTimeout(brushHintTimeoutRef.current)
      brushHintTimeoutRef.current = null
    }
    setBrushingActive(false)
    setHintMessage(phaseStep === 2 ? 'BRUSH IN CIRCLES' : 'BRUSH UP AND DOWN')
    setShowBrushHint(true)
    brushHintTimeoutRef.current = setTimeout(() => {
      setShowBrushHint(false)
      brushHintTimeoutRef.current = null
      setBrushingActive(true)
    }, 2000)
  }, [])

  const handleGermSuccess = useCallback(() => {
    clearFailureTimer()
    lastCircleAngleRef.current = null
    circleProgressRef.current = 0
    const nextCount = successCountRef.current + 1
    setSuccessCount(nextCount)
    successCountRef.current = nextCount

    setTimeout(() => {
      setCurrentGerm(prev => {
        if (prev && prev.status === 'success') {
          currentGermRef.current = null
          return null
        }
        return prev
      })

      if (nextCount >= WIN_CONDITION_COUNT && hudGermsRef.current < 3) {
        const currentStep = stepRef.current
        setShowSuccess(true)
        if (currentStep === 1) {
          setTimeout(() => {
            setShowSuccess(false)
            setStep(2)
          }, 1200)
        } else if (currentStep === 2) {
          setTimeout(() => setCleared(true), 1200)
        }
      } else if (hudGermsRef.current < 3 && nextCount < WIN_CONDITION_COUNT) {
        // spawn after the clear delay so next germ always arrives post-removal
        scheduleNextSpawn(NEXT_SPAWN_DELAY_MS)
      }
    }, SUCCESS_CLEAR_DELAY_MS)
  }, [clearFailureTimer, scheduleNextSpawn])

  const handleGermFailure = useCallback(() => {
    clearFailureTimer()
    lastCircleAngleRef.current = null
    circleProgressRef.current = 0
    setCurrentGerm(prev => prev ? { ...prev, status: 'failed' } : prev)
    let nextHud = hudGermsRef.current
    setHudGerms(prev => {
      const next = Math.min(3, prev + 1)
      hudGermsRef.current = next
      nextHud = next
      return next
    })
    
    setTimeout(() => {
      setCurrentGerm(prev => {
        if (prev && prev.status === 'failed') {
          currentGermRef.current = null
          return null
        }
        return prev
      })
      
      // Schedule next spawn after clearing
      if (nextHud < 3) {
        scheduleNextSpawn(NEXT_SPAWN_DELAY_MS)
      }
    }, FAILURE_CLEAR_DELAY_MS)
  }, [clearFailureTimer, scheduleNextSpawn])

  useEffect(() => {
    handleGermFailureRef.current = handleGermFailure
  }, [handleGermFailure])

  // Track pointer while dragging
  useEffect(() => {
    const handleMove = (e) => {
      if (step === 0 && dragging) {
        // Step 0: Drag toothpaste to brush
        setCursorPos({ x: e.clientX, y: e.clientY })
        // Collision check with bristles
        if (brushRef.current) {
          const rect = brushRef.current.getBoundingClientRect()
          const top = rect.top + rect.height * BRISTLES_TOP_OFFSET_PORTION
          const width = rect.width * BRISTLES_WIDTH_PORTION
          const height = rect.height * BRISTLES_HEIGHT_PORTION
          const bristlesRect = {
            left: rect.right - width,
            top,
            right: rect.right,
            bottom: top + height,
          }
          const over = e.clientX >= bristlesRect.left &&
            e.clientX <= bristlesRect.right &&
            e.clientY >= bristlesRect.top &&
            e.clientY <= bristlesRect.bottom
          setOverBristles(over)
        }
      } else if ((step === 1 || step === 2) && brushing) {
        // Step 1 & 2: Drag toothbrush to brush teeth
        setBrushPos({ x: e.clientX, y: e.clientY })

        // Use the bristles center (computed from the floating brush element) for detection
        let bristleCenterX = e.clientX
        let bristleCenterY = e.clientY
        if (brushRef.current) {
          const bRect = brushRef.current.getBoundingClientRect()
          const topPortion = brushing ? BRISTLES_TOP_OFFSET_PORTION_STEP1 : BRISTLES_TOP_OFFSET_PORTION
          const widthPortion = brushing ? BRISTLES_WIDTH_PORTION_STEP1 : BRISTLES_WIDTH_PORTION
          const heightPortion = brushing ? BRISTLES_HEIGHT_PORTION_STEP1 : BRISTLES_HEIGHT_PORTION
          const bTop = bRect.top + bRect.height * topPortion
          const bWidth = bRect.width * widthPortion
          const bHeight = bRect.height * heightPortion
          const bLeft = bRect.right - bWidth
          bristleCenterX = bLeft + bWidth / 2
          bristleCenterY = bTop + bHeight / 2
        }

        if (!headRef.current) {
          return
        }

        const headRect = headRef.current.getBoundingClientRect()
        const teethArea = {
          left: headRect.left + headRect.width * 0.25,
          right: headRect.right - headRect.width * 0.25,
          top: headRect.top + headRect.height * 0.38,
          bottom: headRect.top + headRect.height * 0.68
        }

        const overTeeth = bristleCenterX >= teethArea.left &&
          bristleCenterX <= teethArea.right &&
          bristleCenterY >= teethArea.top &&
          bristleCenterY <= teethArea.bottom

        if (!overTeeth) {
          if (step === 1) {
            setLastBrushY(null)
            setBrushDirection(null)
          } else {
            lastCircleAngleRef.current = null
            circleProgressRef.current = 0
          }
          return
        }

        const germ = currentGermRef.current
        if (!germ || germ.status !== 'active') {
          if (step === 1) {
            setLastBrushY(bristleCenterY)
          } else {
            lastCircleAngleRef.current = null
            circleProgressRef.current = 0
          }
          return
        }

        let gLeft, gTop, gWidth, gHeight
        if (germRef.current) {
          const gRect = germRef.current.getBoundingClientRect()
          gLeft = gRect.left
          gTop = gRect.top
          gWidth = gRect.width
          gHeight = gRect.height
        } else {
          const size = GERM_DISPLAY_SIZE
          const centerX = headRect.left + (headRect.width * (germ.xPct ?? 50) / 100)
          const centerY = headRect.top + (headRect.height * (germ.yPct ?? 53) / 100)
          gLeft = centerX - size / 2
          gTop = centerY - size / 2
          gWidth = size
          gHeight = size
        }

        if (gLeft == null) {
          return
        }

        const overGerm =
          bristleCenterX >= gLeft && bristleCenterX <= (gLeft + gWidth) &&
          bristleCenterY >= gTop && bristleCenterY <= (gTop + gHeight)

        if (step === 1) {
          if (lastBrushY !== null) {
            const deltaY = bristleCenterY - lastBrushY
            const threshold = 15

            if (Math.abs(deltaY) > threshold) {
              const newDirection = deltaY < 0 ? 'up' : 'down'

              if (brushDirection !== newDirection && overGerm) {
                setBrushedThisWindow(true)
                brushedThisWindowRef.current = true

                const perStroke = 1 / STEP1_GERM_STROKES
                const nextOpacity = Math.max(0, (germ.opacity ?? 1) - perStroke)

                if (nextOpacity <= 0) {
                  spawnShineEffect(germ)
                  const successGerm = { ...germ, status: 'success', opacity: 0 }
                  setCurrentGerm(successGerm)
                  currentGermRef.current = successGerm
                  handleGermSuccess()
                } else {
                  const updatedGerm = { ...germ, opacity: nextOpacity }
                  setCurrentGerm(updatedGerm)
                  currentGermRef.current = updatedGerm
                }
              }

              setBrushDirection(newDirection)
              setLastBrushY(bristleCenterY)
            }
          } else {
            setLastBrushY(bristleCenterY)
          }
          return
        }

        if (!overGerm) {
          lastCircleAngleRef.current = null
          circleProgressRef.current = 0
          return
        }

        const germCenterX = gLeft + gWidth / 2
        const germCenterY = gTop + gHeight / 2
        const dx = bristleCenterX - germCenterX
        const dy = bristleCenterY - germCenterY
        const radius = Math.sqrt(dx * dx + dy * dy)
        const minRadius = Math.max(gWidth, gHeight) * 0.2

        if (radius < minRadius) {
          lastCircleAngleRef.current = null
          return
        }

        const angle = Math.atan2(dy, dx)
        const lastAngle = lastCircleAngleRef.current

        if (lastAngle != null) {
          let delta = angle - lastAngle
          while (delta <= -Math.PI) delta += Math.PI * 2
          while (delta > Math.PI) delta -= Math.PI * 2

          const minDelta = 12 * (Math.PI / 180)
          const absDelta = Math.abs(delta)

          if (absDelta > minDelta) {
            const degreesDelta = absDelta * (180 / Math.PI)
            const newProgress = circleProgressRef.current + degreesDelta
            circleProgressRef.current = newProgress

            if (newProgress >= 360) {
              circleProgressRef.current = newProgress - 360
              setBrushedThisWindow(true)
              brushedThisWindowRef.current = true

              const perStroke = 1 / STEP2_GERM_STROKES
              const nextOpacity = Math.max(0, (germ.opacity ?? 1) - perStroke)

              if (nextOpacity <= 0) {
                spawnShineEffect(germ)
                const successGerm = { ...germ, status: 'success', opacity: 0 }
                setCurrentGerm(successGerm)
                currentGermRef.current = successGerm
                handleGermSuccess()
                lastCircleAngleRef.current = null
                circleProgressRef.current = 0
                return
              }

              const updatedGerm = { ...germ, opacity: nextOpacity }
              setCurrentGerm(updatedGerm)
              currentGermRef.current = updatedGerm
            }
          }
        }

        // Initialize angle on first brush over germ
        lastCircleAngleRef.current = angle
      }
    }
    const handleUp = () => {
      if (step === 0 && dragging) {
        if (overBristles) {
          setHasPaste(true)
        }
        setDragging(false)
        setOverBristles(false)
      } else if ((step === 1 || step === 2) && brushing) {
        setBrushing(false)
        setLastBrushY(null)
        setBrushDirection(null)
        lastCircleAngleRef.current = null
        circleProgressRef.current = 0
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [step, dragging, overBristles, brushing, lastBrushY, brushDirection, handleGermSuccess, spawnShineEffect])

  const startDrag = (e) => {
    if (hasPaste || step !== 0) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
  }

  const startBrushing = (e) => {
    if (step !== 1 && step !== 2) return
    try {
      if (e.currentTarget && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
    } catch (err) {}
    setBrushing(true)
    setBrushPos({ x: e.clientX, y: e.clientY })
    setBrushDirection(null)
    if (step === 1) {
      // Try to initialize lastBrushY to the bristle center if possible so first stroke counts
      if (brushRef.current) {
        const bRect = brushRef.current.getBoundingClientRect()
        const bTop = bRect.top + bRect.height * BRISTLES_TOP_OFFSET_PORTION
        const bWidth = bRect.width * BRISTLES_WIDTH_PORTION
        const bHeight = bRect.height * BRISTLES_HEIGHT_PORTION
        const bLeft = bRect.right - bWidth
        const bristleCenterY = bTop + bHeight / 2
        setLastBrushY(bristleCenterY)
      } else {
        setLastBrushY(e.clientY)
      }
    } else {
      setLastBrushY(null)
      lastCircleAngleRef.current = null
      circleProgressRef.current = 0
    }
  }

  // When paste is applied, move to next step
  useEffect(() => {
    if (hasPaste && step === 0) {
      const showTimer = setTimeout(() => {
        setShowSuccess(true)
        const clearTimer = setTimeout(() => {
          setShowSuccess(false)
          setStep(1) // Move to step 1
        }, 1200)
        return () => clearTimeout(clearTimer)
      }, 1500)
      return () => clearTimeout(showTimer)
    }
  }, [hasPaste, step])

  // Reset brushing state when entering brushing steps
  useEffect(() => {
    if (step === 1 || step === 2) {
      setBrushingActive(false)
      setHudGerms(0)
      setSuccessCount(0)
      setCurrentGerm(null)
      setBrushedThisWindow(false)
      setBrushDirection(null)
      setLastBrushY(null)
      setShineEffects([])
      hudGermsRef.current = 0
      successCountRef.current = 0
      currentGermRef.current = null
      brushedThisWindowRef.current = false
      lastCircleAngleRef.current = null
      circleProgressRef.current = 0

      if (spawnTimersRef.current.windowTimer) {
        clearTimeout(spawnTimersRef.current.windowTimer)
        spawnTimersRef.current.windowTimer = null
      }
      if (spawnTimersRef.current.nextSpawnTimer) {
        clearTimeout(spawnTimersRef.current.nextSpawnTimer)
        spawnTimersRef.current.nextSpawnTimer = null
      }
      if (shineTimeoutsRef.current.size) {
        shineTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
        shineTimeoutsRef.current.clear()
      }
    }

    if (step === 1) {
      setShowIntro(true)
      setHintMessage('BRUSH UP AND DOWN')
    } else {
      setShowIntro(false)
    }

    if (step === 2) {
      setHintMessage('BRUSH IN CIRCLES')
      startBrushingPhase(2)
    }
  }, [step, startBrushingPhase])

  // Step 1: Start game loop
  useEffect(() => {
    if ((step !== 1 && step !== 2) || !brushingActive) return
    const initial = setTimeout(() => {
      if (
        (stepRef.current === 1 || stepRef.current === 2) &&
        brushingActiveRef.current &&
        currentGermRef.current === null &&
        hudGermsRef.current < 3 &&
        successCountRef.current < WIN_CONDITION_COUNT
      ) {
        spawnGerm()
      }
    }, INITIAL_SPAWN_DELAY_MS)

    return () => {
      clearTimeout(initial)
      clearFailureTimer()
      clearNextSpawnTimer()
    }
  }, [step, brushingActive, spawnGerm, clearFailureTimer, clearNextSpawnTimer])


  const startStep1 = () => {
    startBrushingPhase(1)
  }

  const skipToNextStep = () => {
    if (step === 0) {
      setHasPaste(true)
      setStep(1)
    } else if (step === 1) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setStep(2)
      }, 1200)
    } else if (step === 2) {
      setShowSuccess(true)
      setTimeout(() => setCleared(true), 1200)
    }
  }

  if (cleared) {
    return (
      <div className="toothbrush-game cleared" />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`toothbrush-game ${dragging || brushing ? 'dragging-active' : ''}`}
    >
      <button className="skip-button" onClick={skipToNextStep}>
        Skip
      </button>
      <div className="step-instruction">
        <div className="step-title-row">
          <div className="step-title">Step {step}:</div>
          {(step === 1 || step === 2) && (
            <div className="germs hud">
              {[0,1,2].map((i) => (
                <span key={i} className={`germ ${i < hudGerms ? 'active' : ''}`} aria-label="germ" role="img">🦠</span>
              ))}
            </div>
          )}
        </div>
        <div className="step-sub">
          {step === 0 
            ? 'Drag the toothpaste to apply it to the toothbrush'
            : step === 1
              ? 'Brush the teeth up and down until clean'
              : 'Brush the outer surface using circular motion'}
        </div>
      </div>

      {/* Step 0: Apply toothpaste */}
      {step === 0 && (
        <div className="play-container">
          <div className={`brush-dropzone ${overBristles ? 'bristles-hot' : ''}`}>
            <img
              ref={brushRef}
              src={hasPaste ? toothbrushCursor : toothbrushNoPaste}
              alt={hasPaste ? 'Toothbrush with paste' : 'Toothbrush without paste'}
              className="toothbrush-img"
              draggable={false}
            />
            {!hasPaste && (
              <div className="bristles-region" aria-hidden="true" />
            )}
          </div>

          {!hasPaste && !dragging && (
            <img
              src={toothpasteClose}
              alt="Toothpaste"
              className="toothpaste-img start small"
              onPointerDown={startDrag}
            />
          )}

          {dragging && !hasPaste && (
            <img
              src={toothpasteOpen}
              alt="Toothpaste (dragging)"
              className="toothpaste-img floating"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            />
          )}
        </div>
      )}

      {/* Step 1: Brush teeth */}
      {(step === 1 || step === 2) && (
        <div className={`play-container step-1${step === 2 ? ' step-2' : ''}`}>
          <div className="head-container">
            <img
              ref={headRef}
              src={cleanMouth}
              alt="Clean teeth"
              className="head-img clean-mouth"
              draggable={false}
            />
            {/* Debug overlay to visualize teeth detection area */}
            {/* <div className="teeth-detection-area" aria-hidden="true" /> */}
            
            {currentGerm && currentGerm.status === 'active' && (
              <img ref={germRef} src={currentGerm.img} alt="germ" className="germ-sprite" style={{ left: `${currentGerm.xPct ?? 50}%`, top: `${currentGerm.yPct ?? 53}%`, opacity: currentGerm.opacity ?? 1, width: `${GERM_DISPLAY_SIZE}px` }} />
            )}

            {shineEffects.map(effect => (
              <img
                key={effect.id}
                src={shineImg}
                alt=""
                className="shine-sprite"
                style={{ left: `${effect.xPct}%`, top: `${effect.yPct}%` }}
              />
            ))}
          </div>

          {!brushing && (
            <img
              ref={brushRef}
              src={toothbrushBackview}
              alt="Toothbrush"
              className="toothbrush-draggable"
              onPointerDown={startBrushing}
              draggable={false}
            />
          )}

          {brushing && (
            <img
              src={toothbrushBackview}
              alt="Toothbrush (brushing)"
              ref={brushRef}
              className="toothbrush-floating"
              style={{
                left: brushPos.x,
                top: brushPos.y,
                transform: `translate(-${(brushAnchor.x ?? BRUSH_HEAD_ANCHOR.x) * 100}%, -${(brushAnchor.y ?? BRUSH_HEAD_ANCHOR.y) * 100}%) rotate(0deg)`
              }}
            />
          )}
        </div>
      )}

      {showSuccess && (
        <div className="success-overlay">
          <div className="backdrop" />
          <img src={goodJobImg} alt="Good job" className="success-popup" />
        </div>
      )}

      {/* Hitbox outlines removed (visuals hidden) */}

      {showIntro && step === 1 && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title">Instructions</div>
            <ul className="intro-list">
              <li>Brush in the specified direction until the germs go away</li>
              <li>If you fail to brush the germs, you gain a germ point</li>
              <li>Three germ points and you lose</li>
            </ul>
            <button className="continue-btn" onClick={() => startStep1()}>Continue</button>
          </div>
        </div>
      )}

      {showBrushHint && (
        <div className="intro-overlay brush-hint">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title">{hintMessage || 'BRUSH UP AND DOWN'}</div>
          </div>
        </div>
      )}

      {hudGerms >= 3 && (step === 1 || step === 2) && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title">You Lose</div>
            <button
              className="continue-btn"
              onClick={() => {
                setStep(0)
                setHasPaste(false)
                setShowIntro(false)
                setBrushingActive(false)
                setHudGerms(0)
                setSuccessCount(0)
                setCurrentGerm(null)
                setBrushedThisWindow(false)
                hudGermsRef.current = 0
                successCountRef.current = 0
                currentGermRef.current = null
                brushedThisWindowRef.current = false
                lastCircleAngleRef.current = null
                circleProgressRef.current = 0
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}