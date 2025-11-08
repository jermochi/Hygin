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
import openMouth from '../assets/open-mouth.png'
import brushTongue from '../assets/brush_tongue.png'
import germ1 from '../assets/1.png'
import germ2 from '../assets/2.png'
import germ3 from '../assets/3.png'
import germ4 from '../assets/4.png'
import germ5 from '../assets/5.png'
import germ6 from '../assets/6.png'
import germ7 from '../assets/7.png'
import germ8 from '../assets/8.png'
import insideTeeth from '../assets/inside_teeth.png'

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
const GERM_STROKES_TO_REMOVE = 3
// Step-1 specific stroke requirement (keep step0 behavior unaffected)
const STEP1_GERM_STROKES = 3
const STEP2_GERM_STROKES = 3
const STEP2_MOVEMENT_THRESHOLD = 60
const STEP4_GERM_STROKES = 3
const STEP5_GERM_STROKES = 3
// Where the cursor should attach to the floating toothbrush (percentages of width/height)
const BRUSH_HEAD_ANCHOR = { x: 0.85, y: 0.45 }
// Germ display / hitbox size (1/3 of previous 260px width)
const GERM_DISPLAY_SIZE = Math.round(260 / 3)
const STEP4_GERM_SIZE = Math.round(GERM_DISPLAY_SIZE * 0.6)
const INSIDE_TOP_Y_RANGE = { min: 0.18, max: 0.36 }
const INSIDE_BOTTOM_Y_RANGE = { min: 0.66, max: 0.88 }
const INSIDE_TOP_SPAWN_RANGE = { min: 0.22, max: 0.30 }
const INSIDE_BOTTOM_SPAWN_RANGE = { min: 0.72, max: 0.80 }
// Step 4 (open mouth) spawn bands for chewing/occlusal surfaces
const STEP4_BAND_TOP = { min: 0.26, max: 0.34 }
const STEP4_BAND_BOTTOM = { min: 0.80, max: 0.86 }
const STEP4_X_RANGE = { min: 0.30, max: 0.70 }
const STEP4_STRIDE = 2

// tongue data will be loaded from brush_tongue.png and used for step 5


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
  const [lastBrushX, setLastBrushX] = useState(null)
  const [brushXDirection, setBrushXDirection] = useState(null) // 'left' or 'right'
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
  const [insideTeethReady, setInsideTeethReady] = useState(false)
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
  const circleProgressRef = useRef(0)
  const step2LastPointerRef = useRef(null)
  const insideTeethDataRef = useRef({
    width: 0,
    height: 0,
    mask: null,
    points: [],
    bounds: null,
    topRange: INSIDE_TOP_Y_RANGE,
    bottomRange: INSIDE_BOTTOM_Y_RANGE,
    topSpawnPoints: [],
    bottomSpawnPoints: []
  })
  // tongue mask data (for step 5)
  const tongueDataRef = useRef({
    width: 0,
    height: 0,
    mask: null,
    points: [],
    bounds: null,
    spawnPoints: []
  })
  // Precomputed teeth mask for open mouth (step 4)
  const openMouthDataRef = useRef({
    width: 0,
    height: 0,
    mask: null,
    topPoints: [],
    bottomPoints: []
  })
  const pointerPosRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0
  })

  useEffect(() => { hudGermsRef.current = hudGerms }, [hudGerms])
  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { brushingActiveRef.current = brushingActive }, [brushingActive])
  useEffect(() => { currentGermRef.current = currentGerm }, [currentGerm])
  useEffect(() => { successCountRef.current = successCount }, [successCount])
  useEffect(() => { brushedThisWindowRef.current = brushedThisWindow }, [brushedThisWindow])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = insideTeeth

    const handleLoad = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (!width || !height) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null }
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null }
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      let imageData = null
      try {
        imageData = ctx.getImageData(0, 0, width, height)
      } catch (err) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null }
        return
      }
      if (!imageData) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null }
        return
      }

      const { data } = imageData
      const mask = new Uint8Array(width * height)
      const points = []
      const stride = 3

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          const alpha = data[idx + 3]
          if (alpha < 200) continue
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const brightness = (r + g + b) / 3
          if (brightness < 210) continue

          mask[y * width + x] = 1
          const normX = (x + 0.5) / width
          const normY = (y + 0.5) / height

          if (x % stride === 0 && y % stride === 0) {
            points.push({ x: normX, y: normY })
          }
        }
      }

      if (!points.length) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = {
          width: 0,
          height: 0,
          mask: null,
          points: [],
          bounds: null,
          topRange: INSIDE_TOP_Y_RANGE,
          bottomRange: INSIDE_BOTTOM_Y_RANGE,
          topSpawnPoints: [],
          bottomSpawnPoints: []
        }
        return
      }

      const isInTeethBand = (normY) =>
        (normY >= INSIDE_TOP_Y_RANGE.min && normY <= INSIDE_TOP_Y_RANGE.max) ||
        (normY >= INSIDE_BOTTOM_Y_RANGE.min && normY <= INSIDE_BOTTOM_Y_RANGE.max)

      const teethPoints = points.filter(({ y }) => isInTeethBand(y))
      const finalPoints = teethPoints.length ? teethPoints : points

      if (!finalPoints.length) {
        setInsideTeethReady(false)
        insideTeethDataRef.current = {
          width: 0,
          height: 0,
          mask: null,
          points: [],
          bounds: null,
          topRange: INSIDE_TOP_Y_RANGE,
          bottomRange: INSIDE_BOTTOM_Y_RANGE,
          topSpawnPoints: [],
          bottomSpawnPoints: []
        }
        return
      }

      const computeBounds = (pts) => {
        let minX = 1
        let maxX = 0
        let minY = 1
        let maxY = 0
        pts.forEach(({ x, y }) => {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        })
        return { minX, maxX, minY, maxY }
      }

      const topSpawnPoints = finalPoints.filter(
        ({ y }) => y >= INSIDE_TOP_SPAWN_RANGE.min && y <= INSIDE_TOP_SPAWN_RANGE.max
      )
      const bottomSpawnPoints = finalPoints.filter(
        ({ y }) => y >= INSIDE_BOTTOM_SPAWN_RANGE.min && y <= INSIDE_BOTTOM_SPAWN_RANGE.max
      )

      insideTeethDataRef.current = {
        width,
        height,
        mask,
        points: finalPoints,
        bounds: computeBounds(finalPoints),
        topRange: INSIDE_TOP_Y_RANGE,
        bottomRange: INSIDE_BOTTOM_Y_RANGE,
        topSpawnPoints,
        bottomSpawnPoints
      }
      setInsideTeethReady(true)
    }

    const handleError = () => {
      setInsideTeethReady(false)
      insideTeethDataRef.current = {
        width: 0,
        height: 0,
        mask: null,
        points: [],
        bounds: null,
        topRange: INSIDE_TOP_Y_RANGE,
        bottomRange: INSIDE_BOTTOM_Y_RANGE,
        topSpawnPoints: [],
        bottomSpawnPoints: []
      }
    }

    img.onload = handleLoad
    img.onerror = handleError

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [])

  // Build white-teeth mask for open_mouth to spawn only on chewing surfaces
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = openMouth

    const handleLoad = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (!width || !height) {
        openMouthDataRef.current = { width: 0, height: 0, mask: null, topPoints: [], bottomPoints: [] }
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, width, height)
      let imageData = null
      try { imageData = ctx.getImageData(0, 0, width, height) } catch { imageData = null }
      if (!imageData) return
      const { data } = imageData
      const mask = new Uint8Array(width * height)
      const topPoints = []
      const bottomPoints = []
      for (let y = 0; y < height; y += STEP4_STRIDE) {
        for (let x = 0; x < width; x += STEP4_STRIDE) {
          const idx = (y * width + x) * 4
          const a = data[idx + 3]
          if (a < 200) continue
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const brightness = (r + g + b) / 3
          // Treat very light pixels as teeth
          if (brightness < 230) continue
          mask[y * width + x] = 1
          const nx = (x + 0.5) / width
          const ny = (y + 0.5) / height
          if (nx >= STEP4_X_RANGE.min && nx <= STEP4_X_RANGE.max) {
            if (ny >= STEP4_BAND_TOP.min && ny <= STEP4_BAND_TOP.max) topPoints.push({ x: nx, y: ny })
            if (ny >= STEP4_BAND_BOTTOM.min && ny <= STEP4_BAND_BOTTOM.max) bottomPoints.push({ x: nx, y: ny })
          }
        }
      }
      openMouthDataRef.current = { width, height, mask, topPoints, bottomPoints }
    }
    img.onload = handleLoad
    return () => { img.onload = null }
  }, [])

  // Build mask for tongue image (step 5)
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = brushTongue

    const handleLoad = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (!width || !height) {
        tongueDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null, spawnPoints: [] }
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, width, height)
      let imageData = null
      try { imageData = ctx.getImageData(0, 0, width, height) } catch { imageData = null }
      if (!imageData) {
        tongueDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null, spawnPoints: [] }
        return
      }
      const { data } = imageData
      const mask = new Uint8Array(width * height)
      const points = []
      const stride = 3
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4
          const a = data[idx + 3]
          if (a < 200) continue
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const brightness = (r + g + b) / 3
          // Check for tongue-like colors (pinkish/reddish, not white)
          if (brightness < 130 || brightness > 200) continue // Skip dark or very bright (teeth)
          if (r < 150 || r < g + 30) continue // Require red channel to be strong
          if (y < height * 0.4) continue // Skip upper portion entirely (teeth area)
          mask[y * width + x] = 1
          if (x % stride === 0 && y % stride === 0) {
            points.push({ x: (x + 0.5) / width, y: (y + 0.5) / height })
          }
        }
      }

      const computeBounds = (pts) => {
        if (!pts || !pts.length) return null
        let minX = 1, maxX = 0, minY = 1, maxY = 0
        pts.forEach(({ x, y }) => {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        })
        return { minX, maxX, minY, maxY }
      }

      const bounds = computeBounds(points)
      // Compute centroid of points to identify the tongue's center
      const centroid = points.reduce((acc, p) => {
        acc.x += p.x; acc.y += p.y; return acc
      }, { x: 0, y: 0 })
      centroid.x /= points.length
      centroid.y /= points.length

      // Restrict spawn points to lower portion of the tongue area
      const spawnPoints = points.filter(p => (
        p.y >= 0.45 && p.y <= 0.85 && // Keep in middle-lower region
        p.x >= 0.2 && p.x <= 0.8 // Avoid far edges
      ))

      // Fallback to a strict central band if needed
      const fallback = points.filter(p => p.y >= 0.55 && p.y <= 0.75)

      tongueDataRef.current = {
        width,
        height,
        mask,
        points,
        bounds,
        centroid,
        spawnPoints: spawnPoints.length ? spawnPoints : (fallback.length ? fallback : points)
      }
    }

    img.onload = handleLoad
    img.onerror = () => { tongueDataRef.current = { width: 0, height: 0, mask: null, points: [], bounds: null, spawnPoints: [] } }
    return () => { img.onload = null }
  }, [])

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
      const currentStep = stepRef.current

      if (
        currentStep === 3 &&
        insideTeethDataRef.current &&
        Array.isArray(insideTeethDataRef.current.points) &&
        insideTeethDataRef.current.points.length
      ) {
        const { points, width, height, mask, topSpawnPoints, bottomSpawnPoints } = insideTeethDataRef.current
        const marginXNorm = r.width > 0 ? (GERM_DISPLAY_SIZE / 2) / r.width : 0
        const marginYNorm = r.height > 0 ? (GERM_DISPLAY_SIZE / 2) / r.height : 0
        const offsets = [
          { dx: 0, dy: 0 },
          { dx: marginXNorm, dy: 0 },
          { dx: -marginXNorm, dy: 0 },
          { dx: 0, dy: marginYNorm },
          { dx: 0, dy: -marginYNorm }
        ]

        const pools = []
        if (topSpawnPoints?.length) pools.push(topSpawnPoints)
        if (bottomSpawnPoints?.length) pools.push(bottomSpawnPoints)

        const pickPool = () => {
          if (!pools.length) return points
          return pools[Math.floor(Math.random() * pools.length)]
        }

        const selectCandidate = () => {
          const activePool = pickPool()
          for (let attempt = 0; attempt < 20; attempt++) {
            const candidate = activePool[Math.floor(Math.random() * activePool.length)]
            if (!candidate) continue
            const valid = offsets.every(({ dx, dy }) => {
              const nx = candidate.x + dx
              const ny = candidate.y + dy
              if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false
              if (!mask || !width || !height) return true
              const px = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))))
              const py = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))))
              return mask[py * width + px] === 1
            })
            if (valid) {
              return candidate
            }
          }
          const fallbackPool = points
          return fallbackPool[Math.floor(Math.random() * fallbackPool.length)] ?? null
        }

        const point = selectCandidate()
        if (point) {
          xPct = (point.x ?? 0.5) * 100
          let clampedY = point.y ?? 0.5
          if (point.y <= INSIDE_TOP_Y_RANGE.max) {
            clampedY = Math.min(
              Math.max(point.y, INSIDE_TOP_SPAWN_RANGE.min),
              INSIDE_TOP_SPAWN_RANGE.max
            )
          } else {
            clampedY = Math.min(
              Math.max(point.y, INSIDE_BOTTOM_SPAWN_RANGE.min),
              INSIDE_BOTTOM_SPAWN_RANGE.max
            )
          }
          yPct = clampedY * 100
        }
  } else if (currentStep === 4) {
        // Prefer spawning directly on detected teeth pixels within occlusal bands.
        const pools = []
        if (openMouthDataRef.current.topPoints?.length) pools.push('top')
        if (openMouthDataRef.current.bottomPoints?.length) pools.push('bottom')
        if (pools.length) {
          const which = pools[Math.random() < 0.5 ? 0 : pools.length - 1]
          const arr = which === 'top' ? openMouthDataRef.current.topPoints : openMouthDataRef.current.bottomPoints
          const candidate = arr[Math.floor(Math.random() * arr.length)]
          if (candidate) {
            xPct = (candidate.x ?? 0.5) * 100
            yPct = (candidate.y ?? 0.5) * 100
          }
        } else {
          // Fallback to geometric bands if mask not ready
          const band = Math.random() < 0.5 ? STEP4_BAND_TOP : STEP4_BAND_BOTTOM
          const yNorm = band.min + Math.random() * (band.max - band.min)
          const xNorm = STEP4_X_RANGE.min + Math.random() * (STEP4_X_RANGE.max - STEP4_X_RANGE.min)
          const xAbs = r.left + r.width * xNorm
          const yAbs = r.top + r.height * yNorm
          xPct = ((xAbs - r.left) / r.width) * 100
          yPct = ((yAbs - r.top) / r.height) * 100
        }
      } else if (currentStep === 5) {
        // Spawn germs preferentially on tongue mask points if available.
        const tongue = tongueDataRef.current
        if (tongue && Array.isArray(tongue.points) && tongue.points.length) {
          const { points, width, height, mask } = tongue
          const marginXNorm = r.width > 0 ? (GERM_DISPLAY_SIZE / 2) / r.width : 0
          const marginYNorm = r.height > 0 ? (GERM_DISPLAY_SIZE / 2) / r.height : 0
          const offsets = [
            { dx: 0, dy: 0 },
            { dx: marginXNorm, dy: 0 },
            { dx: -marginXNorm, dy: 0 },
            { dx: 0, dy: marginYNorm },
            { dx: 0, dy: -marginYNorm }
          ]

          const selectCandidate = () => {
            for (let attempt = 0; attempt < 40; attempt++) {
              const candidate = points[Math.floor(Math.random() * points.length)]
              if (!candidate) continue
              const valid = offsets.every(({ dx, dy }) => {
                const nx = candidate.x + dx
                const ny = candidate.y + dy
                if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false
                if (!mask || !width || !height) return true
                const px = Math.min(width - 1, Math.max(0, Math.round(nx * (width - 1))))
                const py = Math.min(height - 1, Math.max(0, Math.round(ny * (height - 1))))
                return mask[py * width + px] === 1
              })
              if (valid) return candidate
            }
            return points[Math.floor(Math.random() * points.length)] ?? null
          }

          const point = selectCandidate()
          if (point) {
            // Map normalized image coordinates to percentage of head image
            xPct = (point.x ?? 0.5) * 100
            yPct = (point.y ?? 0.5) * 100
          }
        } else if (headRef.current) {
          // fallback to lower-central area of the head image
          const xAbs = r.left + r.width * 0.5
          const yAbs = r.top + r.height * 0.72
          xPct = ((xAbs - r.left) / r.width) * 100
          yPct = ((yAbs - r.top) / r.height) * 100
        }
      } else {
        const teethLeft = r.left + r.width * 0.25
        const teethRight = r.right - r.width * 0.25
        const teethTop = r.top + r.height * 0.38
        const teethBottom = r.top + r.height * 0.68

        const teethWidth = Math.max(teethRight - teethLeft, 1)
        const teethHeight = Math.max(teethBottom - teethTop, 1)

        const padX = teethWidth * 0.08
        const padY = teethHeight * 0.08
        const spawnWidth = Math.max(teethWidth - 2 * padX, 0)
        const spawnHeight = Math.max(teethHeight - 2 * padY, 0)

        const xAbs = spawnWidth > 0
          ? teethLeft + padX + Math.random() * spawnWidth
          : teethLeft + teethWidth / 2
        const yAbs = spawnHeight > 0
          ? teethTop + padY + Math.random() * spawnHeight
          : teethTop + teethHeight / 2

        xPct = ((xAbs - r.left) / r.width) * 100
        yPct = ((yAbs - r.top) / r.height) * 100
      }
    }

    const newGerm = { id: Date.now(), img: pick, status: 'active', xPct, yPct, opacity: 1 }
    setCurrentGerm(newGerm)
    currentGermRef.current = newGerm
    setBrushedThisWindow(false)
    brushedThisWindowRef.current = false
    step2LastPointerRef.current = null
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
        (stepRef.current === 1 || stepRef.current === 2 || stepRef.current === 3 || stepRef.current === 4 || stepRef.current === 5) &&
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
    const message = phaseStep === 4
      ? 'BRUSH BACK AND FORTH'
      : phaseStep === 3
        ? 'BRUSH THE INSIDES'
        : phaseStep === 2
          ? 'BRUSH IN CIRCLES'
          : phaseStep === 5
            ? 'BRUSH THE TONGUE'
            : 'BRUSH UP AND DOWN'
    setHintMessage(message)
    setShowBrushHint(true)
    brushHintTimeoutRef.current = setTimeout(() => {
      setShowBrushHint(false)
      brushHintTimeoutRef.current = null
      setBrushingActive(true)
    }, 2000)
  }, [])

  const handleGermSuccess = useCallback(() => {
    clearFailureTimer()
    step2LastPointerRef.current = null
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
          setTimeout(() => {
            setShowSuccess(false)
            setStep(3)
          }, 1200)
        } else if (currentStep === 3) {
          setTimeout(() => {
            setShowSuccess(false)
            setStep(4)
          }, 1200)
        } else if (currentStep === 4) {
          setTimeout(() => {
            setShowSuccess(false)
            setStep(5)
          }, 1200)
        } else if (currentStep === 5) {
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
    step2LastPointerRef.current = null
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

  // ========== Helper Functions ==========
  
  // Get bristle center position
  const getBristleCenter = useCallback(() => {
    if (!brushRef.current) return { x: 0, y: 0 }
    const bRect = brushRef.current.getBoundingClientRect()
    const topPortion = brushing ? BRISTLES_TOP_OFFSET_PORTION_STEP1 : BRISTLES_TOP_OFFSET_PORTION
    const widthPortion = brushing ? BRISTLES_WIDTH_PORTION_STEP1 : BRISTLES_WIDTH_PORTION
    const heightPortion = brushing ? BRISTLES_HEIGHT_PORTION_STEP1 : BRISTLES_HEIGHT_PORTION
    const bTop = bRect.top + bRect.height * topPortion
    const bWidth = bRect.width * widthPortion
    const bHeight = bRect.height * heightPortion
    const bLeft = bRect.right - bWidth
    return {
      x: bLeft + bWidth / 2,
      y: bTop + bHeight / 2
    }
  }, [brushing])

  // Get teeth area bounds
  const getTeethArea = () => {
    if (!headRef.current) return null
    const headRect = headRef.current.getBoundingClientRect()

    if (stepRef.current === 3 && insideTeethDataRef.current.bounds) {
      const { bounds, topRange, bottomRange } = insideTeethDataRef.current
      const minX = bounds?.minX ?? 0.1
      const maxX = bounds?.maxX ?? 0.9
      const topBand = topRange ?? INSIDE_TOP_Y_RANGE
      const bottomBand = bottomRange ?? INSIDE_BOTTOM_Y_RANGE
      return {
        left: headRect.left + headRect.width * minX,
        right: headRect.left + headRect.width * maxX,
        top: headRect.top + headRect.height * (topBand?.min ?? INSIDE_TOP_Y_RANGE.min),
        bottom: headRect.top + headRect.height * (bottomBand?.max ?? INSIDE_BOTTOM_Y_RANGE.max)
      }
    }
    if (stepRef.current === 5 && tongueDataRef.current && tongueDataRef.current.bounds) {
      const { bounds } = tongueDataRef.current
      const minX = bounds?.minX ?? 0.2
      const maxX = bounds?.maxX ?? 0.8
      const minY = bounds?.minY ?? 0.6
      const maxY = bounds?.maxY ?? 0.92
      return {
        left: headRect.left + headRect.width * minX,
        right: headRect.left + headRect.width * maxX,
        top: headRect.top + headRect.height * minY,
        bottom: headRect.top + headRect.height * maxY
      }
    }

    return {
      left: headRect.left + headRect.width * 0.25,
      right: headRect.right - headRect.width * 0.25,
      top: headRect.top + headRect.height * 0.38,
      bottom: headRect.top + headRect.height * 0.68
    }
  }

  const isInsideTeethPixel = (normX, normY) => {
    const data = insideTeethDataRef.current
    if (!data || !data.mask || !data.width || !data.height) return true
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return false

    if (
      stepRef.current === 3 &&
      !(
        (normY >= INSIDE_TOP_Y_RANGE.min && normY <= INSIDE_TOP_Y_RANGE.max) ||
        (normY >= INSIDE_BOTTOM_Y_RANGE.min && normY <= INSIDE_BOTTOM_Y_RANGE.max)
      )
    ) {
      return false
    }

    const x = Math.min(data.width - 1, Math.max(0, Math.round(normX * (data.width - 1))))
    const y = Math.min(data.height - 1, Math.max(0, Math.round(normY * (data.height - 1))))
    return data.mask[y * data.width + x] === 1
  }

  // Get germ bounds
  const getGermBounds = (germ) => {
    if (!germ || !headRef.current) return null
    if (germRef.current) {
      const gRect = germRef.current.getBoundingClientRect()
      return {
        left: gRect.left,
        top: gRect.top,
        width: gRect.width,
        height: gRect.height
      }
    }
    const size = GERM_DISPLAY_SIZE
    const headRect = headRef.current.getBoundingClientRect()
    const centerX = headRect.left + (headRect.width * (germ.xPct ?? 50) / 100)
    const centerY = headRect.top + (headRect.height * (germ.yPct ?? 53) / 100)
    return {
      left: centerX - size / 2,
      top: centerY - size / 2,
      width: size,
      height: size
    }
  }

  // ========== Step 0: Drag Toothpaste ==========
  
  const handleStep0Move = useCallback((e) => {
        setCursorPos({ x: e.clientX, y: e.clientY })
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
  }, [])

  const handleStep0Up = useCallback(() => {
    if (overBristles) {
      setHasPaste(true)
    }
    setDragging(false)
    setOverBristles(false)
  }, [overBristles])

  // ========== Step 1: Brush Up and Down ==========
  
  const handleStep1Move = useCallback((e, bristleCenterX, bristleCenterY) => {
    const teethArea = getTeethArea()
    if (!teethArea) return

          const overTeeth = bristleCenterX >= teethArea.left &&
            bristleCenterX <= teethArea.right &&
            bristleCenterY >= teethArea.top &&
            bristleCenterY <= teethArea.bottom

    if (!overTeeth) {
      setLastBrushY(null)
      setBrushDirection(null)
      return
    }

    const germ = currentGermRef.current
    if (!germ || germ.status !== 'active') {
      setLastBrushY(bristleCenterY)
      return
    }

    const germBounds = getGermBounds(germ)
    if (!germBounds) return

    const overGerm = bristleCenterX >= germBounds.left &&
      bristleCenterX <= (germBounds.left + germBounds.width) &&
      bristleCenterY >= germBounds.top &&
      bristleCenterY <= (germBounds.top + germBounds.height)

    if (lastBrushY !== null) {
            const deltaY = bristleCenterY - lastBrushY
      const threshold = 15

            if (Math.abs(deltaY) > threshold) {
              const newDirection = deltaY < 0 ? 'up' : 'down'

        if (brushDirection !== newDirection && overGerm) {
                      setBrushedThisWindow(true)
                      brushedThisWindowRef.current = true

                        const strokesNeeded = stepRef.current === 5 ? STEP5_GERM_STROKES : STEP1_GERM_STROKES
                        const perStroke = 1 / strokesNeeded
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
  }, [lastBrushY, brushDirection, getTeethArea, getGermBounds, handleGermSuccess, spawnShineEffect])

  const handleStep1Up = useCallback(() => {
    setBrushing(false)
    setLastBrushY(null)
    setBrushDirection(null)
  }, [])

  // ========== Step 2: Brush in Circles (or any motion!) ==========
  
  const handleStep2Move = useCallback((e, bristleCenterX, bristleCenterY) => {
    const pointerX = e.clientX
    const pointerY = e.clientY
    const teethArea = getTeethArea()
    if (!teethArea) return

    const overTeeth = pointerX >= teethArea.left &&
      pointerX <= teethArea.right &&
      pointerY >= teethArea.top &&
      pointerY <= teethArea.bottom

    if (!overTeeth) {
      circleProgressRef.current = 0
      step2LastPointerRef.current = null
      return
    }

    if (stepRef.current === 3 && headRef.current) {
      const headRect = headRef.current.getBoundingClientRect()
      const relX = (pointerX - headRect.left) / headRect.width
      const relY = (pointerY - headRect.top) / headRect.height
      if (!isInsideTeethPixel(relX, relY)) {
        circleProgressRef.current = 0
        step2LastPointerRef.current = null
        return
      }
    }

    const germ = currentGermRef.current
    if (!germ || germ.status !== 'active') {
      circleProgressRef.current = 0
      step2LastPointerRef.current = null
      return
    }

    const germBounds = getGermBounds(germ)
    if (!germBounds) return

    const expandedPadding = 12
    const overGerm = pointerX >= (germBounds.left - expandedPadding) &&
      pointerX <= (germBounds.left + germBounds.width + expandedPadding) &&
      pointerY >= (germBounds.top - expandedPadding) &&
      pointerY <= (germBounds.top + germBounds.height + expandedPadding)

    if (!overGerm) {
      circleProgressRef.current = 0
      step2LastPointerRef.current = null
      return
    }

    const lastPointer = step2LastPointerRef.current
    if (lastPointer) {
      const movement = Math.hypot(pointerX - lastPointer.x, pointerY - lastPointer.y)
      if (movement > 1) {
        circleProgressRef.current += movement
      }
    }
    step2LastPointerRef.current = { x: pointerX, y: pointerY }

    if (!lastPointer) {
      return
    }

    if (circleProgressRef.current >= STEP2_MOVEMENT_THRESHOLD) {
      // Enough movement - reduce opacity
      circleProgressRef.current = 0
      step2LastPointerRef.current = { x: pointerX, y: pointerY }
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
        return
      }

      const updatedGerm = { ...germ, opacity: nextOpacity }
      setCurrentGerm(updatedGerm)
      currentGermRef.current = updatedGerm
    }

  }, [getTeethArea, getGermBounds, handleGermSuccess, spawnShineEffect, isInsideTeethPixel])

  const handleStep2Up = useCallback(() => {
    setBrushing(false)
    step2LastPointerRef.current = null
    circleProgressRef.current = 0
  }, [])

  // ========== Step 4: Brush Back and Forth (left/right) ==========
  const handleStep4Move = useCallback((e, bristleCenterX, bristleCenterY) => {
    const teethArea = getTeethArea()
    if (!teethArea) return

    const overTeeth = bristleCenterX >= teethArea.left &&
      bristleCenterX <= teethArea.right &&
      bristleCenterY >= teethArea.top &&
      bristleCenterY <= teethArea.bottom

    if (!overTeeth) {
      setLastBrushX(null)
      setBrushXDirection(null)
      return
    }

    const germ = currentGermRef.current
    if (!germ || germ.status !== 'active') {
      setLastBrushX(bristleCenterX)
      return
    }

    const germBounds = getGermBounds(germ)
    if (!germBounds) return

    const overGerm = bristleCenterX >= germBounds.left &&
      bristleCenterX <= (germBounds.left + germBounds.width) &&
      bristleCenterY >= germBounds.top &&
      bristleCenterY <= (germBounds.top + germBounds.height)

    if (lastBrushX !== null) {
      const deltaX = bristleCenterX - lastBrushX
      const threshold = 15
      if (Math.abs(deltaX) > threshold) {
        const newDir = deltaX < 0 ? 'left' : 'right'
        if (brushXDirection !== newDir && overGerm) {
          setBrushedThisWindow(true)
          brushedThisWindowRef.current = true

          const perStroke = 1 / STEP4_GERM_STROKES
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
        setBrushXDirection(newDir)
        setLastBrushX(bristleCenterX)
      }
    } else {
      setLastBrushX(bristleCenterX)
    }
  }, [lastBrushX, brushXDirection, getTeethArea, getGermBounds, handleGermSuccess, spawnShineEffect])

  const handleStep4Up = useCallback(() => {
    setBrushing(false)
    setLastBrushX(null)
    setBrushXDirection(null)
  }, [])

  // ========== Main Event Handlers ==========
  
  // Track pointer while dragging
  useEffect(() => {
    const handleMove = (e) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY }
      if (step === 0 && dragging) {
        handleStep0Move(e)
      } else if ((step === 1 || step === 5) && brushing) {
        setBrushPos({ x: e.clientX, y: e.clientY })
        const bristleCenter = getBristleCenter()
        handleStep1Move(e, bristleCenter.x, bristleCenter.y)
      } else if ((step === 2 || step === 3) && brushing) {
        setBrushPos({ x: e.clientX, y: e.clientY })
        const bristleCenter = getBristleCenter()
        handleStep2Move(e, bristleCenter.x, bristleCenter.y)
      } else if (step === 4 && brushing) {
        setBrushPos({ x: e.clientX, y: e.clientY })
        const bristleCenter = getBristleCenter()
        handleStep4Move(e, bristleCenter.x, bristleCenter.y)
      }
    }

    const handleUp = () => {
      if (step === 0 && dragging) {
        handleStep0Up()
      } else if (step === 1 && brushing) {
        handleStep1Up()
      } else if ((step === 2 || step === 3) && brushing) {
        handleStep2Up()
      } else if (step === 4 && brushing) {
        handleStep4Up()
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [step, dragging, brushing, handleStep0Move, handleStep0Up, handleStep1Move, handleStep1Up, handleStep2Move, handleStep2Up, handleStep4Move, handleStep4Up, getBristleCenter])

  const startDrag = (e) => {
    if (hasPaste || step !== 0) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
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
    if (step === 1 || step === 2 || step === 3 || step === 4 || step === 5) {
      setBrushingActive(false)
      setHudGerms(0)
      setSuccessCount(0)
      setCurrentGerm(null)
      setBrushedThisWindow(false)
      setBrushDirection(null)
      setLastBrushY(null)
      setBrushXDirection(null)
      setLastBrushX(null)
      setShineEffects([])
      setShowBrushHint(false)
      hudGermsRef.current = 0
      successCountRef.current = 0
      currentGermRef.current = null
      brushedThisWindowRef.current = false
      step2LastPointerRef.current = null
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
    } else if (step === 3) {
      setHintMessage('BRUSH THE INSIDES')
    } else if (step === 4) {
      setHintMessage('BRUSH BACK AND FORTH')
      startBrushingPhase(4)
    } else if (step === 5) {
      setHintMessage('BRUSH THE TONGUE')
      startBrushingPhase(5)
    }
  }, [step, startBrushingPhase])

  useEffect(() => {
    if (step === 3 && insideTeethReady) {
      startBrushingPhase(3)
    }
    if (step === 5) {
      // tongue image doesn't require extra readiness; start phase immediately
      startBrushingPhase(5)
    }
  }, [step, insideTeethReady, startBrushingPhase])

  useEffect(() => {
    if ((step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && brushingActive && !brushing) {
      setBrushing(true)
      setBrushDirection(null)
      const pos = pointerPosRef.current
      setBrushPos({ x: pos.x, y: pos.y })
      if (step === 1) {
        setLastBrushY(null)
      } else if (step === 2 || step === 3) {
        setLastBrushY(null)
        step2LastPointerRef.current = null
        circleProgressRef.current = 0
      } else if (step === 4) {
        setLastBrushX(null)
      } else if (step === 5) {
        // tongue uses up/down strokes like step 1
        setLastBrushY(null)
      }
    }
  }, [step, brushingActive, brushing])

  useEffect(() => {
    if (brushing && (step === 1 || step === 5) && lastBrushY === null) {
      const raf = requestAnimationFrame(() => {
        const center = getBristleCenter()
        if (center?.y !== undefined) {
          setLastBrushY(center.y)
        }
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [brushing, step, lastBrushY, getBristleCenter])

  // Initialize X position for step 4
  useEffect(() => {
    if (brushing && step === 4 && lastBrushX === null) {
      const raf = requestAnimationFrame(() => {
        const center = getBristleCenter()
        if (center?.x !== undefined) {
          setLastBrushX(center.x)
        }
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [brushing, step, lastBrushX, getBristleCenter])

  // Step 1: Start game loop
  useEffect(() => {
    if ((step !== 1 && step !== 2 && step !== 3 && step !== 4 && step !== 5) || !brushingActive) return
    const initial = setTimeout(() => {
      if (
        (stepRef.current === 1 || stepRef.current === 2 || stepRef.current === 3 || stepRef.current === 4 || stepRef.current === 5) &&
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
      setTimeout(() => {
        setShowSuccess(false)
        setStep(3)
      }, 1200)
    } else if (step === 3) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setStep(4)
      }, 1200)
    } else if (step === 4) {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setStep(5)
      }, 1200)
    } else if (step === 5) {
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
          {(step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && (
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
              : step === 2
                ? 'Brush the outer surface using circular motion'
                : step === 3
                  ? 'Brush the inside surfaces to make them sparkle'
                  : step === 4
                    ? 'Brush the chewing surfaces with back and forth strokes'
                    : 'Brush the tongue up and down to remove germs'}
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
      {(step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && (
        <div className={`play-container step-1${step === 2 ? ' step-2' : ''}${step === 3 ? ' step-3' : ''}${step === 4 ? ' step-4' : ''}${step === 5 ? ' step-5' : ''}`}>
          <div className="head-container">
              <img
                ref={headRef}
                src={step === 3 ? insideTeeth : step === 4 ? openMouth : step === 5 ? brushTongue : cleanMouth}
                alt={step === 3 ? 'Inside teeth' : step === 4 ? 'Open mouth' : step === 5 ? 'Tongue' : 'Clean teeth'}
                className={`head-img ${step === 3 ? 'inside-mouth' : step === 4 ? 'open-mouth' : step === 5 ? 'tongue-mouth' : 'clean-mouth'}`}
                draggable={false}
              />
            {/* Debug overlay to visualize teeth detection area */}
            {/* <div className="teeth-detection-area" aria-hidden="true" /> */}
            
            {currentGerm && currentGerm.status === 'active' && (
              <img
                ref={germRef}
                src={currentGerm.img}
                alt="germ"
                className="germ-sprite"
                style={{
                  left: `${currentGerm.xPct ?? 50}%`,
                  top: `${currentGerm.yPct ?? 53}%`,
                  opacity: currentGerm.opacity ?? 1,
                  width: `${step === 4 ? STEP4_GERM_SIZE : GERM_DISPLAY_SIZE}px`
                }}
              />
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

  {hudGerms >= 3 && (step === 1 || step === 2 || step === 3 || step === 4 || step === 5) && (
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
                step2LastPointerRef.current = null
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