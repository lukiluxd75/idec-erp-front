import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers2, SplitSquareHorizontal, SquareStack, Eye } from 'lucide-react'
import { Badge, EmptyState } from '@/shared/ui'

const MODES = [
  {
    id: 'tablero',
    label: 'Tablero A|B',
    icon: Layers2,
    tip: 'Cuadros alternos A y B. Si calles o techos no calzan, la alineación es débil.',
  },
  {
    id: 'lado',
    label: 'Lado a lado',
    icon: SplitSquareHorizontal,
    tip: 'Misma escena: año A a la izquierda y año B a la derecha.',
  },
  {
    id: 'superpuesto',
    label: 'Superpuesto',
    icon: SquareStack,
    tip: 'Deslice para revelar A sobre B. Útil para ver desfase o coincidencia.',
  },
  {
    id: 'resultado',
    label: 'Detecciones',
    icon: Eye,
    tip: 'Resultado con cajas: verde = nueva, rojo = eliminada, amarillo = cambio.',
  },
]

/**
 * Graphical review of alignment and detections (prototype style).
 */
export default function AlignReviewPanel({
  yearA,
  yearB,
  alignCheckUrl,
  imageUrlA,
  imageUrlB,
  resultadoUrl,
  panelUrl,
  defaultMode = 'tablero',
}) {
  const [mode, setMode] = useState(defaultMode)
  const [opacity, setOpacity] = useState(50)
  const [wipe, setWipe] = useState(50)
  const wrapRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    setMode(defaultMode)
  }, [defaultMode, alignCheckUrl, imageUrlA, imageUrlB])

  const modeMeta = useMemo(() => MODES.find((m) => m.id === mode) || MODES[0], [mode])

  const hasAny =
    alignCheckUrl || imageUrlA || imageUrlB || resultadoUrl || panelUrl

  if (!hasAny) {
    return (
      <EmptyState
        title="Sin imágenes de chequeo"
        subtitle="Ejecute una detección para ver el tablero A|B y las ortofotos alineadas."
      />
    )
  }

  function onWipePointer(clientX) {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100
    setWipe(Math.max(2, Math.min(98, pct)))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-900">
          Chequeo gráfico · A {yearA || '—'} vs B {yearB || '—'}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{modeMeta.tip}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="success">Verde · nueva</Badge>
          <Badge variant="danger">Rojo · eliminada</Badge>
          <Badge variant="warning">Amarillo · cambio</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => {
          const Icon = m.icon
          const disabled =
            (m.id === 'tablero' && !alignCheckUrl && !panelUrl) ||
            (m.id === 'lado' && !(imageUrlA && imageUrlB)) ||
            (m.id === 'superpuesto' && !(imageUrlA && imageUrlB)) ||
            (m.id === 'resultado' && !(resultadoUrl || panelUrl))
          const active = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => setMode(m.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                active
                  ? 'bg-brand-800 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          )
        })}
      </div>

      {mode === 'tablero' && (
        <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
          <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold text-white">
            Tablero de cuadros alternos (si no calzan calles/techos → alineación débil)
          </div>
          {(alignCheckUrl || panelUrl) && (
            <img
              src={alignCheckUrl || panelUrl}
              alt="Chequeo de alineación A|B"
              className="mx-auto max-h-[70vh] w-full object-contain"
            />
          )}
        </figure>
      )}

      {mode === 'lado' && imageUrlA && imageUrlB && (
        <div className="grid gap-2 lg:grid-cols-2">
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-semibold text-white">
              <span>A · referencia (antes)</span>
              <span className="text-accent-300">{yearA || '—'}</span>
            </div>
            <img src={imageUrlA} alt={`Ortofoto A ${yearA}`} className="mx-auto max-h-[65vh] w-full object-contain" />
          </figure>
          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs font-semibold text-white">
              <span>B · comparación (después)</span>
              <span className="text-accent-300">{yearB || '—'}</span>
            </div>
            <img src={imageUrlB} alt={`Ortofoto B ${yearB}`} className="mx-auto max-h-[65vh] w-full object-contain" />
          </figure>
        </div>
      )}

      {mode === 'superpuesto' && imageUrlA && imageUrlB && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
            <label className="inline-flex items-center gap-2 font-medium">
              Opacidad A
              <input
                type="range"
                min={0}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-36"
              />
              <span className="tabular-nums">{opacity}%</span>
            </label>
            <span className="text-slate-500">o arrastre la cortina en la imagen</span>
          </div>

          <div
            ref={wrapRef}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              setDragging(true)
              e.currentTarget.setPointerCapture?.(e.pointerId)
              onWipePointer(e.clientX)
            }}
            onPointerMove={(e) => {
              if (dragging) onWipePointer(e.clientX)
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          >
            <img
              src={imageUrlB}
              alt="B base"
              className="mx-auto block max-h-[70vh] w-full object-contain"
              draggable={false}
            />
            <img
              src={imageUrlA}
              alt="A sobre B"
              className="pointer-events-none absolute inset-0 mx-auto max-h-[70vh] w-full object-contain"
              style={{
                opacity: opacity / 100,
                clipPath: `inset(0 ${100 - wipe}% 0 0)`,
              }}
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent-400 shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
              style={{ left: `${wipe}%` }}
            />
            <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
              A {yearA || ''}
            </div>
            <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
              B {yearB || ''}
            </div>
          </div>
        </div>
      )}

      {mode === 'resultado' && (
        <div className="space-y-3">
          {resultadoUrl && (
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold text-white">
                Resultado de detección (cajas sobre año B)
              </div>
              <img
                src={resultadoUrl}
                alt="Resultado detección"
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </figure>
          )}
          {panelUrl && (
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <div className="border-b border-slate-800 px-3 py-2 text-xs font-semibold text-white">
                Panel completo 1 | 2 | 3
              </div>
              <img
                src={panelUrl}
                alt="Panel resultado"
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            </figure>
          )}
          {!resultadoUrl && !panelUrl && (
            <EmptyState title="Sin imagen de resultado" subtitle="Este trabajo no devolvió el panel de detecciones." />
          )}
        </div>
      )}
    </div>
  )
}
