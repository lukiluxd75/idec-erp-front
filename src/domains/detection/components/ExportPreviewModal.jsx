import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { FileDown, FileJson, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { Badge, Button, EmptyState, Modal, Spinner } from '@/shared/ui'
import { detectionApi } from '../api/detection.api'
import {
  CampaignBreakdownChart,
  CampaignResolutionChart,
  ChangeTypeChart,
  DailyTrendChart,
  SectorsByStatusChart,
  ValidationStatusChart,
  ValidationTrendChart,
} from './ReportCharts'
import './ExportPreviewModal.css'

const STATUS_STYLE = {
  confirmed: { border: 'border-l-emerald-400', badge: 'success' },
  rejected: { border: 'border-l-rose-400', badge: 'danger' },
}

// Same 14 fields as the Excel export's columns (see export_excel.py's
// HEADERS) -- the print profile keeps every technical column too, just laid
// out as a vertical field:value ficha per predio instead of a wide table,
// since a 14-column table would never fit a printed page legibly.
const FICHA_FIELDS = [
  { key: 'number', label: 'Nº' },
  { key: 'sector_name', label: 'Sector' },
  { key: 'cadastral_code', label: 'Código catastral' },
  { key: 'change_type_label', label: 'Tipo de cambio' },
  { key: 'change_detail', label: 'Detalle del cambio' },
  { key: 'validation_status_label', label: 'Estado' },
  { key: 'rejection_comment', label: 'Motivo de rechazo' },
  { key: 'years', label: 'Años comparados' },
  { key: 'campaign_code', label: 'Campaña' },
  { key: 'probability_pct', label: 'Probabilidad (%)' },
  { key: 'validated_by_username', label: 'Validado por' },
  { key: 'validated_at', label: 'Fecha de validación' },
]

function PrintFicha({ row }) {
  const coords = row.lat != null && row.lon != null ? `${row.lat.toFixed(6)}, ${row.lon.toFixed(6)}` : ''
  return (
    <table className="print-ficha">
      <tbody>
        {FICHA_FIELDS.map(({ key, label }) => {
          const value = row[key]
          if (value === null || value === undefined || value === '') return null
          return (
            <tr key={key}>
              <th>{label}</th>
              <td>{value}</td>
            </tr>
          )
        })}
        {coords && (
          <tr>
            <th>Coordenadas</th>
            <td>{coords}</td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

/**
 * "Imprimir"'s actual content -- rendered through its OWN portal straight to
 * `document.body`, as a sibling of Modal's portal rather than a descendant
 * of it. The Modal panel is `max-h-[...] overflow-y-auto` (it has to be, so
 * a tall modal still fits the screen); nesting the print content inside it
 * confines `@media print` output to that panel's own box -- clipped, and
 * starting wherever the panel happened to sit on screen instead of the top
 * of the page (confirmed: that's exactly the "corta a la mitad de la hoja"
 * bug this replaced). A `print-report-root` sibling with plain static flow
 * has no such ancestor to escape, so it paginates normally from the top.
 */
function PrintReport({ data }) {
  if (!data) return null
  return createPortal(
    <div className="print-report-root">
      <h1>Detección de construcciones — Reporte de predios</h1>
      <p className="print-report-subtitle">
        {data.campaign_label} · {data.rows.length} predios
      </p>
      {data.rows.map((row) => (
        <PrintFicha key={`print-${row.number}-${row.cadastral_code}`} row={row} />
      ))}
    </div>,
    document.body
  )
}

/**
 * Off-screen (not display:none -- html2canvas can't rasterize a node with no
 * layout) render of every chart Reportes has stats for, purely so "PDF" and
 * "Imprimir" can capture each one as a PNG at click time -- same Recharts
 * components the architect already sees on the page, just a throwaway copy
 * positioned outside the viewport instead of shown. Always mounted whenever
 * `charts` has entries (not gated on the modal being open) so the nodes are
 * already laid out and ready to capture the instant an export is clicked.
 */
function ChartCaptureArea({ charts, nodeRefs }) {
  if (!charts.length) return null
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: '-99999px', width: '900px', pointerEvents: 'none' }}
    >
      {charts.map(({ key, Component, data }) => (
        <div
          key={key}
          ref={(el) => {
            nodeRefs.current[key] = el
          }}
        >
          <Component data={data} />
        </div>
      ))}
    </div>
  )
}

function ParcelCard({ row, showCampaign }) {
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
              {showCampaign && ` · ${row.campaign_code || 'Sin campaña'}`}
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

/**
 * "Exportar" on the detection map: a presentable preview (styled cards, not
 * a flat spreadsheet-style table -- per the engineer's request, this is what
 * authorities actually see) before picking a format. XML/XLSM were
 * considered and dropped: no system consumes them yet, and we don't ship
 * exports nobody uses.
 *
 * No campaign selector of its own -- reuses whatever Reportes' own selector
 * (`campaignId`, the page's `campaignFilter`) has picked, so the two never
 * disagree ("exportar campaña X" can't silently include campaign Y's data).
 * An empty `campaignId` means "Todas las campañas", matching that selector's
 * own blank option; there is no "Sin campaña" bucket here anymore (Reportes'
 * selector never offers one), so exporting is always available once a
 * campaign (or "todas") is picked up there.
 *
 * "Imprimir" renders a different profile than this preview: see PrintFicha,
 * a vertical field:value table per predio (same fields as the Excel export)
 * instead of either these cards or a 14-column spreadsheet table, neither of
 * which prints legibly.
 *
 * PDF gets one extra page per chart (captured as a PNG via html2canvas-pro,
 * see ChartCaptureArea/captureChartImages below) -- scoped to the SAME
 * `campaignId` this modal is showing predios for. Imprimir stays plain
 * fichas only -- tried adding the same chart pages there too, but the
 * captured images weren't rendering in the print output (only each chart's
 * title showed), so that path was reverted; only PDF gets charts. Excel and
 * JSON never get charts either -- a spreadsheet/data response has nowhere
 * sensible to put an image, only a formatted document does.
 *
 * `dateFrom`/`dateTo` (optional): the Reportes page's own date filter, if
 * any -- applied to the chart stats fetched here so the PDF's charts match
 * both the campaign AND the date range the architect is looking at, not
 * just the campaign.
 */
export default function ExportPreviewModal({ open, onClose, campaignId, dateFrom, dateTo }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyFormat, setBusyFormat] = useState('')
  const [chartStats, setChartStats] = useState(null)
  const chartNodeRefs = useRef({})

  const allCampaigns = !campaignId
  const selectedCampaignId = campaignId ? Number(campaignId) : null

  useEffect(() => {
    if (!open) {
      setData(null)
      return
    }
    setLoading(true)
    setError('')
    detectionApi
      .fetchCampaignReportData(selectedCampaignId, { allCampaigns })
      .then(setData)
      .catch((err) => setError(err.message || 'No se pudo cargar la vista previa.'))
      .finally(() => setLoading(false))
  }, [open, selectedCampaignId, allCampaigns])

  // Re-fetched every time Reportes' own campaign selector changes.
  useEffect(() => {
    if (!open) {
      setChartStats(null)
      return
    }
    detectionApi
      .getReportStats({ campaignId: allCampaigns ? undefined : selectedCampaignId, dateFrom, dateTo })
      .then(setChartStats)
      .catch(() => setChartStats(null))
  }, [open, selectedCampaignId, allCampaigns, dateFrom, dateTo])

  // Only these 7 (the actual gráficas); ValidatorsTable isn't rasterized.
  const exportCharts = chartStats
    ? [
        { key: 'validation_status', title: 'Estado de validación', Component: ValidationStatusChart, data: chartStats.by_validation_status },
        { key: 'change_type', title: 'Distribución por tipo de cambio', Component: ChangeTypeChart, data: chartStats.by_change_type },
        { key: 'sectors_by_status', title: 'Sectores por estado', Component: SectorsByStatusChart, data: chartStats.sectors_by_status },
        { key: 'daily_trend', title: 'Evolución temporal', Component: DailyTrendChart, data: chartStats.daily_counts },
        { key: 'validation_trend', title: 'Línea de tiempo de validación', Component: ValidationTrendChart, data: chartStats.daily_counts },
        { key: 'campaign_breakdown', title: 'Cambios detectados por campaña', Component: CampaignBreakdownChart, data: chartStats.by_campaign },
        { key: 'campaign_resolution', title: 'Comparativa de resolución entre campañas', Component: CampaignResolutionChart, data: chartStats.by_campaign },
      ]
    : []

  function downloadJson() {
    const blob = new Blob([JSON.stringify(data.rows, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte-predios-${allCampaigns ? 'todas-las-campanas' : selectedCampaignId}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  /** Rasterizes every entry in `charts` from the off-screen ChartCaptureArea
   * -- same pixels as the live chart, scale:2 for a print/PDF-sharp image
   * instead of a blurry 1x screen capture. html2canvas-pro, not plain
   * html2canvas: Tailwind v4's palette is oklch by default, and vanilla
   * html2canvas (no CSS Color 4 support) throws "unsupported color function
   * oklch" on every card's border/bg/text color -- the -pro fork is the
   * maintained one that actually parses it. */
  async function captureChartImages() {
    if (!exportCharts.length) return []
    const { default: html2canvas } = await import('html2canvas-pro')
    const images = []
    for (const { key, title } of exportCharts) {
      const node = chartNodeRefs.current[key]
      if (!node) continue
      const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 })
      images.push({ title, image_base64: canvas.toDataURL('image/png') })
    }
    return images
  }

  async function handleFormat(kind) {
    setBusyFormat(kind)
    const opts = { allCampaigns }
    try {
      if (kind === 'excel') await detectionApi.exportCampaignReport(selectedCampaignId, opts)
      else if (kind === 'pdf') {
        const chartImages = await captureChartImages()
        await detectionApi.exportCampaignReportPdf(selectedCampaignId, opts, chartImages)
      } else if (kind === 'json') downloadJson()
      else if (kind === 'print') window.print()
      if (kind !== 'print') toast.success('Reporte generado.')
    } catch (err) {
      toast.error(err.message || 'No se pudo generar el reporte.')
    } finally {
      setBusyFormat('')
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Exportar reporte de predios" icon={FileDown} size="xl">
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-medium text-slate-400">Exportando</p>
            <p className="text-sm font-bold text-slate-900">
              {data ? data.campaign_label : loading ? 'Cargando…' : '—'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">{data ? `${data.rows.length} predios` : 'Cargando…'}</p>
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
            <div className="space-y-2">
              {data.rows.length === 0 ? (
                <EmptyState
                  title="Sin predios confirmados o rechazados"
                  subtitle="Esta campaña todavía no tiene hallazgos validados para exportar."
                />
              ) : (
                <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                  {data.rows.map((row) => (
                    <ParcelCard key={`${row.number}-${row.cadastral_code}`} row={row} showCampaign={allCampaigns} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
      <ChartCaptureArea charts={exportCharts} nodeRefs={chartNodeRefs} />
      <PrintReport data={data?.rows.length ? data : null} />
    </>
  )
}
