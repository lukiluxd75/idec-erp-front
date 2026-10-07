import { useRef, useState } from 'react'

/**
 * Selector de pestañas a modo de control segmentado: pista oscura, píldora
 * blanca que se desliza hacia la pestaña activa. Sin pestaña elegida, la
 * píldora no se muestra y la primera aparece en su sitio (sin deslizar desde
 * otro lado).
 */
export function ResolutionTabs({ tabs, value, onChange, label }) {
  const [deslizar, setDeslizar] = useState(false)
  const refs = useRef([])

  const indice = tabs.findIndex((t) => t.id === value)
  const seleccionar = (id) => {
    if (value != null) setDeslizar(true)
    onChange(id)
  }

  const onKeyDown = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    let destino = i
    if (e.key === 'ArrowRight') destino = (i + 1) % tabs.length
    if (e.key === 'ArrowLeft') destino = (i - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') destino = 0
    if (e.key === 'End') destino = tabs.length - 1
    refs.current[destino]?.focus()
    seleccionar(tabs[destino].id)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid gap-0 rounded-2xl bg-brand-900/75 p-1.5 shadow-[0_14px_30px_-14px_rgba(15,23,42,0.55)] ring-1 ring-white/20"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-xl bg-white shadow-[0_8px_18px_-8px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.75rem) / ${tabs.length})`,
          transform: `translateX(${Math.max(indice, 0) * 100}%)`,
          opacity: indice === -1 ? 0 : 1,
          transition: deslizar
            ? 'transform 260ms cubic-bezier(0.77, 0, 0.175, 1), opacity 160ms ease-out'
            : 'opacity 160ms ease-out',
        }}
      />

      {tabs.map(({ id, label: texto, icon: Icon }, i) => {
        const activa = id === value
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls={`panel-${id}`}
            tabIndex={activa || (indice === -1 && i === 0) ? 0 : -1}
            onClick={() => seleccionar(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`relative z-10 flex min-h-[52px] cursor-pointer items-center justify-center gap-2.5 rounded-xl px-4 text-[15px] font-semibold outline-none transition-[color,background-color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.97] motion-reduce:transition-none ${
              activa
                ? 'text-brand-900'
                : 'text-white [@media(hover:hover)]:hover:bg-white/10'
            }`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} aria-hidden="true" />
            <span>{texto}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ResolutionTabs
