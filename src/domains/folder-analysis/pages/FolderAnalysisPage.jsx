import { FolderSearch } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DocumentSection } from '@/domains/folder-analysis/components/DocumentSection'
import { InboxPanel } from '@/domains/folder-analysis/components/InboxPanel'
import { chunkForUpload, splitValidCaptures } from '@/domains/folder-analysis/utils/captureUpload'
import { DOC_TYPES } from '@/domains/folder-analysis/utils/documentMeta'
import { usePollWhile } from '@/domains/folder-analysis/utils/usePollWhile'
import { Alert, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

export default function FolderAnalysisPage() {
  const [captures, setCaptures] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)

  // `loading` only covers the first load; the polling refreshes are silent.
  const refresh = useCallback(
    () =>
      Promise.all([folderAnalysisApi.inbox(), folderAnalysisApi.documents()])
        .then(([inbox, docs]) => {
          setCaptures(inbox)
          setDocuments(docs)
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  // Always on while the screen is open: new photos from the phone and the analysis
  // progress both arrive by polling.
  usePollWhile(true, refresh)

  const run = async (action, successMessage) => {
    setBusy(true)
    try {
      await action()
      if (successMessage) toast.success(successMessage)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
      refresh()
    }
  }

  // Photos picked in the computer's file explorer (or dropped on the inbox) go to the
  // same endpoint the mobile app uses, in batches of MAX_FILES_PER_UPLOAD.
  const uploadCaptures = async (picked) => {
    const { files, rejected } = splitValidCaptures(picked)
    rejected.forEach((reason) => toast.warn(reason))
    if (files.length === 0) return

    setUploading(true)
    let uploaded = 0
    try {
      for (const chunk of chunkForUpload(files)) {
        await folderAnalysisApi.uploadCaptures(chunk)
        uploaded += chunk.length
      }
      toast.success(uploaded === 1 ? 'Foto subida a la bandeja.' : `${uploaded} fotos subidas a la bandeja.`)
    } catch (e) {
      toast.error(uploaded > 0 ? `Se subieron ${uploaded} de ${files.length} fotos: ${e.message}` : e.message)
    } finally {
      setUploading(false)
      refresh()
    }
  }

  const handlers = {
    onCreate: (docType, captureId) => run(() => folderAnalysisApi.createDocument(docType, [captureId])),
    onAddPage: (document, captureId) =>
      run(() => folderAnalysisApi.setPages(document.id, [...document.pages.map((p) => p.capture_id), captureId])),
    onSetPages: (document, captureIds) => run(() => folderAnalysisApi.setPages(document.id, captureIds)),
    onAnalyze: (document) =>
      run(
        () => folderAnalysisApi.analyze(document.id),
        document.doc_type === 'folio'
          ? 'Leyendo el folio. Los datos aparecerán en menos de un minuto.'
          : 'Documento enviado a analizar. Los datos aparecerán en unos minutos.'
      ),
    onDelete: (document) =>
      setConfirm({
        title: '¿Eliminar documento?',
        message:
          document.status === 'reviewed'
            ? 'Se perderán los datos revisados. Las fotos vuelven a "Fotos recibidas".'
            : 'Las fotos vuelven a "Fotos recibidas" para que pueda clasificarlas de nuevo.',
        onConfirm: () => run(() => folderAnalysisApi.deleteDocument(document.id)),
      }),
  }

  const deleteCapture = (capture) =>
    setConfirm({
      title: '¿Eliminar foto?',
      message: 'La foto se borra definitivamente. Si la necesita, tendrá que volver a tomarla con el celular.',
      onConfirm: () => run(() => folderAnalysisApi.deleteCapture(capture.id)),
    })

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FolderSearch}
        eyebrow="Herramientas OCR+IA"
        title="Analizador y extractor de datos de carpetas"
        subtitle="Tablero de clasificación: bandeja a la izquierda y carriles Folio, Impuesto y Plano (vista en filas, no tarjetas de módulo)."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <div className="workbench-shell">
            <div className="workbench-board">
              <InboxPanel
                captures={captures}
                disabled={busy}
                uploading={uploading}
                onUpload={uploadCaptures}
                onSend={handlers.onCreate}
                onDelete={deleteCapture}
              />
              <div className="workbench-lanes">
                {DOC_TYPES.map((type) => (
                  <DocumentSection
                    key={type.id}
                    type={type}
                    documents={documents.filter((d) => d.doc_type === type.id)}
                    busy={busy}
                    {...handlers}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
      />
    </Card>
  )
}
