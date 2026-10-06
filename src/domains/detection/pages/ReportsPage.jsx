import { useState } from 'react'
import { BarChart3, FileSpreadsheet } from 'lucide-react'
import { Button, Card } from '@/shared/ui'
import ExportPreviewModal from '../components/ExportPreviewModal'

/**
 * "Reportes": analysis and export for the detection module -- distinct from
 * "Mapa y detección" (doing: draw/process/validate) and "Historial"
 * (auditing/consulta, read-only). This phase only relocates the existing
 * "Exportar" button + ExportPreviewModal from DetectionPage, unmodified --
 * no changes to the export itself, to keep this move isolated from any
 * export improvements (those land in a later phase). Charts/stats
 * (cambios por campaña, estado de validación, evolución temporal, etc.)
 * are a separate, later addition to this same page.
 *
 * No `campaignId` to inherit here (this is its own route, not a tab inside
 * "Mapa y detección") -- ExportPreviewModal's own campaign selector starts
 * blank and the architect picks explicitly, same as it already supports
 * when reached from the map with no campaign active.
 */
export default function ReportsPage() {
  const [exportOpen, setExportOpen] = useState(false)

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white">
            <BarChart3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Reportes</h1>
            <p className="truncate text-xs text-slate-500">
              Análisis, comparación y exportación de lo detectado
            </p>
          </div>
        </div>
      </header>

      <Card glass={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Reporte de predios</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Vista previa, PDF, Excel, JSON o impresión — por campaña o todas a la vez.
            </p>
          </div>
          <Button variant="primary" size="sm" icon={FileSpreadsheet} onClick={() => setExportOpen(true)}>
            Exportar
          </Button>
        </div>
      </Card>

      <ExportPreviewModal open={exportOpen} onClose={() => setExportOpen(false)} campaignId={null} />
    </div>
  )
}
