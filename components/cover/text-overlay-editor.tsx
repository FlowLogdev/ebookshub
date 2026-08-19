"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface OverlayText {
  id: string
  text: string
  x: number // 0-1, relative to image width
  y: number // 0-1, relative to image height
  fontSize: number // relative to image width (e.g. 0.08 = 8% of width)
  color: string
  fontFamily: string
}

const FONT_CHOICES = [
  { label: "Display serif", value: "Georgia, serif" },
  { label: "Display sans", value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Condensed", value: "'Arial Narrow', sans-serif" },
]

const DISPLAY_WIDTH = 420

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

export function TextOverlayEditor({
  imageUrl,
  initialOverlays,
  onSave,
  onCancel,
  saving,
}: {
  imageUrl: string
  initialOverlays: OverlayText[]
  onSave: (overlays: OverlayText[], renderedDataUrl: string) => void
  onCancel: () => void
  saving: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [overlays, setOverlays] = useState<OverlayText[]>(initialOverlays)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [displayHeight, setDisplayHeight] = useState(DISPLAY_WIDTH * 1.5)
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  const selected = overlays.find((o) => o.id === selectedId) ?? null

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    for (const overlay of overlays) {
      const fontPx = overlay.fontSize * canvas.width
      ctx.font = `600 ${fontPx}px ${overlay.fontFamily}`
      ctx.fillStyle = overlay.color
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.shadowColor = "rgba(0,0,0,0.35)"
      ctx.shadowBlur = fontPx * 0.15
      ctx.fillText(overlay.text, overlay.x * canvas.width, overlay.y * canvas.height)
      ctx.shadowBlur = 0

      if (overlay.id === selectedId) {
        const metrics = ctx.measureText(overlay.text)
        const w = metrics.width + fontPx * 0.4
        const h = fontPx * 1.3
        ctx.strokeStyle = "#d4a94a"
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.strokeRect(overlay.x * canvas.width - w / 2, overlay.y * canvas.height - h / 2, w, h)
        ctx.setLineDash([])
      }
    }
  }, [overlays, selectedId])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
      const ratio = img.naturalHeight / img.naturalWidth
      setDisplayHeight(DISPLAY_WIDTH * ratio)
    }
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    draw()
  }, [draw, displayHeight])

  function hitTest(px: number, py: number): OverlayText | null {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return null
    for (let i = overlays.length - 1; i >= 0; i--) {
      const overlay = overlays[i]
      const fontPx = overlay.fontSize * canvas.width
      ctx.font = `600 ${fontPx}px ${overlay.fontFamily}`
      const metrics = ctx.measureText(overlay.text)
      const w = metrics.width + fontPx * 0.4
      const h = fontPx * 1.3
      const cx = overlay.x * canvas.width
      const cy = overlay.y * canvas.height
      if (Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= h / 2) return overlay
    }
    return null
  }

  function toCanvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = toCanvasCoords(e)
    const hit = hitTest(x, y)
    setSelectedId(hit?.id ?? null)
    if (hit) {
      const canvas = canvasRef.current!
      dragState.current = { id: hit.id, offsetX: x - hit.x * canvas.width, offsetY: y - hit.y * canvas.height }
      canvas.setPointerCapture(e.pointerId)
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragState.current) return
    const canvas = canvasRef.current!
    const { x, y } = toCanvasCoords(e)
    const nx = (x - dragState.current.offsetX) / canvas.width
    const ny = (y - dragState.current.offsetY) / canvas.height
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === dragState.current!.id
          ? { ...o, x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) }
          : o,
      ),
    )
  }

  function handlePointerUp() {
    dragState.current = null
  }

  function addText() {
    const overlay: OverlayText = {
      id: makeId(),
      text: "Your Title",
      x: 0.5,
      y: 0.5,
      fontSize: 0.08,
      color: "#ffffff",
      fontFamily: FONT_CHOICES[0].value,
    }
    setOverlays((prev) => [...prev, overlay])
    setSelectedId(overlay.id)
  }

  function updateSelected(patch: Partial<OverlayText>) {
    if (!selectedId) return
    setOverlays((prev) => prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o)))
  }

  function removeSelected() {
    if (!selectedId) return
    setOverlays((prev) => prev.filter((o) => o.id !== selectedId))
    setSelectedId(null)
  }

  function save() {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    // Render at the source image's native resolution so the saved cover isn't blurry.
    const full = document.createElement("canvas")
    full.width = img.naturalWidth
    full.height = img.naturalHeight
    const ctx = full.getContext("2d")
    if (!ctx) return
    ctx.drawImage(img, 0, 0, full.width, full.height)
    for (const overlay of overlays) {
      const fontPx = overlay.fontSize * full.width
      ctx.font = `600 ${fontPx}px ${overlay.fontFamily}`
      ctx.fillStyle = overlay.color
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.shadowColor = "rgba(0,0,0,0.35)"
      ctx.shadowBlur = fontPx * 0.15
      ctx.fillText(overlay.text, overlay.x * full.width, overlay.y * full.height)
    }
    onSave(overlays, full.toDataURL("image/png"))
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
      <canvas
        ref={canvasRef}
        width={DISPLAY_WIDTH}
        height={displayHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="cursor-move touch-none rounded-md border shadow-sm"
        style={{ width: DISPLAY_WIDTH, height: displayHeight }}
      />

      <div className="flex min-w-[240px] flex-col gap-4">
        <Button size="sm" variant="outline" onClick={addText}>
          <Plus className="h-3.5 w-3.5" /> Add text
        </Button>

        {selected ? (
          <div className="space-y-3 rounded-lg border bg-card p-3">
            <Input value={selected.text} onChange={(e) => updateSelected({ text: e.target.value })} placeholder="Text" />
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">Size</span>
              <input
                type="range"
                min={3}
                max={18}
                step={0.5}
                value={selected.fontSize * 100}
                onChange={(e) => updateSelected({ fontSize: Number(e.target.value) / 100 })}
                className="flex-1 accent-gold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">Color</span>
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updateSelected({ color: e.target.value })}
                className="h-8 w-14 cursor-pointer rounded border"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-16 text-xs text-muted-foreground">Font</span>
              <select
                value={selected.fontFamily}
                onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                className="h-8 flex-1 rounded-md border bg-background px-2 text-sm"
              >
                {FONT_CHOICES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={removeSelected}>
              <Trash2 className="h-3.5 w-3.5" /> Remove text
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Click a text layer to edit it, or add a new one. Drag text directly on the cover to reposition it.</p>
        )}

        <div className="mt-auto flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button variant="gold" className="flex-1" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save as new cover
          </Button>
        </div>
      </div>
    </div>
  )
}
