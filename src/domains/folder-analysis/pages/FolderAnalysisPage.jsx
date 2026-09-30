import { FolderSearch, FolderTree, Layers } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ClassificationBoard } from '@/domains/folder-analysis/components/ClassificationBoard'
import { DOC_TYPES } from '@/domains/folder-analysis/utils/documentMeta'
import { folderTypeOf, useCatalog } from '@/domains/folder-analysis/utils/catalog'
import { Alert, Button, Card, SectionHeader, Select, Spinner } from '@/shared/ui'

// El tipo elegido se recuerda en el equipo: quien trabaja poseedores toda la
// mañana no tiene que volver a elegirlo cada vez que entra a la pantalla.
const STORAGE_KEY = 'folder-analysis.folder-type'

function remembered() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * El tablero de clasificación.
 *
 * Arriba se elige de qué tipo de carpeta es lo que se va a analizar, y los
 * carriles son los de ese tipo: en poseedores aparecen avalúo, plano,
 * formulario, declaración jurada y carnets, y ya no folio ni impuesto. Los tipos
 * y sus documentos los da el catálogo del back (domain/folder_types.py), así que
 * un tipo nuevo aparece acá solo.
 *
 * Lo que se clasifica acá no queda dentro de ninguna carpeta: es el tablero
 * suelto, para el documento que se resuelve por su cuenta. El trabajo por
 * trámite -- con la hoja de datos de la carpeta, su dirección, sus colindancias,
 * su notario -- va en Carpetas registradas.
 */
export default function FolderAnalysisPage() {
  const { catalog, error, loading } = useCatalog()
  const [typeKey, setTypeKey] = useState(remembered)

  // Con el catálogo en mano se resuelve qué tipo mostrar: el recordado, si
  // todavía existe. Sin nada elegido arranca en "general", que son los carriles
  // que esta pantalla tuvo siempre -- quien ya trabajaba acá la encuentra igual
  // y elige otro tipo cuando lo necesita.
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
    <Card className="animate-card-in">
      <SectionHeader
        icon={FolderSearch}
        eyebrow="Herramientas OCR+IA"
        title="Analizador y extractor de datos de carpetas"
        subtitle={
          current
            ? `Tablero de clasificación: bandeja a la izquierda y los carriles de una carpeta de ${current.label.toLowerCase()}.`
            : 'Tablero de clasificación: bandeja a la izquierda y los carriles del tipo de carpeta elegido.'
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <Select
              id="folder-type"
              label="Tipo de carpeta a analizar"
              value={current?.key || ''}
              onChange={(event) => elegir(event.target.value)}
              containerClassName="w-full sm:w-72"
              className="py-2.5"
            >
              {types.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </Select>
            <div className="min-w-0 flex-1 pt-1 sm:pt-6">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Layers className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {lanes.map((lane) => lane.label).join(' · ')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {current?.description} Para cargar además los datos propios de la carpeta (dirección,
                colindancias, notario), ábrela en <strong>Carpetas registradas</strong>.
              </p>
            </div>
          </div>

          <ClassificationBoard types={lanes} folderType={current?.key} />
        </div>
      )}
    </Card>
  )
}
