import React, { useState, useRef, useEffect, useCallback } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-no-toothpaste.png'
import toothbrushCursor from '../assets/toothbrush-toothpaste.png'
import toothpasteImg from '../assets/Toothpaste.png'
import goodJobImg from '../assets/goodjob.png'
import cleanMouth from '../assets/clean-mouth.png'
import toothbrushBackview from '../assets/toothbrush-angle-b.png'
import germ1 from '../assets/1.png'
import germ2 from '../assets/2.png'
import germ3 from '../assets/3.png'
import germ4 from '../assets/4.png'
import germ5 from '../assets/5.png'
import germ6 from '../assets/6.png'
import germ7 from '../assets/7.png'
import germ8 from '../assets/8.png'
import shinePng from '../assets/shine.png'

// Bristles hitbox portions (upper-right of brush head)
const BRISTLES_WIDTH_PORTION = 0.30
const BRISTLES_HEIGHT_PORTION = 0.55
const BRISTLES_TOP_OFFSET_PORTION = -0.30

// Step 1 configuration
const WIN_CONDITION_COUNT = 5 // How many germs to win
const FAILURE_WINDOW_MS = 3000 // Time to brush each germ
const INITIAL_SPAWN_DELAY_MS = 1000
const NEXT_SPAWN_DELAY_MS = 1000
const SUCCESS_CLEAR_DELAY_MS = 1200
const FAILURE_CLEAR_DELAY_MS = 600
const GERM_IMAGES = [germ1, germ2, germ3, germ4, germ5, germ6, germ7, germ8]

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
  const [hudGerms, setHudGerms] = useState(0)
  const [step1Active, setStep1Active] = useState(false)
  const [currentGerm, setCurrentGerm] = useState(null)
  const [brushedThisWindow, setBrushedThisWindow] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const spawnTimersRef = useRef({ windowTimer: null, nextSpawnTimer: null })

  // Live refs to avoid stale state inside timeouts
  const hudGermsRef = useRef(hudGerms)
  const stepRef = useRef(step)
  const step1ActiveRef = useRef(step1Active)
  const currentGermRef = useRef(currentGerm)
  const successCountRef = useRef(successCount)
  const brushedThisWindowRef = useRef(brushedThisWindow)
  const spawnGermRef = useRef(() => {})
  const handleGermFailureRef = useRef(() => {})

  useEffect(() => { hudGermsRef.current = hudGerms }, [hudGerms])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { step1ActiveRef.current = step1Active }, [step1Active])
  useEffect(() => { currentGermRef.current = currentGerm }, [currentGerm])
  useEffect(() => { successCountRef.current = successCount }, [successCount])
  useEffect(() => { brushedThisWindowRef.current = brushedThisWindow }, [brushedThisWindow])

  const brushRef = useRef(null)
  const containerRef = useRef(null)
  const headRef = useRef(null)

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

  const scheduleNextSpawn = useCallback((delayMs) => {
    clearNextSpawnTimer()
    spawnTimersRef.current.nextSpawnTimer = setTimeout(() => {
      spawnTimersRef.current.nextSpawnTimer = null
      if (
        stepRef.current === 1 &&
        step1ActiveRef.current &&
        hudGermsRef.current < 3 &&
        successCountRef.current < WIN_CONDITION_COUNT
      ) {
        spawnGermRef.current?.()
      }
    }, delayMs)
  }, [clearNextSpawnTimer])

  const spawnGerm = useCallback(() => {
    if (hudGermsRef.current >= 3 || successCountRef.current >= WIN_CONDITION_COUNT) return
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

    setCurrentGerm({ id: Date.now(), img: pick, status: 'active', xPct, yPct, opacity: 1 })
    setBrushedThisWindow(false)
    brushedThisWindowRef.current = false
    clearFailureTimer()
    spawnTimersRef.current.windowTimer = setTimeout(() => {
      const germ = currentGermRef.current
      if (!germ || germ.status !== 'active') return
      handleGermFailureRef.current?.()
    }, FAILURE_WINDOW_MS)
  }, [clearFailureTimer, clearNextSpawnTimer])

  const handleGermSuccess = useCallback(() => {
    clearFailureTimer()
    const nextCount = successCountRef.current + 1
    setSuccessCount(nextCount)
    successCountRef.current = nextCount
    setTimeout(() => {
      setCurrentGerm(prev => (prev && prev.status === 'success') ? null : prev)
    }, SUCCESS_CLEAR_DELAY_MS)
    if (nextCount >= WIN_CONDITION_COUNT && hudGermsRef.current < 3) {
      setShowSuccess(true)
      setTimeout(() => setCleared(true), 1200)
    } else if (hudGermsRef.current < 3) {
      scheduleNextSpawn(Math.max(NEXT_SPAWN_DELAY_MS, SUCCESS_CLEAR_DELAY_MS))
    }
  }, [clearFailureTimer, scheduleNextSpawn])

  const handleGermFailure = useCallback(() => {
    clearFailureTimer()
    setCurrentGerm(prev => prev ? { ...prev, status: 'failed' } : prev)
    let nextHud = hudGermsRef.current
    setHudGerms(prev => {
      const next = Math.min(3, prev + 1)
      hudGermsRef.current = next
      nextHud = next
      return next
    })
    setTimeout(() => {
      setCurrentGerm(prev => (prev && prev.status === 'failed') ? null : prev)
    }, FAILURE_CLEAR_DELAY_MS)
    if (nextHud < 3) {
      scheduleNextSpawn(NEXT_SPAWN_DELAY_MS)
    }
  }, [clearFailureTimer, scheduleNextSpawn])

  useEffect(() => {
    spawnGermRef.current = spawnGerm
  }, [spawnGerm])

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
      } else if (step === 1 && brushing) {
        // Step 1: Drag toothbrush to brush teeth
        setBrushPos({ x: e.clientX, y: e.clientY })
        
        // Track vertical movement for brushing detection
        if (headRef.current) {
          const headRect = headRef.current.getBoundingClientRect()
          const teethArea = {
            left: headRect.left + headRect.width * 0.25,
            right: headRect.right - headRect.width * 0.25,
            top: headRect.top + headRect.height * 0.38,
            bottom: headRect.top + headRect.height * 0.68
          }
          
          const overTeeth = e.clientX >= teethArea.left &&
            e.clientX <= teethArea.right &&
            e.clientY >= teethArea.top &&
            e.clientY <= teethArea.bottom
          
          if (overTeeth && lastBrushY !== null) {
            const deltaY = e.clientY - lastBrushY
            const threshold = 15 // Minimum movement to count as a stroke
            
            if (Math.abs(deltaY) > threshold) {
              const newDirection = deltaY < 0 ? 'up' : 'down'
              
              if (brushDirection && brushDirection !== newDirection) {
                // Brush detection over germ
                let resolvedSuccess = false
                setCurrentGerm(prev => {
                  if (!prev || prev.status !== 'active') return prev
                  const size = 180
                  const half = size / 2
                  const r = headRef.current?.getBoundingClientRect()
                  if (!r) return prev
                  const centerX = r.left + (r.width * (prev.xPct ?? 50) / 100)
                  const centerY = r.top + (r.height * (prev.yPct ?? 53) / 100)
                  const overGerm =
                    e.clientX >= (centerX - half) && e.clientX <= (centerX + half) &&
                    e.clientY >= (centerY - half) && e.clientY <= (centerY + half)

                  if (!overGerm) return prev

                  setBrushedThisWindow(true)
                  brushedThisWindowRef.current = true

                  const nextOpacity = Math.max(0, (prev.opacity ?? 1) - 0.35)
                  if (nextOpacity <= 0) {
                    resolvedSuccess = true
                    return { ...prev, status: 'success', opacity: 0 }
                  }

                  return { ...prev, opacity: nextOpacity }
                })

                if (resolvedSuccess) {
                  handleGermSuccess()
                }
              }
              setBrushDirection(newDirection)
              setLastBrushY(e.clientY)
            }
          } else if (overTeeth) {
            setLastBrushY(e.clientY)
          }
        }
      }
    }
    const handleUp = () => {
      if (step === 0 && dragging) {
        if (overBristles) {
          setHasPaste(true)
        }
        setDragging(false)
        setOverBristles(false)
      } else if (step === 1 && brushing) {
        setBrushing(false)
        setLastBrushY(null)
        setBrushDirection(null)
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [step, dragging, overBristles, brushing, lastBrushY, brushDirection, handleGermSuccess])

  const startDrag = (e) => {
    if (hasPaste || step !== 0) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
  }

  const startBrushing = (e) => {
    if (step !== 1) return
    try {
      if (e.currentTarget && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
    } catch (err) {}
    setBrushing(true)
    setBrushPos({ x: e.clientX, y: e.clientY })
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

  // Show Step 1 intro when entering step 1, and reset game state
  useEffect(() => {
    if (step === 1) {
      setShowIntro(true)
      setStep1Active(false)
      setHudGerms(0)
      setSuccessCount(0)
      setCurrentGerm(null)
      setBrushedThisWindow(false)
      hudGermsRef.current = 0
      successCountRef.current = 0
      brushedThisWindowRef.current = false
      // Clear all timers
      if (spawnTimersRef.current.windowTimer) {
        clearTimeout(spawnTimersRef.current.windowTimer)
        spawnTimersRef.current.windowTimer = null
      }
      if (spawnTimersRef.current.nextSpawnTimer) {
        clearTimeout(spawnTimersRef.current.nextSpawnTimer)
        spawnTimersRef.current.nextSpawnTimer = null
      }
    }
  }, [step])

  // Step 1: Start game loop
  useEffect(() => {
    if (step !== 1 || !step1Active) return
    const initial = setTimeout(() => {
      if (
        stepRef.current === 1 &&
        step1ActiveRef.current &&
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
  }, [step, step1Active, spawnGerm, clearFailureTimer, clearNextSpawnTimer])


  const startStep1 = () => {
    setShowIntro(false)
    setStep1Active(true)
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
      <div className="step-instruction">
        <div className="step-title-row">
          <div className="step-title">Step {step}:</div>
          {step === 1 && (
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
            : 'Brush the teeth up and down until clean'}
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
              src={toothpasteImg}
              alt="Toothpaste"
              className="toothpaste-img start"
              onPointerDown={startDrag}
            />
          )}

          {dragging && !hasPaste && (
            <img
              src={toothpasteImg}
              alt="Toothpaste (dragging)"
              className="toothpaste-img floating"
              style={{ left: cursorPos.x, top: cursorPos.y }}
            />
          )}
        </div>
      )}

      {/* Step 1: Brush teeth */}
      {step === 1 && (
        <div className="play-container step-1">
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
            
            {currentGerm && (
              <>
                {currentGerm.status === 'active' && (
                  <img src={currentGerm.img} alt="germ" className="germ-sprite" style={{ left: `${currentGerm.xPct ?? 50}%`, top: `${currentGerm.yPct ?? 53}%`, opacity: currentGerm.opacity ?? 1 }} />
                )}
                {currentGerm.status === 'success' && (
                  <img src={shinePng} alt="shine" className="shine-sprite" style={{ left: `${currentGerm.xPct ?? 50}%`, top: `${currentGerm.yPct ?? 53}%` }} />
                )}
              </>
            )}
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
              className="toothbrush-floating"
              style={{ left: brushPos.x, top: brushPos.y }}
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

      {showIntro && step === 1 && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title">Instructions</div>
            <ul className="intro-list">
              <li>Brush up and down until the germs go away</li>
              <li>If you fail to brush the germs, you gain a germ point</li>
              <li>Three germ points and you lose</li>
            </ul>
            <button className="continue-btn" onClick={() => startStep1()}>Continue</button>
          </div>
        </div>
      )}

      {hudGerms >= 3 && step === 1 && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <div className="intro-title">You Lose</div>
            <button className="continue-btn" onClick={() => { setStep(0); setHasPaste(false); setShowIntro(false); setStep1Active(false); setHudGerms(0); setCurrentGerm(null); }}>Try Again</button>
          </div>
        </div>
      )}
    </div>
  )
}