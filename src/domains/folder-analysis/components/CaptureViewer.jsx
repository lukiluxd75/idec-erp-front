import { ImageOff, Maximize2, RotateCcw, RotateCw, Scan, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useCaptureUrl } from '@/domains/folder-analysis/utils/captureImages'
import { IconButton, Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

const ZOOM_MIN = 1 // "100 %" is the photo fitted to the frame
const ZOOM_MAX = 8
const ZOOM_STEP = 1.35
const HD_FROM = 1.15

const rotations = new Map()

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function CaptureViewer({ captureId, alt = 'Foto', className = '', onExpand, folderId = null }) {
  const stageRef = useRef(null)
  const [zoom, setZoom] = useState(ZOOM_MIN)
  const [rotation, setRotation] = useState(() => rotations.get(captureId) || 0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [natural, setNatural] = useState(null)
  const [stage, setStage] = useState({ width: 0, height: 0 })
  const [dragging, setDragging] = useState(false)
  // The original is only asked for once the zoom goes past the preview's pixels.
  const [wantsHd, setWantsHd] = useState(false)

  const preview = useCaptureUrl(captureId, 'preview', folderId)
  const hd = useCaptureUrl(wantsHd ? captureId : null, 'original', folderId)
  const fallback = useCaptureUrl(preview.failed ? captureId : null, 'original', folderId)
  const url = hd.url || preview.url || fallback.url

  useLayoutEffect(() => {
    const element = stageRef.current
    if (!element) return undefined
    const measure = () => setStage({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const turned = rotation % 180 !== 0
  const shownWidth = natural ? (turned ? natural.height : natural.width) : 0
  const shownHeight = natural ? (turned ? natural.width : natural.height) : 0
  // How much the photo has to shrink to fit the frame; a small photo is left at its own size instead of being blown up.
  const fit =
    natural && stage.width && stage.height
      ? Math.min(1, stage.width / shownWidth, stage.height / shownHeight)
      : 1
  const drawn = fit * zoom

  /** Dragging may not pull the photo out of the frame. */
  const contain = useCallback(
    (point) => {
      const overflowX = Math.max(0, (shownWidth * drawn - stage.width) / 2)
      const overflowY = Math.max(0, (shownHeight * drawn - stage.height) / 2)
      return { x: clamp(point.x, -overflowX, overflowX), y: clamp(point.y, -overflowY, overflowY) }
    },
    [shownWidth, shownHeight, drawn, stage.width, stage.height]
  )

  const view = contain(offset)

  /** Zooms keeping whatever is under `point` (frame coordinates) in place. */
  const zoomTo = useCallback(
    (next, point = null) => {
      const target = clamp(next, ZOOM_MIN, ZOOM_MAX)
      if (target === zoom) return
      if (fit * target > HD_FROM) setWantsHd(true)
      setZoom(target)
      if (point) {
        const ratio = target / zoom
        setOffset((o) => ({ x: point.x - (point.x - o.x) * ratio, y: point.y - (point.y - o.y) * ratio }))
      }
    },
    [zoom, fit]
  )

  const fitAgain = () => {
    setZoom(ZOOM_MIN)
    setOffset({ x: 0, y: 0 })
  }

  const turn = (degrees) => {
    const next = (rotation + degrees + 360) % 360
    rotations.set(captureId, next)
    setRotation(next)
    setOffset({ x: 0, y: 0 })
  }

  // React listens for wheel passively, so the zoom needs its own listener or the page would scroll behind the photo.
  useEffect(() => {
    const element = stageRef.current
    if (!element) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      const point = {
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
      }
      zoomTo(zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), point)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoom, zoomTo])

  const startDrag = (event) => {
    if (event.button !== 0) return
    const from = { x: event.clientX, y: event.clientY }
    const start = view
    setDragging(true)
    const move = (e) => setOffset(contain({ x: start.x + (e.clientX - from.x), y: start.y + (e.clientY - from.y) }))
    const stop = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const canPan = shownWidth * drawn > stage.width + 1 || shownHeight * drawn > stage.height + 1

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-2', className)}>
      <div className="flex items-center gap-1.5">
        <IconButton
          icon={ZoomOut}
          size={14}
          className="p-1"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => zoomTo(zoom / ZOOM_STEP)}
          title="Alejar"
        />
        <button
          type="button"
          onClick={fitAgain}
          title="Ajustar al recuadro"
          className="w-12 text-center text-[10px] font-black tabular-nums text-slate-400 transition-colors hover:text-slate-700"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton
          icon={ZoomIn}
          size={14}
          className="p-1"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => zoomTo(zoom * ZOOM_STEP)}
          title="Acercar"
        />
        <span className="mx-1 h-4 w-px bg-slate-200" />
        <IconButton icon={RotateCcw} size={14} className="p-1" onClick={() => turn(-90)} title="Girar a la izquierda" />
        <IconButton icon={RotateCw} size={14} className="p-1" onClick={() => turn(90)} title="Girar a la derecha" />
        {zoom > ZOOM_MIN && (
          <IconButton icon={Scan} size={14} className="p-1" onClick={fitAgain} title="Ajustar al recuadro" />
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {wantsHd && hd.loading && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <Spinner className="h-3 w-3" /> Cargando detalle…
            </span>
          )}
          {onExpand && (
            <IconButton icon={Maximize2} size={14} className="p-1" onClick={onExpand} title="Ver en grande" />
          )}
        </span>
      </div>

      <div
        ref={stageRef}
        onPointerDown={canPan ? startDrag : undefined}
        onDoubleClick={() => (zoom > ZOOM_MIN ? fitAgain() : zoomTo(2.5))}
        className={cn(
          'relative min-h-[320px] flex-1 select-none overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/70',
          canPan ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        )}
        style={{ touchAction: 'none' }}
      >
        {(preview.failed || fallback.failed) && !url ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <ImageOff className="h-6 w-6" />
            No se pudo cargar la foto.
          </div>
        ) : !url ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <img
            src={url}
            alt={alt}
            draggable={false}
            onLoad={(event) => {
              // Read here and not inside the updater: React has already let go of the event by the time the updater runs.
              const size = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight }
              if (!size.width || !size.height) return
              // The box keeps the size of the copy that opened the viewer, so the original swapping in only makes it sharper.
              setNatural((current) => current || size)
            }}
            className="absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: natural ? `${natural.width}px` : 'auto',
              height: natural ? `${natural.height}px` : 'auto',
              visibility: natural ? 'visible' : 'hidden',
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${drawn}) rotate(${rotation}deg)`,
              transition: dragging ? 'none' : 'transform 180ms ease-out',
            }}
          />
        )}
      </div>
    </div>
  )
}
