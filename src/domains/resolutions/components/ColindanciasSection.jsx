import { Bug, ChevronDown, ChevronRight, Compass, FileDown, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { ColindanciaCard } from '@/shared/colindancias/ColindanciaCard'
import { focosDe, motivosDe, unidadesVisibles } from '@/shared/colindancias/colindanciasCards'
import {
  LEYENDAS_COLINDANCIA,
  analizarColindancias,
  autodetectarUnidades,
} from '@/shared/colindancias/colindanciasDetector'
import { generarColindanciasPdf } from '@/shared/colindancias/colindanciasPdf'
import { ocrImagenEnMosaicos } from '@/shared/colindancias/ocrMosaicos'
import { detectNorth } from '@/shared/colindancias/planNorthDetector'
import { Button, Card, SectionHeader } from '@/shared/ui'
import { downloadBlob } from '@/shared/utils'

export function ColindanciasSection({
  resolutionId,
  resolutionNumber,
  planPages,
  unidadesPorPlanta,
  colindancias,
  setColindancias,
}) {
  const [detectando, setDetectando] = useState(false)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [datosPorPlanta, setDatosPorPlanta] = useState({}) // { [planta]: { ancho, alto, bloques, angleDeg, confidence, pagina, nombres, autoDetectadas, focos } }
  const [imagenesPorPlanta, setImagenesPorPlanta] = useState({}) // { [planta]: objectURL } -- preview, independiente del OCR
  const [logPorPagina, setLogPorPagina] = useState({}) // { ["orden|planta"]: entrada del log de llenado }

  const [abiertas, setAbiertas] = useState(() => new Set()) // pisos desplegados
  const cargadasRef = useRef(new Set())
  const [yaMostradas, setYaMostradas] = useState(() => new Set()) // pisos que ya aparecieron
  const objectUrlsRef = useRef({})

  const plantasConPlano = [...new Set(planPages.map((p) => p.planta))]

  useEffect(() => {
    const plantas = [...new Set(planPages.map((p) => p.planta))]
    plantas.forEach((planta) => {
      if (cargadasRef.current.has(planta)) return
      const pagina = planPages.find((p) => p.planta === planta)
      if (!pagina) return
      cargadasRef.current.add(planta)
      resolutionsApi
        .planPageBlob(resolutionId, pagina.order_index)
        .then((blob) => {
          const url = URL.createObjectURL(blob)
          objectUrlsRef.current[planta] = url
          setImagenesPorPlanta((prev) => ({ ...prev, [planta]: url }))
        })
        .catch(() => {
          // Silencioso: si falla la precarga, la tarjeta simplemente no muestra imagen.
        })
    })
  }, [planPages, resolutionId])

  useEffect(
    () => () => {
      Object.values(objectUrlsRef.current).forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  const recalcular = (planta, angleDeg) => {
    const datos = datosPorPlanta[planta]
    setDatosPorPlanta((prev) => ({ ...prev, [planta]: { ...(prev[planta] || {}), angleDeg } }))
    if (!datos?.ancho || !datos?.alto) return // aun no corrio el OCR -- solo gira la vista previa
    const nombres = unidadesPorPlanta[planta]?.length ? unidadesPorPlanta[planta] : datos.nombres || []
    const analisis = analizarColindancias(datos.bloques, nombres, { angleDeg }, {
      width: datos.ancho,
      height: datos.alto,
    })
    const sugerencias = analisis.sugerencias
    const focos = focosDe(analisis.detalle, datos.ancho, datos.alto)
    const motivos = motivosDe(analisis.detalle)
    setDatosPorPlanta((prev) => ({ ...prev, [planta]: { ...(prev[planta] || {}), angleDeg, focos, motivos } }))
    setLogPorPagina((prev) =>
      prev[datos.claveLog]
        ? {
            ...prev,
            [datos.claveLog]: {
              ...prev[datos.claveLog],
              correccionManualNorteDeg: angleDeg,
              unidadesBuscadas: nombres,
              analisis: analisis.detalle,
              sugerencias,
            },
          }
        : prev,
    )
    setColindancias((prev) => ({
      ...prev,
      [planta]: { ...(prev[planta] || {}), ...sugerencias },
    }))
  }

  const detectar = async () => {
    if (planPages.length === 0) {
      toast.error('Primero suba las páginas del plano.')
      return
    }
    setDetectando(true)
    try {
      const nuevosDatos = {}
      const nuevasColindancias = {}
      const nuevoLog = {}
      const leidas = {}
      for (const p of planPages) {
        if (!leidas[p.order_index]) {
          const blobPagina = await resolutionsApi.planPageBlob(resolutionId, p.order_index)
          const bitmap = await createImageBitmap(blobPagina)
          const { width, height } = bitmap
          bitmap.close?.()
          // Planos grandes/alargados: el OCR solo lee bien por mosaicos (ocrMosaicos.js).
          const bloquesPagina = await ocrImagenEnMosaicos(blobPagina, `plano_${p.order_index}.jpg`)
          leidas[p.order_index] = {
            blob: blobPagina,
            ancho: width,
            alto: height,
            bloques: bloquesPagina,
            norte: await detectNorth(blobPagina, bloquesPagina),
          }
        }
        const { blob, ancho, alto, bloques, norte } = leidas[p.order_index]
        const deTabla = unidadesPorPlanta[p.planta] || []
        const nombres = deTabla.length > 0 ? deTabla : autodetectarUnidades(bloques)
        const claveLog = `${p.order_index}|${p.planta}`
        const analisis = analizarColindancias(bloques, nombres, norte, { width: ancho, height: alto })
        const sugerencias = analisis.sugerencias

        nuevosDatos[p.planta] = {
          ancho,
          alto,
          bloques,
          angleDeg: norte.angleDeg,
          confidence: norte.confidence,
          pagina: p.order_index,
          claveLog,
          nombres,
          autoDetectadas: deTabla.length === 0,
          focos: focosDe(analisis.detalle, ancho, alto),
          motivos: motivosDe(analisis.detalle),
        }
        const url = URL.createObjectURL(blob)
        if (objectUrlsRef.current[p.planta]) URL.revokeObjectURL(objectUrlsRef.current[p.planta])
        objectUrlsRef.current[p.planta] = url
        setImagenesPorPlanta((prev) => ({ ...prev, [p.planta]: url }))
        nuevasColindancias[p.planta] = { ...(nuevasColindancias[p.planta] || {}), ...sugerencias }
        nuevoLog[claveLog] = {
          planta: p.planta,
          pagina: p.order_index,
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
      setDatosPorPlanta((prev) => ({ ...prev, ...nuevosDatos }))
      setLogPorPagina((prev) => ({ ...prev, ...nuevoLog }))
      setColindancias((prev) => {
        const merged = { ...prev }
        Object.entries(nuevasColindancias).forEach(([planta, porUnidad]) => {
          merged[planta] = { ...(merged[planta] || {}), ...porUnidad }
        })
        return merged
      })
      toast.success('Colindancias sugeridas. Revise cada unidad antes de generar el Excel.')
    } catch (e) {
      toast.error(`No se pudo detectar colindancias: ${e.message}`)
    } finally {
      setDetectando(false)
    }
  }

  const descargarLog = () => {
    const log = {
      tipo: 'log_llenado_colindancias',
      version: 1,
      generado: new Date().toISOString(),
      resolucion: { id: resolutionId, numero: resolutionNumber || null },
      paginas: Object.values(logPorPagina).sort((a, b) => a.pagina - b.pagina || a.planta.localeCompare(b.planta)),
      valoresEnPantalla: colindancias,
    }
    const nombre = String(resolutionNumber || resolutionId).replace(/\W+/g, '_')
    downloadBlob(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }), `colindancias_log_${nombre}.json`)
  }

  const generarPdf = async () => {
    const secciones = plantasConPlano.map((planta) => {
      const datos = datosPorPlanta[planta]
      const nombres = unidadesVisibles(unidadesPorPlanta[planta] || [], datos)
      return {
        planta,
        unidades: nombres.map((ambiente) => ({
          nombre: ambiente,
          valores: colindancias[planta]?.[ambiente] || {},
          url: imagenesPorPlanta[planta],
          angleDeg: datos?.angleDeg ?? 0,
          foco: datos?.focos?.[ambiente],
        })),
      }
    })
    setGenerandoPdf(true)
    try {
      await generarColindanciasPdf(`Resolución ${resolutionNumber || ''}`, secciones)
    } catch (e) {
      toast.error(`No se pudo generar el PDF: ${e.message}`)
    } finally {
      setGenerandoPdf(false)
    }
  }

  const onCambioValor = (planta, ambiente, direccion, valor) => {
    setColindancias((prev) => ({
      ...prev,
      [planta]: {
        ...(prev[planta] || {}),
        [ambiente]: { ...(prev[planta]?.[ambiente] || {}), [direccion]: valor },
      },
    }))
  }

  const alternarPiso = (planta) =>
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (!next.delete(planta)) next.add(planta)
      return next
    })

  const tieneColindancias = (planta, nombres) =>
    nombres.some((ambiente) =>
      Object.values(colindancias[planta]?.[ambiente] || {}).some((v) => String(v || '').trim() !== ''),
    )

  // Un piso entra a la lista si tiene alguna colindancia; una vez que entra se
  // queda (yaMostradas) para no desaparecer mientras se edita.
  const conColindancias = (planta) =>
    tieneColindancias(planta, unidadesVisibles(unidadesPorPlanta[planta] || [], datosPorPlanta[planta]))
  const nuevasMostradas = plantasConPlano.filter((p) => !yaMostradas.has(p) && conColindancias(p))
  if (nuevasMostradas.length > 0) setYaMostradas(new Set([...yaMostradas, ...nuevasMostradas]))
  const pisoVisible = (planta) => yaMostradas.has(planta) || conColindancias(planta)

  if (planPages.length === 0) {
    return (
      <Card className="animate-card-in">
        <p className="text-sm text-slate-500">Suba las páginas del plano para sacar las colindancias.</p>
      </Card>
    )
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Compass}
        eyebrow="Plano de división"
        title="Colindancias"
        subtitle="Sugerido a partir del OCR del plano y la orientación detectada — revise cada unidad antes de generar el Excel."
      />

      <div className="flex flex-wrap gap-2">
        <Button icon={ScanSearch} onClick={detectar} loading={detectando}>
          Detectar colindancias
        </Button>
        {Object.keys(datosPorPlanta).length > 0 && (
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

      {plantasConPlano.every((p) => !pisoVisible(p)) && (
        <p className="mt-5 text-sm text-slate-400">
          Todavía no hay pisos con colindancias. Pulse "Detectar colindancias" para sacarlas del plano.
        </p>
      )}

      {plantasConPlano.filter(pisoVisible).map((planta) => {
        const datos = datosPorPlanta[planta]
        const autoDetectadas = !unidadesPorPlanta[planta]?.length
        const nombresConocidos = autoDetectadas ? datos?.nombres || [] : unidadesPorPlanta[planta]
        const nombres = unidadesVisibles(unidadesPorPlanta[planta] || [], datos)
        const angleDeg = datos?.angleDeg ?? 0
        const imagenUrl = imagenesPorPlanta[planta]
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...nombresConocidos]
        const datalistId = `colindancia-opciones-${planta.replace(/\s+/g, '-')}`
        const abierta = abiertas.has(planta)
        const conValores = nombres.filter((a) => tieneColindancias(planta, [a])).length

        return (
          <div key={planta} className="mt-3 rounded-xl border border-slate-200">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
              onClick={() => alternarPiso(planta)}
              aria-expanded={abierta}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {abierta ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {planta}
                {autoDetectadas && datos && (
                  <span
                    className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-normal normal-case text-accent-600"
                    title="Esta planta todavía no tiene filas en la tabla de superficies (Hoja2): las unidades se leyeron directo del plano, revíselas con más cuidado."
                  >
                    del plano, sin tabla
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400">
                {conValores} {conValores === 1 ? 'unidad con colindancias' : 'unidades con colindancias'}
              </span>
            </button>

            {abierta && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-4">
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Norte detectado: {Math.round(angleDeg)}°{' '}
                  {datos?.confidence === 'baja' && (
                    <span className="text-state-warning">(no se encontró el símbolo de norte, revise)</span>
                  )}
                  {datos?.confidence === 'media' && (
                    <span className="text-state-warning">(confianza media, revise)</span>
                  )}
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                  title="Rotar -90°"
                  onClick={() => recalcular(planta, (angleDeg - 90 + 360) % 360)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                  title="Rotar +90°"
                  onClick={() => recalcular(planta, (angleDeg + 90) % 360)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  step="1"
                  className="w-16 rounded-lg border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-accent-500/60"
                  value={Math.round(angleDeg)}
                  onChange={(e) => recalcular(planta, Number(e.target.value) || 0)}
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
              <p className="text-xs text-slate-400">
                {autoDetectadas
                  ? 'Pulse "Detectar colindancias" para leer las unidades directo del plano.'
                  : datos?.motivos
                    ? 'Ninguno de los nombres de la tabla de superficies se encontró en este plano: revise la columna Planta de Hoja2.'
                    : 'Sin unidades en la tabla de superficies para esta planta.'}
              </p>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(26rem, 1fr))' }}>
              {nombres.map((ambiente) => (
                <ColindanciaCard
                  key={ambiente}
                  ambiente={ambiente}
                  valores={colindancias[planta]?.[ambiente] || {}}
                  onCambioValor={(direccion, valor) => onCambioValor(planta, ambiente, direccion, valor)}
                  datalistId={datalistId}
                  imagenUrl={imagenUrl}
                  angleDeg={angleDeg}
                  ancho={datos?.ancho}
                  alto={datos?.alto}
                  foco={datos?.focos?.[ambiente]}
                />
              ))}
            </div>
              </div>
            )}
          </div>
        )
      })}
    </Card>
  )
}
