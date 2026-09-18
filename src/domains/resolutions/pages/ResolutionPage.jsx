import { ArrowLeft, Bug, FileSpreadsheet, Landmark, Save, ScanText, Table2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { ENV } from '@/core/config/env.config'
import { ocrImage, resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { StatusBadge } from '@/domains/resolutions/components/StatusBadge'
import { SurfacesTable } from '@/domains/resolutions/components/SurfacesTable'
import { buildRows, downloadBlob, fillSheet2 } from '@/domains/resolutions/utils/sheet2Excel'
import { parseSuperficiesPage } from '@/domains/resolutions/utils/surfacesOcrParser'
import { detectAndDeskewTable } from '@/domains/resolutions/utils/tableLineDetector'
import { Alert, Button, Card, Input, SectionHeader, Spinner } from '@/shared/ui'

const TEMPLATE_URL = '/plantilla-ph.xlsm'

// Campos que van directo a celdas fijas de INICIO al generar el Excel (ver
// INICIO_CAMPOS en sheet2Excel.js) -- salvo "propietario", que sigue siendo
// solo de referencia interna (no se encontro una celda propia para el
// nombre del propietario en la plantilla, a diferencia de sus documentos de
// identidad).
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

// Input controlado atado a un campo de `datosGenerales` -- evita repetir
// value/onChange en cada uno de los ~12 campos de la tarjeta de abajo.
function Campo({ campo, datosGenerales, setDatosGenerales, ...props }) {
  return (
    <Input
      value={datosGenerales[campo]}
      onChange={(e) => setDatosGenerales((prev) => ({ ...prev, [campo]: e.target.value }))}
      {...props}
    />
  )
}

export default function ResolutionPage() {
  const { id } = useParams()

  const [resolucion, setResolucion] = useState(null)
  const [paginasImg, setPaginasImg] = useState([]) // [{ orden, url, blob }]
  const [loadingPage, setLoadingPage] = useState(true)
  const [error, setError] = useState(null)

  const [paginasTabla, setPaginasTabla] = useState(null)
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrError, setOcrError] = useState(null)
  // Raw OCR blocks per page, for the "Descargar diagnóstico OCR" button —
  // so the file can be sent directly instead of hand-copying from the browser
  // console (which also only shows it collapsed).
  const [ocrDiagnostics, setOcrDiagnostics] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Datos generales del edificio: no salen del escaneo de la tabla de
  // superficies -- se transcriben a mano mirando el plano/resolucion
  // aprobados. Se guardan en el mismo JSON opaco "tabla" que las paginas
  // (ver saveTable) y, al generar el Excel, casi todos se escriben en celdas
  // fijas de la hoja INICIO (ver INICIO_CAMPOS en sheet2Excel.js) -- excepto
  // "propietario", que queda solo de referencia interna.
  const [datosGenerales, setDatosGenerales] = useState(DATOS_GENERALES_VACIO)
  const [savingGeneralData, setSavingGeneralData] = useState(false)

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
        // Deskews by perspective using the table's own borders and detects
        // its row lines; if the photo has no detectable table borders, returns
        // the image as-is with empty lineYs (parser falls back to its usual gap heuristic).
        const { blob: blobCorregido, lineYs, corregido } = await detectAndDeskewTable(img.blob)
        const bloques = await ocrImage(blobCorregido, `pagina_${img.orden}.jpg`)
        const parsed = parseSuperficiesPage(bloques, { lineYs })
        // For diagnostics: "Descargar diagnóstico OCR" (below) downloads this
        // as a file if column detection goes wrong.
         
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
    upd(pageIdx, (p) => ({
      ...p,
      rows: p.rows.map((row) => (row.id === rowId ? { ...row, planta: text } : row)),
    }))

  const onBloqueChange = (pageIdx, rowId, text) =>
    upd(pageIdx, (p) => ({
      ...p,
      rows: p.rows.map((row) => (row.id === rowId ? { ...row, bloque: text } : row)),
    }))

  const onDeleteRow = (pageIdx, rowId) =>
    upd(pageIdx, (p) => ({ ...p, rows: p.rows.filter((row) => row.id !== rowId) }))

  const downloadOcrDiagnostics = () => {
    const blob = new Blob([JSON.stringify(ocrDiagnostics, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `ocr_diagnostico_${resolucion.resolution_number.replace(/\W+/g, '_')}.json`)
  }

  const saveTable = async (estado) => {
    setSaving(true)
    try {
      const actualizada = await resolutionsApi.saveTable(
        id,
        { paginas: paginasTabla, datosGenerales },
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
        { paginas: paginasTabla, datosGenerales },
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

  const generateExcel = async () => {
    const filas = buildRows(paginasTabla)
    if (filas.length === 0) {
      toast.error('Asigne la columna "Ambiente" y revise que haya al menos una fila con datos.')
      return
    }
    setGenerating(true)
    try {
      const buf = await fetch(TEMPLATE_URL).then((r) => {
        if (!r.ok) throw new Error('No se encontró la plantilla (public/plantilla-ph.xlsm).')
        return r.arrayBuffer()
      })
      const blob = await fillSheet2(buf, filas, datosGenerales)
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
          actions={<StatusBadge status={resolucion.status} />}
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

      <Card className="animate-card-in">
        <SectionHeader
          icon={Landmark}
          eyebrow="Plano de división"
          title="Datos generales del edificio"
          subtitle="No salen del escaneo de la tabla — se transcriben a mano mirando el plano aprobado y la resolución. Se escriben directo en la hoja INICIO del Excel al generar."
        />

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Identificación catastral
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo
            label="Código catastral"
            placeholder="00-000-000-0-00-000-000"
            campo="codigoCatastral"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Distrito"
            type="number"
            campo="distrito"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Subalcaldía"
            campo="subalcaldia"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Zona homogénea"
            placeholder="Ej. ZONA 6"
            campo="zonaHomogenea"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
        </div>

        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Ubicación</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            label="Calle o avenida"
            campo="calle"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Edificio / Proyecto"
            placeholder='Ej. Edificio "Don Juan"'
            campo="edificio"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
        </div>

        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Resolución ejecutiva
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            label="N° Resolución Ejecutiva"
            placeholder="102/2026"
            campo="resolucionEjecutiva"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Fecha de la R.E."
            placeholder="DD/MM/AAAA"
            campo="fechaResolucion"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="Fecha de plano aprobado"
            placeholder="DD/MM/AAAA"
            campo="fechaPlanoAprobado"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
        </div>

        <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Propietario(s) y superficie de lote
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Campo
              label="Propietario(s)"
              placeholder="Nombre completo"
              campo="propietario"
              datosGenerales={datosGenerales}
              setDatosGenerales={setDatosGenerales}
            />
          </div>
          <Campo
            label="C.I. propietario 1"
            type="number"
            campo="ci1"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
          <Campo
            label="C.I. propietario 2"
            type="number"
            campo="ci2"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Campo
            label="Sup. de lote (m²)"
            type="number"
            campo="supLote"
            datosGenerales={datosGenerales}
            setDatosGenerales={setDatosGenerales}
          />
        </div>

        <div className="mt-4">
          <Button variant="secondary" icon={Save} onClick={saveGeneralData} loading={savingGeneralData}>
            Guardar datos generales
          </Button>
        </div>
      </Card>

      {paginasTabla && (
        <Card className="animate-card-in">
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
  )
}
