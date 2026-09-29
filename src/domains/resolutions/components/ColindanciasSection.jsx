import { Bug, Compass, FileDown, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
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
import { ocrImage } from '@/shared/colindancias/ocrClient'
import { detectNorth } from '@/shared/colindancias/planNorthDetector'
import { Button, Card, SectionHeader } from '@/shared/ui'
import { downloadBlob } from '@/shared/utils'

/**
 * Revisión/confirmación de colindancias (columna E de COLINDANCIAS, ver
 * sheet2Excel.js) a partir de las páginas del plano de división ya subidas
 * (PlanPagesSection). Por cada planta con plano:
 *
 *   1. Corre el mismo servicio de OCR que ya usa la tabla de superficies.
 *   2. Detecta hacia dónde apunta el norte dibujado (planNorthDetector.js).
 *   3. Sugiere, para cada unidad de esa planta, su vecino en cada dirección
 *      (colindanciasDetector.js).
 *
 * Una tarjeta por unidad (no una fila de tabla): la MISMA imagen del plano
 * de la planta, rotada visualmente para que el norte quede arriba, con los
 * 4 valores de esa unidad alrededor -- la plantilla real de COLINDANCIAS
 * solo pide esos 4 datos por unidad, nada más.
 *
 * Es "asistido": las sugerencias se guardan en `colindancias` (estado de
 * ResolutionPage.jsx, mismo JSON opaco que datosGenerales/paginasTabla) pero
 * SIEMPRE quedan en un <input> editable con lista de opciones -- el usuario
 * tiene la última palabra antes de generar el Excel. Si el norte detectado
 * quedó mal, los botones de rotación lo corrigen sin volver a llamar al OCR
 * (se guarda el resultado crudo del OCR por planta para recalcular local).
 *
 * "Descargar log de llenado" baja un JSON con TODO lo que llevó a cada
 * sugerencia (norte detectado y por qué, bloques del OCR, dónde se ubicó cada
 * unidad o por qué no, candidatos por lado) más lo que quedó en pantalla,
 * para depurar con resoluciones reales sin tener que reproducirlas.
 *
 * No hace falta la tabla de superficies (Hoja2) para detectar: cada planta
 * se detecta por su cuenta, sin depender de la otra. Con filas ya cargadas en
 * Hoja2 para esa planta, busca esos nombres de "Ambiente"; sin ellas, saca
 * los nombres de unidad directo del plano (autodetectarUnidades en
 * colindanciasDetector.js) -- la tarjeta lo marca ("del plano, sin tabla")
 * porque, al no venir de una lista conocida, conviene revisarla con más
 * cuidado.
 *
 * Después de detectar, cada planta muestra SOLO las unidades que el OCR
 * ubicó en SU plano: un nombre de Hoja2 que no aparece ahí no es de esa
 * planta (pertenece a otra, o la tabla lo trajo mal) y no gana tarjeta --
 * sigue ofrecido igual en el <input> de "vecino" de las que sí aparecen.
 *
 * "Generar PDF" (colindanciasPdf.js) vuelca TODO lo detectado -- todas las
 * plantas, cada unidad con la misma imagen ampliada/rotada de su tarjeta y
 * sus 4 valores -- en un único documento para repasar o compartir sin abrir
 * la pantalla con decenas de tarjetas. Usa lo que quedó en `colindancias`
 * (con las correcciones a mano ya aplicadas), no la sugerencia cruda.
 */
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

  const cargadasRef = useRef(new Set())
  const objectUrlsRef = useRef({})

  // Toda planta con página de plano entra, tenga o no filas ya cargadas en
  // Hoja2: sin tabla, "Detectar colindancias" saca los nombres de unidad del
  // propio plano (autodetectarUnidades) en vez de saltarse la planta.
  const plantasConPlano = [...new Set(planPages.map((p) => p.planta))]

  // Precarga la foto de cada planta apenas hay página de plano, sin esperar
  // a "Detectar colindancias" -- así el usuario ya ve el plano (sin rotar)
  // mientras revisa/edita a mano si quiere.
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
    // Igual que en detectar(): con tabla, sus nombres; sin tabla, los que ya
    // se autodetectaron del plano (guardados en datos.nombres).
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
      // Una hoja tipo llega una vez por cada piso (ver ResolutionPage): el
      // OCR y el norte de esa imagen se calculan una sola vez.
      const leidas = {}
      for (const p of planPages) {
        if (!leidas[p.order_index]) {
          const blobPagina = await resolutionsApi.planPageBlob(resolutionId, p.order_index)
          const bitmap = await createImageBitmap(blobPagina)
          const { width, height } = bitmap
          bitmap.close?.()
          const bloquesPagina = await ocrImage(blobPagina, `plano_${p.order_index}.jpg`)
          leidas[p.order_index] = {
            blob: blobPagina,
            ancho: width,
            alto: height,
            bloques: bloquesPagina,
            norte: await detectNorth(blobPagina, bloquesPagina),
          }
        }
        const { blob, ancho, alto, bloques, norte } = leidas[p.order_index]
        // Con tabla, sus nombres de "Ambiente"; sin tabla (todavía no se
        // cargó Hoja2 para esta planta), los rótulos que el propio plano deja
        // leer -- cada planta se detecta por su cuenta, sin depender de la
        // otra.
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
        // El zoom usa posiciones de ESTA página: la tarjeta tiene que mostrar
        // la misma imagen (si la planta tiene varias páginas, la precarga
        // mostraba la primera).
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
      // Lo que quedó en los campos al descargar (incluye lo corregido a mano):
      // comparándolo con `sugerencias` de cada página se ve qué falló.
      valoresEnPantalla: colindancias,
    }
    const nombre = String(resolutionNumber || resolutionId).replace(/\W+/g, '_')
    downloadBlob(new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' }), `colindancias_log_${nombre}.json`)
  }

  const generarPdf = async () => {
    // Mismas plantas y las mismas unidades que se ven en pantalla ahora
    // mismo (unidadesVisibles), con los valores YA corregidos a mano si los
    // hubo -- es un reporte de lo que el usuario dejó, no de la sugerencia
    // cruda.
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

  if (planPages.length === 0) return null

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Compass}
        eyebrow="Plano de división"
        title="Colindancias (COLINDANCIAS)"
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

      {plantasConPlano.map((planta) => {
        const datos = datosPorPlanta[planta]
        const autoDetectadas = !unidadesPorPlanta[planta]?.length
        const nombresConocidos = autoDetectadas ? datos?.nombres || [] : unidadesPorPlanta[planta]
        const nombres = unidadesVisibles(unidadesPorPlanta[planta] || [], datos)
        const angleDeg = datos?.angleDeg ?? 0
        const imagenUrl = imagenesPorPlanta[planta]
        // El <input list> de "vecino" sigue ofreciendo TODOS los nombres
        // conocidos (aunque no tengan tarjeta propia): puede ser el vecino de
        // una unidad de esta planta sin serlo ella misma.
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...nombresConocidos]
        const datalistId = `colindancia-opciones-${planta.replace(/\s+/g, '-')}`

        return (
          <div key={planta} className="mt-6 border-t border-slate-100 pt-5 first:mt-4 first:border-0 first:pt-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                {planta}
                {autoDetectadas && datos && (
                  <span
                    className="ml-2 rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-normal normal-case text-accent-600"
                    title="Esta planta todavía no tiene filas en la tabla de superficies (Hoja2): las unidades se leyeron directo del plano, revíselas con más cuidado."
                  >
                    del plano, sin tabla
                  </span>
                )}
              </p>
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
                {/* Ajuste fino: el símbolo de norte (arco + barra) lo busca
                    planNorthDetector.js con OpenCV; si no lo encontró o el
                    plano tiene otro símbolo, el ángulo se corrige acá a mano. */}
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
        )
      })}
    </Card>
  )
}
