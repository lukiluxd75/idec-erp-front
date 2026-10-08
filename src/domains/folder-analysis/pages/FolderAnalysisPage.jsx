import { FolderSearch, FolderTree, Layers } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ClassificationBoard } from '@/domains/folder-analysis/components/ClassificationBoard'
import { DOC_TYPES } from '@/domains/folder-analysis/utils/documentMeta'
import { folderTypeOf, useCatalog } from '@/domains/folder-analysis/utils/catalog'
import { Alert, Button, SectionHeader, Select } from '@/shared/ui'

const STORAGE_KEY = 'folder-analysis.folder-type'

function remembered() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/** El tablero de clasificación. */
export default function FolderAnalysisPage() {
  const { catalog, error, loading } = useCatalog()
  const [typeKey, setTypeKey] = useState(remembered)

  // Con el catálogo en mano se resuelve qué tipo mostrar: el recordado, si todavía existe.
  const types = catalog?.folder_types || []
  const current = folderTypeOf(catalog, typeKey) || folderTypeOf(catalog, 'general') || types[0] || null
  const lanes = current ? DOC_TYPES.filter((type) => current.document_types.includes(type.id)) : []

  const elegir = (key) => {
    setTypeKey(key)
    try {
      localStorage.setItem(STORAGE_KEY, key)
    } catch {
      // Sin almacenamiento del navegador se pierde la preferencia y nada más.
    }
  }

  return (
    <div className="folder-analysis-overview animate-card-in space-y-4">
      <section className="liquid-glass-panel rounded-3xl p-4 sm:p-6">
        <SectionHeader
          icon={FolderSearch}
          eyebrow="Herramientas OCR+IA"
          title="Analizador y extractor de datos de carpetas"
          subtitle={
            current
              ? `Escanee una carpeta física completa de ${current.label.toLowerCase()}: bandeja a la izquierda y sus carriles a la derecha.`
              : 'Escanee una carpeta física completa: bandeja a la izquierda y los carriles del tipo de carpeta elegido.'
          }
          actions={
            <Link to="/folder-analysis/folders">
              <Button variant="secondary" size="sm" icon={FolderTree}>
                Carpetas registradas
              </Button>
            </Link>
          }
        />

        {error && <Alert type="error">{error}</Alert>}

        <div className="folder-analysis-setup grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <Select
            id="folder-type"
            label="Tipo de carpeta a analizar"
            value={current?.key || ''}
            onChange={(event) => elegir(event.target.value)}
            disabled={loading}
            containerClassName="w-full"
            className="py-2.5"
          >
            {types.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </Select>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-slate-800">{current?.label || 'Preparando catálogo'}</p>
                {loading && <span className="text-xs text-slate-500">Cargando tipos de carpeta…</span>}
              </div>
              {current?.description && <p className="mt-1 text-sm text-slate-500">{current.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <Layers className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                <span>Documentos que se pueden clasificar</span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Carriles disponibles">
                {lanes.map((lane) => (
                  <li key={lane.id} className="folder-analysis-lane-chip rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                    {lane.label}
                  </li>
                ))}
                {!loading && lanes.length === 0 && <li className="text-xs text-slate-500">Este tipo no tiene carriles configurados.</li>}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                Al terminar de clasificar, seleccione <strong>Guardar en carpeta</strong> para registrar el número de la carpeta física.
              </p>
            </div>
        </div>
      </section>

      {!loading && <ClassificationBoard types={lanes} folderType={current?.key} folderTypeLabel={current?.label} />}
    </div>
  )
}
