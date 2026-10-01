import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { AnalyzingDialog } from '@/domains/folder-analysis/components/AnalyzingDialog'
import { DocumentSection } from '@/domains/folder-analysis/components/DocumentSection'
import { InboxPanel } from '@/domains/folder-analysis/components/InboxPanel'
import { chunkForUpload, splitValidCaptures } from '@/domains/folder-analysis/utils/captureUpload'
import { DOC_TYPE_BY_ID, IN_PROGRESS } from '@/domains/folder-analysis/utils/documentMeta'
import { usePhonePresence } from '@/domains/folder-analysis/utils/usePhonePresence'
import { usePollWhile } from '@/domains/folder-analysis/utils/usePollWhile'
import { Alert, Button, ConfirmDialog, Spinner } from '@/shared/ui'

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

/**
 * Tablero de clasificación: la bandeja de fotos a un lado y los carriles al
 * otro. Es el mismo tablero dentro de una carpeta y fuera de ella.
 *
 * `folderId` es la carpeta en la que se está trabajando: los documentos que se
 * abren acá nacen dentro de ella y el tablero solo muestra los suyos. Sin él es
 * el tablero suelto, con todos los documentos del usuario.
 *
 * `types` son los carriles a mostrar -- los que el tipo de carpeta lleva, según
 * el catálogo. La bandeja, en cambio, es siempre la misma: las fotos llegan del
 * celular sin saber a qué carpeta van, y es al soltarlas en un carril cuando se
 * decide.
 *
 * `folderType` viaja con cada documento que se abre: es lo que le dice al
 * servidor qué datos sacarle al analizarlo. Dentro de una carpeta manda la suya.
 */
export function ClassificationBoard({ types, folderId = null, folderType = null, onDocumentsChange }) {
  const [captures, setCaptures] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  // Document being analyzed right now, followed in a dialog until it ends.
  const [watchedId, setWatchedId] = useState(null)

  // "Celular conectado" para la cabecera de la bandeja. El hook vive aquí, que
  // es el dueño del InboxPanel, y no en cada página: así el indicador sale
  // igual en el tablero suelto y en el de una carpeta registrada, con una sola
  // consulta en vuelo.
  const { connected: phoneConnected } = usePhonePresence()

  // Moves being saved right now. A poll that started before one of them would
  // answer with a board from before the move and put the photo back in the
  // bandeja for a moment, so while a move is in flight its own answer wins.
  const movesInFlight = useRef(0)

  // `loading` only covers the first load; the polling refreshes are silent.
  const refresh = useCallback(
    () =>
      Promise.all([folderAnalysisApi.inbox(), folderAnalysisApi.documents(folderId)])
        .then(([inbox, docs]) => {
          if (movesInFlight.current > 0) return
          setCaptures(inbox)
          setDocuments(docs)
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [folderId]
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
      onDocumentsChange?.()
    }
  }

  // Files picked in the computer's file explorer (or dropped on the inbox) go to
  // the same endpoint the mobile app uses, in batches of MAX_FILES_PER_UPLOAD.
  // A PDF comes back as one photo per page, so what arrived is counted from the
  // server's answer and not from what was sent.
  const uploadCaptures = async (picked) => {
    const { files, rejected } = splitValidCaptures(picked)
    rejected.forEach((reason) => toast.warn(reason))
    if (files.length === 0) return

    setUploading(true)
    let uploaded = 0
    try {
      for (const chunk of chunkForUpload(files)) {
        const created = await folderAnalysisApi.uploadCaptures(chunk)
        uploaded += created?.length || chunk.length
      }
      const photos = uploaded === 1 ? 'Foto subida a la bandeja.' : `${uploaded} fotos subidas a la bandeja.`
      toast.success(uploaded > files.length ? `${photos} Los PDF se separaron en una foto por página.` : photos)
    } catch (e) {
      toast.error(uploaded > 0 ? `Se subieron ${uploaded} fotos y el resto falló: ${e.message}` : e.message)
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
      onDocumentsChange?.()
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
        folder_id: folderId,
        folder_type: folderType,
        status: 'draft',
        pages: [{ capture_id: captureId, page_index: 0, status: 'draft' }],
        created_at: now,
        updated_at: now,
        pending: true,
      }
      return move(
        captures.filter((c) => c.id === captureId),
        (docs) => [opening, ...docs],
        () => folderAnalysisApi.createDocument(docType, [captureId], folderId, folderType),
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
  // Confirmed reviews belong in "Datos guardados"; keep them in the API state
  // for polling/actions, but remove them from the active workbench lanes.
  const activeDocuments = documents.filter((document) => document.status !== 'reviewed')
  // Documentos que no entran en ningún carril de los que se están mostrando:
  // quedaron clasificados con los de otro tipo de carpeta. No se perdieron, pero
  // desde acá no se ven, así que la pantalla lo dice en vez de tragárselo.
  const outsideLanes = activeDocuments.filter(
    (document) => !types.some((type) => type.id === document.doc_type)
  )
  const outsideLabels = [...new Set(outsideLanes.map((d) => DOC_TYPE_BY_ID[d.doc_type]?.label || d.doc_type))]
  // Lo que se está viendo: los documentos de estos carriles. Es lo que se
  // descarta cuando se pide empezar de nuevo.
  const onBoard = activeDocuments.filter((document) => !outsideLanes.includes(document))

  /**
   * Dejar el tablero limpio para empezar con otro juego de fotos: se eliminan los
   * documentos que se ven y las fotos de la bandeja.
   *
   * Primero los documentos y después la bandeja, porque borrar un documento
   * devuelve sus fotos a "Fotos recibidas": al revés quedarían ahí las que se
   * querían tirar. Los documentos con la revisión ya guardada no se tocan --
   * esos son trabajo terminado y viven en "Datos guardados".
   */
  const discardAll = () =>
    setConfirm({
      title: '¿Descartar todo?',
      message:
        `Se eliminan definitivamente ${onBoard.length} documento(s) del tablero con sus fotos` +
        (captures.length ? ` y las ${captures.length} foto(s) de la bandeja` : '') +
        '. Los documentos con la revisión ya guardada no se tocan: siguen en "Datos guardados".' +
        (outsideLanes.length
          ? ' Los de carriles de otro tipo de carpeta tampoco.'
          : ''),
      onConfirm: () =>
        run(async () => {
          let removed = 0
          for (const document of onBoard) {
            await folderAnalysisApi.deleteDocument(document.id)
            removed += 1
          }
          const { deleted } = await folderAnalysisApi.clearInbox()
          toast.success(`Tablero limpio: ${removed} documento(s) y ${deleted} foto(s) eliminados.`)
        }),
    })

  const clearInbox = () =>
    setConfirm({
      title: '¿Vaciar las fotos recibidas?',
      message:
        `Se eliminan definitivamente las ${captures.length} fotos que están sin clasificar. ` +
        'Las que ya forman parte de un documento no se tocan. Si las necesita, tendrá que volver a ' +
        'tomarlas con el celular o subirlas de nuevo.',
      onConfirm: () =>
        run(async () => {
          const { deleted } = await folderAnalysisApi.clearInbox()
          toast.success(deleted === 1 ? 'Se eliminó 1 foto de la bandeja.' : `Se eliminaron ${deleted} fotos de la bandeja.`)
        }),
    })

  const deleteCapture = (capture) =>
    setConfirm({
      title: '¿Eliminar foto?',
      message: 'La foto se borra definitivamente. Si la necesita, tendrá que volver a tomarla con el celular.',
      onConfirm: () => run(() => folderAnalysisApi.deleteCapture(capture.id)),
    })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert type="error">{error}</Alert>}
      {outsideLanes.length > 0 && (
        <Alert type="info">
          {outsideLanes.length === 1
            ? 'Hay 1 documento clasificado en un carril que no pertenece a este tipo de carpeta'
            : `Hay ${outsideLanes.length} documentos clasificados en carriles que no pertenecen a este tipo de carpeta`}{' '}
          ({outsideLabels.join(', ')}). Siguen guardados: cambie el tipo de carpeta para verlos.
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {captures.length} {captures.length === 1 ? 'foto en la bandeja' : 'fotos en la bandeja'} ·{' '}
          {onBoard.length} {onBoard.length === 1 ? 'documento en el tablero' : 'documentos en el tablero'}
        </p>
        {(captures.length > 0 || onBoard.length > 0) && (
          <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={discardAll}>
            Descartar todo
          </Button>
        )}
      </div>

      <div className="workbench-shell">
        <div className="workbench-board">
          <InboxPanel
            captures={captures}
            disabled={busy}
            uploading={uploading}
            onUpload={uploadCaptures}
            onSend={handlers.onCreate}
            onDelete={deleteCapture}
            onClearAll={clearInbox}
            types={types}
            phoneConnected={phoneConnected}
          />
          <div className="workbench-lanes">
            {types.map((type) => (
              <DocumentSection
                key={type.id}
                type={type}
                documents={activeDocuments.filter((d) => d.doc_type === type.id)}
                busy={busy}
                {...handlers}
              />
            ))}
          </div>
        </div>
      </div>

      <AnalyzingDialog document={watched} onClose={() => setWatchedId(null)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
      />
    </div>
  )
}
