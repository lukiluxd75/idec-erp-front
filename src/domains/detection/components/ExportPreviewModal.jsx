import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { FileDown, FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { Badge, Button, EmptyState, Modal, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import './ExportPreviewModal.css'

const STATUS_STYLE = {
  confirmed: { border: 'border-l-emerald-400', badge: 'success' },
  rejected: { border: 'border-l-rose-400', badge: 'danger' },
}

function ParcelCard({ row }) {
  const style = STATUS_STYLE[row.validation_status] || { border: 'border-l-slate-300', badge: 'neutral' }
  return (
    <div
      className={`rounded-xl border border-l-4 border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${style.border}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
            {row.number}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{row.cadastral_code || 'Sin código catastral'}</p>
            <p className="text-[11px] text-slate-500">
              {row.sector_name} · {row.years}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{row.change_type_label}</Badge>
          <Badge variant={style.badge}>{row.validation_status_label}</Badge>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] sm:grid-cols-4">
        {row.change_detail && (
          <div>
            <span className="text-slate-400">Detalle</span>
            <p className="font-medium text-slate-700">{row.change_detail}</p>
          </div>
        )}
        {row.probability_pct != null && (
          <div>
            <span className="text-slate-400">Probabilidad</span>
            <p className="font-medium text-slate-700">{row.probability_pct}%</p>
          </div>
        )}
        {row.validated_by_username && (
          <div>
            <span className="text-slate-400">Validado por</span>
            <p className="font-medium text-slate-700">{row.validated_by_username}</p>
          </div>
        )}
        {row.validated_at && (
          <div>
            <span className="text-slate-400">Fecha</span>
            <p className="font-medium text-slate-700">{row.validated_at}</p>
          </div>
        )}
        {row.rejection_comment && (
          <div className="col-span-2 sm:col-span-4">
            <span className="text-slate-400">Motivo de rechazo</span>
            <p className="font-medium text-slate-700">{row.rejection_comment}</p>
          </div>
        )}
        {row.lat != null && row.lon != null && (
          <div className="col-span-2 sm:col-span-4">
            <span className="text-slate-400">Coordenadas</span>
            <p className="font-mono text-[10.5px] text-slate-600">
              {row.lat.toFixed(6)}, {row.lon.toFixed(6)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExportPreviewModal({ open, onClose, campaignId, unassignedOnly }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyFormat, setBusyFormat] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    detectionApi
      .fetchCampaignReportData(campaignId, { unassignedOnly })
      .then(setData)
      .catch((err) => setError(err.message || 'No se pudo cargar la vista previa.'))
      .finally(() => setLoading(false))
  }, [open, campaignId, unassignedOnly])

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte-predios-${campaignId || 'sin-campania'}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function handleFormat(kind) {
    setBusyFormat(kind)
    try {
      if (kind === 'excel') await detectionApi.exportCampaignReport(campaignId, { unassignedOnly })
      else if (kind === 'pdf') await detectionApi.exportCampaignReportPdf(campaignId, { unassignedOnly })
      else if (kind === 'json') downloadJson()
      else if (kind === 'print') window.print()
      if (kind !== 'print') toast.success('Reporte generado.')
    } catch (err) {
      toast.error(err.message || 'No se pudo generar el reporte.')
    } finally {
      setBusyFormat('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Exportar reporte de predios" icon={FileDown} size="xl">
      <div className="space-y-4">
        <div className="export-print-hide flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <p className="text-xs text-slate-500">
            {data ? `${data.campaign_label} · ${data.rows.length} predios` : 'Cargando…'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              icon={FileText}
              loading={busyFormat === 'pdf'}
              disabled={!data || !!busyFormat}
              onClick={() => handleFormat('pdf')}
            >
              PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={FileSpreadsheet}
              loading={busyFormat === 'excel'}
              disabled={!data || !!busyFormat}
              onClick={() => handleFormat('excel')}
            >
              Excel
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={FileJson}
              loading={busyFormat === 'json'}
              disabled={!data || !!busyFormat}
              onClick={() => handleFormat('json')}
            >
              JSON
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={Printer}
              disabled={!data || !!busyFormat}
              onClick={() => handleFormat('print')}
            >
              Imprimir
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-14">
            <Spinner className="h-7 w-7" />
          </div>
        )}

        {!loading && error && <EmptyState title="No se pudo cargar la vista previa" subtitle={error} />}

        {!loading && !error && data && (
          <div className="export-print-root space-y-2">
            <div className="export-print-hide-until-print hidden print:mb-3 print:block">
              <h1 className="text-lg font-bold text-slate-900">Detección de construcciones — Reporte de predios</h1>
              <p className="text-sm text-slate-500">
                {data.campaign_label} · {data.rows.length} predios
              </p>
            </div>
            {data.rows.length === 0 ? (
              <EmptyState
                title="Sin predios confirmados o rechazados"
                subtitle="Esta campaña todavía no tiene hallazgos validados para exportar."
              />
            ) : (
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                {data.rows.map((row) => (
                  <ParcelCard key={`${row.number}-${row.cadastral_code}`} row={row} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
