import {
  FileSearch,
  FolderInput,
  FolderSearch,
  FolderTree,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { ReadableValue } from '@/domains/folder-analysis/components/SavedDataFields'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import {
  bySavedAtDesc,
  findRegistrationNumber,
  isRecentlySaved,
  normalizeSearch,
  savedData,
  savedDocumentHaystack,
  savedDocumentTitle,
} from '@/domains/folder-analysis/utils/savedDocuments'
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  SectionHeader,
  Select,
  Spinner,
} from '@/shared/ui'

/** Valor del filtro de carpeta para "lo que todavía no está archivado". */
const UNFILED = '__unfiled__'

/** `?carpeta=` en la URL: un id de carpeta, o "sin-archivar". */
const UNFILED_PARAM = 'sin-archivar'

/**
 * "Datos guardados": todas las revisiones confirmadas del usuario.
 *
 * Un ingeniero que escaneó varias carpetas termina con decenas de revisiones, así
 * que la lista no es plana: arriba va lo recién guardado (lo que acaba de
 * analizar, que es lo que viene a buscar) y debajo el resto agrupado por la
 * carpeta que lo tiene, que es como lo piensa. Desde aquí también se archiva un
 * documento suelto sin pasar por "Carpetas registradas".
 */
export default function SavedFolderDataPage() {
  const [searchParams] = useSearchParams()
  const [docType, setDocType] = useState('')
  // "Carpetas registradas" enlaza acá con la carpeta ya elegida; de ahí en más
  // manda el selector, así que el parámetro solo se lee al entrar.
  const [folderFilter, setFolderFilter] = useState(() => {
    const desde = searchParams.get('carpeta')
    return desde === UNFILED_PARAM ? UNFILED : desde || ''
  })
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  // Cuándo se trajo la lista: contra esta hora se mide qué es "recién guardado",
  // para que no dependa del momento en que React vuelva a dibujar.
  const [loadedAt, setLoadedAt] = useState(0)
  const [error, setError] = useState(null)
  // La revisión que se pidió borrar, junto al nombre con que se la muestra,
  // para que el diálogo pueda nombrarla.
  const [porEliminar, setPorEliminar] = useState(null)
  // El documento suelto que se está archivando: { document, nombre }.
  const [porArchivar, setPorArchivar] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    // Las carpetas vienen en la misma carga: sin ellas no se sabe dónde está
    // archivado cada documento, que es lo que ordena toda la pantalla.
    Promise.all([
      folderAnalysisApi.reviewedDocuments(docType || undefined),
      folderAnalysisApi.folders(),
    ])
      .then(([documentList, folderList]) => {
        setDocuments(documentList)
        setFolders(folderList)
        setLoadedAt(Date.now())
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [docType])

  useEffect(() => { load() }, [load])

  /** Documento archivado -> la carpeta que lo tiene. */
  const folderByDocument = useMemo(() => {
    const holders = {}
    for (const folder of folders) {
      for (const document of folder.documents || []) holders[document.id] = folder
    }
    return holders
  }, [folders])

  const filteredDocuments = useMemo(() => {
    const term = normalizeSearch(query)
    return documents.filter((document) => {
      const folder = folderByDocument[document.id]
      if (folderFilter === UNFILED && folder) return false
      if (folderFilter && folderFilter !== UNFILED && folder?.id !== folderFilter) return false
      if (!term) return true
      // El nombre de la carpeta también busca: escribir "Ballivián" trae todo lo
      // de esa carpeta aunque ningún documento diga la palabra.
      return (
        savedDocumentHaystack(document).includes(term) ||
        normalizeSearch(folder?.name).includes(term)
      )
    })
  }, [documents, query, folderFilter, folderByDocument])

  /**
   * Lo recién guardado se saca del resto y sube al tope; abajo queda agrupado por
   * carpeta, con los sueltos al final porque son los que aún hay que archivar.
   */
  const { recientes, grupos } = useMemo(() => {
    const nuevos = []
    const porCarpeta = new Map()
    for (const document of filteredDocuments) {
      if (loadedAt && isRecentlySaved(document, loadedAt)) {
        nuevos.push(document)
        continue
      }
      const folder = folderByDocument[document.id]
      const key = folder?.id || UNFILED
      if (!porCarpeta.has(key)) porCarpeta.set(key, { folder, documents: [] })
      porCarpeta.get(key).documents.push(document)
    }
    const ordenados = [...porCarpeta.values()].sort((a, b) => {
      if (!a.folder) return 1
      if (!b.folder) return -1
      return a.folder.name.localeCompare(b.folder.name, 'es', { sensitivity: 'base' })
    })
    for (const group of ordenados) group.documents.sort(bySavedAtDesc)
    return { recientes: nuevos.sort(bySavedAtDesc), grupos: ordenados }
  }, [filteredDocuments, folderByDocument, loadedAt])

  const sinArchivar = useMemo(
    () => documents.filter((document) => !folderByDocument[document.id]).length,
    [documents, folderByDocument]
  )

  // Un folio, un impuesto y un plano son el mismo documento con otro doc_type,
  // así que los tres se borran por el mismo endpoint. El backend se lleva con
  // él la fila de reviewed_* (ON DELETE CASCADE) y devuelve las fotos a
  // "Fotos recibidas", donde se las puede volver a clasificar.
  const eliminar = async ({ document, nombre }) => {
    try {
      await folderAnalysisApi.deleteDocument(document.id)
      setDocuments((prev) => prev.filter((d) => d.id !== document.id))
      // La carpeta que lo tenía se queda con una copia vieja del documento.
      setFolders((prev) =>
        prev.map((folder) => ({
          ...folder,
          documents: (folder.documents || []).filter((d) => d.id !== document.id),
        }))
      )
      toast.success(`${nombre}: revisión eliminada.`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** Archiva un documento suelto y deja la carpeta como la devolvió el backend. */
  const archivar = async (folderId) => {
    const { document, nombre } = porArchivar
    const updated = await folderAnalysisApi.addFolderDocuments(folderId, [document.id])
    setFolders((prev) => prev.map((folder) => (folder.id === updated.id ? updated : folder)))
    setPorArchivar(null)
    toast.success(`${nombre} se archivó en "${updated.name}".`)
  }

  const cardProps = (document) => ({
    document,
    folder: folderByDocument[document.id],
    onFilterFolder: setFolderFilter,
    onArchive: () =>
      setPorArchivar({ document, nombre: savedDocumentTitle(document) }),
    onDelete: () =>
      setPorEliminar({ document, nombre: savedDocumentTitle(document) }),
  })

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        icon={FolderSearch}
        eyebrow="Analizador y extractor de datos de carpetas"
        title="Datos guardados"
        subtitle="Lo recién analizado sube al tope; lo demás queda agrupado por la carpeta que lo tiene."
        actions={<>
          <Link to="/folder-analysis/folders">
            <Button variant="secondary" size="sm" icon={FolderTree}>Carpetas registradas</Button>
          </Link>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Actualizar</Button>
        </>}
      />

      <Card className="grid gap-3 sm:grid-cols-3 sm:items-end">
        <Select
          id="saved-doc-type"
          label="Tipo de documento"
          value={docType}
          onChange={(event) => setDocType(event.target.value)}
        >
          <option value="">Todos los tipos</option>
          {DOC_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </Select>
        <Select
          id="saved-folder"
          label="Carpeta"
          value={folderFilter}
          onChange={(event) => setFolderFilter(event.target.value)}
        >
          <option value="">Todas las carpetas</option>
          <option value={UNFILED}>Sin archivar ({sinArchivar})</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name} ({folder.documents?.length || 0})
            </option>
          ))}
        </Select>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700" htmlFor="saved-search">
          Buscar
          <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-accent-500/60">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              id="saved-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Matrícula, dato o nombre de carpeta…"
              className="min-w-0 flex-1 py-2.5 text-sm font-normal outline-none"
            />
          </span>
        </label>
        <p className="text-xs text-slate-500 sm:col-span-3">
          {filteredDocuments.length} {filteredDocuments.length === 1 ? 'revisión' : 'revisiones'}
          {sinArchivar > 0 && folderFilter !== UNFILED && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => setFolderFilter(UNFILED)}
                className="font-semibold text-accent-700 underline-offset-2 hover:underline"
              >
                {sinArchivar} sin archivar
              </button>
            </>
          )}
        </p>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Card className="flex justify-center py-16"><Spinner className="h-6 w-6" /></Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileSearch}
            title={documents.length ? 'No se encontraron coincidencias' : 'No hay revisiones guardadas'}
            subtitle={
              documents.length
                ? 'Pruebe con otro texto, otra carpeta u otro tipo de documento.'
                : 'Al guardar una revisión, aparecerá aquí.'
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {recientes.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-accent-600/10 p-1.5 text-accent-700">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Recién guardados
                </h2>
                <span className="text-xs text-slate-500">
                  Últimas 24 horas · {recientes.length}
                  {recientes.length === 1 ? ' revisión' : ' revisiones'}
                </span>
              </div>
              <div className="grid gap-4">
                {recientes.map((document) => (
                  <SavedDocumentCard key={document.id} highlight {...cardProps(document)} />
                ))}
              </div>
            </section>
          )}

          {grupos.map(({ folder, documents: rows }) => (
            <section key={folder?.id || UNFILED} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-brand-800/10 p-1.5 text-brand-800">
                  {folder ? <FolderTree className="h-4 w-4" aria-hidden /> : <FileSearch className="h-4 w-4" aria-hidden />}
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  {folder ? folder.name : 'Sin archivar'}
                </h2>
                <span className="text-xs text-slate-500">
                  {rows.length} {rows.length === 1 ? 'revisión' : 'revisiones'}
                </span>
                {folder && (
                  <Link
                    to={`/folder-analysis/folders/${folder.id}`}
                    className="text-xs font-semibold text-accent-700 underline-offset-2 hover:underline"
                  >
                    Abrir carpeta
                  </Link>
                )}
              </div>
              <div className="grid gap-4">
                {rows.map((document) => (
                  <SavedDocumentCard key={document.id} {...cardProps(document)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {porArchivar && (
        <ArchiveInFolderModal
          nombre={porArchivar.nombre}
          folders={folders}
          onArchive={archivar}
          onClose={() => setPorArchivar(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(porEliminar)}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title="Eliminar revisión"
        message={
          porEliminar
            ? `Se eliminarán los datos guardados de "${porEliminar.nombre}". Las fotos vuelven a "Fotos recibidas" para clasificarlas de nuevo.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}

/**
 * Una revisión guardada. Siempre dice en qué carpeta está -- aunque se la esté
 * viendo dentro de su grupo, porque buscando se la ve fuera de él -- y si no está
 * en ninguna, ofrece archivarla ahí mismo.
 */
function SavedDocumentCard({ document, folder, highlight, onFilterFolder, onArchive, onDelete }) {
  const type = DOC_TYPES.find((item) => item.id === document.doc_type)
  const data = savedData(document)
  const registrationNumber = findRegistrationNumber(data)
  const displayName = savedDocumentTitle(document)

  return (
    <Card className={`overflow-hidden p-0 ${highlight ? 'ring-1 ring-accent-400/50' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="rounded-lg bg-accent-600/10 p-2 text-accent-700"><FileSearch className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="font-bold text-slate-800">{displayName}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {type?.label || document.doc_type}{registrationNumber ? ` · Matrícula ${registrationNumber}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Guardado {formatDateTime(document.reviewed_at)} · {document.id.slice(0, 8).toUpperCase()}
            </p>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {folder ? (
                <button
                  type="button"
                  onClick={() => onFilterFolder(folder.id)}
                  title={`Ver solo lo de "${folder.name}"`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-800/20 bg-brand-800/5 px-2 py-0.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-800/10"
                >
                  <FolderTree className="h-3.5 w-3.5" aria-hidden />
                  {folder.name}
                </button>
              ) : (
                <Badge variant="warning">Sin archivar</Badge>
              )}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {!folder && (
            <Button size="sm" variant="secondary" icon={FolderInput} onClick={onArchive}>
              Archivar
            </Button>
          )}
          <Link to={`/folder-analysis/documents/${document.id}`}>
            <Button size="sm" variant="secondary">Abrir revisión</Button>
          </Link>
          <IconButton
            icon={Trash2}
            tone="danger"
            title="Eliminar revisión"
            aria-label={`Eliminar ${displayName}`}
            onClick={onDelete}
          />
        </div>
      </div>
      <details className="group">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-accent-700 hover:bg-slate-50 sm:px-5">
          <span className="group-open:hidden">Ver todos los datos guardados</span>
          <span className="hidden group-open:inline">Ocultar datos</span>
        </summary>
        <dl className="grid gap-x-6 gap-y-4 border-t border-slate-100 bg-white p-4 sm:grid-cols-2 sm:p-5">
          <ReadableValue value={data} />
        </dl>
      </details>
    </Card>
  )
}

/**
 * Archiva un documento suelto sin ir a "Carpetas registradas": se elige la
 * carpeta y se guarda. Un documento vive en una sola carpeta, así que desde aquí
 * solo se archiva lo que todavía no está en ninguna.
 */
function ArchiveInFolderModal({ nombre, folders, onArchive, onClose }) {
  const [folderId, setFolderId] = useState(folders[0]?.id || '')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onArchive(folderId)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={FolderInput} title="Archivar en una carpeta">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          <strong>{nombre}</strong> se guardará en la carpeta que elija. Un documento se archiva en
          una sola carpeta; podrá retirarlo cuando lo requiera.
        </p>
        {folders.length === 0 ? (
          <Alert type="warning">
            Todavía no hay carpetas registradas. Cree una en "Carpetas registradas" y regrese a esta pantalla.
          </Alert>
        ) : (
          <Select
            id="archive-folder"
            label="Carpeta"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            required
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name} — {folder.folder_type_label}
              </option>
            ))}
          </Select>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={!folderId}>Archivar</Button>
        </div>
      </form>
    </Modal>
  )
}
