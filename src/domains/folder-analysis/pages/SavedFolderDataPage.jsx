import { FileSearch, FolderSearch, FolderTree, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { ReadableValue } from '@/domains/folder-analysis/components/SavedDataFields'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import {
  findRegistrationNumber,
  normalizeSearch,
  savedData,
  savedDocumentHaystack,
  savedDocumentTitle,
} from '@/domains/folder-analysis/utils/savedDocuments'
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  SectionHeader,
  Spinner,
} from '@/shared/ui'

export default function SavedFolderDataPage() {
  const [docType, setDocType] = useState('')
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // La revisión que se pidió borrar, junto al nombre con que se la muestra,
  // para que el diálogo pueda nombrarla.
  const [porEliminar, setPorEliminar] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    folderAnalysisApi.reviewedDocuments(docType || undefined)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [docType])

  useEffect(() => { load() }, [load])

  const filteredDocuments = useMemo(() => {
    const term = normalizeSearch(query)
    if (!term) return documents
    return documents.filter((document) => savedDocumentHaystack(document).includes(term))
  }, [documents, query])

  // Un folio, un impuesto y un plano son el mismo documento con otro doc_type,
  // así que los tres se borran por el mismo endpoint. El backend se lleva con
  // él la fila de reviewed_* (ON DELETE CASCADE) y devuelve las fotos a
  // "Fotos recibidas", donde se las puede volver a clasificar.
  const eliminar = async ({ document, nombre }) => {
    try {
      await folderAnalysisApi.deleteDocument(document.id)
      setDocuments((prev) => prev.filter((d) => d.id !== document.id))
      toast.success(`${nombre}: revisión eliminada.`)
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader icon={FolderSearch} eyebrow="Analizador y extractor de datos de carpetas" title="Datos guardados"
        subtitle="Consulta rápidamente las revisiones confirmadas y sus datos principales."
        actions={<>
          <Link to="/folder-analysis/folders">
            <Button variant="secondary" size="sm" icon={FolderTree}>Carpetas registradas</Button>
          </Link>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Actualizar</Button>
        </>} />

      <Card className="grid gap-3 sm:grid-cols-[minmax(180px,0.7fr)_minmax(240px,1.3fr)] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="saved-doc-type">Tipo de documento
          <select id="saved-doc-type" value={docType} onChange={(event) => setDocType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-accent-500/60">
            <option value="">Todos los tipos</option>{DOC_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="saved-search">Buscar por matrícula
          <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-accent-500/60">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input id="saved-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe el número de matrícula…"
              className="min-w-0 flex-1 py-2.5 font-normal outline-none" />
          </span>
        </label>
        <p className="text-xs text-slate-500 sm:col-span-2">{filteredDocuments.length} {filteredDocuments.length === 1 ? 'revisión' : 'revisiones'}</p>
      </Card>

      {error && <Alert type="error">{error}</Alert>}
      {loading ? <Card className="flex justify-center py-16"><Spinner className="h-6 w-6" /></Card> : filteredDocuments.length === 0 ? (
        <Card><EmptyState icon={FileSearch} title={documents.length ? 'No se encontraron coincidencias' : 'No hay revisiones guardadas'}
          subtitle={documents.length ? 'Prueba con otro texto o cambia el tipo de documento.' : 'Al guardar una revisión, aparecerá aquí.'} /></Card>
      ) : <div className="grid gap-4">{filteredDocuments.map((document) => {
        const type = DOC_TYPES.find((item) => item.id === document.doc_type)
        const data = savedData(document)
        const registrationNumber = findRegistrationNumber(data)
        const displayName = savedDocumentTitle(document)
        return <Card key={document.id} className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-lg bg-accent-600/10 p-2 text-accent-700"><FileSearch className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="font-bold text-slate-800">{displayName}</p>
                <p className="mt-0.5 text-xs text-slate-500">{type?.label || document.doc_type}{registrationNumber ? ` · Matrícula ${registrationNumber}` : ''}</p>
                <p className="mt-0.5 text-xs text-slate-500">Guardado {formatDateTime(document.reviewed_at)} · {document.id.slice(0, 8).toUpperCase()}</p></div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link to={`/folder-analysis/documents/${document.id}`}><Button size="sm" variant="secondary">Abrir revisión</Button></Link>
              <IconButton icon={Trash2} tone="danger" title="Eliminar revisión"
                aria-label={`Eliminar ${displayName}`}
                onClick={() => setPorEliminar({ document, nombre: displayName })} />
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
      })}</div>}

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
