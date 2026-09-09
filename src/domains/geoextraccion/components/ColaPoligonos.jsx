import { Layers, XCircle } from 'lucide-react'
import { Button, IconButton } from '@/shared/ui'

/**
 * Aviso de polígonos en cola pendientes de exportar como capa masiva.
 * Adaptado de la franja ámbar de geo-extract/frontend/src/pages/Capture.jsx.
 */
export function ColaPoligonos({ count, onExportar, onDescartar }) {
  if (count === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-state-amber/30 bg-state-amber/10 px-4 py-2 shadow-xs animate-pulse">
      <div className="flex items-center gap-2">
        <Layers size={18} className="shrink-0 text-state-amber" />
        <span className="text-[10px] font-black uppercase text-slate-700">{count} Polígonos en cola</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="warning" size="sm" onClick={onExportar}>
          EXPORTAR CAPA
        </Button>
        <IconButton icon={XCircle} size={16} tone="dangerActive" onClick={onDescartar} />
      </div>
    </div>
  )
}

export default ColaPoligonos
