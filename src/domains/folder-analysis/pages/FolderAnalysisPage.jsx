import { FolderSearch } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DocumentSection } from '@/domains/folder-analysis/components/DocumentSection'
import { InboxPanel } from '@/domains/folder-analysis/components/InboxPanel'
import { DOC_TYPES } from '@/domains/folder-analysis/utils/documentMeta'
import { usePollWhile } from '@/domains/folder-analysis/utils/usePollWhile'
import { Alert, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

export default function FolderAnalysisPage() {
  const [captures, setCaptures] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
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

  const handlers = {
    onCreate: (docType, captureId) => run(() => folderAnalysisApi.createDocument(docType, [captureId])),
    onAddPage: (document, captureId) =>
      run(() => folderAnalysisApi.setPages(document.id, [...document.pages.map((p) => p.capture_id), captureId])),
    onSetPages: (document, captureIds) => run(() => folderAnalysisApi.setPages(document.id, captureIds)),
    onAnalyze: (document) =>
      run(
        () => folderAnalysisApi.analyze(document.id),
        'Documento enviado a analizar. Los datos aparecerán en unos minutos.'
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
        subtitle="Las fotos que usted toma con la aplicación móvil llegan a la bandeja. Arrástrelas al apartado que corresponda y presione Analizar."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Alert type="error">{error}</Alert>}
          <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
            <InboxPanel
              captures={captures}
              disabled={busy}
              onSend={handlers.onCreate}
              onDelete={deleteCapture}
            />
            <div className="grid gap-4 xl:grid-cols-3">
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
