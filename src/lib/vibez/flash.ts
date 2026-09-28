// "Night flash": the look of a disposable camera fired in a dark room. Runs on a canvas in the browser.

export type Shot = { canvas: HTMLCanvasElement; blob: Blob }

const MAX_EDGE = 1600

function stampText(date = new Date()) {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `'${yy} ${mm} ${dd}`
}

/** Draw a source (video frame or image) into a canvas, capped at MAX_EDGE, optionally mirrored. */
export function drawSource(source: CanvasImageSource, width: number, height: number, mirror = false) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(source, 0, 0, w, h)
  return canvas
}

/** Apply the night-flash grade in place. */
export function nightFlash(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!
  const { width: w, height: h } = canvas

  // 1. Soft bloom: a blurred copy screened on top so highlights glow
  const bloom = document.createElement("canvas")
  bloom.width = w
  bloom.height = h
  const b = bloom.getContext("2d")!
  b.filter = `blur(${Math.round(Math.max(w, h) / 90)}px) brightness(1.2)`
  b.drawImage(canvas, 0, 0)
  ctx.globalAlpha = 0.35
  ctx.globalCompositeOperation = "screen"
  ctx.drawImage(bloom, 0, 0)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = "source-over"

  // 2. Per-pixel grade: lift exposure, punch contrast, warm the whites, add grain
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const cx = w / 2, cy = h * 0.45
  const maxR = Math.hypot(w, h) / 2
  for (let i = 0; i < d.length; i += 4) {
    const p = i / 4
    const x = p % w, y = (p - x) / w
    const r = Math.hypot(x - cx, y - cy) / maxR // 0 centre → ~1 corners
    const flash = 1.45 - r * 0.85 // the flash falls off towards the edges
    const vignette = 1 - Math.max(0, r - 0.55) * 1.1
    const grain = (Math.random() - 0.5) * 22
    for (let c = 0; c < 3; c++) {
      let v = d[i + c] / 255
      v = Math.pow(v, 0.82) * flash // exposure + flash hotspot
      v = (v - 0.5) * 1.18 + 0.5 // contrast
      d[i + c] = v * 255 * vignette + grain
    }
    d[i] += 10 // warm
    d[i + 2] -= 8
  }
  ctx.putImageData(img, 0, 0)

  // 3. Date stamp, bottom right, like the orange LED on a disposable camera
  const size = Math.round(Math.max(w, h) / 32)
  ctx.font = `bold ${size}px ui-monospace, "SF Mono", Menlo, monospace`
  ctx.textAlign = "right"
  ctx.textBaseline = "bottom"
  ctx.shadowColor = "rgba(255,120,20,0.9)"
  ctx.shadowBlur = size / 2
  ctx.fillStyle = "#ff9d2e"
  ctx.fillText(stampText(), w - size, h - size * 0.8)
  ctx.shadowBlur = 0
  return canvas
}

export function toJpeg(canvas: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode photo"))), "image/jpeg", quality)
  )
}
