import React, { useState, useRef, useEffect } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-no-toothpaste.png'
import toothbrushCursor from '../assets/toothbrush-toothpaste.png'
import toothpasteImg from '../assets/Toothpaste.png'
import goodJobImg from '../assets/goodjob.png'
import dirtyMouth from '../assets/dirty-mouth.png'
import cleanMouth from '../assets/clean-mouth.png'
import toothbrushBackview from '../assets/toothbrush-angle-b.png'

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

  // Step 1: Check if enough brush strokes completed
  useEffect(() => {
    if (step === 1 && brushStrokes >= REQUIRED_BRUSH_STROKES) {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        setCleared(true)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [step, brushStrokes])

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
            : 'Brush the teeth up and down'}
        </div>
        {/* brush progress counter removed per UX request */}
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
            {/* Dirty mouth (fades out as brushing progresses) */}
            <img
              src={dirtyMouth}
              alt="Dirty teeth"
              className="head-img dirty-mouth"
              style={{ opacity: 1 - cleanliness }}
              draggable={false}
            />
            {/* Clean mouth (fades in as brushing progresses) */}
            <img
              ref={headRef}
              src={cleanMouth}
              alt="Clean teeth"
              className="head-img clean-mouth"
              style={{ opacity: cleanliness }}
              draggable={false}
            />
            {/* Debug overlay to visualize teeth detection area */}
            <div className="teeth-detection-area" aria-hidden="true" />
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
    </div>
  )
}
