import { ArrowLeft, Bug, Compass, FileSpreadsheet, Save, ScanText, Table2, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { ENV } from '@/core/config/env.config'
import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { ColindanciasSection } from '@/domains/resolutions/components/ColindanciasSection'
import { GeneralDataForm } from '@/domains/resolutions/components/GeneralDataForm'
import { PlanPagesSection } from '@/domains/resolutions/components/PlanPagesSection'
import { ResolutionTabs } from '@/domains/resolutions/components/ResolutionTabs'
import { StatusBadge } from '@/domains/resolutions/components/StatusBadge'
import { SurfacesTable } from '@/domains/resolutions/components/SurfacesTable'
import { plantasDePagina } from '@/domains/resolutions/utils/plantasCatalog'
import { buildRows, downloadBlob, fillSheet2 } from '@/domains/resolutions/utils/sheet2Excel'
import { parseSuperficiesPage } from '@/domains/resolutions/utils/surfacesOcrParser'
import { detectAndDeskewTable } from '@/domains/resolutions/utils/tableLineDetector'
import { ocrImage } from '@/shared/colindancias/ocrClient'
import { Alert, Button, Card, ConfirmDialog, SectionHeader, Spinner } from '@/shared/ui'

const TEMPLATE_URL = '/plantilla-ph.xlsm'

const DATOS_GENERALES_VACIO = {
  codigoCatastral: '',
  distrito: '',
  subalcaldia: '',
  zonaHomogenea: '',
  calle: '',
  edificio: '',
  resolucionEjecutiva: '',
  fechaResolucion: '',
  fechaPlanoAprobado: '',
  supLote: '',
  propietario: '',
  ci1: '',
  ci2: '',
}

export default function ResolutionPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [pestana, setPestana] = useState(null) // null | 'superficies' | 'colindancias'
  const [resolucion, setResolucion] = useState(null)
  const [paginasImg, setPaginasImg] = useState([]) // [{ orden, url, blob }]
  const [loadingPage, setLoadingPage] = useState(true)
  const [error, setError] = useState(null)

  const [paginasTabla, setPaginasTabla] = useState(null)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrError, setOcrError] = useState(null)
  const [ocrDiagnostics, setOcrDiagnostics] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [datosGenerales, setDatosGenerales] = useState(DATOS_GENERALES_VACIO)
  const [savingGeneralData, setSavingGeneralData] = useState(false)

  const [colindancias, setColindancias] = useState({})

  useEffect(() => {
    let alive = true
    const urls = []
    ;(async () => {
      try {
        const detalle = await resolutionsApi.get(id)
        if (!alive) return
        setResolucion(detalle)
        if (detalle.table_data?.paginas) setPaginasTabla(detalle.table_data.paginas)
        if (detalle.table_data?.datosGenerales) {
          setDatosGenerales({ ...DATOS_GENERALES_VACIO, ...detalle.table_data.datosGenerales })
        }
        if (detalle.table_data?.colindancias) setColindancias(detalle.table_data.colindancias)

        const imgs = []
        for (const p of detalle.pages) {
          const blob = await resolutionsApi.pageBlob(id, p.order_index)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          imgs.push({ orden: p.order_index, url, blob })
        }
        if (alive) setPaginasImg(imgs)
      } catch (e) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setLoadingPage(false)
      }
    })()
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [id])

  const runOcr = useCallback(async () => {
    setOcrRunning(true)
    setOcrError(null)
    try {
      const out = []
      const diag = []
      for (const img of paginasImg) {
        const { blob: blobCorregido, lineYs, corregido } = await detectAndDeskewTable(img.blob)
        const bloques = await ocrImage(blobCorregido, `pagina_${img.orden}.jpg`)
        const parsed = parseSuperficiesPage(bloques, { lineYs })
        // For diagnostics: "Descargar diagnóstico OCR" (below) downloads this as a file if column detection goes wrong.
         
        console.log(`[OCR] página ${img.orden} — deskew`, { corregido, lineYs })
         
        console.log(`[OCR] página ${img.orden} — bloques crudos`, bloques)
         
        console.log(`[OCR] página ${img.orden} — parseado`, parsed)
        out.push({ pagina: img.orden, ...parsed })
        diag.push({ pagina: img.orden, corregido, lineYs, bloques, parseado: parsed })
      }
      setPaginasTabla(out)
      setOcrDiagnostics(diag)
      toast.success('OCR terminado. Revise las columnas y las celdas en rojo.')
    } catch (e) {
      setOcrError(
        `${e.message}. Si es un problema de CORS del servicio OCR, hay que habilitarlo ` +
          'o pasar el OCR por el backend.',
      )
    } finally {
      setOcrRunning(false)
    }
  }, [paginasImg])

  const upd = (pageIdx, fn) =>
    setPaginasTabla((prev) => prev.map((p, i) => (i === pageIdx ? fn(p) : p)))

  const onRoleChange = (pageIdx, colIdx, role) =>
    upd(pageIdx, (p) => ({
      ...p,
      columnRoles: p.columnRoles.map((r, i) => (i === colIdx ? role : r)),
    }))

  const onCellChange = (pageIdx, rowId, cellIdx, text) =>
    upd(pageIdx, (p) => ({
      ...p,
      rows: p.rows.map((row) =>
        row.id !== rowId
          ? row
          : { ...row, cells: row.cells.map((c, i) => (i === cellIdx ? { text, confidence: 1 } : c)) },
      ),
    }))

  const onPlantaChange = (pageIdx, rowId, text) =>
    upd(pageIdx, (p) => {
      const idx = p.rows.findIndex((row) => row.id === rowId)
      if (idx === -1) return p
      const valorViejo = p.rows[idx].planta || ''
      let fin = idx
      while (fin + 1 < p.rows.length && (p.rows[fin + 1].planta || '') === valorViejo) fin++
      return {
        ...p,
        rows: p.rows.map((row, i) => (i >= idx && i <= fin ? { ...row, planta: text } : row)),
      }
    })

  const onBloqueChange = (pageIdx, rowId, text) =>
    upd(pageIdx, (p) => ({
      ...p,
      rows: p.rows.map((row) => (row.id === rowId ? { ...row, bloque: text } : row)),
    }))

  const onDeleteRow = (pageIdx, rowId) =>
    upd(pageIdx, (p) => ({ ...p, rows: p.rows.filter((row) => row.id !== rowId) }))

  const refrescarResolucion = async () => {
    try {
      setResolucion(await resolutionsApi.get(id))
    } catch (e) {
      toast.error(e.message)
    }
  }

  const downloadOcrDiagnostics = () => {
    const blob = new Blob([JSON.stringify(ocrDiagnostics, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `ocr_diagnostico_${resolucion.resolution_number.replace(/\W+/g, '_')}.json`)
  }

  const saveTable = async (estado) => {
    setSaving(true)
    try {
      const actualizada = await resolutionsApi.saveTable(
        id,
        { paginas: paginasTabla, datosGenerales, colindancias },
        estado,
      )
      setResolucion(actualizada)
      toast.success('Guardado.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const saveGeneralData = async () => {
    setSavingGeneralData(true)
    try {
      const actualizada = await resolutionsApi.saveTable(
        id,
        { paginas: paginasTabla, datosGenerales, colindancias },
        resolucion.status,
      )
      setResolucion(actualizada)
      toast.success('Datos generales guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingGeneralData(false)
    }
  }

  const unidadesPorPlanta = {}
  if (paginasTabla) {
    buildRows(paginasTabla).forEach((f) => {
      if (!f.planta) return
      if (!unidadesPorPlanta[f.planta]) unidadesPorPlanta[f.planta] = []
      if (!unidadesPorPlanta[f.planta].includes(f.ambiente)) unidadesPorPlanta[f.planta].push(f.ambiente)
    })
  }

  const paginasPorPlanta = (resolucion?.plan_pages || []).flatMap((p) =>
    plantasDePagina(p).map((planta) => ({ ...p, planta })),
  )

  const generateExcel = async () => {
    const filas = buildRows(paginasTabla)
    if (filas.length === 0) {
      toast.error('Asigne la columna "Ambiente" y revise que haya al menos una fila con datos.')
      return
    }
    setGenerating(true)
    try {
      // `no-cache`: revalidar siempre.
      const buf = await fetch(TEMPLATE_URL, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error('No se encontró la plantilla (public/plantilla-ph.xlsm).')
        return r.arrayBuffer()
      })
      const blob = await fillSheet2(buf, filas, datosGenerales, colindancias)
      downloadBlob(blob, `hoja2_${resolucion.resolution_number.replace(/\W+/g, '_')}.xlsm`)
      await saveTable('listo')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loadingPage) {
    return (
      <Card className="animate-card-in">
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="animate-card-in">
        <Alert type="error">{error}</Alert>
      </Card>
    )
  }

  const eliminarResolucion = async () => {
    try {
      await resolutionsApi.remove(id)
      toast.success('Resolución eliminada.')
      navigate('/resolutions')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="animate-card-in">
        <Link
          to="/resolutions"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-500"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <SectionHeader
          icon={FileSpreadsheet}
          eyebrow={`N° ${resolucion.resolution_number}`}
          title={resolucion.name}
          subtitle={`${resolucion.total_pages} ${
            resolucion.total_pages === 1 ? 'página escaneada' : 'páginas escaneadas'
          }`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge status={resolucion.status} />
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setConfirmarEliminar(true)}
              >
                Eliminar
              </Button>
            </div>
          }
        />
      </Card>

      <GeneralDataForm
        datosGenerales={datosGenerales}
        setDatosGenerales={setDatosGenerales}
        onSave={saveGeneralData}
        saving={savingGeneralData}
      />

      <ResolutionTabs
        label="Secciones de la resolución"
        tabs={[
          { id: 'superficies', label: 'Tabla de superficies', icon: Table2 },
          { id: 'colindancias', label: 'Colindancias', icon: Compass },
        ]}
        value={pestana}
        onChange={setPestana}
      />

      {/* Las dos pestañas quedan montadas (solo se ocultan): ColindanciasSection
          y PlanPagesSection guardan el resultado del OCR y las imágenes en su
          propio estado, y desmontarlas al cambiar de pestaña lo perdería. */}
      <div
        role="tabpanel"
        id="panel-superficies"
        aria-labelledby="tab-superficies"
        hidden={pestana !== 'superficies'}
        className="animate-panel-in space-y-6"
      >
        <Card>
          <SectionHeader
            icon={ScanText}
            title="Páginas escaneadas"
            subtitle={
              paginasTabla
                ? 'Si el OCR leyó mal, puede volver a extraer la tabla.'
                : 'Todavía no hay tabla de superficies. Pulse "Extraer con OCR" para llenarla.'
            }
          />
          <div className="flex flex-wrap gap-3">
            {paginasImg.map((p) => (
              <a key={p.orden} href={p.url} target="_blank" rel="noreferrer">
                <img
                  src={p.url}
                  alt={`Página ${p.orden}`}
                  className="h-28 w-24 rounded-xl border border-white/60 object-cover shadow-xs transition hover:shadow-md"
                />
              </a>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button icon={ScanText} onClick={runOcr} loading={ocrRunning}>
              {paginasTabla ? 'Volver a extraer con OCR' : 'Extraer con OCR'}
            </Button>
            {ocrDiagnostics && (
              <Button variant="secondary" icon={Bug} onClick={downloadOcrDiagnostics}>
                Descargar diagnóstico OCR
              </Button>
            )}
          </div>
          {ocrError && (
            <Alert type="error" className="mt-3">
              {ocrError}
            </Alert>
          )}
        </Card>

        {paginasTabla && (
          <Card>
            <SectionHeader
              icon={Table2}
              eyebrow="Hoja2"
              title="Tabla de superficies"
              subtitle="Asigne qué es cada columna, corrija lo que el OCR haya leído mal (rojo) y complete la Planta."
            />
            <div className="-mx-2 overflow-x-auto px-2">
              <SurfacesTable
                paginas={paginasTabla}
                onRoleChange={onRoleChange}
                onCellChange={onCellChange}
                onPlantaChange={onPlantaChange}
                onBloqueChange={onBloqueChange}
                onDeleteRow={onDeleteRow}
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" icon={Save} onClick={() => saveTable('en_proceso')} loading={saving}>
                Guardar borrador
              </Button>
              <Button icon={FileSpreadsheet} onClick={generateExcel} loading={generating}>
                Generar Excel
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Celdas con confianza &lt; {ENV.OCR_CONFIDENCE_THRESHOLD} van en rojo para revisar.
            </p>
          </Card>
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-colindancias"
        aria-labelledby="tab-colindancias"
        hidden={pestana !== 'colindancias'}
        className="animate-panel-in space-y-6"
      >
        <PlanPagesSection
          resolutionId={id}
          planPages={resolucion.plan_pages || []}
          onChanged={refrescarResolucion}
        />
        <ColindanciasSection
          resolutionId={id}
          resolutionNumber={resolucion.resolution_number}
          planPages={paginasPorPlanta}
          unidadesPorPlanta={unidadesPorPlanta}
          colindancias={colindancias}
          setColindancias={setColindancias}
        />
      </div>

      <ConfirmDialog
        open={confirmarEliminar}
        onClose={() => setConfirmarEliminar(false)}
        onConfirm={eliminarResolucion}
        title="Eliminar resolución"
        message={`Se eliminará "${resolucion.name}" (N° ${resolucion.resolution_number}) con sus páginas escaneadas, el plano y la tabla de superficies.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
