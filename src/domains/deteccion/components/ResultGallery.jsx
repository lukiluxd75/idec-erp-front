import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Expand, Images, X } from 'lucide-react'

const ASSET_ORDER = [
  'resultado',
  'panel_resultado',
  'align_check',
  'aligned_a',
  'aligned_b',
  'orto_ref',
  'orto_mov',
]

const ASSET_LABELS = {
  aligned_a: '1 · Ortofoto alineada · año A',
  aligned_b: '2 · Ortofoto alineada · año B',
  resultado: '3 · Resultado de detección',
  panel_resultado: 'Panel completo 1 | 2 | 3',
  align_check: 'Chequeo de alineación A | B',
  orto_ref: 'Ortofoto de referencia',
  orto_mov: 'Ortofoto de comparación',
}

const PRIMARY_KEYS = new Set(['resultado', 'panel_resultado', 'align_check'])

/**
 * Galería de evidencias: imágenes a tamaño completo + visor ampliado.
 */
export default function ResultGallery({ assetUrls = {}, compact = false }) {
  const [viewer, setViewer] = useState(null)

  const items = useMemo(() => {
    const entries = Object.entries(assetUrls || {}).filter(([, src]) => !!src)
    entries.sort((a, b) => {
      const ia = ASSET_ORDER.indexOf(a[0])
      const ib = ASSET_ORDER.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    return entries.map(([key, src]) => ({
      key,
      src,
      label: ASSET_LABELS[key] || key,
      primary: PRIMARY_KEYS.has(key),
    }))
  }, [assetUrls])

  if (!items.length) return null

  const primary = items.filter((i) => i.primary)
  const secondary = items.filter((i) => !i.primary)

  return (
    <>
      <div className="space-y-4">
        {!compact && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
              <Images className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Evidencia
              </p>
              <h2 className="text-sm font-bold text-slate-900">Resultados visuales</h2>
              <p className="text-[11px] text-slate-500">
                Pulse una imagen para verla a tamaño completo.
              </p>
            </div>
          </div>
        )}
        {compact && (
          <p className="text-[11px] text-slate-500">
            Pulse una imagen para verla a tamaño completo.
          </p>
        )}

        {primary.length > 0 && (
          <div className="space-y-4">
            {primary.map((item) => (
              <figure
                key={item.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
                  <figcaption className="text-xs font-semibold text-white">{item.label}</figcaption>
                  <button
                    type="button"
                    onClick={() => setViewer(item)}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
                  >
                    <Expand className="h-3.5 w-3.5" />
                    Ampliar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewer(item)}
                  className="block w-full cursor-zoom-in bg-slate-950 p-2 text-left"
                >
                  <img
                    src={item.src}
                    alt={item.label}
                    className="mx-auto max-h-[70vh] w-full object-contain"
                  />
                </button>
              </figure>
            ))}
          </div>
        )}

        {secondary.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {secondary.map((item) => (
              <figure
                key={item.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
                  <figcaption className="text-[11px] font-semibold text-slate-800">{item.label}</figcaption>
                  <button
                    type="button"
                    onClick={() => setViewer(item)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-accent-600 hover:bg-accent-50"
                  >
                    <Expand className="h-3.5 w-3.5" />
                    Ampliar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setViewer(item)}
                  className="block w-full cursor-zoom-in bg-slate-100 p-2 text-left"
                >
                  <img
                    src={item.src}
                    alt={item.label}
                    className="mx-auto max-h-[420px] w-full object-contain"
                  />
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>

      {viewer &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6"
            style={{ zIndex: 10050 }}
            onClick={() => setViewer(null)}
            role="dialog"
            aria-modal="true"
            aria-label={viewer.label}
          >
            <div
              className="relative flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                <p className="truncate text-sm font-semibold text-white">{viewer.label}</p>
                <button
                  type="button"
                  onClick={() => setViewer(null)}
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-auto p-3 sm:p-4">
                <img
                  src={viewer.src}
                  alt={viewer.label}
                  className="mx-auto h-auto w-full max-w-none object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
