import React, { useState, useRef, useEffect } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-nopaste.png'
import toothbrushCursor from '../assets/toothbrush-cursor.png'
import toothpasteImg from '../assets/Toothpaste.png'
import goodJobImg from '../assets/goodjob.png'

// Bristles hitbox portions (upper-right of brush head)
const BRISTLES_WIDTH_PORTION = 0.30
const BRISTLES_HEIGHT_PORTION = 0.55
const BRISTLES_TOP_OFFSET_PORTION = -0.30

export default function ToothbrushGame() {
  const [hasPaste, setHasPaste] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [overBristles, setOverBristles] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cleared, setCleared] = useState(false)

  const brushRef = useRef(null)
  const containerRef = useRef(null)

  // Track pointer while dragging so "cursor" (toothpaste) follows it
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging) return
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
    }
    const handleUp = () => {
      if (dragging) {
        if (overBristles) {
          setHasPaste(true)
        }
        setDragging(false)
        setOverBristles(false)
      }
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragging, overBristles])

  const startDrag = (e) => {
    if (hasPaste) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
  }

  // When paste is applied, wait 3s, then show success overlay, then clear
  useEffect(() => {
    if (hasPaste) {
      const showTimer = setTimeout(() => {
        setShowSuccess(true)
        const clearTimer = setTimeout(() => setCleared(true), 1200)
        return () => clearTimeout(clearTimer)
      }, 1500)
      return () => clearTimeout(showTimer)
    }
  }, [hasPaste])

  if (cleared) {
    return (
      <div className="toothbrush-game cleared" />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`toothbrush-game ${dragging ? 'dragging-active' : ''}`}
    >
      <div className="step-instruction">
        <div className="step-title">Step 0:</div>
        <div className="step-sub">Drag the toothpaste to apply it to the toothbrush</div>
      </div>
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

      {showSuccess && (
        <div className="success-overlay">
          <div className="backdrop" />
          <img src={goodJobImg} alt="Good job" className="success-popup" />
        </div>
      )}
    </div>
  )
}
