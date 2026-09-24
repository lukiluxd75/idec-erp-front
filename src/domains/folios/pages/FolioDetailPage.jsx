import {
  ArrowLeft,
  Braces,
  Bug,
  CheckCircle2,
  FileSearch,
  FormInput,
  ListChecks,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { foliosApi } from '@/domains/folios/api/folios.api'
import { FolioForm } from '@/domains/folios/components/FolioForm'
import { FolioStatusBadge } from '@/domains/folios/components/FolioStatusBadge'
import { JsonPanel } from '@/domains/folios/components/JsonPanel'
import { PageViewer } from '@/domains/folios/components/PageViewer'
import {
  IN_PROGRESS,
  buildFillReport,
  downloadJson,
  formatDateTime,
  pathKey,
  prepareForSave,
  setAt,
} from '@/domains/folios/utils/folioData'
import { FolioFormContext } from '@/domains/folios/utils/folioFormContext'
import { useFoliosUpdates, usePollWhile } from '@/domains/folios/utils/useFoliosUpdates'
import { Alert, Button, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

function Tab({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
        active ? 'bg-brand-800 text-white' : 'text-slate-600 hover:bg-white/80'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

export default function FolioDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [folio, setFolio] = useState(null)
  const [draft, setDraft] = useState(null)
  const [dirty, setDirtyState] = useState(false)
  // Read by `load` (a stable callback) without re-creating it on every edit.
  const dirtyRef = useRef(false)
  const setDirty = useCallback((value) => {
    dirtyRef.current = value
    setDirtyState(value)
  }, [])
  const [touched, setTouched] = useState(() => new Set())
  const [tab, setTab] = useState('form')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dialog, setDialog] = useState(null) // 'confirm' | 'reprocess' | 'delete'

  // `loading` only covers the first load. A refresh (websocket / poll) never
  // overwrites unsaved edits.
  const refresh = useCallback(
    () =>
      foliosApi
        .get(id)
        .then((f) => {
          setFolio(f)
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

  const inProgress = folio ? IN_PROGRESS.has(folio.status) : false
  useFoliosUpdates(refresh)
  usePollWhile(inProgress, refresh)

  const readOnly = folio?.status === 'confirmed'
  const lowSet = useMemo(() => new Set(draft?.campos_baja_confianza || []), [draft])

  const update = useCallback((path, value, flagPath) => {
    setDraft((prev) => setAt(prev, path, value))
    setDirty(true)
    if (flagPath) setTouched((prev) => new Set(prev).add(pathKey(flagPath)))
  }, [setDirty])

  const formContext = useMemo(
    () => ({ data: draft, update, lowSet, touched, readOnly }),
    [draft, update, lowSet, touched, readOnly]
  )

  const save = async (confirm) => {
    setSaving(true)
    try {
      const f = await foliosApi.save(id, prepareForSave(draft), confirm)
      setFolio(f)
      setDraft(f.data)
      setDirty(false)
      toast.success(confirm ? 'Folio confirmado.' : 'Cambios guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const reprocess = async () => {
    try {
      const f = await foliosApi.reprocess(id)
      setFolio(f)
      setDirty(false)
      setTouched(new Set())
      toast.info('Reprocesando el folio…')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const remove = async () => {
    try {
      await foliosApi.remove(id)
      toast.success('Folio eliminado.')
      navigate('/folios')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const downloadDiagnostics = async () => {
    try {
      downloadJson(await foliosApi.diagnostics(id), `diagnostico_folio_${folio.matricula || id}.json`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const downloadFillLog = async () => {
    try {
      const report = buildFillReport(folio, await foliosApi.fillLog(id), draft)
      downloadJson(report, `log_llenado_folio_${folio.matricula || id}.json`)
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
  if (error && !folio) {
    return <Alert type="error">{error}</Alert>
  }

  const observations = draft?.observaciones || []
  const jsonName = `folio_${draft?.matricula?.numero || id}.json`

  return (
    <div className="space-y-4">
      <Card className="animate-card-in">
        <SectionHeader
          icon={FileSearch}
          eyebrow="Detección de Folios"
          title={folio.matricula ? `Matrícula ${folio.matricula}` : 'Folio sin matrícula'}
          subtitle={`Escaneado el ${formatDateTime(folio.created_at)} · ${folio.page_count} ${
            folio.page_count === 1 ? 'página' : 'páginas'
          }${folio.confirmed_at ? ` · confirmado el ${formatDateTime(folio.confirmed_at)}` : ''}`}
          actions={
            <>
              <FolioStatusBadge status={folio.status} />
              <Link to="/folios">
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
                Confirmar folio
              </Button>
            </>
          )}
          {!readOnly && !inProgress && (
            <Button icon={RefreshCw} size="sm" variant="secondary" onClick={() => setDialog('reprocess')}>
              Reprocesar
            </Button>
          )}
          {folio.processed_at && (
            <>
              <Button
                icon={ListChecks}
                size="sm"
                variant="ghost"
                onClick={downloadFillLog}
                title="De qué texto salió cada campo y qué se corrigió en pantalla"
              >
                Log de llenado
              </Button>
              <Button icon={Bug} size="sm" variant="ghost" onClick={downloadDiagnostics}>
                Descargar diagnóstico
              </Button>
            </>
          )}
          <span className="ml-auto" />
          <Button icon={Trash2} size="sm" variant="danger" onClick={() => setDialog('delete')}>
            Eliminar
          </Button>
        </div>

        {dirty && <p className="mt-2 text-xs text-state-amber">Hay cambios sin guardar.</p>}
        {folio.status === 'failed' && (
          <Alert type="error" className="mt-3">
            {folio.error_message || 'No se pudo procesar el folio.'} Puede reprocesarlo.
          </Alert>
        )}
        {observations.length > 0 && !inProgress && (
          <Alert type="warning" className="mt-3">
            <ul className="list-disc space-y-0.5 pl-4">
              {observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Card className="lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]" glass>
          <PageViewer folioId={id} pages={folio.pages} version={folio.processed_at} />
        </Card>

        <Card>
          {inProgress ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Spinner className="h-7 w-7" />
              <p className="font-semibold text-slate-700">Detectando los datos del folio…</p>
              <p className="max-w-sm text-sm text-slate-500">
                Se endereza cada página, se ubican las columnas y se leen con OCR. Suele tardar menos de un minuto; esta
                pantalla se actualiza sola.
              </p>
            </div>
          ) : !draft ? (
            <p className="py-16 text-center text-sm text-slate-500">Todavía no hay datos detectados para este folio.</p>
          ) : (
            <>
              <div className="mb-4 flex gap-1 rounded-xl bg-slate-100/70 p-1">
                <Tab active={tab === 'form'} icon={FormInput} onClick={() => setTab('form')}>
                  Datos
                </Tab>
                <Tab active={tab === 'json'} icon={Braces} onClick={() => setTab('json')}>
                  JSON
                </Tab>
              </div>
              {tab === 'form' ? (
                <FolioFormContext.Provider value={formContext}>
                  <FolioForm />
                </FolioFormContext.Provider>
              ) : (
                <JsonPanel data={prepareForSave(draft)} filename={jsonName} />
              )}
            </>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={dialog === 'confirm'}
        onClose={() => setDialog(null)}
        onConfirm={() => save(true)}
        title="¿Confirmar el folio?"
        message="Se guardan los datos tal como están y el folio queda cerrado: ya no se podrá editar ni reprocesar."
        confirmLabel="Confirmar"
        confirmVariant="primary"
      />
      <ConfirmDialog
        open={dialog === 'reprocess'}
        onClose={() => setDialog(null)}
        onConfirm={reprocess}
        title="¿Reprocesar el folio?"
        message="Se vuelve a detectar todo desde las fotos. Las correcciones guardadas y sin confirmar se descartan."
        confirmLabel="Reprocesar"
        confirmVariant="warning"
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={remove}
        title="¿Eliminar el folio?"
        message="El folio deja de aparecer en la lista."
      />
    </div>
  )
}
