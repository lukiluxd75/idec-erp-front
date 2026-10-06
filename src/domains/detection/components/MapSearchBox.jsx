import { useEffect, useRef, useState } from 'react'
import { Clock, Layers, MapPinned, Search, Tag, X } from 'lucide-react'
import { detectionApi } from '../api/detection.api'

const RECENT_KEY = 'detection.recentSearches'
const MAX_RECENT = 6

function loadRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)))
  } catch {
    /* ignore -- private browsing / storage disabled, recents are a convenience only */
  }
}

const KIND_ICON = { sector: Layers, parcel: MapPinned, campaign: Tag }
const KIND_LABEL = { sector: 'Sector', parcel: 'Predio', campaign: 'Campaña' }

/**
 * Overlaid search box on the detection map: sector (id/nombre), predio
 * (código catastral) or campaña (código/nombre) -- one shared endpoint, see
 * SearchDetectionEntitiesUseCase. Selecting a sector/predio result reuses
 * the EXISTING highlight-and-fitBounds mechanism ("explorar predio"'s own
 * renderParcelHighlight is geometry-agnostic -- it doesn't care whether the
 * polygon belongs to a parcel or a sector); only the caller decides how
 * long the highlight stays before clearing itself. Selecting a campaña
 * hands back enough (id, code, name, year_a, year_b) to drive the same
 * campaign-switch flow the "Campaña" dropdown already uses.
 *
 * Recent-searches history is local (per browser), just the typed query
 * text -- not the full result (geometry), kept light on purpose.
 */
export default function MapSearchBox({ onSelectSector, onSelectParcel, onSelectCampaign }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState(() => loadRecent())
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return undefined
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      detectionApi
        .searchDetectionEntities(q)
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  useEffect(() => {
    function onClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function remember(result) {
    const next = [result.label, ...recent.filter((label) => label !== result.label)].slice(0, MAX_RECENT)
    setRecent(next)
    saveRecent(next)
  }

  function handleSelect(result) {
    remember(result)
    setOpen(false)
    setQuery('')
    setResults([])
    if (result.kind === 'sector') onSelectSector?.(result)
    else if (result.kind === 'parcel') onSelectParcel?.(result)
    else if (result.kind === 'campaign') onSelectCampaign?.(result)
  }

  const trimmed = query.trim()
  const showDropdown = open && (trimmed.length >= 2 || recent.length > 0)

  return (
    <div ref={containerRef} className="relative z-[1100] ml-auto w-full min-w-[12rem] max-w-xs sm:w-64">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar sector, predio o campaña…"
          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-8 text-xs font-medium text-slate-800 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30"
        />
        {trimmed && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {trimmed.length >= 2 ? (
            loading ? (
              <p className="px-3 py-3 text-xs text-slate-400">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-400">Sin coincidencias.</p>
            ) : (
              results.map((r, i) => {
                const Icon = KIND_ICON[r.kind] || Search
                return (
                  <button
                    key={`${r.kind}-${i}`}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent-600" />
                    <span className="min-w-0 flex-1 truncate text-slate-800">{r.label}</span>
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {KIND_LABEL[r.kind] || r.kind}
                    </span>
                  </button>
                )
              })
            )
          ) : (
            recent.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <Clock className="h-3 w-3" /> Recientes
                </p>
                {recent.map((label, i) => (
                  <button
                    key={`recent-${i}`}
                    type="button"
                    onClick={() => setQuery(label)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    <span className="min-w-0 flex-1 truncate text-slate-600">{label}</span>
                  </button>
                ))}
              </>
            )
          )}
        </div>
      )}
    </div>
  )
}
