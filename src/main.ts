import './style.css'
import { removeBackground } from '@imgly/background-removal'

let subjectImg: HTMLImageElement | null = null
let bgImg: HTMLImageElement | null = null

// Subject position & scale (normalized 0-1)
let subjectX = 0.5
let subjectY = 0.7
let subjectScale = 0.7
let subjectRotation = 0 // degrees

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
const sampleSection = document.getElementById('sample-section')!
const scaleSlider = document.getElementById('scale-slider') as HTMLInputElement
const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement

// Preload background image
function loadBgImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = '/bg.png'
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
  if (subjectImg) renderResult(subjectImg)
})

window.addEventListener('mouseup', () => {
  isDragging = false
  canvas.style.cursor = 'grab'
})

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  isDragging = true
  const pos = getCanvasPos(e.touches[0])
  dragStartX = pos.x
  dragStartY = pos.y
  dragStartSubjectX = subjectX
  dragStartSubjectY = subjectY
}, { passive: false })

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault()
  if (!isDragging) return
  const pos = getCanvasPos(e.touches[0])
  subjectX = dragStartSubjectX + (pos.x - dragStartX)
  subjectY = dragStartSubjectY + (pos.y - dragStartY)
  if (subjectImg) renderResult(subjectImg)
}, { passive: false })

canvas.addEventListener('touchend', () => {
  isDragging = false
})

// Scale slider
scaleSlider.addEventListener('input', () => {
  subjectScale = parseFloat(scaleSlider.value)
  if (subjectImg) renderResult(subjectImg)
})

// Rotation slider
rotationSlider.addEventListener('input', () => {
  subjectRotation = parseFloat(rotationSlider.value)
  if (subjectImg) renderResult(subjectImg)
})

// Download
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a')
  link.download = 'inspiration-animal.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
})

// Share
shareBtn.addEventListener('click', async () => {
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png')
    })
    const file = new File([blob], 'inspiration-animal.png', { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'InspirationCat',
        text: '閃いた！',
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      showToast('クリップボードにコピーしました')
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error(err)
    }
  }
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
  subjectImg = null
  subjectX = 0.5
  subjectY = 0.7
  subjectScale = 0.7
  subjectRotation = 0
  scaleSlider.value = '0.7'
  rotationSlider.value = '0'
  fileInput.value = ''
  sampleSection.classList.remove('hidden')
  uploadArea.classList.remove('hidden')
  previewSection.classList.add('hidden')
  controls.classList.add('hidden')
})

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

    processingText.textContent = '背景を除去中...（初回は少し時間がかかります）'

    const blob = await removeBackground(file, {
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
      subjectX = 0.5
      subjectY = 0.7
      subjectScale = 0.7
      subjectRotation = 0
      scaleSlider.value = '0.7'
      rotationSlider.value = '0'
      renderResult(img)
      processing.classList.add('hidden')
      controls.classList.remove('hidden')
      canvas.style.cursor = 'grab'
    }
    img.src = URL.createObjectURL(blob)
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

function renderResult(img: HTMLImageElement) {
  if (!bgImg) return
  // Use background image's native size
  canvas.width = bgImg.width
  canvas.height = bgImg.height
  const ctx = canvas.getContext('2d')!

  // Draw background image as-is (no cropping)
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
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
}
