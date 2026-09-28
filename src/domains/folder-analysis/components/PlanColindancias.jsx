import { Bug, Compass, FileDown, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { ColindanciaCard } from '@/shared/colindancias/ColindanciaCard'
import { focosDe, motivosDe, unidadesVisibles } from '@/shared/colindancias/colindanciasCards'
import { LEYENDAS_COLINDANCIA, analizarColindancias, autodetectarUnidades } from '@/shared/colindancias/colindanciasDetector'
import { generarColindanciasPdf } from '@/shared/colindancias/colindanciasPdf'
import { ocrImage } from '@/shared/colindancias/ocrClient'
import { detectNorth } from '@/shared/colindancias/planNorthDetector'
import { Button, Card, SectionHeader } from '@/shared/ui'
import { downloadBlob } from '@/shared/utils'

/** El primer rótulo "PLANTA ..." que el OCR haya leído en la página, tal cual
 * salió -- solo para encabezar la sección con algo más útil que "Página N".
 * Sin ese rótulo (no es un edificio con plantas, o el OCR no lo agarró), se
 * usa el número de página. */
function tituloDePagina(bloques, indice) {
  const rotulo = bloques.find((b) => /^\s*planta\b/i.test(b.text || ''))
  return rotulo ? rotulo.text.trim().toUpperCase() : `Página ${indice + 1}`
}

/**
 * Colindancias del plano, dentro de "Analizador y extractor de datos de
 * carpetas" -- extra sobre lo que ya lee el modelo de visión: por cada
 * página del documento (una unidad de "plan" puede tener varias, ver
 * documentMeta.js), lee el OCR, detecta el norte dibujado y sugiere, para
 * cada unidad que encuentra, su vecino en cada dirección. Mismo algoritmo
 * que usa Resoluciones P.H. (shared/colindancias), adaptado a este dominio:
 *
 *   - Acá no hay una tabla de superficies (Hoja2) que traiga los nombres de
 *     antemano -- SIEMPRE se autodetectan del propio plano
 *     (autodetectarUnidades), por eso cada tarjeta pide revisarla con más
 *     cuidado que si vinieran de una lista conocida.
 *   - Las páginas no se agrupan por "planta" (no hay backend que la lea del
 *     título como en resolutions): cada página de la foto es su propia
 *     sección, encabezada con el rótulo "PLANTA ..." que el OCR haya
 *     encontrado en ella, o "Página N" si no hay ninguno.
 *
 * Es una herramienta de repaso, no reemplaza la revisión del documento: lo
 * detectado NO se guarda en el JSON del documento (Guardar revisión no lo
 * toca), solo queda en pantalla y en el PDF que arma "Generar PDF" mientras
 * la pestaña siga abierta.
 */
export function PlanColindancias({ documentId, pages }) {
  const [detectando, setDetectando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [datosPorPagina, setDatosPorPagina] = useState({}) // { [capture_id]: { ancho, alto, bloques, angleDeg, confidence, titulo, nombres, focos, motivos } }
  const [imagenesPorPagina, setImagenesPorPagina] = useState({}) // { [capture_id]: objectURL }
  const [colindancias, setColindancias] = useState({}) // { [capture_id]: { [ambiente]: {norte,este,sud,oeste} } }
  const [logPorPagina, setLogPorPagina] = useState({})

  const cargadasRef = useRef(new Set())
  const objectUrlsRef = useRef({})

  // Precarga la foto original de cada página (no la preview web-sized que ya
  // usa PagesViewer: acá hace falta la resolución completa para el OCR y
  // para que el zoom de cada tarjeta no se vea pixelado).
  useEffect(() => {
    pages.forEach((p) => {
      if (cargadasRef.current.has(p.capture_id)) return
      cargadasRef.current.add(p.capture_id)
      folderAnalysisApi
        .captureBlob(p.capture_id, 'original')
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          objectUrlsRef.current[p.capture_id] = url
          setImagenesPorPagina((prev) => ({ ...prev, [p.capture_id]: url }))
        })
        .catch(() => {
          // Silencioso: si falla la precarga, la tarjeta simplemente no muestra imagen.
        })
    })
  }, [pages])

  useEffect(
    () => () => {
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const recalcular = (captureId, angleDeg) => {
    const datos = datosPorPagina[captureId]
    setDatosPorPagina((prev) => ({ ...prev, [captureId]: { ...(prev[captureId] || {}), angleDeg } }))
    if (!datos?.ancho || !datos?.alto) return // aun no corrio el OCR -- solo gira la vista previa
    const analisis = analizarColindancias(datos.bloques, datos.nombres, { angleDeg }, {
      width: datos.ancho,
      height: datos.alto,
    })
    const sugerencias = analisis.sugerencias
    const focos = focosDe(analisis.detalle, datos.ancho, datos.alto)
    const motivos = motivosDe(analisis.detalle)
    setDatosPorPagina((prev) => ({ ...prev, [captureId]: { ...(prev[captureId] || {}), angleDeg, focos, motivos } }))
    setLogPorPagina((prev) =>
      prev[captureId]
        ? {
            ...prev,
            [captureId]: {
              ...prev[captureId],
              correccionManualNorteDeg: angleDeg,
              analisis: analisis.detalle,
              sugerencias,
            },
          }
        : prev,
    )
    setColindancias((prev) => ({ ...prev, [captureId]: { ...(prev[captureId] || {}), ...sugerencias } }))
  }

  const detectar = async () => {
    if (pages.length === 0) {
      toast.error('Este documento no tiene páginas.')
      return
    }
    setDetectando(true)
    try {
      const nuevosDatos = {}
      const nuevasColindancias = {}
      const nuevoLog = {}
      for (const [indice, p] of pages.entries()) {
        const blob = await folderAnalysisApi.captureBlob(p.capture_id, 'original')
        const bitmap = await createImageBitmap(blob)
        const { width: ancho, height: alto } = bitmap
        bitmap.close?.()
        const bloques = await ocrImage(blob, `plano_${indice + 1}.jpg`)
        const norte = await detectNorth(blob, bloques)
        const nombres = autodetectarUnidades(bloques)
        const titulo = tituloDePagina(bloques, indice)
        const analisis = analizarColindancias(bloques, nombres, norte, { width: ancho, height: alto })
        const sugerencias = analisis.sugerencias

        nuevosDatos[p.capture_id] = {
          ancho,
          alto,
          bloques,
          angleDeg: norte.angleDeg,
          confidence: norte.confidence,
          titulo,
          nombres,
          focos: focosDe(analisis.detalle, ancho, alto),
          motivos: motivosDe(analisis.detalle),
        }
        const url = URL.createObjectURL(blob)
        if (objectUrlsRef.current[p.capture_id]) URL.revokeObjectURL(objectUrlsRef.current[p.capture_id])
        objectUrlsRef.current[p.capture_id] = url
        setImagenesPorPagina((prev) => ({ ...prev, [p.capture_id]: url }))
        nuevasColindancias[p.capture_id] = sugerencias
        nuevoLog[p.capture_id] = {
          pagina: indice + 1,
          titulo,
          imagen: { ancho, alto },
          norte,
          correccionManualNorteDeg: null,
          ocr: {
            cantidadBloques: bloques.length,
            bloques: bloques.map((b) => ({
              texto: b.text,
              confianza: b.confidence,
              centro: {
                x: Math.round(b.points.reduce((a, pt) => a + pt[0], 0) / b.points.length),
                y: Math.round(b.points.reduce((a, pt) => a + pt[1], 0) / b.points.length),
              },
            })),
          },
          unidadesBuscadas: nombres,
          analisis: analisis.detalle,
          sugerencias,
        }
      }
      setDatosPorPagina((prev) => ({ ...prev, ...nuevosDatos }))
      setLogPorPagina((prev) => ({ ...prev, ...nuevoLog }))
      setColindancias((prev) => ({ ...prev, ...nuevasColindancias }))
      toast.success('Colindancias sugeridas. Revise cada unidad -- se autodetectaron del plano, sin una tabla de referencia.')
    } catch (e) {
      toast.error(`No se pudo detectar colindancias: ${e.message}`)
    } finally {
      setDetectando(false)
    }
  }

  const descargarLog = () => {
    const log = {
      tipo: 'log_llenado_colindancias_plan',
      version: 1,
      generado: new Date().toISOString(),
      documento: { id: documentId },
      paginas: pages.map((p) => logPorPagina[p.capture_id]).filter(Boolean),
      valoresEnPantalla: colindancias,
    }
    downloadBlob(
      new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }),
      `colindancias_log_${documentId.slice(0, 8)}.json`,
    )
  }

  const generarPdf = async () => {
    const secciones = pages.map((p, indice) => {
      const datos = datosPorPagina[p.capture_id]
      const nombres = unidadesVisibles([], datos)
      return {
        planta: datos?.titulo || `Página ${indice + 1}`,
        unidades: nombres.map((ambiente) => ({
          nombre: ambiente,
          valores: colindancias[p.capture_id]?.[ambiente] || {},
          url: imagenesPorPagina[p.capture_id],
          angleDeg: datos?.angleDeg ?? 0,
          foco: datos?.focos?.[ambiente],
        })),
      }
    })
    setGenerandoPdf(true)
    try {
      await generarColindanciasPdf(`Plano — documento ${documentId.slice(0, 8)}`, secciones)
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${e.message}`)
    } finally {
      setGenerandoPdf(false)
    }
  }

  const onCambioValor = (captureId, ambiente, direccion, valor) => {
    setColindancias((prev) => ({
      ...prev,
      [captureId]: { ...(prev[captureId] || {}), [ambiente]: { ...(prev[captureId]?.[ambiente] || {}), [direccion]: valor } },
    }))
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Compass}
        eyebrow="Extra sobre el plano"
        title="Colindancias"
        subtitle="Detectadas del propio plano (no hay una tabla de referencia acá) — revise cada unidad; esto no se guarda con la revisión del documento."
      />

      <div className="flex flex-wrap gap-2">
        <Button icon={ScanSearch} onClick={detectar} loading={detectando}>
          Detectar colindancias
        </Button>
        {Object.keys(datosPorPagina).length > 0 && (
          <Button variant="secondary" icon={FileDown} onClick={generarPdf} loading={generandoPdf}>
            Generar PDF
          </Button>
        )}
        {Object.keys(logPorPagina).length > 0 && (
          <Button variant="secondary" icon={Bug} onClick={descargarLog}>
            Descargar log de llenado
          </Button>
        )}
      </div>

      {pages.map((p, indice) => {
        const datos = datosPorPagina[p.capture_id]
        if (!datos) return null // todavia no se detecto esta pagina
        const nombres = unidadesVisibles([], datos)
        const angleDeg = datos.angleDeg ?? 0
        const imagenUrl = imagenesPorPagina[p.capture_id]
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...(datos.nombres || [])]
        const datalistId = `plan-colindancia-opciones-${p.capture_id}`

        return (
          <div key={p.capture_id} className="mt-6 border-t border-slate-100 pt-5 first:mt-4 first:border-0 first:pt-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">{datos.titulo || `Página ${indice + 1}`}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Norte detectado: {Math.round(angleDeg)}°{' '}
                  {datos.confidence === 'baja' && (
                    <span className="text-state-warning">(no se encontró el símbolo de norte, revise)</span>
                  )}
                  {datos.confidence === 'media' && <span className="text-state-warning">(confianza media, revise)</span>}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                  title="Rotar -90°"
                  onClick={() => recalcular(p.capture_id, (angleDeg - 90 + 360) % 360)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                  title="Rotar +90°"
                  onClick={() => recalcular(p.capture_id, (angleDeg + 90) % 360)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  step="1"
                  className="w-16 rounded-lg border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-accent-500/60"
                  value={Math.round(angleDeg)}
                  onChange={(e) => recalcular(p.capture_id, Number(e.target.value) || 0)}
                  title="Ángulo del norte, en grados (0 = arriba de la foto)"
                />
                <span>°</span>
              </div>
            </div>

            <datalist id={datalistId}>
              {opcionesDatalist.map((op) => (
                <option key={op} value={op} />
              ))}
            </datalist>

            {nombres.length === 0 && (
              <p className="text-xs text-slate-400">No se detectaron unidades en el plano de esta página.</p>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(26rem, 1fr))' }}>
              {nombres.map((ambiente) => (
                <ColindanciaCard
                  key={ambiente}
                  ambiente={ambiente}
                  valores={colindancias[p.capture_id]?.[ambiente] || {}}
                  onCambioValor={(direccion, valor) => onCambioValor(p.capture_id, ambiente, direccion, valor)}
                  datalistId={datalistId}
                  imagenUrl={imagenUrl}
                  angleDeg={angleDeg}
                  ancho={datos.ancho}
                  alto={datos.alto}
                  foco={datos.focos?.[ambiente]}
                />
              ))}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
