import { useEffect, useRef, useState } from 'react'
import './ToothBrushingGame.css'
import characterImg from '../assets/character.png'
import teethClean from '../assets/toothbrushing/teeth-clean.svg'
import toothbrush from '../assets/toothbrushing/toothbrush.svg'

/*
  ToothBrushingGame
  - Shows the character model (second image) with an overlaid mouth area to clean
  - A canvas draws a "dirt" layer that the player erases by moving the mouse/finger while holding/dragging
  - Progress is computed by counting erased pixels; completion at > 88%
*/
export default function ToothBrushingGame() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const brushRef = useRef(null)
  const [isDown, setIsDown] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)

  // Canvas dimensions relative to character mouth
  const CANVAS_W = 320
  const CANVAS_H = 180
  const BRUSH_RADIUS = 18

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Fill with semi-opaque plaque + random grime spots
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Base plaque film
    ctx.fillStyle = 'rgba(206, 187, 136, 0.75)'
    roundedRect(ctx, 6, 8, CANVAS_W - 12, CANVAS_H - 16, 24)
    ctx.fill()

    // Random dirty blots
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * CANVAS_W
      const y = Math.random() * CANVAS_H
      const r = 6 + Math.random() * 16
      ctx.fillStyle = `rgba(162, 128, 86, ${0.25 + Math.random() * 0.45})`
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    // Tiny food bits (green/orange dots)
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(102, 153, 77, 0.8)' : 'rgba(230, 141, 67, 0.8)'
      const x = 12 + Math.random() * (CANVAS_W - 24)
      const y = 12 + Math.random() * (CANVAS_H - 24)
      ctx.beginPath()
      ctx.arc(x, y, 3 + Math.random() * 4, 0, Math.PI * 2)
      ctx.fill()
    }

    computeProgress()
  }, [])

  useEffect(() => {
    if (progress > 88 && !completed) setCompleted(true)
  }, [progress, completed])

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function handlePointerMove(e) {
    const brush = brushRef.current
    const container = containerRef.current
    const rect = container.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top

    // Move toothbrush sprite
    if (brush) {
      brush.style.transform = `translate(${x - 40}px, ${y - 40}px) rotate(${(x + y) % 20 - 10}deg)`
    }

    if (!isDown || completed) return

    // Draw erase
    const canvasRect = canvasRef.current.getBoundingClientRect()
    const cx = x - (canvasRect.left - rect.left)
    const cy = y - (canvasRect.top - rect.top)

    const ctx = canvasRef.current.getContext('2d')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(cx, cy, BRUSH_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // Update progress throttled
    if (Math.random() < 0.35) computeProgress()
  }

  function computeProgress() {
    const ctx = canvasRef.current.getContext('2d')
    const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
    let transparent = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) transparent++
    }
    const total = CANVAS_W * CANVAS_H
    const pct = Math.min(100, Math.round((transparent / total) * 100))
    setProgress(pct)
  }

  function handlePointerDown(e) {
    e.preventDefault()
    setIsDown(true)
  }
  function handlePointerUp() {
    setIsDown(false)
    computeProgress()
  }

  function reset() {
    setCompleted(false)
    setProgress(0)
    // Redraw grime
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.fillStyle = 'rgba(206, 187, 136, 0.75)'
    roundedRect(ctx, 6, 8, CANVAS_W - 12, CANVAS_H - 16, 24)
    ctx.fill()
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * CANVAS_W
      const y = Math.random() * CANVAS_H
      const r = 6 + Math.random() * 16
      ctx.fillStyle = `rgba(162, 128, 86, ${0.25 + Math.random() * 0.45})`
      ctx.beginPath()
      ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.8), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(102, 153, 77, 0.8)' : 'rgba(230, 141, 67, 0.8)'
      const x = 12 + Math.random() * (CANVAS_W - 24)
      const y = 12 + Math.random() * (CANVAS_H - 24)
      ctx.beginPath()
      ctx.arc(x, y, 3 + Math.random() * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    computeProgress()
  }

  return (
    <div className="toothbrushing-root">
      <div className="hud">
        <div className="progress">
          <div className="label">Cleanliness</div>
          <div className="bar"><span style={{ width: `${progress}%` }} /></div>
          <div className="pct">{progress}%</div>
        </div>
        <button className="reset-btn" onClick={reset}>Reset</button>
      </div>

      <div
        className={`model-stage ${completed ? 'completed' : ''}`}
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchEnd={handlePointerUp}
      >
        <img src={characterImg} alt="Character model" className="model" />

        {/* Teeth area: base clean teeth image */}
        <img src={teethClean} alt="Teeth" className="teeth-base" draggable={false} />
        {/* Dirt overlay on canvas to erase */}
        <canvas
          ref={canvasRef}
          className="teeth-canvas"
          width={CANVAS_W}
          height={CANVAS_H}
        />

        {/* Toothbrush that follows the cursor */}
        <img ref={brushRef} src={toothbrush} alt="Toothbrush" className="toothbrush" draggable={false} />

        {completed && (
          <div className="success-banner">Sparkly clean! ✨</div>
        )}
      </div>

      <div className="tip">Tip: Click and drag (or touch) to scrub the teeth until they shine.</div>
    </div>
  )
}
