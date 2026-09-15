import { Smartphone, Trash2 } from 'lucide-react'
import { Badge, IconButton } from '@/shared/ui'

function formatHora(fechaISO) {
  try {
    return new Date(fechaISO).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

/**
 * Fotos mandadas desde la app móvil (geoextract móvil: solo saca la foto y la manda
 * acá) que todavía no se cargaron en el visor. Viven en memoria del backend — no hay
 * "historial", desaparecen de la lista apenas se cargan o se descartan.
 */
export function CapturasMoviles({ capturas, cargandoId, onCargar, onDescartar }) {
  if (capturas.length === 0) return null

  return (
    <div className="flex items-center gap-2 normal-case">
      <Smartphone size={14} className="shrink-0 text-accent-600" />
      <Badge variant="accent" dot dotPulse>
        {capturas.length} {capturas.length === 1 ? 'foto del celular' : 'fotos del celular'}
      </Badge>
      <div className="flex flex-wrap items-center gap-1.5">
        {capturas.map((c) => (
          <div key={c.id_captura} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/70 pl-2 pr-1 py-1">
            <button
              onClick={() => onCargar(c.id_captura)}
              disabled={cargandoId !== null}
              className="text-[10px] font-black uppercase tracking-wide text-brand-800 hover:text-brand-600 disabled:opacity-50"
            >
              {cargandoId === c.id_captura ? 'Cargando…' : `Cargar ${formatHora(c.fecha_creacion)}`}
            </button>
            <IconButton
              icon={Trash2}
              size={12}
              className="p-0.5"
              tone="dangerActive"
              disabled={cargandoId !== null}
              onClick={() => onDescartar(c.id_captura)}
              title="Descartar"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default CapturasMoviles
