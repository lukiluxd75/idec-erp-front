import { useState } from 'react'

/** Imagen del plano en la tarjeta de una unidad, con el norte arriba. */
function PlanoUnidad({ url, etiqueta, angleDeg, ancho, alto, foco }) {
  const [completo, setCompleto] = useState(false)
  if (!url) return <span className="px-2 text-center text-[10px] text-slate-400">Cargando plano…</span>
  if (!foco || !ancho || !alto || completo) {
    const image = (
      <img
        src={url}
        alt={`Plano ${etiqueta}`}
        className={`max-h-full max-w-full object-contain transition-transform ${foco ? 'cursor-zoom-in' : ''}`}
        style={{ transform: `rotate(${-angleDeg}deg)` }}
      />
    )
    if (!foco) return image
    return (
      <button
        type="button"
        onClick={() => setCompleto(false)}
        aria-label={`Volver al acercamiento del plano ${etiqueta}`}
        className="max-h-full max-w-full p-0"
      >
        {image}
      </button>
    )
  }
  // viewBox centrado en el rótulo: el SVG escala solo al tamaño de la tarjeta.
  const v = foco.ventana
  return (
    <button
      type="button"
      onClick={() => setCompleto(true)}
      aria-label={`Ver el plano completo ${etiqueta}`}
      className="h-full w-full cursor-zoom-out p-0"
    >
      <svg viewBox={`${-v / 2} ${-v / 2} ${v} ${v}`} className="h-full w-full">
        <title>Ver el plano completo</title>
        <g transform={`rotate(${-angleDeg}) translate(${-foco.x} ${-foco.y})`}>
          <image href={url} width={ancho} height={alto} />
        </g>
        <circle r={v * 0.04} fill="none" stroke="var(--color-state-danger)" strokeWidth={v * 0.008} />
      </svg>
    </button>
  )
}

const inputBase =
  'w-full min-w-0 truncate rounded-lg border px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60'
const inputOk = 'border-slate-200 bg-white'
const inputDudoso = 'border-state-danger/60 bg-state-danger/5 text-state-danger'

export function ColindanciaCard({
  ambiente,
  valores,
  onCambioValor,
  datalistId,
  imagenUrl,
  angleDeg,
  ancho,
  alto,
  foco,
  dudas = {},
}) {
  const cls = (lado) => `${inputBase} ${dudas[lado] ? inputDudoso : inputOk}`
  const tip = (lado) => (dudas[lado] ? `Revisar: ${dudas[lado]}` : valores[lado] || '')
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="mb-3 truncate text-sm font-semibold text-slate-700" title={ambiente}>
        {ambiente}
      </p>
      <div
        className="grid items-center justify-center justify-items-stretch gap-2"
        style={{
          gridTemplateAreas: '". norte ." "oeste imagen este" ". sud ."',
          gridTemplateColumns: 'minmax(0, 8rem) minmax(0, 10rem) minmax(0, 8rem)',
          gridTemplateRows: 'auto 10rem auto',
        }}
      >
        <div style={{ gridArea: 'norte' }} className="flex min-w-0 flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Norte</span>
          <input
            list={datalistId}
            className={cls('norte')}
            value={valores.norte || ''}
            title={tip('norte')}
            onChange={(e) => onCambioValor('norte', e.target.value)}
            placeholder="Sin detectar…"
          />
        </div>

        <div style={{ gridArea: 'oeste' }} className="flex min-w-0 flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Oeste</span>
          <input
            list={datalistId}
            className={cls('oeste')}
            value={valores.oeste || ''}
            title={tip('oeste')}
            onChange={(e) => onCambioValor('oeste', e.target.value)}
            placeholder="Sin detectar…"
          />
        </div>

        <div
          style={{ gridArea: 'imagen' }}
          className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <PlanoUnidad url={imagenUrl} etiqueta={ambiente} angleDeg={angleDeg} ancho={ancho} alto={alto} foco={foco} />
        </div>

        <div style={{ gridArea: 'este' }} className="flex min-w-0 flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Este</span>
          <input
            list={datalistId}
            className={cls('este')}
            value={valores.este || ''}
            title={tip('este')}
            onChange={(e) => onCambioValor('este', e.target.value)}
            placeholder="Sin detectar…"
          />
        </div>

        <div style={{ gridArea: 'sud' }} className="flex min-w-0 flex-col items-center">
          <input
            list={datalistId}
            className={cls('sud')}
            value={valores.sud || ''}
            title={tip('sud')}
            onChange={(e) => onCambioValor('sud', e.target.value)}
            placeholder="Sin detectar…"
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sud</span>
        </div>
      </div>
    </div>
  )
}
