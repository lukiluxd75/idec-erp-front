import { ArrowLeft, Bug, FileSpreadsheet, Landmark, Save, ScanText, Table2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'

import { ENV } from '@/core/config/env.config'
import { ocrImagen, resolucionesApi } from '@/domains/resoluciones/api/resoluciones.api'
import { EstadoBadge } from '@/domains/resoluciones/components/EstadoBadge'
import { TablaSuperficies } from '@/domains/resoluciones/components/TablaSuperficies'
import { construirFilas, descargarBlob, fillHoja2 } from '@/domains/resoluciones/utils/hoja2Excel'
import { parseSuperficiesPage } from '@/domains/resoluciones/utils/superficiesOcrParser'
import { detectarYEnderezarTabla } from '@/domains/resoluciones/utils/tableLineDetector'
import { Alert, Button, Card, Input, SectionHeader, Spinner } from '@/shared/ui'

const PLANTILLA_URL = '/plantilla-ph.xlsm'

const DATOS_GENERALES_VACIO = { codigoCatastral: '', edificio: '', propietario: '' }

export default function ResolucionPage() {
  const { id } = useParams()

  const [resolucion, setResolucion] = useState(null)
  const [paginasImg, setPaginasImg] = useState([]) // [{ orden, url, blob }]
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [paginasTabla, setPaginasTabla] = useState(null)
  const [ocrEnCurso, setOcrEnCurso] = useState(false)
  const [ocrError, setOcrError] = useState(null)
  // Bloques crudos del OCR por página, para el botón "Descargar diagnóstico
  // OCR" — así se puede mandar el archivo directo en vez de copiar a mano de
  // la consola del navegador (que además solo lo muestra colapsado).
  const [diagnosticoOcr, setDiagnosticoOcr] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [generando, setGenerando] = useState(false)

  // Datos generales del edificio (Código Catastral, nombre del edificio,
  // propietario/os): no salen de la tabla "RELACIÓN DE SUPERFICIE" escaneada
  // -- viven en Hoja1 de la plantilla, una hoja de datos aparte con varias
  // fórmulas encadenadas a otras hojas. Se decidió con el usuario (2026-09-09)
  // NO tocar Hoja1 desde acá: por ahora estos 3 campos solo quedan guardados
  // en el sistema (dentro del mismo JSON opaco "tabla" que ya guarda las
  // páginas) para tenerlos a mano, y se transcriben a mano al Excel.
  const [datosGenerales, setDatosGenerales] = useState(DATOS_GENERALES_VACIO)
  const [guardandoDatos, setGuardandoDatos] = useState(false)

  useEffect(() => {
    let alive = true
    const urls = []
    ;(async () => {
      try {
        const detalle = await resolucionesApi.obtener(id)
        if (!alive) return
        setResolucion(detalle)
        if (detalle.tabla?.paginas) setPaginasTabla(detalle.tabla.paginas)
        if (detalle.tabla?.datosGenerales) {
          setDatosGenerales({ ...DATOS_GENERALES_VACIO, ...detalle.tabla.datosGenerales })
        }

        const imgs = []
        for (const p of detalle.paginas) {
          const blob = await resolucionesApi.paginaBlob(id, p.orden)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          imgs.push({ orden: p.orden, url, blob })
        }
        if (alive) setPaginasImg(imgs)
      } catch (e) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setCargando(false)
      }
    })()
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [id])

  const extraerOcr = useCallback(async () => {
    setOcrEnCurso(true)
    setOcrError(null)
    try {
      const out = []
      const diag = []
      for (const img of paginasImg) {
        // Endereza por perspectiva usando los propios bordes de la tabla y
        // detecta sus líneas de fila; si la foto no tiene bordes de tabla
        // detectables, devuelve la imagen tal cual y lineYs vacío (el parser
        // cae a su heurístico de gap de siempre).
        const { blob: blobCorregido, lineYs, corregido } = await detectarYEnderezarTabla(img.blob)
        const bloques = await ocrImagen(blobCorregido, `pagina_${img.orden}.jpg`)
        const parsed = parseSuperficiesPage(bloques, { lineYs })
        // Para diagnóstico: "Descargar diagnóstico OCR" (abajo) baja esto
        // como archivo si la detección de columnas sale mal.
         
        console.log(`[OCR] página ${img.orden} — deskew`, { corregido, lineYs })
         
        console.log(`[OCR] página ${img.orden} — bloques crudos`, bloques)
         
        console.log(`[OCR] página ${img.orden} — parseado`, parsed)
        out.push({ pagina: img.orden, ...parsed })
        diag.push({ pagina: img.orden, corregido, lineYs, bloques, parseado: parsed })
      }
      setPaginasTabla(out)
      setDiagnosticoOcr(diag)
      toast.success('OCR terminado. Revise las columnas y las celdas en rojo.')
    } catch (e) {
      setOcrError(
        `${e.message}. Si es un problema de CORS del servicio OCR, hay que habilitarlo ` +
          'o pasar el OCR por el backend.',
      )
    } finally {
      setOcrEnCurso(false)
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

  const descargarDiagnosticoOcr = () => {
    const blob = new Blob([JSON.stringify(diagnosticoOcr, null, 2)], { type: 'application/json' })
    descargarBlob(blob, `ocr_diagnostico_${resolucion.nro_resolucion.replace(/\W+/g, '_')}.json`)
  }

  const guardar = async (estado) => {
    setGuardando(true)
    try {
      const actualizada = await resolucionesApi.guardarTabla(id, { paginas: paginasTabla, datosGenerales }, estado)
      setResolucion(actualizada)
      toast.success('Guardado.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const guardarDatosGenerales = async () => {
    setGuardandoDatos(true)
    try {
      const actualizada = await resolucionesApi.guardarTabla(
        id,
        { paginas: paginasTabla, datosGenerales },
        resolucion.estado,
      )
      setResolucion(actualizada)
      toast.success('Datos generales guardados.')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGuardandoDatos(false)
    }
  }

  const generarExcel = async () => {
    const filas = construirFilas(paginasTabla)
    if (filas.length === 0) {
      toast.error('Asigne la columna "Ambiente" y revise que haya al menos una fila con datos.')
      return
    }
    setGenerando(true)
    try {
      const buf = await fetch(PLANTILLA_URL).then((r) => {
        if (!r.ok) throw new Error('No se encontró la plantilla (public/plantilla-ph.xlsm).')
        return r.arrayBuffer()
      })
      const blob = await fillHoja2(buf, filas)
      descargarBlob(blob, `hoja2_${resolucion.nro_resolucion.replace(/\W+/g, '_')}.xlsm`)
      await guardar('listo')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) {
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
          to="/resoluciones"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-500"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <SectionHeader
          icon={FileSpreadsheet}
          eyebrow={`N° ${resolucion.nro_resolucion}`}
          title={resolucion.nombre}
          subtitle={`${resolucion.total_paginas} ${
            resolucion.total_paginas === 1 ? 'página escaneada' : 'páginas escaneadas'
          }`}
          actions={<EstadoBadge estado={resolucion.estado} />}
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
          <Button icon={ScanText} onClick={extraerOcr} loading={ocrEnCurso}>
            {paginasTabla ? 'Volver a extraer con OCR' : 'Extraer con OCR'}
          </Button>
          {diagnosticoOcr && (
            <Button variant="secondary" icon={Bug} onClick={descargarDiagnosticoOcr}>
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
          subtitle="No salen del escaneo de la tabla — se transcriben a mano mirando el plano aprobado (sello, código catastral, propietarios)."
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Código catastral"
            placeholder="00-000-000-0-00-000-000"
            value={datosGenerales.codigoCatastral}
            onChange={(e) => setDatosGenerales((prev) => ({ ...prev, codigoCatastral: e.target.value }))}
          />
          <Input
            label="Edificio / Proyecto"
            placeholder='Ej. Edificio "Don Juan"'
            value={datosGenerales.edificio}
            onChange={(e) => setDatosGenerales((prev) => ({ ...prev, edificio: e.target.value }))}
          />
          <Input
            label="Propietario(s)"
            placeholder="Nombre completo"
            value={datosGenerales.propietario}
            onChange={(e) => setDatosGenerales((prev) => ({ ...prev, propietario: e.target.value }))}
          />
        </div>
        <div className="mt-4">
          <Button variant="secondary" icon={Save} onClick={guardarDatosGenerales} loading={guardandoDatos}>
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
            <TablaSuperficies
              paginas={paginasTabla}
              onRoleChange={onRoleChange}
              onCellChange={onCellChange}
              onPlantaChange={onPlantaChange}
              onBloqueChange={onBloqueChange}
              onDeleteRow={onDeleteRow}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" icon={Save} onClick={() => guardar('en_proceso')} loading={guardando}>
              Guardar borrador
            </Button>
            <Button icon={FileSpreadsheet} onClick={generarExcel} loading={generando}>
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
