import {
  ArrowLeft,
  CheckCircle2,
  CircleCheck,
  CircleX,
  ListChecks,
  Receipt,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { facturasApi } from '@/domains/facturas/api/facturas.api'
import { FacturaStatusBadge } from '@/domains/facturas/components/FacturaStatusBadge'
import { ImageViewer } from '@/domains/facturas/components/ImageViewer'
import { ReceiptSheet } from '@/domains/facturas/components/ReceiptSheet'
import {
  IN_PROGRESS,
  buildFillReport,
  checkAmounts,
  downloadJson,
  formatDateTime,
  prepareForSave,
} from '@/domains/facturas/utils/facturaData'
import { useFacturasUpdates, usePollWhile } from '@/domains/facturas/utils/useFacturasUpdates'
import { Alert, Button, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

export default function FacturaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [factura, setFactura] = useState(null)
  const [draft, setDraft] = useState(null)
  const [dirty, setDirtyState] = useState(false)
  // Read by `refresh` (a stable callback) without re-creating it on every edit.
  const dirtyRef = useRef(false)
  const setDirty = useCallback((value) => {
    dirtyRef.current = value
    setDirtyState(value)
  }, [])
  const [touched, setTouched] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState(null) // 'confirm' | 'reprocess' | 'delete'

  // `loading` only covers the first load. A refresh (websocket / poll) never
  // overwrites unsaved edits.
  const refresh = useCallback(
    () =>
      facturasApi
        .get(id)
        .then((f) => {
          setFactura(f)
          setError(null)
          if (!dirtyRef.current) setDraft(f.data)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const inProgress = factura ? IN_PROGRESS.has(factura.status) : false
  useFacturasUpdates(refresh)
  usePollWhile(inProgress, refresh)

  const readOnly = factura?.status === 'confirmed'
  const checks = useMemo(() => checkAmounts(draft?.campos), [draft])

  // Red = read with low confidence / not read / checks failing at extraction
  // time, until the reviewer touches it; plus whatever breaks a check NOW.
  const { isRed, reasons } = useMemo(() => {
    const low = new Set(draft?.campos_baja_confianza || [])
    const why = {}
    for (const k of low) why[k] = ['Marcado para revisar al leer la factura']
    const failing = new Set()
    for (const rule of checks) {
      if (rule.ok) continue
      for (const k of rule.campos) {
        failing.add(k)
        why[k] = [...(why[k] || []), `No cuadra: ${rule.regla}`]
      }
    }
    return { isRed: (k) => failing.has(k) || (low.has(k) && !touched.has(k)), reasons: why }
  }, [draft, checks, touched])

  const onChange = useCallback(
    (key, value) => {
      setDraft((prev) => ({ ...prev, campos: { ...(prev?.campos || {}), [key]: value } }))
      setTouched((prev) => new Set(prev).add(key))
      setDirty(true)
    },
    [setDirty]
  )

  const save = async (confirm) => {
    setSaving(true)
    try {
      const f = await facturasApi.save(id, prepareForSave(draft), confirm)
      setFactura(f)
      setDraft(f.data)
      setDirty(false)
      toast.success(confirm ? 'Factura confirmada.' : 'Cambios guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reprocess = async () => {
    try {
      const f = await facturasApi.reprocess(id)
      setFactura(f)
      setDirty(false)
      setTouched(new Set())
      toast.info('Leyendo la factura de nuevo…')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const remove = async () => {
    try {
      await facturasApi.remove(id)
      toast.success('Factura eliminada.')
      navigate('/facturas')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const downloadFillLog = async () => {
    try {
      const report = buildFillReport(factura, await facturasApi.fillLog(id), draft)
      downloadJson(report, `log_llenado_factura_${factura.numero_comprobante || id}.json`)
      if (!report.llenado) toast.info(report.aviso)
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }
  if (error && !factura) {
    return <Alert type="error">{error}</Alert>
  }

  const redCount = Object.keys(draft?.campos || {}).filter(isRed).length
  const observations = (draft?.observaciones || []).filter((o) => !o.startsWith('No cuadra'))

  return (
    <div className="space-y-4">
      <Card className="animate-card-in">
        <SectionHeader
          icon={Receipt}
          eyebrow="Facturas"
          title={factura.numero_comprobante ? `Comprobante ${factura.numero_comprobante}` : 'Factura sin número'}
          subtitle={`Escaneada el ${formatDateTime(factura.created_at)}${
            factura.confirmed_at ? ` · confirmada el ${formatDateTime(factura.confirmed_at)}` : ''
          }`}
          actions={
            <>
              <FacturaStatusBadge status={factura.status} />
              <Link to="/facturas">
                <Button variant="ghost" size="sm" icon={ArrowLeft}>
                  Volver
                </Button>
              </Link>
            </>
          }
          className="mb-4"
        />

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && draft && (
            <>
              <Button icon={Save} size="sm" variant="secondary" loading={saving} disabled={!dirty} onClick={() => save(false)}>
                Guardar cambios
              </Button>
              <Button icon={CheckCircle2} size="sm" disabled={saving} onClick={() => setDialog('confirm')}>
                Confirmar factura
              </Button>
            </>
          )}
          {!readOnly && !inProgress && (
            <Button icon={RefreshCw} size="sm" variant="secondary" onClick={() => setDialog('reprocess')}>
              Reprocesar
            </Button>
          )}
          {factura.processed_at && (
            <Button
              icon={ListChecks}
              size="sm"
              variant="ghost"
              onClick={downloadFillLog}
              title="De qué lectura del OCR salió cada campo y qué se corrigió en pantalla"
            >
              Log de llenado
            </Button>
          )}
          <span className="ml-auto" />
          <Button icon={Trash2} size="sm" variant="danger" onClick={() => setDialog('delete')}>
            Eliminar
          </Button>
        </div>

        {dirty && <p className="mt-2 text-xs text-state-amber">Hay cambios sin guardar.</p>}
        {factura.status === 'failed' && (
          <Alert type="error" className="mt-3">
            {factura.error_message || 'No se pudo leer la factura.'} Puede reprocesarla.
          </Alert>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]" glass>
          <ImageViewer facturaId={id} version={factura.processed_at} />
        </Card>

        <div className="space-y-4">
          {inProgress ? (
            <Card>
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <Spinner className="h-7 w-7" />
                <p className="font-semibold text-slate-700">Leyendo la factura…</p>
                <p className="max-w-sm text-sm text-slate-500">
                  Se endereza la foto, se recorta el comprobante y se lee con OCR. Suele tardar menos de medio minuto;
                  esta pantalla se actualiza sola.
                </p>
              </div>
            </Card>
          ) : !draft ? (
            <Card>
              <p className="py-16 text-center text-sm text-slate-500">Todavía no hay datos leídos para esta factura.</p>
            </Card>
          ) : (
            <>
              <Card>
                {redCount > 0 && !readOnly && (
                  <p className="mb-3 text-xs text-state-danger">
                    {redCount} {redCount === 1 ? 'campo en rojo' : 'campos en rojo'}: se leyeron con confianza menor a 85%,
                    no se leyeron o no cuadran. Compárelos con la foto y corríjalos si hace falta (al pasar el mouse se ve
                    la confianza).
                  </p>
                )}
                <ReceiptSheet
                  campos={draft.campos}
                  confianza={draft.confianza}
                  onChange={onChange}
                  readOnly={readOnly}
                  isRed={isRed}
                  reasons={reasons}
                />
              </Card>

              <Card>
                <h3 className="mb-2 text-sm font-bold text-slate-800">Verificación de montos</h3>
                {checks.length === 0 ? (
                  <p className="text-sm text-slate-500">Faltan montos para poder verificarlos.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {checks.map((c) => (
                      <li key={c.regla} className="flex items-start gap-2 text-sm">
                        {c.ok ? (
                          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-state-success" />
                        ) : (
                          <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-state-danger" />
                        )}
                        <span>
                          <span className="font-medium text-slate-700">{c.regla}</span>
                          <span className="block text-xs text-slate-500">{c.detalle}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {observations.length > 0 && (
                  <Alert type="warning" className="mt-3">
                    <ul className="list-disc space-y-0.5 pl-4">
                      {observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        onConfirm={() => save(true)}
        title="¿Confirmar la factura?"
        message="Se guardan los datos tal como están y la factura queda cerrada: ya no se podrá editar ni reprocesar."
        confirmLabel="Confirmar"
        confirmVariant="primary"
      />
      <ConfirmDialog
        open={dialog === 'reprocess'}
        onClose={() => setDialog(null)}
        onConfirm={reprocess}
        title="¿Reprocesar la factura?"
        message="Se vuelve a leer todo desde la foto. Las correcciones guardadas y sin confirmar se descartan."
        confirmLabel="Reprocesar"
        confirmVariant="warning"
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={remove}
        title="¿Eliminar la factura?"
        message="La factura deja de aparecer en la lista."
      />
    </div>
  )
}
