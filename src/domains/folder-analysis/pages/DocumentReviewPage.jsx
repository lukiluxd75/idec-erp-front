import { ArrowLeft, Download, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DocumentStatusBadge } from '@/domains/folder-analysis/components/DocumentStatusBadge'
import { PagesViewer } from '@/domains/folder-analysis/components/PagesViewer'
import { ReadingProgress } from '@/domains/folder-analysis/components/ReadingProgress'
import { FolioForm } from '@/domains/folder-analysis/components/forms/FolioForm'
import { JsonEditor } from '@/domains/folder-analysis/components/forms/JsonEditor'
import { TaxReceiptForm } from '@/domains/folder-analysis/components/forms/TaxReceiptForm'
import { withFolioDefaults, withTaxReceiptDefaults } from '@/domains/folder-analysis/utils/formDefaults'
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
  const [document, setDocument] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [jsonInvalid, setJsonInvalid] = useState(false)
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

  usePollWhile(Boolean(document && IN_PROGRESS.has(document.status)), load)

  const save = async () => {
    setSaving(true)
    try {
      const doc = await folderAnalysisApi.review(id, form)
      formStatus.current = doc.status
      setDocument(doc)
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
  // What the OCR + rules reading flagged (only folios read on the server carry
  // it). It is a to-do list: once the architect saved the review, the values
  // were checked by a person and the marks would only be noise.
  const reading = document.status === 'extracted' ? document.data?.reading : null

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
        <PagesViewer pages={document.pages} />

        <div className="flex flex-col gap-4">
          {IN_PROGRESS.has(document.status) && (
            <Alert type="info">
              {document.doc_type === 'folio' ? (
                <>
                  <p>El folio se está leyendo con OCR en el servidor. Esta pantalla se actualiza sola.</p>
                  <ReadingProgress className="mt-2" pages={document.pages} />
                </>
              ) : (
                'El documento se está analizando en las PCs de los arquitectos. Esta pantalla se actualiza sola.'
              )}
            </Alert>
          )}
          {document.status === 'failed' && <Alert type="error">{document.error}</Alert>}
          {document.status === 'draft' && (
            <Alert type="info">Este documento todavía no fue analizado. Vuelva a la bandeja y presione Analizar.</Alert>
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
            </Alert>
          )}

          {hasData && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button icon={Save} loading={saving} disabled={jsonInvalid} onClick={save}>
                  Guardar revisión
                </Button>
                <Button variant="secondary" icon={Download} onClick={download}>Descargar JSON</Button>
                <Button variant="ghost" icon={RotateCcw} onClick={() => setConfirmReanalyze(true)}>
                  Volver a analizar
                </Button>
              </div>
              <div key={formVersion} className="max-h-[70vh] overflow-y-auto pr-1">
                {document.doc_type === 'folio' ? (
                  <FolioForm value={form} onChange={setForm} lowConfidence={reading?.low_confidence_fields} />
                ) : document.doc_type === 'tax_receipt' ? (
                  <TaxReceiptForm value={form} onChange={setForm} />
                ) : (
                  <JsonEditor value={form} onChange={setForm} onInvalid={setJsonInvalid} />
                )}
              </div>
            </>
          )}
          {document.status === 'failed' && (
            <Button icon={RotateCcw} className="self-start" onClick={reanalyze}>Reintentar análisis</Button>
          )}
        </div>
      </div>

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
