import { Bug, Compass, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ocrImage, resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import {
  LEYENDAS_COLINDANCIA,
  analizarColindancias,
  autodetectarUnidades,
} from '@/domains/resolutions/utils/colindanciasDetector'
import { detectNorth } from '@/domains/resolutions/utils/planNorthDetector'
import { downloadBlob } from '@/domains/resolutions/utils/sheet2Excel'
import { Button, Card, SectionHeader } from '@/shared/ui'

/**
 * Dónde hacer zoom en la tarjeta de cada unidad: el rótulo de la unidad en
 * el plano (posición en la imagen original) y el ancho de la "ventana"
 * visible -- 3 veces la distancia al vecino elegido más cercano (se ve la
 * unidad y lo que la rodea), acotado entre 12% y 40% del plano.
 */
function focosDe(detalle, ancho, alto) {
  const lado = Math.max(ancho, alto)
  const focos = {}
  detalle.busquedas
    .filter((b) => b.tipo === 'unidad' && b.encontrada)
    .forEach((b) => {
      const distancias = Object.values(detalle.porUnidad[b.valor] || {})
        .map((l) => l.candidatos[0]?.distancia)
        .filter(Boolean)
      const base = distancias.length ? Math.min(...distancias) * 3 : lado * 0.25
      focos[b.valor] = {
        x: b.posicionImagen.x,
        y: b.posicionImagen.y,
        ventana: Math.min(lado * 0.4, Math.max(lado * 0.12, base)),
      }
    })
  return focos
}

/**
 * Por qué no se ubicó cada unidad (texto del log de llenado): se muestra en
 * su tarjeta, para distinguir "el nombre no está escrito en el plano / el OCR
 * no lo leyó" de "no hay nada al lado".
 */
function motivosDe(detalle) {
  const motivos = {}
  detalle.busquedas
    .filter((b) => b.tipo === 'unidad' && !b.encontrada)
    .forEach((b) => {
      motivos[b.valor] = b.motivo
    })
  return motivos
}

/**
 * Imagen del plano en la tarjeta de una unidad, con el norte arriba. Si se
 * ubicó el rótulo de la unidad, muestra el plano AMPLIADO sobre esa zona (no
 * un recorte: es el mismo plano con zoom, marcando el rótulo); un clic
 * alterna con el plano completo.
 */
function PlanoUnidad({ url, planta, angleDeg, ancho, alto, foco }) {
  const [completo, setCompleto] = useState(false)
  if (!url) return <span className="px-2 text-center text-[10px] text-slate-400">Cargando plano…</span>
  if (!foco || !ancho || !alto || completo) {
    return (
      <img
        src={url}
        alt={`Plano ${planta}`}
        className={`max-h-full max-w-full object-contain transition-transform ${foco ? 'cursor-zoom-in' : ''}`}
        style={{ transform: `rotate(${-angleDeg}deg)` }}
        onClick={foco ? () => setCompleto(false) : undefined}
        title={foco ? 'Clic para acercar a la unidad' : undefined}
      />
    )
  }
  // viewBox centrado en el rótulo: el SVG escala solo al tamaño de la tarjeta.
  const v = foco.ventana
  return (
    <svg
      viewBox={`${-v / 2} ${-v / 2} ${v} ${v}`}
      className="h-full w-full cursor-zoom-out"
      onClick={() => setCompleto(true)}
    >
      <title>Clic para ver el plano completo</title>
      <g transform={`rotate(${-angleDeg}) translate(${-foco.x} ${-foco.y})`}>
        <image href={url} width={ancho} height={alto} />
      </g>
      <circle r={v * 0.04} fill="none" stroke="#dc2626" strokeWidth={v * 0.008} />
    </svg>
  )
}

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
        {Object.keys(logPorPagina).length > 0 && (
          <Button variant="secondary" icon={Bug} onClick={descargarLog}>
            Descargar log de llenado
          </Button>
        )}
      </div>

      {plantasConPlano.map((planta) => {
        const datos = datosPorPlanta[planta]
        // Con tabla, sus nombres de "Ambiente"; sin tabla, los que ya se
        // autodetectaron del plano (vacío hasta que se pulse "Detectar").
        const nombres = unidadesPorPlanta[planta]?.length ? unidadesPorPlanta[planta] : datos?.nombres || []
        const autoDetectadas = !unidadesPorPlanta[planta]?.length
        const angleDeg = datos?.angleDeg ?? 0
        const imagenUrl = imagenesPorPlanta[planta]
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...nombres]
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
                  : 'Sin unidades en la tabla de superficies para esta planta.'}
              </p>
            )}

            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(26rem, 1fr))' }}>
              {nombres.map((ambiente) => {
                const valores = colindancias[planta]?.[ambiente] || {}
                return (
                  <div key={ambiente} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="truncate text-sm font-semibold text-slate-700" title={ambiente}>
                      {ambiente}
                    </p>
                    {datos?.motivos?.[ambiente] ? (
                      <p
                        className="mb-3 mt-0.5 text-[11px] leading-snug text-state-amber"
                        title={datos.motivos[ambiente]}
                      >
                        No se encontró este nombre en el plano ({datos.motivos[ambiente]}). Complete a mano o revise
                        el nombre en la tabla de superficies.
                      </p>
                    ) : (
                      <div className="mb-3" />
                    )}
                    <div
                      className="grid items-center justify-items-stretch gap-2"
                      style={{
                        gridTemplateAreas: '". norte ." "oeste imagen este" ". sud ."',
                        gridTemplateColumns: '8rem 10rem 8rem',
                        gridTemplateRows: 'auto 10rem auto',
                      }}
                    >
                      <div style={{ gridArea: 'norte' }} className="flex min-w-0 flex-col items-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Norte
                        </span>
                        <input
                          list={datalistId}
                          className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
                          value={valores.norte || ''}
                          title={valores.norte || ''}
                          onChange={(e) => onCambioValor(planta, ambiente, 'norte', e.target.value)}
                          placeholder="Sin detectar…"
                        />
                      </div>

                      <div style={{ gridArea: 'oeste' }} className="flex min-w-0 flex-col items-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Oeste
                        </span>
                        <input
                          list={datalistId}
                          className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
                          value={valores.oeste || ''}
                          title={valores.oeste || ''}
                          onChange={(e) => onCambioValor(planta, ambiente, 'oeste', e.target.value)}
                          placeholder="Sin detectar…"
                        />
                      </div>

                      <div
                        style={{ gridArea: 'imagen' }}
                        className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
                      >
                        <PlanoUnidad
                          url={imagenUrl}
                          planta={planta}
                          angleDeg={angleDeg}
                          ancho={datos?.ancho}
                          alto={datos?.alto}
                          foco={datos?.focos?.[ambiente]}
                        />
                      </div>

                      <div style={{ gridArea: 'este' }} className="flex min-w-0 flex-col items-center">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Este
                        </span>
                        <input
                          list={datalistId}
                          className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
                          value={valores.este || ''}
                          title={valores.este || ''}
                          onChange={(e) => onCambioValor(planta, ambiente, 'este', e.target.value)}
                          placeholder="Sin detectar…"
                        />
                      </div>

                      <div style={{ gridArea: 'sud' }} className="flex min-w-0 flex-col items-center">
                        <input
                          list={datalistId}
                          className="w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs outline-none focus:border-accent-500/60"
                          value={valores.sud || ''}
                          title={valores.sud || ''}
                          onChange={(e) => onCambioValor(planta, ambiente, 'sud', e.target.value)}
                          placeholder="Sin detectar…"
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sud</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
