import React, { useState, useRef, useEffect, useCallback } from 'react'
import './ToothbrushGame.css'
import { markGameCompleted, GAME_IDS } from '../utils/gameCompletion'

import toothbrushNoPaste from '../assets/toothbrush-no-toothpaste.png'
import toothbrushCursor from '../assets/toothbrush-toothpaste.png'
import toothpasteClose from '../assets/toothpaste-closed.png'
import toothpasteOpen from '../assets/toothpaste-open.png'
import toothpasteSfx from '../assets/sounds/toothpaste.wav'
import goodJobImg from '../assets/goodjob.png'
import cleanMouth from '../assets/clean-mouth.png'
import shineImg from '../assets/shine.png'
import goodJobSfx from '../assets/sounds/good-job.wav'
import toothbrushSfx from '../assets/sounds/toothbrush.wav'
import successSfx from '../assets/sounds/success-sound.wav'
import gargleWaterSfx from '../assets/sounds/gargle-water.wav'
import toothbrushBackview from '../assets/toothbrush-angle-b.png'
import toothbrushAngled from '../assets/toothbrush_angled.png'
import openMouth from '../assets/open-mouth.png'
import brushTongue from '../assets/brush_tongue.png'
import mouthClosed from '../assets/mouth-closed.png'
import mouthWater from '../assets/mouth-water.png'
import rinseWater from '../assets/water.png'
import sparklingTeeth from '../assets/sparkling-teeth.png'
import germ1 from '../assets/1.png'
import germ2 from '../assets/2.png'
import germ3 from '../assets/3.png'
import germ4 from '../assets/4.png'
import germ5 from '../assets/5.png'
import germ6 from '../assets/6.png'
import germ7 from '../assets/7.png'
import germ8 from '../assets/8.png'
import insideTeeth from '../assets/inside_teeth.png'
import failSfx from '../assets/sounds/fail-sound.wav'

// Bristles hitbox portions (upper-right of brush head)
const BRISTLES_WIDTH_PORTION = 0.40
const BRISTLES_HEIGHT_PORTION = 0.55
const BRISTLES_TOP_OFFSET_PORTION = -0.30
// Step 1-specific bristles placement (place hitbox lower so it sits over the head)
const BRISTLES_WIDTH_PORTION_STEP1 = BRISTLES_WIDTH_PORTION
const BRISTLES_HEIGHT_PORTION_STEP1 = BRISTLES_HEIGHT_PORTION
const BRISTLES_TOP_OFFSET_PORTION_STEP1 = 0.25
// Step 4-5 angled placement (use upper portion of brush)
const STEP4_POINTER_ANCHOR = { x: 0.16, y: 0.12 }
const STEP4_DETECTION_CENTER = { x: 0.30, y: 0.32 }
const STEP4_BRISTLE_SIZE = { width: 0.26, height: 0.24 }
const STEP5_POINTER_ANCHOR = { x: 0.18, y: 0.10 }
const STEP5_DETECTION_CENTER = { x: 0.38, y: 0.30 }
const STEP5_BRISTLE_SIZE = { width: 0.28, height: 0.24 }

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
const STEP4_GERM_STROKES = 2
const STEP5_GERM_STROKES = 3
const VERTICAL_STROKE_THRESHOLD = 8
const VERTICAL_HORIZONTAL_TOLERANCE = 28
const VERTICAL_DOMINANCE_RATIO = 1.05
const STEP4_VERTICAL_THRESHOLD = 6
const STEP4_HORIZONTAL_TOLERANCE = 40
const STEP4_DOMINANCE_RATIO = 0.9
const STEP45_BRUSH_WIDTH = 'clamp(100px, 10vw, 150px)'
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
const STEP4_LIGHT_BLUE_ZONES = [
  { minX: 0.17, maxX: 0.38, minY: 0.26, maxY: 0.41 },
  { minX: 0.62, maxX: 0.83, minY: 0.26, maxY: 0.41 },
  { minX: 0.17, maxX: 0.38, minY: 0.68, maxY: 0.82 },
  { minX: 0.62, maxX: 0.83, minY: 0.68, maxY: 0.82 }
]
const STEP4_STRIDE = 2
const STEP4_MANUAL_SPAWNS = [
  { x: 0.26, y: 0.33 },
  { x: 0.74, y: 0.33 },
  { x: 0.27, y: 0.76 },
  { x: 0.73, y: 0.76 }
]
const STEP4_SPAWN_JITTER = { x: 0.03, y: 0.03 }
const clamp01 = (value) => Math.min(1, Math.max(0, value))

// tongue data will be loaded from brush_tongue.png and used for step 5


export default function ToothbrushGame() {
  const [step, setStep] = useState(0) // 0: apply paste, 1: brush teeth
  const [hasPaste, setHasPaste] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [overBristles, setOverBristles] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [finalComplete, setFinalComplete] = useState(false)

  // Step 1: Brushing state
  const [brushPos, setBrushPos] = useState({ x: 0, y: 0 })
  const [brushing, setBrushing] = useState(false)
  const [lastBrushY, setLastBrushY] = useState(null)
  const [brushDirection, setBrushDirection] = useState(null) // 'up' or 'down'
  const [showIntro, setShowIntro] = useState(false)
  const [showBrushHint, setShowBrushHint] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [brushingActive, setBrushingActive] = useState(false)
  const [currentGerm, setCurrentGerm] = useState(null)
  const [brushedThisWindow, setBrushedThisWindow] = useState(false)
  const [shineEffects, setShineEffects] = useState([])
  // dynamic brush anchor so the pointer sits on the bristles center
  // dynamic brush anchor so the pointer sits on the bristles center
  const [brushAnchor, setBrushAnchor] = useState(BRUSH_HEAD_ANCHOR)
  const [successCount, setSuccessCount] = useState(0)
  const [insideTeethReady, setInsideTeethReady] = useState(false)
  const [showHitboxes, setShowHitboxes] = useState(false)
  const [waterDragging, setWaterDragging] = useState(false)
  const [waterCursorPos, setWaterCursorPos] = useState({ x: 0, y: 0 })
  const [waterPoured, setWaterPoured] = useState(false)
  const [overRinseMouth, setOverRinseMouth] = useState(false)
  const spawnTimersRef = useRef({ windowTimer: null, nextSpawnTimer: null })

  // Live refs to avoid stale state inside timeouts
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
  
  // Reference for the brushing sound effect
  const brushingSoundRef = useRef(null)
  const prevBrushPosRef = useRef({ x: 0, y: 0 })
  const brushMovementTimeoutRef = useRef(null)
  // Precomputed teeth mask for open mouth (step 4)
  const openMouthDataRef = useRef({
    width: 0,
    height: 0,
    mask: null,
    zones: []
  })
  const pointerPosRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0
  })
  const verticalLastBrushXRef = useRef(null)

  useEffect(() => { stepRef.current = step }, [step])
  useEffect(() => { brushingActiveRef.current = brushingActive }, [brushingActive])
  useEffect(() => { currentGermRef.current = currentGerm }, [currentGerm])
  useEffect(() => { successCountRef.current = successCount }, [successCount])
  useEffect(() => { brushedThisWindowRef.current = brushedThisWindow }, [brushedThisWindow])

  // Initialize brushing sound
  useEffect(() => {
    const audio = new Audio(toothbrushSfx);
    audio.loop = true;
    brushingSoundRef.current = audio;

    return () => {
      if (brushMovementTimeoutRef.current) {
        clearTimeout(brushMovementTimeoutRef.current);
      }
      if (brushingSoundRef.current) {
        brushingSoundRef.current.pause();
        brushingSoundRef.current = null;
      }
    };
  }, []);

  // Watch for brush position changes and handle sound
  useEffect(() => {
    if (brushing && brushingActive) {
      // Calculate if there was actual movement
      const dx = brushPos.x - prevBrushPosRef.current.x;
      const dy = brushPos.y - prevBrushPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Update previous position
      prevBrushPosRef.current = { x: brushPos.x, y: brushPos.y };

      // Only play sound if there's significant movement (more than 1 pixel)
      if (distance > 1) {
        if (brushingSoundRef.current && brushingSoundRef.current.paused) {
          brushingSoundRef.current.play().catch(err => console.log('Audio play failed:', err));
        }
        
        // Clear any existing timeout
        if (brushMovementTimeoutRef.current) {
          clearTimeout(brushMovementTimeoutRef.current);
        }
        
        // Set new timeout to stop sound after movement stops
        brushMovementTimeoutRef.current = setTimeout(() => {
          if (brushingSoundRef.current && !brushingSoundRef.current.paused) {
            brushingSoundRef.current.pause();
            if (brushingSoundRef.current.currentTime) {
              brushingSoundRef.current.currentTime = 0;
            }
          }
        }, 50); // Stop sound after 50ms of no movement
      }
    } else {
      // If we're not brushing or not active, stop the sound immediately
      if (brushingSoundRef.current && !brushingSoundRef.current.paused) {
        brushingSoundRef.current.pause();
        if (brushingSoundRef.current.currentTime) {
          brushingSoundRef.current.currentTime = 0;
        }
      }
    }
  }, [brushPos, brushing, brushingActive]);

  // Play good job sound when success screen shows
  useEffect(() => {
    if (showSuccess) {
      const audio = new Audio(goodJobSfx);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
  }, [showSuccess])

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
        openMouthDataRef.current = { width: 0, height: 0, mask: null, zones: [] }
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
      const zonePoints = STEP4_LIGHT_BLUE_ZONES.map(() => [])
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
          const zoneIndex = STEP4_LIGHT_BLUE_ZONES.findIndex(({ minX, maxX, minY, maxY }) =>
            nx >= minX && nx <= maxX && ny >= minY && ny <= maxY
          )
          if (zoneIndex !== -1) {
            zonePoints[zoneIndex].push({ x: nx, y: ny })
          }
        }
      }
      openMouthDataRef.current = { width, height, mask, zones: zonePoints }
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

  useEffect(() => {
    if (step === 6) {
      setWaterDragging(false)
      setOverRinseMouth(false)
      setWaterPoured(false)
      setWaterCursorPos({ x: 0, y: 0 })
      setShowBrushHint(false)
      setBrushingActive(false)
      brushingActiveRef.current = false
    }
  }, [step])

  // Mark game as completed when finalComplete becomes true
  useEffect(() => {
    if (finalComplete) {
      markGameCompleted(GAME_IDS.TOOTHBRUSHING)
      // Dispatch custom event to update medal display
      window.dispatchEvent(new Event('gameCompleted'))
    }
  }, [finalComplete])

  // Toggle germ hitbox visualization with "H"
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.repeat) return
      if (!event.key || event.key.toLowerCase() !== 'h') return
      const target = event.target
      if (target && (target.closest?.('input, textarea, [contenteditable="true"]') || ['INPUT', 'TEXTAREA'].includes(target.tagName))) {
        return
      }
      event.preventDefault()
      setShowHitboxes((prev) => !prev)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getActiveBristleRect = useCallback((rect) => {
    let widthPortion = BRISTLES_WIDTH_PORTION
    let heightPortion = BRISTLES_HEIGHT_PORTION
    let centerX = 1 - widthPortion / 2
    let centerY = BRISTLES_TOP_OFFSET_PORTION + heightPortion / 2
    let pointerAnchor = null

    if (step === 1 || step === 2 || step === 3) {
      widthPortion = BRISTLES_WIDTH_PORTION_STEP1
      heightPortion = BRISTLES_HEIGHT_PORTION_STEP1
      centerX = 1 - widthPortion / 2
      centerY = BRISTLES_TOP_OFFSET_PORTION_STEP1 + heightPortion / 2
    } else if (step === 4) {
      widthPortion = STEP4_BRISTLE_SIZE.width
      heightPortion = STEP4_BRISTLE_SIZE.height
      centerX = STEP4_DETECTION_CENTER.x
      centerY = STEP4_DETECTION_CENTER.y
      pointerAnchor = STEP4_POINTER_ANCHOR
    } else if (step === 5) {
      widthPortion = STEP5_BRISTLE_SIZE.width
      heightPortion = STEP5_BRISTLE_SIZE.height
      centerX = STEP5_DETECTION_CENTER.x
      centerY = STEP5_DETECTION_CENTER.y
      pointerAnchor = STEP5_POINTER_ANCHOR
    }

    const width = rect.width * widthPortion
    const height = rect.height * heightPortion
    const left = rect.left + rect.width * (centerX - widthPortion / 2)
    const top = rect.top + rect.height * (centerY - heightPortion / 2)

    return { top, left, width, height, pointerAnchor: pointerAnchor ?? { x: centerX, y: centerY } }
  }, [step])

  // Update brush anchor (compute bristle center) when brush element or pointer moves
  useEffect(() => {
    const updateBristles = () => {
      if (!brushRef.current) return
      const rect = brushRef.current.getBoundingClientRect()
      const { top, left, width, height, pointerAnchor } = getActiveBristleRect(rect)
      const bristleCenterX = left + width / 2
      const bristleCenterY = top + height / 2
      const anchorX = (bristleCenterX - rect.left) / rect.width
      const anchorY = (bristleCenterY - rect.top) / rect.height
      setBrushAnchor(pointerAnchor ?? { x: anchorX, y: anchorY })
    }

    updateBristles()
    window.addEventListener('resize', updateBristles)
    return () => window.removeEventListener('resize', updateBristles)
  }, [dragging, brushing, cursorPos.x, cursorPos.y, brushPos.x, brushPos.y, step, getActiveBristleRect])

  // Germ hitbox visual overlay removed — collision still uses germRef DOM rect when present.

  const brushRef = useRef(null)
  const containerRef = useRef(null)
  const headRef = useRef(null)
  const germRef = useRef(null)
  const rinseMouthRef = useRef(null)

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
    if (currentGermRef.current !== null || successCountRef.current >= WIN_CONDITION_COUNT) {
      return
    }
    
    clearNextSpawnTimer()
    const pick = GERM_IMAGES[Math.floor(Math.random() * GERM_IMAGES.length)]

  let xPct = 50, yPct = 53
  let placementHandled = false
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
        const mouthData = openMouthDataRef.current
        const zones = mouthData.zones ?? []
        const availableZones = zones.filter((zone) => zone?.length)
        if (availableZones.length) {
          const zone = availableZones[Math.floor(Math.random() * availableZones.length)]
          const candidate = zone[Math.floor(Math.random() * zone.length)]
          if (candidate) {
            xPct = (candidate.x ?? 0.5) * 100
            yPct = (candidate.y ?? 0.5) * 100
            placementHandled = true
          }
        }

        if (!placementHandled) {
          // Fallback: sample inside the predefined zones but ensure mask coverage when available.
          const trySampleInZone = (zone) => {
            for (let attempt = 0; attempt < 20; attempt++) {
              const xNorm = zone.minX + Math.random() * (zone.maxX - zone.minX)
              const yNorm = zone.minY + Math.random() * (zone.maxY - zone.minY)
              if (mouthData?.mask && mouthData.width && mouthData.height) {
                const px = Math.min(mouthData.width - 1, Math.max(0, Math.round(xNorm * (mouthData.width - 1))))
                const py = Math.min(mouthData.height - 1, Math.max(0, Math.round(yNorm * (mouthData.height - 1))))
                if (!mouthData.mask[py * mouthData.width + px]) {
                  continue
                }
              }
              const xAbs = r.left + r.width * xNorm
              const yAbs = r.top + r.height * yNorm
              return {
                xPct: ((xAbs - r.left) / r.width) * 100,
                yPct: ((yAbs - r.top) / r.height) * 100
              }
            }
            return null
          }

          const shuffledZones = [...STEP4_LIGHT_BLUE_ZONES].sort(() => Math.random() - 0.5)
          let placed = null
          for (const zone of shuffledZones) {
            placed = trySampleInZone(zone)
            if (placed) break
          }

          if (placed) {
            xPct = placed.xPct
            yPct = placed.yPct
            placementHandled = true
          }
        }

        if (!placementHandled) {
          const anchor = STEP4_MANUAL_SPAWNS[Math.floor(Math.random() * STEP4_MANUAL_SPAWNS.length)]
          if (anchor) {
            const jitterX = (Math.random() * 2 - 1) * STEP4_SPAWN_JITTER.x
            const jitterY = (Math.random() * 2 - 1) * STEP4_SPAWN_JITTER.y
            const finalX = clamp01(anchor.x + jitterX)
            const finalY = clamp01(anchor.y + jitterY)
            xPct = finalX * 100
            yPct = finalY * 100
            placementHandled = true
          } else {
            // final fallback keep previous behavior
            const xAbs = r.left + r.width * 0.5
            const yAbs = r.top + r.height * 0.32
            xPct = ((xAbs - r.left) / r.width) * 100
            yPct = ((yAbs - r.top) / r.height) * 100
            placementHandled = true
          }
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

    // Play success sound
    const audio = new Audio(successSfx);
    audio.play().catch(err => console.log('Audio play failed:', err));

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
      ? 'BRUSH UP AND DOWN'
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

      if (nextCount >= WIN_CONDITION_COUNT) {
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
          setBrushingActive(false)
          brushingActiveRef.current = false
          setTimeout(() => {
            setShowSuccess(false)
            setStep(6)
          }, 1200)
        }
      } else if (nextCount < WIN_CONDITION_COUNT) {
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
    
    const failSound = new Audio(failSfx);
    failSound.play().catch(err => console.log('Audio play failed:', err));

    setTimeout(() => {
      setCurrentGerm(prev => {
        if (prev && prev.status === 'failed') {
          currentGermRef.current = null
          return null
        }
        return prev
      })
      
      // Schedule next spawn after clearing
      scheduleNextSpawn(NEXT_SPAWN_DELAY_MS)
    }, FAILURE_CLEAR_DELAY_MS)
  }, [clearFailureTimer, scheduleNextSpawn])

  useEffect(() => {
    handleGermFailureRef.current = handleGermFailure
  }, [handleGermFailure])

  // ========== Helper Functions ==========
  
  // Get bristle center position
  const getBristleCenter = useCallback(() => {
    if (!brushRef.current) return { x: 0, y: 0 }
    const rect = brushRef.current.getBoundingClientRect()
    const { top, left, width, height } = getActiveBristleRect(rect)
    return {
      x: left + width / 2,
      y: top + height / 2
    }
  }, [getActiveBristleRect])

  // Get teeth area bounds
  const getTeethArea = () => {
    if (!headRef.current) return null
    const headRect = headRef.current.getBoundingClientRect()

    if (stepRef.current === 4) {
      const zones = STEP4_LIGHT_BLUE_ZONES
      const paddingX = 0.02
      const paddingY = 0.02
      const minX = Math.max(0, Math.min(...zones.map(zone => zone.minX)) - paddingX)
      const maxX = Math.min(1, Math.max(...zones.map(zone => zone.maxX)) + paddingX)
      const minY = Math.max(0, Math.min(...zones.map(zone => zone.minY)) - paddingY)
      const maxY = Math.min(1, Math.max(...zones.map(zone => zone.maxY)) + paddingY)

      return {
        left: headRect.left + headRect.width * minX,
        right: headRect.left + headRect.width * maxX,
        top: headRect.top + headRect.height * minY,
        bottom: headRect.top + headRect.height * maxY
      }
    }

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
      // Play toothpaste sound effect
      const audio = new Audio(toothpasteSfx);
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
    setDragging(false)
    setOverBristles(false)
  }, [overBristles])

  // ========== Shared Vertical Stroke Handler (Steps 1, 4, 5) ==========
  
  const handleVerticalStrokeMove = useCallback((e, bristleCenterX, bristleCenterY) => {
    const teethArea = getTeethArea()
    if (!teethArea) return

          const overTeeth = bristleCenterX >= teethArea.left &&
            bristleCenterX <= teethArea.right &&
            bristleCenterY >= teethArea.top &&
            bristleCenterY <= teethArea.bottom

    if (!overTeeth) {
      setLastBrushY(null)
      setBrushDirection(null)
      verticalLastBrushXRef.current = null
      return
    }

    const germ = currentGermRef.current
    if (!germ || germ.status !== 'active') {
      setLastBrushY(bristleCenterY)
      verticalLastBrushXRef.current = bristleCenterX
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
      const verticalDistance = Math.abs(deltaY)
      const lastX = verticalLastBrushXRef.current
      const isStep4 = stepRef.current === 4
      const verticalThreshold = isStep4 ? STEP4_VERTICAL_THRESHOLD : VERTICAL_STROKE_THRESHOLD
      const horizontalTolerance = isStep4 ? STEP4_HORIZONTAL_TOLERANCE : VERTICAL_HORIZONTAL_TOLERANCE
      const dominanceRatio = isStep4 ? STEP4_DOMINANCE_RATIO : VERTICAL_DOMINANCE_RATIO

      const horizontalDistance = lastX === null ? 0 : Math.abs(bristleCenterX - lastX)
      if (horizontalDistance > horizontalTolerance && verticalDistance < verticalThreshold) {
        setLastBrushY(bristleCenterY)
        verticalLastBrushXRef.current = bristleCenterX
        return
      }
      const meetsThreshold = verticalDistance >= verticalThreshold
      const hasVerticalPreference =
        horizontalDistance <= horizontalTolerance ||
        verticalDistance >= horizontalDistance * dominanceRatio

      if (meetsThreshold && hasVerticalPreference) {
        const newDirection = deltaY < 0 ? 'up' : 'down'

        if (brushDirection !== newDirection && overGerm) {
          setBrushedThisWindow(true)
          brushedThisWindowRef.current = true

          const strokesNeeded =
            stepRef.current === 5
              ? STEP5_GERM_STROKES
              : stepRef.current === 4
                ? STEP4_GERM_STROKES
                : STEP1_GERM_STROKES
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
        verticalLastBrushXRef.current = bristleCenterX
      }
    } else {
      setLastBrushY(bristleCenterY)
      verticalLastBrushXRef.current = bristleCenterX
    }
  }, [lastBrushY, brushDirection, getTeethArea, getGermBounds, handleGermSuccess, spawnShineEffect])

  const handleVerticalUp = useCallback(() => {
    setBrushing(false)
    setLastBrushY(null)
    setBrushDirection(null)
    verticalLastBrushXRef.current = null
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

  const handleStep6Move = useCallback((e) => {
    setWaterCursorPos({ x: e.clientX, y: e.clientY })
    if (!rinseMouthRef.current) {
      setOverRinseMouth(false)
      return
    }
    const rect = rinseMouthRef.current.getBoundingClientRect()
    const paddingX = rect.width * 0.1
    const paddingY = rect.height * 0.2
    const left = rect.left - paddingX
    const right = rect.right + paddingX
    const top = rect.top - paddingY
    const bottom = rect.bottom + paddingY
    const isOver = e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom
    setOverRinseMouth(isOver)
  }, [])

  const handleStep6Up = useCallback(() => {
    if (overRinseMouth && !waterPoured) {
      setWaterPoured(true)
      // Play gargle water sound effect
      const gargleSound = new Audio(gargleWaterSfx);
      gargleSound.play().catch(err => console.log('Audio play failed:', err));
      // Add delay before showing "good job"
      setTimeout(() => {
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          setFinalComplete(true)
        }, SUCCESS_CLEAR_DELAY_MS)
      }, 1000) // 1 second delay after water touches mouth
    }
    setWaterDragging(false)
    setOverRinseMouth(false)
  }, [overRinseMouth, waterPoured])

  // ========== Main Event Handlers ==========
  
  // Track pointer while dragging
  useEffect(() => {
    const handleMove = (e) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY }
      if (step === 0 && dragging) {
        handleStep0Move(e)
      } else if ((step === 1 || step === 4 || step === 5) && brushing) {
        setBrushPos({ x: e.clientX, y: e.clientY })
        const bristleCenter = getBristleCenter()
        handleVerticalStrokeMove(e, bristleCenter.x, bristleCenter.y)
      } else if ((step === 2 || step === 3) && brushing) {
        setBrushPos({ x: e.clientX, y: e.clientY })
        const bristleCenter = getBristleCenter()
        handleStep2Move(e, bristleCenter.x, bristleCenter.y)
      } else if (step === 6 && waterDragging) {
        handleStep6Move(e)
      }
    }

    const handleUp = () => {
      if (step === 0 && dragging) {
        handleStep0Up()
      } else if ((step === 1 || step === 4 || step === 5) && brushing) {
        handleVerticalUp()
      } else if ((step === 2 || step === 3) && brushing) {
        handleStep2Up()
      } else if (step === 6 && waterDragging) {
        handleStep6Up()
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [step, dragging, brushing, waterDragging, handleStep0Move, handleStep0Up, handleVerticalStrokeMove, handleVerticalUp, handleStep2Move, handleStep2Up, handleStep6Move, handleStep6Up, getBristleCenter])

  const startDrag = (e) => {
    if (hasPaste || step !== 0) return
    setDragging(true)
    setCursorPos({ x: e.clientX, y: e.clientY })
  }

  const startWaterDrag = (e) => {
    if (step !== 6 || waterPoured) return
    setWaterDragging(true)
    setWaterCursorPos({ x: e.clientX, y: e.clientY })
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
      setSuccessCount(0)
      setCurrentGerm(null)
      setBrushedThisWindow(false)
      setBrushDirection(null)
      setLastBrushY(null)
      verticalLastBrushXRef.current = null
      setShineEffects([])
      setShowBrushHint(false)
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
      setHintMessage('BRUSH UP AND DOWN')
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
        verticalLastBrushXRef.current = null
      } else if (step === 2 || step === 3) {
        setLastBrushY(null)
        step2LastPointerRef.current = null
        circleProgressRef.current = 0
      } else if (step === 4) {
        setLastBrushY(null)
        verticalLastBrushXRef.current = null
      } else if (step === 5) {
        // tongue uses up/down strokes like step 1
        setLastBrushY(null)
        verticalLastBrushXRef.current = null
      }
    }
  }, [step, brushingActive, brushing])

  useEffect(() => {
    if (brushing && (step === 1 || step === 4 || step === 5) && lastBrushY === null) {
      const raf = requestAnimationFrame(() => {
        const center = getBristleCenter()
        if (center?.y !== undefined) {
          setLastBrushY(center.y)
        }
        if (center?.x !== undefined) {
          verticalLastBrushXRef.current = center.x
        }
      })
      return () => cancelAnimationFrame(raf)
    }
  }, [brushing, step, lastBrushY, getBristleCenter])

  // Step 1: Start game loop
  useEffect(() => {
    if ((step !== 1 && step !== 2 && step !== 3 && step !== 4 && step !== 5) || !brushingActive) return
    const initial = setTimeout(() => {
      if (
        (stepRef.current === 1 || stepRef.current === 2 || stepRef.current === 3 || stepRef.current === 4 || stepRef.current === 5) &&
        brushingActiveRef.current &&
        currentGermRef.current === null &&
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
      setTimeout(() => {
        setShowSuccess(false)
        setStep(6)
      }, 1200)
    } else if (step === 6) {
      setFinalComplete(true)
    }
  }

  const resetAll = () => {
    // Clear timers and timeouts
    if (spawnTimersRef.current.windowTimer) {
      clearTimeout(spawnTimersRef.current.windowTimer)
      spawnTimersRef.current.windowTimer = null
    }
    if (spawnTimersRef.current.nextSpawnTimer) {
      clearTimeout(spawnTimersRef.current.nextSpawnTimer)
      spawnTimersRef.current.nextSpawnTimer = null
    }
    if (brushHintTimeoutRef.current) {
      clearTimeout(brushHintTimeoutRef.current)
      brushHintTimeoutRef.current = null
    }
    if (shineTimeoutsRef.current.size) {
      shineTimeoutsRef.current.forEach(t => clearTimeout(t))
      shineTimeoutsRef.current.clear()
    }
    setStep(0)
    setHasPaste(false)
    setShowIntro(false)
    setBrushingActive(false)
    setSuccessCount(0)
    setCurrentGerm(null)
    setBrushedThisWindow(false)
    successCountRef.current = 0
    currentGermRef.current = null
    brushedThisWindowRef.current = false
    step2LastPointerRef.current = null
    circleProgressRef.current = 0
    setWaterDragging(false)
    setWaterPoured(false)
    setOverRinseMouth(false)
    setFinalComplete(false)
    setCleared(false)
    setShowSuccess(false)
  }

  const goHome = () => {
    try {
      // Hard redirect to app root (dev: http://localhost:5173/)
      window.location.assign('/')
    } catch {
      // Fallback: update location directly
      window.location.href = '/'
    }
  }

  return (
    <div
      ref={containerRef}
      className={`toothbrush-game ${dragging || brushing ? 'dragging-active' : ''} ${step === 6 ? 'rinse-cursor' : ''}`}
    >
      {showHitboxes && (
        <div className="debug-chip">Hitboxes ON — press H to hide</div>
      )}
      <button className="skip-button" onClick={skipToNextStep}>
        Skip
      </button>
      <div className="step-instruction">
        <div className="step-title-row">
          <div className="step-title">Step {step}:</div>
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
                    ? 'Brush the chewing surfaces up and down until clean'
                    : step === 5
                      ? 'Brush the tongue up and down to remove germs'
                      : 'Rinse out your mouth using water'}
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

            {showHitboxes && currentGerm && currentGerm.status === 'active' && (
              <div
                className="germ-hitbox-debug"
                style={{
                  left: `${currentGerm.xPct ?? 50}%`,
                  top: `${currentGerm.yPct ?? 53}%`,
                  width: `${step === 4 ? STEP4_GERM_SIZE : GERM_DISPLAY_SIZE}px`,
                  height: `${step === 4 ? STEP4_GERM_SIZE : GERM_DISPLAY_SIZE}px`
                }}
              >
                <span className="germ-hitbox-label">Germ Hitbox</span>
              </div>
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
              src={step >= 4 ? toothbrushAngled : toothbrushBackview}
              alt="Toothbrush (brushing)"
              ref={brushRef}
              className="toothbrush-floating"
              style={{
                left: brushPos.x,
                top: brushPos.y,
                width: step >= 4 ? STEP45_BRUSH_WIDTH : undefined,
                transform: `translate(-${(brushAnchor.x ?? BRUSH_HEAD_ANCHOR.x) * 100}%, -${(brushAnchor.y ?? BRUSH_HEAD_ANCHOR.y) * 100}%) rotate(0deg)`
              }}
            />
          )}
        </div>
      )}

      {step === 6 && !finalComplete && (
        <div className="play-container rinse-step">
          <div className={`rinse-mouth ${overRinseMouth ? 'target-hot' : ''}`}>
            <img
              ref={rinseMouthRef}
              src={waterPoured ? mouthWater : mouthClosed}
              alt={waterPoured ? 'Mouth rinsed with water' : 'Closed mouth'}
              className="rinse-mouth-img"
              draggable={false}
            />
          </div>

          {!waterPoured && !waterDragging && (
            <img
              src={rinseWater}
              alt="Glass of water"
              className="water-glass"
              onPointerDown={startWaterDrag}
              draggable={false}
            />
          )}

          {waterDragging && (
            <img
              src={rinseWater}
              alt="Glass of water"
              className="water-glass floating"
              style={{ left: waterCursorPos.x, top: waterCursorPos.y }}
              draggable={false}
            />
          )}
        </div>
      )}

      {finalComplete && (
        <div className="intro-overlay">
          <div className="backdrop" />
          <div className="intro-card">
            <img src={sparklingTeeth} alt="Sparkling teeth" className="final-sparkle" />
            <div className="intro-title" style={{ marginTop: '12px', fontSize: '4rem', fontWeight: 900 }}>CONGRATULATIONS!</div>
            <div className="intro-title" style={{ marginTop: '12px' }}>Brush your teeth twice a day</div>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
              <button className="continue-btn" onClick={goHome}>Main Menu</button>
              <button className="continue-btn" onClick={() => { setFinalComplete(false); setStep(1); }}>Try Again</button>
            </div>
          </div>
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

    </div>
  )
}