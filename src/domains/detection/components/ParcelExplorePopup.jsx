import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Badge } from '@/shared/ui'

const CHANGE_TYPE_LABEL = {
  new: 'Nueva',
  removed: 'Eliminada',
  modified: 'Cambio',
  unchanged: 'Sin cambio',
}

const VALIDATION_BADGE = {
  confirmed: { variant: 'success', label: 'Confirmado' },
  rejected: { variant: 'danger', label: 'Rechazado' },
}

export default function ParcelExplorePopup({ parcels, index, onNavigate, onClose }) {
  if (!parcels?.length) return null
  const parcel = parcels[index]
  const vBadge = VALIDATION_BADGE[parcel.validation_status] || { variant: 'neutral', label: parcel.validation_status }

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[1200] w-[min(92%,22rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="neutral">{CHANGE_TYPE_LABEL[parcel.change_type] || parcel.change_type}</Badge>
          <Badge variant={vBadge.variant}>{vBadge.label}</Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar exploración"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-1.5 text-sm font-semibold text-slate-900">{parcel.cadastral_code || 'Sin código catastral'}</p>
      {parcel.construction_type && <p className="text-xs text-brand-700">{parcel.construction_type}</p>}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <button
          type="button"
          onClick={() => onNavigate(index - 1)}
          disabled={index === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Predio anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] font-medium text-slate-500">
          {index + 1} de {parcels.length}
        </span>
        <button
          type="button"
          onClick={() => onNavigate(index + 1)}
          disabled={index === parcels.length - 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Siguiente predio"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
