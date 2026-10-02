import { ArrowLeft, Download, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DocumentStatusBadge } from '@/domains/folder-analysis/components/DocumentStatusBadge'
import { PagesViewer } from '@/domains/folder-analysis/components/PagesViewer'
import { PlanColindancias } from '@/domains/folder-analysis/components/PlanColindancias'
import { PossessorsPlanLookup } from '@/domains/folder-analysis/components/PossessorsPlanLookup'
import { ReadingProgress } from '@/domains/folder-analysis/components/ReadingProgress'
import { FolioForm } from '@/domains/folder-analysis/components/forms/FolioForm'
import { PlanPageInfo } from '@/domains/folder-analysis/components/forms/PlanPageInfo'
import { TaxReceiptForm } from '@/domains/folder-analysis/components/forms/TaxReceiptForm'
import { FieldInput } from '@/domains/folder-analysis/components/forms/FieldInput'
import { withFolioDefaults, withTaxReceiptDefaults } from '@/domains/folder-analysis/utils/formDefaults'
import { folderTypeOf, useCatalog } from '@/domains/folder-analysis/utils/catalog'
import {
  DOC_TYPE_BY_ID,
  FALLBACK_ICON,
  IN_PROGRESS,
  formatDateTime,
} from '@/domains/folder-analysis/utils/documentMeta'
import { usePollWhile } from '@/domains/folder-analysis/utils/usePollWhile'
import { Alert, Button, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

const WITH_DATA = new Set(['extracted', 'reviewed'])

function initialForm(document) {
  if (document.doc_type === 'folio') return withFolioDefaults(document.data)
  if (document.doc_type === 'tax_receipt') return withTaxReceiptDefaults(document.data)
  return document.data || {}
}

export default function DocumentReviewPage() {
  const { id } = useParams()
  const { catalog } = useCatalog()
  const [document, setDocument] = useState(null)
  const [form, setForm] = useState(null)
  const [planName, setPlanName] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmReanalyze, setConfirmReanalyze] = useState(false)
  // Bumped when the data is replaced from the server, to remount the editors.
  const [formVersion, setFormVersion] = useState(0)

  // Last status the form was built from: a background refresh with the same status
  // must not overwrite what the architect is typing.
  const formStatus = useRef(null)

  const load = useCallback(
    () =>
      folderAnalysisApi
        .document(id)
        .then((doc) => {
          if (formStatus.current !== doc.status) {
            formStatus.current = doc.status
            setForm(initialForm(doc))
            setPlanName(doc.data?.plan_name || doc.data?.name || doc.data?.title || '')
            setPageIndex(0)
            setFormVersion((v) => v + 1)
          }
          setDocument(doc)
          setError(null)
        })
        .catch((e) => setError(e.message)),
    [id]
  )

  useEffect(() => {
    load()
  }, [load])

  // While it is being analyzed the screen asks more often: the bar moves photo by
  // photo and a five second gap between answers is felt as a stall.
  usePollWhile(Boolean(document && IN_PROGRESS.has(document.status)), load, 3000)

  // Los valores que la carpeta pide de este documento: los declara el catálogo
  // para el par (tipo de carpeta, tipo de documento), y el análisis los dejó en
  // `values`. Un documento de un par que no declara nada no muestra este bloque
  // y se revisa con la vista de siempre.
  // Los `hidden` (dirección y colindancias del plano) se llenan desde el IDE y no se
  // piden acá, pero siguen en `values` para que la hoja de la carpeta los traiga.
  const values = (
    folderTypeOf(catalog, document?.folder_type)?.document_values?.[document?.doc_type] || []
  ).filter((field) => !field.hidden)

  const setValue = (key, value) =>
    setForm((previous) => ({ ...previous, values: { ...(previous?.values || {}), [key]: value } }))

  const setValues = (patch) =>
    setForm((previous) => ({ ...previous, values: { ...(previous?.values || {}), ...patch } }))

  const save = async () => {
    setSaving(true)
    try {
      const reviewedData = document.doc_type === 'plan' ? { ...form, plan_name: planName.trim() } : form
      const doc = await folderAnalysisApi.review(id, reviewedData)
      formStatus.current = doc.status
      setDocument(doc)
      setForm(doc.reviewed_data || reviewedData)
      toast.success('Datos guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const download = async () => {
    try {
      const blob = await folderAnalysisApi.exportBlob(id)
      const url = URL.createObjectURL(blob)
      const link = Object.assign(window.document.createElement('a'), {
        href: url,
        download: `${document.doc_type}-${id.slice(0, 8)}.json`,
      })
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const reanalyze = async () => {
    try {
      const doc = await folderAnalysisApi.analyze(id, document.status === 'reviewed')
      setDocument(doc)
      toast.success('Documento enviado a analizar nuevamente.')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (error && !document) {
    return (
      <Card>
        <Alert type="error">{error}</Alert>
      </Card>
    )
  }
  if (!document || !form) {
    return (
      <Card className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </Card>
    )
  }

  const type = DOC_TYPE_BY_ID[document.doc_type]
  const hasData = WITH_DATA.has(document.status)
  // What the OCR + rules reading flagged (only the lanes read on the server
  // carry it). It is a to-do list: once the architect saved the review, the
  // values were checked by a person and the marks would only be noise.
  const reading = document.status === 'extracted' ? document.data?.reading : null
  // Fields to compare against the photo: the ones the OCR was unsure about, plus
  // the ones the AI placed from the text instead of a rule.
  const flagged = [...(reading?.low_confidence_fields || []), ...(reading?.fields_filled_by_ai || [])]

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={type?.icon || FALLBACK_ICON}
        eyebrow="Analizador y extractor de datos de carpetas"
        title={`Revisión de ${type?.label || 'documento'}`}
        subtitle={
          document.reviewed_at
            ? `Revisado el ${formatDateTime(document.reviewed_at)}`
            : document.analyzed_at
              ? `Analizado el ${formatDateTime(document.analyzed_at)}`
              : 'Todavía no fue analizado'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            <Link to="/folder-analysis">
              <Button size="sm" variant="secondary" icon={ArrowLeft}>Volver</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <PagesViewer pages={document.pages} current={pageIndex} onChange={setPageIndex} />

        <div className="flex flex-col gap-4">
          {IN_PROGRESS.has(document.status) && (
            <Alert type="info">
              <p>
                {`Se está analizando ${type?.noun || 'el documento'} con OCR en el servidor.`} Esta
                pantalla se actualiza sola.
              </p>
              <ReadingProgress className="mt-2" document={document} />
            </Alert>
          )}
          {document.status === 'failed' && <Alert type="error">{document.error}</Alert>}
          {document.status === 'draft' && (
            <Alert type="info">Este documento todavía no fue analizado. Vuelva a la bandeja y presione Analizar.</Alert>
          )}
          {document.status === 'filed' && (
            <Alert type="info">
              Este documento se guarda con la carpeta y no se lee: acompaña al trámite, no tiene datos
              que extraer. Sus fotos están arriba.
            </Alert>
          )}

          {hasData && reading?.observations?.length > 0 && (
            <Alert type="warning" title="Qué revisar de esta lectura">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {reading.observations.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
              {reading.unassigned_lines?.length > 0 && (
                <p className="mt-2">
                  Líneas leídas que no se pudieron asignar a un asiento:{' '}
                  <span className="font-mono">{reading.unassigned_lines.join(' · ')}</span>
                </p>
              )}
              {reading.labels_not_found?.length > 0 && (
                <p className="mt-2">
                  Casillas cuyo rótulo no se encontró en la foto (quedaron vacías):{' '}
                  <span className="font-mono">{reading.labels_not_found.join(' · ')}</span>
                </p>
              )}
            </Alert>
          )}

          {hasData && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button icon={Save} loading={saving} onClick={save}>
                  Guardar revisión
                </Button>
                <Button variant="secondary" icon={Download} onClick={download}>Descargar JSON</Button>
                <Button variant="ghost" icon={RotateCcw} onClick={() => setConfirmReanalyze(true)}>
                  Volver a analizar
                </Button>
              </div>
              <div key={formVersion} className="max-h-[70vh] overflow-y-auto pr-1">
                {values.length > 0 && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                    <p className="text-sm font-bold text-slate-800">Datos para la carpeta</p>
                    <p className="mb-3 text-xs text-slate-500">
                      Lo que la lectura encontró en esta hoja. Lo que quedó vacío no estaba rotulado:
                      escríbalo comparando con la foto.
                    </p>
                    <div className="grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
                      {values.map((field) => (
                        <FieldInput
                          key={field.key}
                          label={field.label}
                          value={form?.values?.[field.key] ?? null}
                          onChange={(value) => setValue(field.key, value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {document.doc_type === 'plan' && (
                  <label className="mb-4 flex flex-col gap-1.5 text-sm font-semibold text-slate-700">
                    Nombre del plano
                    <input
                      value={planName}
                      onChange={(event) => setPlanName(event.target.value)}
                      placeholder="Ej.: Plano de ubicación"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-accent-500/60"
                    />
                  </label>
                )}
                {document.doc_type === 'folio' ? (
                  <FolioForm value={form} onChange={setForm} lowConfidence={flagged} />
                ) : document.doc_type === 'tax_receipt' ? (
                  <TaxReceiptForm value={form} onChange={setForm} lowConfidence={flagged} />
                ) : (
                  <PlanPageInfo key={pageIndex} value={form} onChange={setForm} pageIndex={pageIndex} />
                )}
              </div>
            </>
          )}
          {document.status === 'failed' && (
            <Button icon={RotateCcw} className="self-start" onClick={reanalyze}>Reintentar análisis</Button>
          )}
        </div>
      </div>

      {/* El plano de poseedores no se lee por sus colindancias dibujadas: trae un
          código catastral y de ahí se saca todo del IDE. El resto de planos
          sigue con la detección sobre la foto. */}
      {document.doc_type === 'plan' && document.folder_type === 'possessors' && hasData && (
        <div className="mt-5">
          <PossessorsPlanLookup
            documentId={document.id}
            code={form?.values?.cadastral_code || null}
            onCodeChange={(code) => setValue('cadastral_code', code)}
            onApply={setValues}
          />
        </div>
      )}
      {document.doc_type === 'plan' && document.folder_type !== 'possessors' && document.pages.length > 0 && (
        <div className="mt-5">
          <PlanColindancias documentId={document.id} pages={document.pages} />
        </div>
      )}

      <ConfirmDialog
        open={confirmReanalyze}
        onClose={() => setConfirmReanalyze(false)}
        onConfirm={reanalyze}
        title="¿Volver a analizar?"
        message={
          document.status === 'reviewed'
            ? 'Se descartarán las correcciones guardadas y se extraerán los datos de nuevo.'
            : 'Se extraerán los datos de nuevo desde las fotos.'
        }
        confirmLabel="Volver a analizar"
        confirmVariant="warning"
      />
    </Card>
  )
}
