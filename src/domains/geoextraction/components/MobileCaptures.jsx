import { Smartphone, Trash2 } from 'lucide-react'
import { Badge, IconButton } from '@/shared/ui'

function formatTime(isoDate) {
  try {
    return new Date(isoDate).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Photos sent from the mobile app (geoextract mobile: take photo and upload here)
 * that have not yet been loaded into the viewer. They live in backend memory —
 * there is no history; they leave the list as soon as they are loaded or discarded.
 */
export function MobileCaptures({ captures, loadingId, onLoad, onDiscard }) {
  if (captures.length === 0) return null

  return (
    <div className="flex items-center gap-2 normal-case">
      <Smartphone size={14} className="shrink-0 text-accent-600" />
      <Badge variant="accent" dot dotPulse>
        {captures.length} {captures.length === 1 ? 'foto del celular' : 'fotos del celular'}
      </Badge>
      <div className="flex flex-wrap items-center gap-1.5">
        {captures.map((c) => (
          <div key={c.capture_id} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 pl-2 pr-1 py-1">
            <button
              onClick={() => onLoad(c.capture_id)}
              disabled={loadingId !== null}
              className="text-[10px] font-black uppercase tracking-wide text-brand-800 hover:text-brand-600 disabled:opacity-50"
            >
              {loadingId === c.capture_id ? 'Cargando…' : `Cargar ${formatTime(c.created_at)}`}
            </button>
            <IconButton
              icon={Trash2}
              size={12}
              className="p-0.5"
              tone="dangerActive"
              disabled={loadingId === c.capture_id}
              onClick={() => onDiscard(c.capture_id)}
              title="Descartar"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default MobileCaptures
