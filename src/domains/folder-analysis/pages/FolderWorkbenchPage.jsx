import { ArrowLeft, Download, FolderOpen, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { ClassificationBoard } from '@/domains/folder-analysis/components/ClassificationBoard'
import { FolderSheet } from '@/domains/folder-analysis/components/FolderSheet'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { folderTypeOf, sheetForm, useCatalog } from '@/domains/folder-analysis/utils/catalog'
import {
  conflictingFills,
  pendingFills,
  sheetSuggestions,
} from '@/domains/folder-analysis/utils/folderSheetFill'
import { Alert, Badge, Button, Card, SectionHeader, Spinner } from '@/shared/ui'

/**
 * Una carpeta abierta: su hoja de datos y su tablero.
 *
 * Es el flujo que pidió la oficina: primero se abre la carpeta y se dice qué
 * trámite es, y recién entonces se le suben las fotos. El tipo de carpeta es el
 * que manda -- los carriles que se ven y los campos de la hoja salen del
 * catálogo, así que esta pantalla no conoce ninguna carpeta por su nombre.
 */
export default function FolderWorkbenchPage() {
  const { id } = useParams()
  const { catalog, error: catalogError } = useCatalog()
  const [folder, setFolder] = useState(null)
  const [sheet, setSheet] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  // Lo que se está escribiendo no se pisa con lo que llega de un refresco: la
  // hoja se rearma solo cuando se abre la carpeta o se guarda.
  const [dirty, setDirty] = useState(false)

  const type = folderTypeOf(catalog, folder?.folder_type)
  // La hoja que se dibuja son los campos que el tipo declara, con lo que la
  // carpeta tenga cargado: se arma al pintar, sin copiar el catálogo al estado.
  const form = type ? sheetForm(type, sheet) : sheet
  const lanes = folder ? DOC_TYPES.filter((item) => folder.document_types.includes(item.id)) : []

  const load = useCallback(
    (withSheet) =>
      folderAnalysisApi
        .folder(id)
        .then((value) => {
          setFolder(value)
          if (withSheet) setSheet(value.data || {})
          setError(null)
        })
        .catch((e) => setError(e.message)),
    [id]
  )

  useEffect(() => {
    load(true)
  }, [load])

  const guardar = async () => {
    setSaving(true)
    try {
      const saved = await folderAnalysisApi.updateFolder(folder.id, {
        name: folder.name,
        notes: folder.notes,
        data: sheet,
      })
      setFolder(saved)
      setSheet(saved.data || {})
      setDirty(false)
      toast.success('Datos de la carpeta guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const cambiar = (key, value) => {
    setDirty(true)
    setSheet((previous) => ({ ...previous, [key]: value }))
  }

  // Lo que los documentos ya revisados de la carpeta saben llenar de su hoja.
  const suggestions = useMemo(
    () => sheetSuggestions(type, folder?.documents),
    [type, folder]
  )
  const pendientes = pendingFills(form, suggestions)
  const distintos = conflictingFills(form, suggestions)

  /** Llena de una vez lo que está vacío; lo escrito a mano no se toca. */
  const traerTodo = () => {
    setDirty(true)
    setSheet((previous) => ({
      ...previous,
      ...Object.fromEntries(pendientes.map(([key, suggestion]) => [key, suggestion.value])),
    }))
    toast.success(
      `Se llenaron ${pendientes.length} ${pendientes.length === 1 ? 'dato' : 'datos'} con los documentos de la carpeta. Revísalos y guarda.`
    )
  }

  if (error || catalogError) return <Alert type="error">{error || catalogError}</Alert>
  if (!folder || !catalog) {
    return (
      <Card className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        icon={FolderOpen}
        eyebrow="Analizador y extractor de datos de carpetas"
        title={folder.name}
        subtitle={
          folder.notes ||
          `${folder.folder_type_label} · Creada ${formatDateTime(folder.created_at)}`
        }
        actions={
          <>
            <Badge variant="accent">{folder.folder_type_label}</Badge>
            <Link to="/folder-analysis/folders">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>
                Carpetas
              </Button>
            </Link>
          </>
        }
      />

      {type?.field_groups?.length > 0 && (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Datos de la carpeta</h2>
              <p className="text-xs text-slate-500">{type.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {pendientes.length > 0 && (
                <Button size="sm" variant="secondary" icon={Download} onClick={traerTodo}>
                  Traer {pendientes.length} de los documentos
                </Button>
              )}
              <Button size="sm" icon={Save} loading={saving} disabled={!dirty} onClick={guardar}>
                {dirty ? 'Guardar datos' : 'Datos guardados'}
              </Button>
            </div>
          </div>

          {folder.documents.length === 0 ? (
            <p className="text-xs text-slate-500">
              Cuando revises y guardes un documento de esta carpeta, sus datos se podrán traer acá
              sin volver a escribirlos.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              {pendientes.length > 0
                ? `Los documentos revisados de esta carpeta pueden llenar ${pendientes.length} ${pendientes.length === 1 ? 'campo vacío' : 'campos vacíos'}. Cada uno muestra de dónde sale antes de copiarlo.`
                : 'Ya está traído todo lo que los documentos de esta carpeta pueden llenar.'}
              {distintos.length > 0 &&
                ` ${distintos.length} ${distintos.length === 1 ? 'campo dice' : 'campos dicen'} algo distinto a su documento: no se tocan solos, mira la nota debajo de cada uno.`}
            </p>
          )}

          <FolderSheet
            folderType={type}
            value={form}
            onChange={cambiar}
            suggestions={suggestions}
            onApply={cambiar}
          />
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Documentos de la carpeta</h2>
          <p className="text-xs text-slate-500">
            Arrastre una foto de la bandeja al carril que corresponde. Lo que abra acá queda dentro
            de esta carpeta. La bandeja es la misma de siempre: las fotos llegan del celular sin
            saber a qué carpeta van.
          </p>
        </div>
        <ClassificationBoard
          types={lanes}
          folderId={folder.id}
          folderType={folder.folder_type}
          onDocumentsChange={() => load(false)}
        />
      </Card>
    </div>
  )
}
