import { CheckCircle2, XCircle } from 'lucide-react'

/**
 * The only two validation actions the architect has (see conversation with
 * the user: "solo esas dos opciones" — confirm the detection, classifying
 * the real change, or reject it with an optional audit comment). Rendered
 * inline in each row of the hallazgos table instead of a separate side
 * panel, so no row needs to be selected first to validate it. Both open
 * ParcelValidationModal in the matching mode; neither commits instantly,
 * since confirming requires picking a construction_type first.
 */
export default function ParcelValidationButtons({ row, onOpenValidation }) {
  if (!row?.affected_parcel_id) return null
  if (row.validation_status && row.validation_status !== 'pending') return null

  return (
    <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title="Confirmar — la detección es real"
        aria-label="Confirmar"
        onClick={(e) => {
          e.stopPropagation()
          onOpenValidation?.(row, 'confirm')
        }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-state-success transition-colors hover:bg-state-success/10"
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Rechazar — no hubo cambio real"
        aria-label="Rechazar"
        onClick={(e) => {
          e.stopPropagation()
          onOpenValidation?.(row, 'reject')
        }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-state-danger transition-colors hover:bg-state-danger/10"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </span>
  )
}
