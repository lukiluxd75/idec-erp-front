import { FolderSearch } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { AnalyzingDialog } from '@/domains/folder-analysis/components/AnalyzingDialog'
import { DocumentSection } from '@/domains/folder-analysis/components/DocumentSection'
import { InboxPanel } from '@/domains/folder-analysis/components/InboxPanel'
import { chunkForUpload, splitValidCaptures } from '@/domains/folder-analysis/utils/captureUpload'
import { DOC_TYPES, IN_PROGRESS } from '@/domains/folder-analysis/utils/documentMeta'
import { usePollWhile } from '@/domains/folder-analysis/utils/usePollWhile'
import { Alert, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

// A document created on screen carries this id until the server gives it its own.
const PENDING_PREFIX = 'pendiente-'

/** The bandeja's own order: newest photo first, as the server lists them. */
function byNewest(captures) {
  return [...captures].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/** The document with its pages in `ids` order, keeping what each page already had. */
function withPages(document, ids) {
  return {
    ...document,
    pages: ids.map((capture_id, page_index) => ({
      status: 'draft',
      ...document.pages.find((p) => p.capture_id === capture_id),
      capture_id,
      page_index,
    })),
  }
}

export default function FolderAnalysisPage() {
  const [captures, setCaptures] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  // Document being analyzed right now, followed in a dialog until it ends.
  const [watchedId, setWatchedId] = useState(null)

  // Moves being saved right now. A poll that started before one of them would
  // answer with a board from before the move and put the photo back in the
  // bandeja for a moment, so while a move is in flight its own answer wins.
  const movesInFlight = useRef(0)

  // `loading` only covers the first load; the polling refreshes are silent.
  const refresh = useCallback(
    () =>
      Promise.all([folderAnalysisApi.inbox(), folderAnalysisApi.documents()])
        .then(([inbox, docs]) => {
          if (movesInFlight.current > 0) return
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
  // progress both arrive by polling. While something is being analyzed it asks
  // more often, so the bar of that document advances photo by photo instead of in
  // five second steps.
  const analyzing = documents.some((d) => IN_PROGRESS.has(d.status))
  usePollWhile(true, refresh, analyzing ? 3000 : 6000)

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

  /**
   * Moving a photo out of the bandeja into a lane. The board is updated from what
   * the drop already implies and the request is sent afterwards, so the photo
   * arrives where it was dropped at once instead of after three round trips; the
   * server's own document then replaces the provisional one.
   *
   * `targetId` is the document the answer belongs to -- for a new one, the
   * provisional id it was given until the server named it -- and `undo` puts that
   * one document back. Undoing this move only, instead of restoring the whole
   * board, is what lets photos be dropped one after another without waiting: a
   * failed move must not drag the ones already on their way back with it.
   */
  const move = async (moved, change, request, targetId, undo) => {
    const ids = new Set(moved.map((c) => c.id))
    movesInFlight.current += 1
    setCaptures((prev) => prev.filter((c) => !ids.has(c.id)))
    setDocuments(change)
    try {
      const saved = await request()
      setDocuments((prev) => prev.map((d) => (d.id === targetId ? saved : d)))
    } catch (e) {
      setCaptures((prev) => byNewest([...prev.filter((c) => !ids.has(c.id)), ...moved]))
      setDocuments(undo)
      toast.error(e.message)
    } finally {
      movesInFlight.current -= 1
    }
  }

  const handlers = {
    onCreate: (docType, captureId) => {
      const now = new Date().toISOString()
      // `pending` keeps the card out of action until it has its real id.
      const opening = {
        id: `${PENDING_PREFIX}${captureId}`,
        doc_type: docType,
        status: 'draft',
        pages: [{ capture_id: captureId, page_index: 0, status: 'draft' }],
        created_at: now,
        updated_at: now,
        pending: true,
      }
      return move(
        captures.filter((c) => c.id === captureId),
        (docs) => [opening, ...docs],
        () => folderAnalysisApi.createDocument(docType, [captureId]),
        opening.id,
        (docs) => docs.filter((d) => d.id !== opening.id)
      )
    },
    onAddPage: (document, captureId) => {
      const ids = [...document.pages.map((p) => p.capture_id), captureId]
      return move(
        captures.filter((c) => c.id === captureId),
        (docs) => docs.map((d) => (d.id === document.id ? withPages(d, ids) : d)),
        () => folderAnalysisApi.setPages(document.id, ids),
        document.id,
        (docs) => docs.map((d) => (d.id === document.id ? document : d))
      )
    },
    onSetPages: (document, captureIds) => {
      // A page taken off the document goes back to the bandeja, and its row there
      // is the server's to give: that one case is followed by a refresh.
      const removed = captureIds.length < document.pages.length
      const done = move(
        [],
        (docs) => docs.map((d) => (d.id === document.id ? withPages(d, captureIds) : d)),
        () => folderAnalysisApi.setPages(document.id, captureIds),
        document.id,
        (docs) => docs.map((d) => (d.id === document.id ? document : d))
      )
      return removed ? done.then(refresh) : done
    },
    onAnalyze: (document) => {
      // Every lane is followed in the dialog: it is the only place that says
      // whether the document is still waiting its turn or already being read, and
      // how long it still needs -- a toast is gone before the answer is.
      setWatchedId(document.id)
      return run(() => folderAnalysisApi.analyze(document.id))
    },
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

  // Read from the polled list, so the dialog follows the document as it advances.
  const watched = watchedId ? documents.find((d) => d.id === watchedId) : null

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

      <AnalyzingDialog document={watched} onClose={() => setWatchedId(null)} />

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
