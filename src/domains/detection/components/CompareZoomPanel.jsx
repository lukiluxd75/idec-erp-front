import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/shared/ui'
import { MousePointerClick } from 'lucide-react'

function expandBbox(bbox, imgW, imgH, padRatio = 0.55, minPad = 48) {
  let [x0, y0, x1, y1] = bbox.map(Number)
  if (!(x1 > x0 && y1 > y0)) {
    const side = Math.min(imgW, imgH, 256)
    return [0, 0, side, side]
  }
  const bw = x1 - x0
  const bh = y1 - y0
  const padX = Math.max(minPad, bw * padRatio)
  const padY = Math.max(minPad, bh * padRatio)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  let side = Math.max(bw + 2 * padX, bh + 2 * padY, 64)
  side = Math.min(side, imgW, imgH)
  let rx0 = Math.round(cx - side / 2)
  let ry0 = Math.round(cy - side / 2)
  rx0 = Math.max(0, Math.min(imgW - side, rx0))
  ry0 = Math.max(0, Math.min(imgH - side, ry0))
  return [rx0, ry0, rx0 + side, ry0 + side]
}

function drawZoomPane(canvas, img, detBbox, cropBox, labelColor) {
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')
  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height
  let [cx0, cy0, cx1, cy1] = cropBox.map(Number)
  cx0 = Math.max(0, Math.min(imgW - 1, cx0))
  cy0 = Math.max(0, Math.min(imgH - 1, cy0))
  cx1 = Math.max(cx0 + 1, Math.min(imgW, cx1))
  cy1 = Math.max(cy0 + 1, Math.min(imgH, cy1))
  const cw = cx1 - cx0
  const ch = cy1 - cy0
  const out = 512
  canvas.width = out
  canvas.height = out
  ctx.fillStyle = '#0a0d12'
  ctx.fillRect(0, 0, out, out)
  ctx.imageSmoothingEnabled = true
  const scale = Math.min(out / cw, out / ch)
  const dw = cw * scale
  const dh = ch * scale
  const ox = (out - dw) / 2
  const oy = (out - dh) / 2
  ctx.drawImage(img, cx0, cy0, cw, ch, ox, oy, dw, dh)
  ctx.strokeStyle = labelColor || '#efbe00'
  ctx.lineWidth = 3
  const [dx0, dy0, dx1, dy1] = detBbox.map(Number)
  if (dx1 > dx0 && dy1 > dy0) {
    ctx.strokeRect(ox + (dx0 - cx0) * scale, oy + (dy0 - cy0) * scale, (dx1 - dx0) * scale, (dy1 - dy0) * scale)
    ctx.fillStyle = 'rgba(10,13,18,.72)'
    ctx.fillRect(8, 8, 148, 24)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 12px Poppins, sans-serif'
    ctx.fillText('Cambio detectado', 14, 24)
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = url
  })
}

/** Architect validation: zoom year A | year B around a detection bbox. */
export default function CompareZoomPanel({ row, yearA, yearB, imageUrlA, imageUrlB }) {
  const canvasA = useRef(null)
  const canvasB = useRef(null)
  const [mode, setMode] = useState('zoom') // zoom | full

  useEffect(() => {
    let cancelled = false
    async function paint() {
      if (!row || !imageUrlA || !imageUrlB) return
      const bbox = row.bbox_px || row.bbox
      try {
        const [imgA, imgB] = await Promise.all([loadImage(imageUrlA), loadImage(imageUrlB)])
        if (cancelled) return
        const w = Math.min(imgA.naturalWidth || imgA.width, imgB.naturalWidth || imgB.width)
        const h = Math.min(imgA.naturalHeight || imgA.height, imgB.naturalHeight || imgB.height)
        const color =
          row.tipo === 'nueva' || row.tipo_cambio === 'nueva'
            ? '#72ae17'
            : row.tipo === 'eliminada' || row.tipo_cambio === 'eliminada'
              ? '#d60035'
              : '#efbe00'
        const useFull = mode === 'full' || !bbox || bbox.length < 4
        const crop = useFull ? [0, 0, w, h] : expandBbox(bbox, w, h)
        const det = bbox && bbox.length >= 4 ? bbox : [0, 0, 1, 1]
        drawZoomPane(canvasA.current, imgA, useFull ? [0, 0, 0, 0] : det, crop, color)
        drawZoomPane(canvasB.current, imgB, useFull ? [0, 0, 0, 0] : det, crop, color)
      } catch {
        /* ignore paint errors */
      }
    }
    paint()
    return () => {
      cancelled = true
    }
  }, [row, imageUrlA, imageUrlB, mode])

  if (!row) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10">
        <EmptyState
          icon={MousePointerClick}
          title="Sin fila seleccionada"
          subtitle="Seleccione un hallazgo del reporte para comparar el año A y el año B."
        />
      </div>
    )
  }

  if (!imageUrlA || !imageUrlB) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10">
        <EmptyState
          title="Ortofotos no disponibles"
          subtitle="Abra la pestaña «Chequeo A|B» para ver el tablero y el resultado completo."
        />
      </div>
    )
  }

  const tipo = row.tipo || row.tipo_cambio || '—'
  const bbox = row.bbox_px || row.bbox

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
        <span className="font-bold uppercase tracking-wide text-slate-900">{String(tipo)}</span>
        {row.prob_pct != null && (
          <span className="font-semibold tabular-nums text-slate-900">{row.prob_pct}%</span>
        )}
        <span className="font-medium text-slate-900">{row.codigo_catastral || 'Sin código'}</span>
        {!bbox && <span className="text-amber-700">Sin recorte · vista completa</span>}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setMode('zoom')}
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${mode === 'zoom' ? 'bg-brand-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}
          >
            Zoom
          </button>
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`rounded px-2 py-0.5 text-[10px] font-bold ${mode === 'full' ? 'bg-brand-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}
          >
            Completo
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-graphite-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white">
            <span>A · referencia</span>
            <span className="text-accent-300">{yearA || '—'}</span>
          </div>
          <canvas ref={canvasA} className="mx-auto block w-full" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-graphite-950">
          <div className="flex items-center justify-between border-b border-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white">
            <span>B · comparación</span>
            <span className="text-accent-300">{yearB || '—'}</span>
          </div>
          <canvas ref={canvasB} className="mx-auto block w-full" />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Compare A (antes) con B (después) en la misma zona. Si no ve diferencia clara, revise también
        la pestaña «Chequeo A|B» → Detecciones.
      </p>
    </div>
  )
}
