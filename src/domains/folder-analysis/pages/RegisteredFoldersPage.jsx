import {
  ChevronRight,
  Download,
  FileSearch,
  FileSpreadsheet,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { ReadableValue } from '@/domains/folder-analysis/components/SavedDataFields'
import { SavedDocumentPicker } from '@/domains/folder-analysis/components/SavedDocumentPicker'
import { FolderSheet } from '@/domains/folder-analysis/components/FolderSheet'
import { DOC_TYPES, LANE_THEME, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { folderTypeOf, sheetForm, useCatalog } from '@/domains/folder-analysis/utils/catalog'
import { pendingFills, sheetSuggestions } from '@/domains/folder-analysis/utils/folderSheetFill'
import {
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
  Input,
  Modal,
  SectionHeader,
  Select,
  Spinner,
} from '@/shared/ui'

const MAX_NAME_LENGTH = 120
const MAX_NOTES_LENGTH = 500

/** "2 folios · 1 impuesto", skipping the types the carpeta does not hold. */
function countsLabel(countsByType) {
  return DOC_TYPES.filter((type) => countsByType?.[type.id])
    .map((type) => {
      const count = countsByType[type.id]
      return `${count} ${count === 1 ? type.label.toLowerCase() : `${type.label.toLowerCase()}s`}`
    })
    .join(' · ')
}

/**
 * "Carpetas registradas" — submódulo de "Datos guardados". El usuario le pone
 * nombre a cada proyecto y archiva en él los documentos ya solucionados (folios,
 * impuestos y planos), de modo que las revisiones dejen de ser una lista plana y
 * queden agrupadas por carpeta.
 *
 * Un documento se archiva en una sola carpeta (el backend lo impone), así que el
 * selector muestra deshabilitados los que ya están en otra, nombrándola.
 */
export default function RegisteredFoldersPage() {
  const { catalog } = useCatalog()
  const [folders, setFolders] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  // null = cerrado; { folder: null } = carpeta nueva; { folder } = editando esa.
  const [editing, setEditing] = useState(null)
  const [porEliminar, setPorEliminar] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([folderAnalysisApi.folders(), folderAnalysisApi.reviewedDocuments()])
      .then(([folderList, documentList]) => {
        setFolders(folderList)
        setDocuments(documentList)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  /** Documento archivado -> nombre de la carpeta que lo tiene. */
  const holderByDocument = useMemo(() => {
    const holders = {}
    for (const folder of folders) {
      for (const document of folder.documents) holders[document.id] = folder.name
    }
    return holders
  }, [folders])

  const unfiledCount = documents.filter((document) => !holderByDocument[document.id]).length

  const filteredFolders = useMemo(() => {
    const term = normalizeSearch(query)
    if (!term) return folders
    return folders.filter(
      (folder) =>
        normalizeSearch(`${folder.name} ${folder.notes || ''}`).includes(term) ||
        folder.documents.some((document) => savedDocumentHaystack(document).includes(term))
    )
  }, [folders, query])

  /** Reemplaza una carpeta con la versión que devolvió el backend. */
  const replaceFolder = (folder) =>
    setFolders((prev) => prev.map((current) => (current.id === folder.id ? folder : current)))

  const saved = (folder, isNew) => {
    setFolders((prev) =>
      [...prev.filter((current) => current.id !== folder.id), folder].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      )
    )
    setEditing(null)
    toast.success(isNew ? `Carpeta "${folder.name}" creada.` : `Carpeta "${folder.name}" actualizada.`)
  }

  const eliminar = async ({ folder }) => {
    try {
      await folderAnalysisApi.deleteFolder(folder.id)
      setFolders((prev) => prev.filter((current) => current.id !== folder.id))
      toast.success(`Carpeta "${folder.name}" eliminada. Sus documentos siguen en Datos guardados.`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const quitar = async (folder, document) => {
    try {
      replaceFolder(await folderAnalysisApi.removeFolderDocument(folder.id, document.id))
      toast.success(`${savedDocumentTitle(document)} salió de "${folder.name}".`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        icon={FolderTree}
        eyebrow="Analizador y extractor de datos de carpetas"
        title="Carpetas registradas"
        subtitle="Cada carpeta es un trámite: su tipo decide qué documentos lleva y qué datos se le sacan. Ábrela para cargarle las fotos y trabajar sus documentos dentro."
        actions={<>
          <Link to="/folder-analysis/saved">
            <Button variant="ghost" size="sm" icon={FileSpreadsheet}>Datos guardados</Button>
          </Link>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Actualizar</Button>
          <Button size="sm" icon={FolderPlus} onClick={() => setEditing({ folder: null })}>Nueva carpeta</Button>
        </>}
      />

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <label
          htmlFor="folders-search"
          className="flex w-full flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-accent-500/60 sm:w-auto sm:min-w-[240px]"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            id="folders-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por carpeta, matrícula o datos…"
            className="min-w-0 flex-1 py-2.5 text-sm outline-none"
          />
        </label>
        <p className="text-xs text-slate-500">
          {filteredFolders.length} {filteredFolders.length === 1 ? 'carpeta' : 'carpetas'} ·{' '}
          {unfiledCount === 0 ? (
            'todo archivado'
          ) : (
            <Link
              to="/folder-analysis/saved?carpeta=sin-archivar"
              className="font-semibold text-accent-700 underline-offset-2 hover:underline"
            >
              {unfiledCount} {unfiledCount === 1 ? 'documento sin archivar' : 'documentos sin archivar'}
            </Link>
          )}
        </p>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Card className="flex justify-center py-16"><Spinner className="h-6 w-6" /></Card>
      ) : filteredFolders.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderTree}
            title={folders.length ? 'Ninguna carpeta coincide' : 'Todavía no hay carpetas registradas'}
            subtitle={
              folders.length
                ? 'Prueba con otro texto.'
                : 'Crea una carpeta, elige de qué trámite es y ábrela para cargarle sus fotos.'
            }
          >
            {folders.length === 0 && (
              <Button className="mt-4" icon={FolderPlus} onClick={() => setEditing({ folder: null })}>
                Nueva carpeta
              </Button>
            )}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              catalog={catalog}
              onEdit={() => setEditing({ folder })}
              onDelete={() => setPorEliminar({ folder })}
              onRemoveDocument={(document) => quitar(folder, document)}
            />
          ))}
        </div>
      )}

      {editing && (
        <FolderFormModal
          folder={editing.folder}
          catalog={catalog}
          documents={documents}
          holderByDocument={holderByDocument}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}

      <ConfirmDialog
        open={Boolean(porEliminar)}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => eliminar(porEliminar)}
        title="Eliminar carpeta"
        message={
          porEliminar
            ? `Se eliminará la carpeta "${porEliminar.folder.name}". Los ${porEliminar.folder.document_count} documento(s) que contiene no se borran: vuelven a quedar sin archivar en "Datos guardados".`
            : ''
        }
        confirmLabel="Eliminar carpeta"
      />
    </div>
  )
}

/**
 * Una carpeta cerrada: se ve el nombre y cuántos documentos tiene, y hay que
 * apretarla para que aparezca lo que archiva. Así la pantalla se lee como un
 * estante de carpetas y no como la lista de revisiones que ya es "Datos
 * guardados".
 */
function FolderCard({ folder, catalog, onEdit, onDelete, onRemoveDocument }) {
  const [open, setOpen] = useState(false)
  const counts = countsLabel(folder.counts_by_type)
  const panelId = `folder-${folder.id}-documents`
  const type = folderTypeOf(catalog, folder.folder_type)
  // Lo cargado de su hoja, para verlo sin tener que abrir la carpeta.
  const filled = (type?.field_groups || [])
    .flatMap((group) => group.fields)
    .filter((field) => field.source !== 'fixed' && folder.data?.[field.key])

  return (
    <Card className="overflow-hidden p-0">
      <div className={`flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-4 py-3 sm:px-5 ${open ? 'border-b border-slate-100' : ''}`}>
        {/* El botón ocupa toda la fila para que apretar la carpeta la abra,
            pero deja fuera Editar/Eliminar: no deben abrirla al pulsarlas. */}
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/40"
        >
          <span className="rounded-lg bg-brand-800/10 p-2 text-brand-800"><FolderTree className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-slate-800">{folder.name}</span>
            {folder.notes && <span className="mt-0.5 block text-sm text-slate-600">{folder.notes}</span>}
            <span className="mt-1 block text-xs text-slate-500">
              {folder.document_count === 0 ? 'Carpeta vacía' : counts} · Creada {formatDateTime(folder.created_at)}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="accent">{folder.folder_type_label}</Badge>
              {type && (
                <span className="text-[11px] text-slate-500">
                  {filled.length} de {type.field_groups.flatMap((g) => g.fields).length} datos cargados
                </span>
              )}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 pr-1 text-xs font-semibold text-accent-700">
            {open ? 'Ocultar' : folder.document_count === 0 ? 'Abrir' : `Ver ${folder.document_count}`}
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden />
          </span>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <Link to={`/folder-analysis/folders/${folder.id}`}>
            <Button size="sm" icon={FolderOpen}>Abrir</Button>
          </Link>
          <Button size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>Editar</Button>
          <IconButton
            icon={Trash2}
            tone="danger"
            title="Eliminar carpeta"
            aria-label={`Eliminar la carpeta ${folder.name}`}
            onClick={onDelete}
          />
        </div>
      </div>

      {open && (
        <div id={panelId}>
          {folder.document_count === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500 sm:px-5">
              Todavía no hay documentos en esta carpeta. <strong>Ábrela</strong> para cargarle fotos, o
              usa <strong>Editar</strong> para archivar en ella documentos ya revisados.
            </p>
          ) : (
            <div className="grid gap-2 p-4 sm:p-5">
              {folder.documents.map((document) => (
                <FolderDocumentRow
                  key={document.id}
                  document={document}
                  onRemove={() => onRemoveDocument(document)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/** Un documento archivado: cómo se llama, y sus datos guardados a un clic. */
function FolderDocumentRow({ document, onRemove }) {
  const type = DOC_TYPES.find((item) => item.id === document.doc_type)
  const TypeIcon = type?.icon || FileSearch
  const data = savedData(document)

  return (
    <div
      className={`overflow-hidden rounded-xl border-l-4 bg-white ring-1 ring-slate-200 ${
        LANE_THEME[document.doc_type]?.workAccent || 'border-l-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <TypeIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{savedDocumentTitle(document)}</p>
            <p className="text-xs text-slate-500">
              {type?.label || document.doc_type} · Guardado {formatDateTime(document.reviewed_at)}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Link to={`/folder-analysis/documents/${document.id}`}>
            <Button size="sm" variant="secondary">Abrir revisión</Button>
          </Link>
          <IconButton
            icon={X}
            title="Quitar de la carpeta"
            aria-label={`Quitar ${savedDocumentTitle(document)} de la carpeta`}
            onClick={onRemove}
          />
        </div>
      </div>
      <details className="group border-t border-slate-100">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-accent-700 hover:bg-slate-50">
          <span className="group-open:hidden">Ver datos guardados</span>
          <span className="hidden group-open:inline">Ocultar datos</span>
        </summary>
        <dl className="grid gap-x-6 gap-y-4 border-t border-slate-100 bg-white p-3 sm:grid-cols-2">
          <ReadableValue value={data} />
        </dl>
      </details>
    </div>
  )
}

/**
 * Crea o edita una carpeta: de qué trámite es, cómo se llama, su hoja de datos y
 * qué documentos ya revisados se archivan en ella.
 *
 * El tipo se elige al crearla y después no se cambia: sus documentos ya se
 * clasificaron con los carriles de ese tipo y su hoja se llenó con sus campos.
 * Ni los campos ni los tipos están escritos acá -- llegan del catálogo.
 */
function FolderFormModal({ folder, catalog, documents, holderByDocument, onClose, onSaved }) {
  // Se monta solo mientras está abierto (ver arriba), así que los campos arrancan
  // de la carpeta que se está editando y no hace falta reiniciarlos.
  const [name, setName] = useState(folder?.name || '')
  const [notes, setNotes] = useState(folder?.notes || '')
  const [typeKey, setTypeKey] = useState(
    () => folder?.folder_type || catalog?.folder_types?.[0]?.key || ''
  )
  const [sheet, setSheet] = useState(() => folder?.data || {})
  const [selectedIds, setSelectedIds] = useState(
    () => folder?.documents.map((document) => document.id) || []
  )
  const [saving, setSaving] = useState(false)

  const type = folderTypeOf(catalog, typeKey)
  // Cambiar de tipo al crear rearma la hoja: los campos son otros.
  const elegirTipo = (key) => {
    setTypeKey(key)
    setSheet((previous) => sheetForm(folderTypeOf(catalog, key), previous))
  }

  const cambiarCampo = (key, value) => setSheet((previous) => ({ ...previous, [key]: value }))

  // Lo que los documentos ya revisados de la carpeta traen para su hoja. Una
  // carpeta nueva no tiene ninguno todavía, así que no ofrece nada.
  const suggestions = useMemo(
    () => sheetSuggestions(type, folder?.documents),
    [type, folder]
  )
  const pendientes = pendingFills(sheet, suggestions)

  const traerTodo = () =>
    setSheet((previous) => ({
      ...previous,
      ...Object.fromEntries(pendientes.map(([key, suggestion]) => [key, suggestion.value])),
    }))

  const filedElsewhere = useMemo(() => {
    const own = new Set(folder?.documents.map((document) => document.id) || [])
    return Object.fromEntries(
      Object.entries(holderByDocument).filter(([documentId]) => !own.has(documentId))
    )
  }, [holderByDocument, folder])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = { name, notes, data: sheet, documentIds: selectedIds, folderType: typeKey }
      const result = folder
        ? await folderAnalysisApi.updateFolder(folder.id, payload)
        : await folderAnalysisApi.createFolder(payload)
      onSaved(result, !folder)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={folder ? Pencil : FolderPlus}
      title={folder ? `Editar "${folder.name}"` : 'Nueva carpeta registrada'}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="folder-name"
            label="Nombre de la carpeta"
            placeholder="Ej.: Av. Ballivián 220 — ampliación"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME_LENGTH}
            required
            autoFocus
          />
          {folder ? (
            <div className="flex flex-col justify-center">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Tipo de carpeta</span>
              <span className="flex items-center gap-2">
                <Badge variant="accent">{folder.folder_type_label}</Badge>
                <span className="text-xs text-slate-500">
                  El tipo no se cambia: sus documentos ya se clasificaron con él.
                </span>
              </span>
            </div>
          ) : (
            <Select
              id="folder-type"
              label="Tipo de carpeta"
              value={typeKey}
              onChange={(event) => elegirTipo(event.target.value)}
              required
            >
              {(catalog?.folder_types || []).map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </Select>
          )}
          <Input
            id="folder-notes"
            label="Descripción (opcional)"
            placeholder="Ej.: Trámite de aprobación 2026"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={MAX_NOTES_LENGTH}
            containerClassName="sm:col-span-2"
          />
        </div>

        {type && <p className="-mt-1 text-xs text-slate-500">{type.description}</p>}

        {type?.field_groups?.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Datos de la carpeta</p>
              {pendientes.length > 0 && (
                <Button type="button" size="sm" variant="secondary" icon={Download} onClick={traerTodo}>
                  Traer {pendientes.length} de los documentos
                </Button>
              )}
            </div>
            <FolderSheet
              folderType={type}
              value={sheet}
              onChange={cambiarCampo}
              suggestions={suggestions}
              onApply={cambiarCampo}
            />
          </div>
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Documentos de la carpeta</p>
          <p className="mb-2.5 text-xs text-slate-500">
            Solo aparecen los documentos con la revisión ya guardada, para archivar acá alguno que se
            haya resuelto fuera de la carpeta. Los que se abran dentro de ella ya están adentro y no
            salen de aquí. Un documento se archiva en una sola carpeta; si está en otra, aquí se
            indica cuál.
          </p>
          <SavedDocumentPicker
            documents={documents}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
            filedElsewhere={filedElsewhere}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            {folder ? 'Guardar cambios' : 'Crear carpeta'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
