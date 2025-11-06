import React, { useState, useRef, useEffect } from 'react'
import './ToothbrushGame.css'

import toothbrushNoPaste from '../assets/toothbrush-nopaste.png'
import toothbrushCursor from '../assets/toothbrush-cursor.png'
import toothpasteImg from '../assets/Toothpaste.png'

// Simple bristles region ratio (rightmost 30% of toothbrush)
const BRISTLES_PORTION = 0.30

export default function ToothbrushGame() {
  const [hasPaste, setHasPaste] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [overBristles, setOverBristles] = useState(false)

  const brushRef = useRef(null)
  const containerRef = useRef(null)

  // Track pointer while dragging so "cursor" (toothpaste) follows it
  useEffect(() => {
    const handleMove = (e) => {
      if (!dragging) return
      setCursorPos({ x: e.clientX, y: e.clientY })
      // Collision check with bristles sub-rect
      if (brushRef.current) {
        const rect = brushRef.current.getBoundingClientRect()
        const bristlesRect = {
          left: rect.right - rect.width * BRISTLES_PORTION,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width * BRISTLES_PORTION,
          height: rect.height
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

  return (
    <div
      ref={containerRef}
      className={`toothbrush-game ${dragging ? 'dragging-active' : ''}`}
    >
      <div className={`brush-dropzone ${overBristles ? 'bristles-hot' : ''}`}>
        <img
          ref={brushRef}
          src={hasPaste ? toothbrushCursor : toothbrushNoPaste}
          alt={hasPaste ? 'Toothbrush with paste' : 'Toothbrush without paste'}
          className="toothbrush-img"
          draggable={false}
        />
        {!hasPaste && (
          <div className="hint">Drag toothpaste onto bristles</div>
        )}
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
          className="toothpaste-img"
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
  )
}
