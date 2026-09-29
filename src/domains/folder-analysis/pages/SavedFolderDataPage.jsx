import { FileSearch, FolderSearch, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { Alert, Button, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

export default function SavedFolderDataPage() {
  const [docType, setDocType] = useState('')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    folderAnalysisApi
      .reviewedDocuments(docType || undefined)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [docType])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        icon={FolderSearch}
        eyebrow="Analizador y extractor de datos de carpetas"
        title="Datos guardados"
        subtitle="Revisiones confirmadas y guardadas en la tabla del tipo de documento dentro de folder_analysis."
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Actualizar</Button>}
      />

      <Card className="flex flex-wrap items-center gap-3">
        <label htmlFor="saved-doc-type" className="text-sm font-semibold text-slate-700">Tipo de documento</label>
        <select
          id="saved-doc-type"
          value={docType}
          onChange={(event) => setDocType(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent-500/60"
        >
          <option value="">Todos</option>
          {DOC_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <span className="text-xs text-slate-500">{documents.length} revisión(es)</span>
      </Card>

      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <Card className="flex justify-center py-16"><Spinner className="h-6 w-6" /></Card>
      ) : documents.length === 0 ? (
        <Card>
          <EmptyState icon={FileSearch} title="No hay revisiones guardadas" subtitle="Al guardar una revisión, aparecerá aquí." />
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => {
            const type = DOC_TYPES.find((item) => item.id === document.doc_type)
            return (
              <Card key={document.id} className="overflow-hidden">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="font-bold text-slate-800">{type?.label || document.doc_type}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Guardado {formatDateTime(document.reviewed_at)} · {document.id}
                    </p>
                  </div>
                  <Link to={`/folder-analysis/documents/${document.id}`}>
                    <Button size="sm" variant="secondary">Abrir revisión</Button>
                  </Link>
                </div>
                <pre className="max-h-[32rem] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
                  {JSON.stringify(document.reviewed_data || document.data || {}, null, 2)}
                </pre>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
