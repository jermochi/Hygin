import React, { useState, useRef, useEffect } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-no-toothpaste.png'
import toothbrushCursor from '../assets/toothbrush-toothpaste.png'
import toothpasteImg from '../assets/Toothpaste.png'
import goodJobImg from '../assets/goodjob.png'
import dirtyMouth from '../assets/dirty-mouth.png'
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
const REQUIRED_BRUSH_STROKES = 20

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
  const [brushStrokes, setBrushStrokes] = useState(0)
  const [lastBrushY, setLastBrushY] = useState(null)
  const [brushDirection, setBrushDirection] = useState(null) // 'up' or 'down'
  const [showIntro, setShowIntro] = useState(false)
  const [hudGerms, setHudGerms] = useState(0)
  const [step1Active, setStep1Active] = useState(false)
  const [currentGerm, setCurrentGerm] = useState(null)
  const [brushedThisWindow, setBrushedThisWindow] = useState(false)
  const spawnTimersRef = useRef({ intervalId: null, windowTimer: null, masterTimer: null })
  const germImages = [germ1, germ2, germ3, germ4, germ5, germ6, germ7, germ8]

  const brushRef = useRef(null)
  const containerRef = useRef(null)
  const headRef = useRef(null)

  // Track pointer while dragging so "cursor" (toothpaste) follows it
  useEffect(() => {
    const handleMove = (e) => {
      if (step === 0 && dragging) {
        // Step 0: Drag toothpaste to brush
        setCursorPos({ x: e.clientX, y: e.clientY })
        // Collision check with bristles sub-rect (upper-right focus)
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
            width,
            height
          }
          // Treat toothpaste image as a point at cursor center for simplicity
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
          // Define teeth area (mouth region - adjusted for clean-mouth.png)
          // The clean-mouth image shows large prominent teeth in the center
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
              
              // Count a stroke when direction changes
              if (brushDirection && brushDirection !== newDirection) {
                setBrushStrokes(prev => prev + 1)
                // If brushing over current germ, fade it out progressively and mark this window as brushed
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
                  // Mark that this window was successfully brushed
                  const nextOpacity = Math.max(0, (prev.opacity ?? 1) - 0.35)
                  if (nextOpacity <= 0) {
                    setTimeout(() => setCurrentGerm(null), 2000)
                    return { ...prev, status: 'success', opacity: 0 }
                  }
                  return { ...prev, opacity: nextOpacity }
                })
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
  }, [step, dragging, overBristles, brushing, lastBrushY, brushDirection])

  const startDrag = (e) => {
    if (hasPaste || step !== 0) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
  }

  const startBrushing = (e) => {
    if (step !== 1) return
    // Try to capture the pointer so dragging continues even if the pointer
    // moves outside the toothbrush image. This helps keep the backview
    // toothbrush active while the user drags.
    try {
      if (e.currentTarget && e.currentTarget.setPointerCapture) {
        e.currentTarget.setPointerCapture(e.pointerId)
      }
    } catch (err) {
      // Some browsers/environments may not support pointer capture; ignore.
    }
    setBrushing(true)
    setBrushPos({ x: e.clientX, y: e.clientY })
  }

  // When paste is applied, wait 3s, then show success overlay, then clear
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

  // Show Step 1 intro when entering step 1
  useEffect(() => {
    if (step === 1) {
      setShowIntro(true)
      setStep1Active(false)
      setHudGerms(0)
      setCurrentGerm(null)
      setBrushedThisWindow(false)
      const { intervalId, windowTimer, masterTimer } = spawnTimersRef.current
      if (intervalId) clearInterval(intervalId)
      if (windowTimer) clearTimeout(windowTimer)
      if (masterTimer) clearTimeout(masterTimer)
    }
  }, [step])

  const startStep1 = () => {
    setShowIntro(false)
    setStep1Active(true)
  }

  // Step 1: Germ spawns and timers
  useEffect(() => {
    if (step !== 1 || !step1Active) return
    const spawn = () => {
      if (hudGerms >= 3) return
      const pick = germImages[Math.floor(Math.random() * germImages.length)]
      // choose random position within clean mouth bounds (percentages)
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
      if (spawnTimersRef.current.windowTimer) clearTimeout(spawnTimersRef.current.windowTimer)
      spawnTimersRef.current.windowTimer = setTimeout(() => {
        setCurrentGerm(prev => {
          if (!prev || prev.status !== 'active') return prev
          const succeeded = (prev.opacity ?? 1) <= 0.01 || prev.status === 'success'
          if (succeeded) {
            // ensure success clears after 2s
            setTimeout(() => setCurrentGerm(null), 2000)
            return { ...prev, status: 'success' }
          }
          // failure: lose a life and clear germ shortly
          setHudGerms(g => Math.min(3, g + 1))
          setTimeout(() => setCurrentGerm(null), 600)
          return { ...prev, status: 'failed' }
        })
      }, 4000)
    }
    const initial = setTimeout(spawn, 1000)
    const intervalId = setInterval(spawn, 4000)
    spawnTimersRef.current.intervalId = intervalId
    const masterTimer = setTimeout(() => {
      if (hudGerms < 3) {
        setShowSuccess(true)
        setTimeout(() => setCleared(true), 1200)
      }
    }, 16000)
    spawnTimersRef.current.masterTimer = masterTimer
    return () => {
      clearTimeout(initial)
      clearInterval(intervalId)
      clearTimeout(masterTimer)
    }
  }, [step, step1Active, hudGerms])

  // Calculate teeth cleanliness based on brush strokes (0 to 1)
  const cleanliness = step === 1 ? Math.min(brushStrokes / REQUIRED_BRUSH_STROKES, 1) : 0

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
        <div className="step-title">Step {step}:</div>
        <div className="step-sub">
          {step === 0 
            ? 'Drag the toothpaste to apply it to the toothbrush'
            : 'Brush the teeth up and down until clean'}
        </div>
        {step === 1 && (
          <div className="germs hud">
            {[0,1,2].map((i) => (
              <span key={i} className={`germ ${i < hudGerms ? 'active' : ''}`} aria-label="germ" role="img">🦠</span>
            ))}
          </div>
        )}
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
            {/* Visualize bristles region for debugging (optional) */}
            {!hasPaste && (
              <div className="bristles-region" aria-hidden="true" />
            )}
          </div>

          {/* Starting toothpaste (click & hold to drag) */}
          {!hasPaste && !dragging && (
            <img
              src={toothpasteImg}
              alt="Toothpaste"
              className="toothpaste-img start"
              onPointerDown={startDrag}
            />
          )}

          {/* Floating toothpaste following cursor while dragging */}
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
            {/* Clean mouth only (aspect ratio preserved via CSS) */}
            <img
              ref={headRef}
              src={cleanMouth}
              alt="Clean teeth"
              className="head-img clean-mouth"
              style={{ opacity: 1 }}
              draggable={false}
            />
            {/* Debug overlay to visualize teeth detection area */}
            <div className="teeth-detection-area" aria-hidden="true" />
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

          {/* Toothbrush that can be dragged */}
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

          {/* Floating toothbrush following cursor while brushing */}
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
