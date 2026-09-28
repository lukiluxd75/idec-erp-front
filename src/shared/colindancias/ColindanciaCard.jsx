import { useState } from 'react'

/**
 * Imagen del plano en la tarjeta de una unidad, con el norte arriba. Si se
 * ubicó el rótulo de la unidad, muestra el plano AMPLIADO sobre esa zona (no
 * un recorte: es el mismo plano con zoom, marcando el rótulo); un clic
 * alterna con el plano completo.
 */
function PlanoUnidad({ url, etiqueta, angleDeg, ancho, alto, foco }) {
  const [completo, setCompleto] = useState(false)
  if (!url) return <span className="px-2 text-center text-[10px] text-slate-400">Cargando plano…</span>
  if (!foco || !ancho || !alto || completo) {
    return (
      <img
        src={url}
        alt={`Plano ${etiqueta}`}
        className={`max-h-full max-w-full object-contain transition-transform ${foco ? 'cursor-zoom-in' : ''}`}
        style={{ transform: `rotate(${-angleDeg}deg)` }}
        onClick={foco ? () => setCompleto(false) : undefined}
        title={foco ? 'Clic para acercar a la unidad' : undefined}
      />
    )
  }
  // viewBox centrado en el rótulo: el SVG escala solo al tamaño de la tarjeta.
  const v = foco.ventana
  return (
    <svg
      viewBox={`${-v / 2} ${-v / 2} ${v} ${v}`}
      className="h-full w-full cursor-zoom-out"
      onClick={() => setCompleto(true)}
    >
      <title>Clic para ver el plano completo</title>
      <g transform={`rotate(${-angleDeg}) translate(${-foco.x} ${-foco.y})`}>
        <image href={url} width={ancho} height={alto} />
      </g>
      <circle r={v * 0.04} fill="none" stroke="#dc2626" strokeWidth={v * 0.008} />
    </svg>
  )
}

/**
 * Una tarjeta de colindancias: nombre de la unidad, su plano ampliado
 * (PlanoUnidad) y sus 4 valores (norte/este/sud/oeste), cada uno en un
 * <input> editable con lista de opciones -- el usuario siempre tiene la
 * última palabra antes de guardar. Compartida por resolutions
 * (ColindanciasSection) y folder-analysis (PlanColindancias).
 */
export function ColindanciaCard({ ambiente, valores, onCambioValor, datalistId, imagenUrl, angleDeg, ancho, alto, foco }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="mb-3 truncate text-sm font-semibold text-slate-700" title={ambiente}>
        {ambiente}
      </p>
      <div
        className="grid items-center justify-items-stretch gap-2"
        style={{
          gridTemplateAreas: '". norte ." "oeste imagen este" ". sud ."',
          gridTemplateColumns: '8rem 10rem 8rem',
          gridTemplateRows: 'auto 10rem auto',
        }}
      >
        <div style={{ gridArea: 'norte' }} className="flex min-w-0 flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Norte</span>
          <input
            list={datalistId}
            className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
            value={valores.norte || ''}
            title={valores.norte || ''}
            onChange={(e) => onCambioValor('norte', e.target.value)}
            placeholder="Sin detectar…"
          />
        </div>

        <div style={{ gridArea: 'oeste' }} className="flex min-w-0 flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Oeste</span>
          <input
            list={datalistId}
            className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
            value={valores.oeste || ''}
            title={valores.oeste || ''}
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
            className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
            value={valores.este || ''}
            title={valores.este || ''}
            onChange={(e) => onCambioValor('este', e.target.value)}
            placeholder="Sin detectar…"
          />
        </div>

        <div style={{ gridArea: 'sud' }} className="flex min-w-0 flex-col items-center">
          <input
            list={datalistId}
            className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
            value={valores.sud || ''}
            title={valores.sud || ''}
            onChange={(e) => onCambioValor('sud', e.target.value)}
            placeholder="Sin detectar…"
          />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sud</span>
        </div>
      </div>
    </div>
  )
}
