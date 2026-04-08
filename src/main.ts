import './style.css'
import { removeBackground } from '@imgly/background-removal'

let subjectImg: HTMLImageElement | null = null
let bgImg: HTMLImageElement | null = null

// Subject position & scale (normalized 0-1)
let subjectX = 0.5
let subjectY = 0.7
let subjectScale = 0.7
let subjectRotation = 0 // degrees
let subjectFlipped = false

const canvas = document.getElementById('result-canvas') as HTMLCanvasElement
const uploadArea = document.getElementById('upload-area')!
const fileInput = document.getElementById('file-input') as HTMLInputElement
const previewSection = document.getElementById('preview-section')!
const processing = document.getElementById('processing')!
const processingText = document.getElementById('processing-text')!
const controls = document.getElementById('controls')!
const downloadBtn = document.getElementById('download-btn')!
const shareBtn = document.getElementById('share-btn')!
const resetBtn = document.getElementById('reset-btn')!
const tweetBtn = document.getElementById('tweet-btn')!
const flipBtn = document.getElementById('flip-btn')!
const sampleSection = document.getElementById('sample-section')!
const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement
const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement
const hintText = document.getElementById('hint-text')!

// Set device-appropriate hint text
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
hintText.textContent = isTouchDevice
  ? 'スライドで位置調整・ピンチでサイズ変更'
  : 'ドラッグで動物の位置を調整'

// Preload background image (WebP with PNG fallback)
function loadBgImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      const fallback = new Image()
      fallback.onload = () => resolve(fallback)
      fallback.onerror = reject
      fallback.src = '/bg.png'
    }
    img.src = '/bg.webp'
  })
}

loadBgImage().then((img) => {
  bgImg = img
})

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

// --- RAF throttling ---
let renderScheduled = false
function scheduleRender() {
  if (renderScheduled) return
  renderScheduled = true
  requestAnimationFrame(() => {
    renderScheduled = false
    if (subjectImg) renderResult(subjectImg)
  })
}

// --- Canvas size tracking (set once, clear with clearRect) ---
let canvasSized = false

// Dragging subject on canvas
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartSubjectX = 0
let dragStartSubjectY = 0

function getCanvasPos(e: MouseEvent | Touch) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  }
}

canvas.addEventListener('mousedown', (e) => {
  isDragging = true
  const pos = getCanvasPos(e)
  dragStartX = pos.x
  dragStartY = pos.y
  dragStartSubjectX = subjectX
  dragStartSubjectY = subjectY
  canvas.style.cursor = 'grabbing'
})

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return
  const pos = getCanvasPos(e)
  subjectX = dragStartSubjectX + (pos.x - dragStartX)
  subjectY = dragStartSubjectY + (pos.y - dragStartY)
  scheduleRender()
})

window.addEventListener('mouseup', () => {
  isDragging = false
  canvas.style.cursor = 'grab'
})

// --- Touch: single-finger drag + pinch zoom/rotate ---
let lastPinchDist = 0
let lastPinchAngle = 0
let isPinching = false

function getTouchDistance(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchAngle(t1: Touch, t2: Touch) {
  return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI)
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  if (e.touches.length === 2) {
    // Pinch start
    isPinching = true
    isDragging = false
    lastPinchDist = getTouchDistance(e.touches[0], e.touches[1])
    lastPinchAngle = getTouchAngle(e.touches[0], e.touches[1])
  } else if (e.touches.length === 1) {
    isDragging = true
    isPinching = false
    const pos = getCanvasPos(e.touches[0])
    dragStartX = pos.x
    dragStartY = pos.y
    dragStartSubjectX = subjectX
    dragStartSubjectY = subjectY
  }
}, { passive: false })

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault()
  if (isPinching && e.touches.length === 2) {
    // Pinch zoom
    const dist = getTouchDistance(e.touches[0], e.touches[1])
    const scaleDelta = dist / lastPinchDist
    subjectScale = Math.max(0.05, Math.min(3, subjectScale * scaleDelta))
    scaleSlider.value = String(subjectScale)
    lastPinchDist = dist

    // Pinch rotate
    const angle = getTouchAngle(e.touches[0], e.touches[1])
    const angleDelta = angle - lastPinchAngle
    subjectRotation = ((subjectRotation + angleDelta + 180) % 360) - 180
    rotationSlider.value = String(Math.round(subjectRotation))
    lastPinchAngle = angle

    scheduleRender()
  } else if (isDragging && e.touches.length === 1) {
    const pos = getCanvasPos(e.touches[0])
    subjectX = dragStartSubjectX + (pos.x - dragStartX)
    subjectY = dragStartSubjectY + (pos.y - dragStartY)
    scheduleRender()
  }
}, { passive: false })

canvas.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) isPinching = false
  if (e.touches.length === 0) isDragging = false
})

// Scale slider
scaleSlider.addEventListener('input', () => {
  subjectScale = parseFloat(scaleSlider.value)
  scheduleRender()
})

// Rotation slider
rotationSlider.addEventListener('input', () => {
  subjectRotation = parseFloat(rotationSlider.value)
  scheduleRender()
})

// Flip button
flipBtn.addEventListener('click', () => {
  subjectFlipped = !subjectFlipped
  scheduleRender()
})

// Download (save)
downloadBtn.addEventListener('click', async () => {
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png')
    })

    if (isTouchDevice) {
      // Mobile: Web Share API for save (allows "Save to Files", AirDrop, etc.)
      const file = new File([blob], 'InspirationCat.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'InspirationCat' })
        return
      }
    }

    // Desktop / fallback: download via link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'InspirationCat.png'
    link.href = url
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err)
    }
  }
})

// Share
shareBtn.addEventListener('click', async () => {
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png')
    })

    if (isTouchDevice) {
      // Mobile: Web Share API for sharing to LINE, Instagram, etc.
      const file = new File([blob], 'InspirationCat.png', { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'InspirationCat',
          text: '閃いた！ #InspirationCat',
        })
        return
      }
    }

    // Desktop / fallback: copy to clipboard
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      showToast('クリップボードにコピーしました')
    } catch {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'InspirationCat.png'
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      showToast('画像をダウンロードしました')
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err)
    }
  }
})

// Tweet to X
tweetBtn.addEventListener('click', () => {
  const text = encodeURIComponent('閃いた！💡\n\n#InspirationCat')
  const url = encodeURIComponent('https://inspiration-cat.pages.dev')
  window.open(
    `https://x.com/intent/post?text=${text}&url=${url}`,
    '_blank'
  )
})

function showToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 300)
  }, 2000)
}

// Reset
resetBtn.addEventListener('click', () => {
  if (!confirm('やり直しますか？')) return
  subjectImg = null
  subjectX = 0.5
  subjectY = 0.7
  subjectScale = 0.7
  subjectRotation = 0
  subjectFlipped = false
  scaleSlider.value = '0.7'
  rotationSlider.value = '0'
  fileInput.value = ''
  canvasSized = false
  sampleSection.classList.remove('hidden')
  uploadArea.classList.remove('hidden')
  previewSection.classList.add('hidden')
  controls.classList.add('hidden')
})

// Resize image before processing to avoid memory issues on mobile
function resizeImageFile(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) {
        // Already small enough
        resolve(file)
        return
      }
      const scale = maxDim / Math.max(img.width, img.height)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      c.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Resize failed'))),
        'image/png'
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function isMemoryError(err: unknown): boolean {
  const message = (err as Error)?.message || ''
  return message.includes('memory') || message.includes('alloc')
}

async function processImage(file: File) {
  sampleSection.classList.add('hidden')
  uploadArea.classList.add('hidden')
  previewSection.classList.remove('hidden')
  processing.classList.remove('hidden')
  controls.classList.add('hidden')

  try {
    if (!bgImg) {
      bgImg = await loadBgImage()
    }

    const sizes = [1024, 768, 512]
    let blob: Blob | null = null

    for (let i = 0; i < sizes.length; i++) {
      try {
        processingText.textContent = '画像を準備中...'
        const resized = await resizeImageFile(file, sizes[i])

        processingText.textContent = i === 0
          ? '背景を除去中...（初回は少し時間がかかります）'
          : `画像を縮小して再処理中...（${sizes[i]}px）`

        blob = await removeBackground(resized, {
          progress: (key: string, current: number, total: number) => {
            if (key === 'compute:inference') {
              const pct = Math.round((current / total) * 100)
              processingText.textContent = `処理中... ${pct}%`
            }
          },
        })
        break
      } catch (err) {
        if (isMemoryError(err) && i < sizes.length - 1) {
          console.warn(`Memory error at ${sizes[i]}px, retrying at ${sizes[i + 1]}px`)
          continue
        }
        throw err
      }
    }

    const img = new Image()
    img.onload = () => {
      subjectImg = img
      subjectX = 0.5
      subjectY = 0.7
      subjectScale = 0.7
      subjectRotation = 0
      subjectFlipped = false
      scaleSlider.value = '0.7'
      rotationSlider.value = '0'
      canvasSized = false
      renderResult(img)
      processing.classList.add('hidden')
      controls.classList.remove('hidden')
      canvas.style.cursor = 'grab'
    }
    img.src = URL.createObjectURL(blob!)
  } catch (err) {
    console.error(err)
    const message = (err as Error)?.message || ''
    if (message.includes('memory') || message.includes('alloc')) {
      processingText.textContent = 'メモリ不足で処理できませんでした。ブラウザのタブを閉じてから再度お試しください。'
    } else if (message.includes('network') || message.includes('fetch')) {
      processingText.textContent = 'ネットワークエラーです。接続を確認してください。'
    } else {
      processingText.textContent = 'エラーが発生しました。もう一度お試しください。'
    }
    setTimeout(() => {
      processing.classList.add('hidden')
      previewSection.classList.add('hidden')
      sampleSection.classList.remove('hidden')
      uploadArea.classList.remove('hidden')
    }, 2500)
  }
}

function renderResult(img: HTMLImageElement) {
  if (!bgImg) return
  const ctx = canvas.getContext('2d')!

  // Set canvas size only once per image session
  if (!canvasSized) {
    canvas.width = bgImg.width
    canvas.height = bgImg.height
    canvasSized = true
  }

  // Clear and draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bgImg, 0, 0)

  // Draw subject
  const aspectRatio = img.width / img.height
  const maxDim = Math.min(canvas.width, canvas.height) * subjectScale
  let drawW: number, drawH: number
  if (aspectRatio > 1) {
    drawW = maxDim
    drawH = maxDim / aspectRatio
  } else {
    drawH = maxDim
    drawW = maxDim * aspectRatio
  }
  const centerX = subjectX * canvas.width
  const centerY = subjectY * canvas.height
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate((subjectRotation * Math.PI) / 180)
  if (subjectFlipped) ctx.scale(-1, 1)
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
}
