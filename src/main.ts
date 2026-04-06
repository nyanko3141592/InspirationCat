import './style.css'
import { removeBackground } from '@imgly/background-removal'

type StyleName = 'yellow' | 'blue' | 'pink'

interface StyleConfig {
  bg: string[]
  rays: string
  glow: string
  sparkle: string
  bulbGlow: string
}

const STYLES: Record<StyleName, StyleConfig> = {
  yellow: {
    bg: ['#1a1a2e', '#2d2200'],
    rays: 'rgba(255, 215, 0, 0.15)',
    glow: 'rgba(255, 200, 0, 0.4)',
    sparkle: '#ffd700',
    bulbGlow: 'rgba(255, 215, 0, 0.3)',
  },
  blue: {
    bg: ['#0a0a2e', '#001a33'],
    rays: 'rgba(100, 180, 255, 0.15)',
    glow: 'rgba(100, 180, 255, 0.4)',
    sparkle: '#64b4ff',
    bulbGlow: 'rgba(100, 180, 255, 0.3)',
  },
  pink: {
    bg: ['#2e1a2e', '#33001a'],
    rays: 'rgba(255, 130, 200, 0.15)',
    glow: 'rgba(255, 130, 200, 0.4)',
    sparkle: '#ff82c8',
    bulbGlow: 'rgba(255, 130, 200, 0.3)',
  },
}

let currentStyle: StyleName = 'yellow'
let subjectBlob: Blob | null = null
let subjectImg: HTMLImageElement | null = null

const canvas = document.getElementById('result-canvas') as HTMLCanvasElement
const uploadArea = document.getElementById('upload-area')!
const fileInput = document.getElementById('file-input') as HTMLInputElement
const previewSection = document.getElementById('preview-section')!
const processing = document.getElementById('processing')!
const processingText = document.getElementById('processing-text')!
const controls = document.getElementById('controls')!
const downloadBtn = document.getElementById('download-btn')!
const resetBtn = document.getElementById('reset-btn')!
const styleBtns = document.querySelectorAll<HTMLButtonElement>('.style-btn')

// Upload
uploadArea.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) processImage(file)
})

// Drag & drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault()
  uploadArea.style.borderColor = '#ffd700'
})
uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = ''
})
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault()
  uploadArea.style.borderColor = ''
  const file = e.dataTransfer?.files[0]
  if (file?.type.startsWith('image/')) processImage(file)
})

// Style buttons
styleBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    styleBtns.forEach((b) => b.classList.remove('active'))
    btn.classList.add('active')
    currentStyle = btn.dataset.style as StyleName
    if (subjectImg) renderResult(subjectImg, currentStyle)
  })
})

// Download
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a')
  link.download = 'inspiration-animal.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
})

// Reset
resetBtn.addEventListener('click', () => {
  subjectBlob = null
  subjectImg = null
  fileInput.value = ''
  uploadArea.classList.remove('hidden')
  previewSection.classList.add('hidden')
  controls.classList.add('hidden')
})

async function processImage(file: File) {
  uploadArea.classList.add('hidden')
  previewSection.classList.remove('hidden')
  processing.classList.remove('hidden')
  controls.classList.add('hidden')

  try {
    processingText.textContent = '背景を除去中...（初回は少し時間がかかります）'

    subjectBlob = await removeBackground(file, {
      progress: (key: string, current: number, total: number) => {
        if (key === 'compute:inference') {
          const pct = Math.round((current / total) * 100)
          processingText.textContent = `処理中... ${pct}%`
        }
      },
    })

    const img = new Image()
    img.onload = () => {
      subjectImg = img
      renderResult(img, currentStyle)
      processing.classList.add('hidden')
      controls.classList.remove('hidden')
    }
    img.src = URL.createObjectURL(subjectBlob)
  } catch (err) {
    console.error(err)
    processingText.textContent = 'エラーが発生しました。もう一度お試しください。'
    setTimeout(() => {
      processing.classList.add('hidden')
      previewSection.classList.add('hidden')
      uploadArea.classList.remove('hidden')
    }, 2000)
  }
}

function renderResult(img: HTMLImageElement, style: StyleName) {
  const size = 1024
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cfg = STYLES[style]

  // Background gradient
  const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7)
  bgGrad.addColorStop(0, cfg.bg[1])
  bgGrad.addColorStop(1, cfg.bg[0])
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, size, size)

  // Radial rays
  drawRays(ctx, size, cfg)

  // Center glow
  const glowGrad = ctx.createRadialGradient(size / 2, size * 0.35, 0, size / 2, size * 0.35, size * 0.4)
  glowGrad.addColorStop(0, cfg.glow)
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, size, size)

  // Draw subject (animal) centered in lower portion
  const aspectRatio = img.width / img.height
  let drawW: number, drawH: number
  if (aspectRatio > 1) {
    drawW = size * 0.8
    drawH = drawW / aspectRatio
  } else {
    drawH = size * 0.7
    drawW = drawH * aspectRatio
  }
  const drawX = (size - drawW) / 2
  const drawY = size - drawH - size * 0.05
  ctx.drawImage(img, drawX, drawY, drawW, drawH)

  // Lightbulb above the animal
  drawLightbulb(ctx, size, cfg)

  // Sparkles
  drawSparkles(ctx, size, cfg)
}

function drawRays(ctx: CanvasRenderingContext2D, size: number, cfg: StyleConfig) {
  const cx = size / 2
  const cy = size * 0.3
  const numRays = 24
  const rayLength = size * 0.9

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = 0; i < numRays; i++) {
    const angle = (i / numRays) * Math.PI * 2
    const spread = Math.PI / numRays * 0.4
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(
      cx + Math.cos(angle - spread) * rayLength,
      cy + Math.sin(angle - spread) * rayLength
    )
    ctx.lineTo(
      cx + Math.cos(angle + spread) * rayLength,
      cy + Math.sin(angle + spread) * rayLength
    )
    ctx.closePath()
    ctx.fillStyle = cfg.rays
    ctx.fill()
  }
  ctx.restore()
}

function drawLightbulb(ctx: CanvasRenderingContext2D, size: number, cfg: StyleConfig) {
  const cx = size / 2
  const cy = size * 0.18
  const bulbRadius = size * 0.06

  // Glow behind bulb
  ctx.save()
  const bulbGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, bulbRadius * 4)
  bulbGlow.addColorStop(0, cfg.bulbGlow)
  bulbGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = bulbGlow
  ctx.fillRect(0, 0, size, size * 0.5)

  // Bulb glass
  ctx.beginPath()
  ctx.arc(cx, cy, bulbRadius, Math.PI, 0)
  ctx.quadraticCurveTo(cx + bulbRadius, cy + bulbRadius * 1.2, cx + bulbRadius * 0.4, cy + bulbRadius * 1.6)
  ctx.lineTo(cx - bulbRadius * 0.4, cy + bulbRadius * 1.6)
  ctx.quadraticCurveTo(cx - bulbRadius, cy + bulbRadius * 1.2, cx - bulbRadius, cy)
  ctx.closePath()

  const bulbFill = ctx.createRadialGradient(cx, cy - bulbRadius * 0.3, 0, cx, cy, bulbRadius * 1.2)
  bulbFill.addColorStop(0, '#fff')
  bulbFill.addColorStop(0.5, cfg.sparkle)
  bulbFill.addColorStop(1, cfg.sparkle + '88')
  ctx.fillStyle = bulbFill
  ctx.fill()

  // Bulb base
  const baseY = cy + bulbRadius * 1.6
  const baseW = bulbRadius * 0.35
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#888' : '#666'
    ctx.fillRect(cx - baseW, baseY + i * (bulbRadius * 0.2), baseW * 2, bulbRadius * 0.2)
  }

  ctx.restore()
}

function drawSparkles(ctx: CanvasRenderingContext2D, size: number, cfg: StyleConfig) {
  const sparklePositions = [
    { x: 0.25, y: 0.12, s: 0.7 },
    { x: 0.75, y: 0.1, s: 0.6 },
    { x: 0.15, y: 0.3, s: 0.5 },
    { x: 0.85, y: 0.25, s: 0.8 },
    { x: 0.3, y: 0.05, s: 0.4 },
    { x: 0.7, y: 0.35, s: 0.5 },
    { x: 0.55, y: 0.08, s: 0.3 },
    { x: 0.4, y: 0.32, s: 0.6 },
  ]

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (const pos of sparklePositions) {
    drawStar(ctx, pos.x * size, pos.y * size, pos.s * size * 0.03, cfg.sparkle)
  }
  ctx.restore()
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save()
  ctx.translate(x, y)

  // 4-pointed star
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2
    const outerX = Math.cos(angle) * r * 2.5
    const outerY = Math.sin(angle) * r * 2.5
    const midAngle1 = ((i - 0.5) / 4) * Math.PI * 2 - Math.PI / 2
    const innerX1 = Math.cos(midAngle1) * r * 0.5
    const innerY1 = Math.sin(midAngle1) * r * 0.5
    const midAngle2 = ((i + 0.5) / 4) * Math.PI * 2 - Math.PI / 2
    const innerX2 = Math.cos(midAngle2) * r * 0.5
    const innerY2 = Math.sin(midAngle2) * r * 0.5

    if (i === 0) ctx.moveTo(innerX1, innerY1)
    ctx.lineTo(outerX, outerY)
    ctx.lineTo(innerX2, innerY2)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()

  // Inner glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  glow.addColorStop(0, '#fff')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
