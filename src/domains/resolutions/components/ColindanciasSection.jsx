import { Compass, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { ocrImage, resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { LEYENDAS_COLINDANCIA, detectColindancias } from '@/domains/resolutions/utils/colindanciasDetector'
import { detectNorth } from '@/domains/resolutions/utils/planNorthDetector'
import { Alert, Button, Card, SectionHeader } from '@/shared/ui'

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
 */
export function ColindanciasSection({ resolutionId, planPages, unidadesPorPlanta, colindancias, setColindancias }) {
  const [detectando, setDetectando] = useState(false)
  const [datosPorPlanta, setDatosPorPlanta] = useState({}) // { [planta]: { ancho, alto, bloques, angleDeg, confidence } }
  const [imagenesPorPlanta, setImagenesPorPlanta] = useState({}) // { [planta]: objectURL } -- preview, independiente del OCR

  const cargadasRef = useRef(new Set())
  const objectUrlsRef = useRef({})

  const plantasConPlano = [...new Set(planPages.map((p) => p.planta))].filter(
    (planta) => (unidadesPorPlanta[planta] || []).length > 0,
  )

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
    const nombres = unidadesPorPlanta[planta] || []
    const sugerencias = detectColindancias(datos.bloques, nombres, { angleDeg }, {
      width: datos.ancho,
      height: datos.alto,
    })
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
      for (const p of planPages) {
        const nombres = unidadesPorPlanta[p.planta] || []
        if (nombres.length === 0) continue // planta sin unidades cargadas todavia en Hoja2

        const blob = await resolutionsApi.planPageBlob(resolutionId, p.order_index)
        const bitmap = await createImageBitmap(blob)
        const { width: ancho, height: alto } = bitmap
        bitmap.close?.()

        const bloques = await ocrImage(blob, `plano_${p.order_index}.jpg`)
        const norte = await detectNorth(blob, bloques)
        const sugerencias = detectColindancias(bloques, nombres, norte, { width: ancho, height: alto })

        nuevosDatos[p.planta] = { ancho, alto, bloques, angleDeg: norte.angleDeg, confidence: norte.confidence }
        nuevasColindancias[p.planta] = { ...(nuevasColindancias[p.planta] || {}), ...sugerencias }
      }
      setDatosPorPlanta((prev) => ({ ...prev, ...nuevosDatos }))
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

      <Button icon={ScanSearch} onClick={detectar} loading={detectando}>
        Detectar colindancias
      </Button>

      {plantasConPlano.length === 0 && (
        <Alert type="info" className="mt-3">
          Cargue primero la tabla de superficies (Hoja2) de al menos una planta con página de plano para poder
          sugerir colindancias.
        </Alert>
      )}

      {plantasConPlano.map((planta) => {
        const nombres = unidadesPorPlanta[planta] || []
        const datos = datosPorPlanta[planta]
        const angleDeg = datos?.angleDeg ?? 0
        const imagenUrl = imagenesPorPlanta[planta]
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...nombres]
        const datalistId = `colindancia-opciones-${planta.replace(/\s+/g, '-')}`

        return (
          <div key={planta} className="mt-6 border-t border-slate-100 pt-5 first:mt-4 first:border-0 first:pt-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">{planta}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>
                  Norte detectado: {Math.round(angleDeg)}°{' '}
                  {datos?.confidence === 'baja' && (
                    <span className="text-state-warning">(baja confianza, revise)</span>
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
                {/* Ajuste fino: el OCR casi nunca lee la "N" del rótulo de
                    norte (es un símbolo, no texto de línea) -- en la
                    práctica el ángulo real casi siempre se corrige acá a
                    mano, no con los botones de 90° solos. */}
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {nombres.map((ambiente) => (
                <div key={ambiente} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="mb-2 truncate text-xs font-semibold text-slate-700" title={ambiente}>
                    {ambiente}
                  </p>
                  <div
                    className="grid items-center justify-items-center gap-1"
                    style={{
                      gridTemplateAreas: '". norte ." "oeste imagen este" ". sud ."',
                      gridTemplateColumns: '5.5rem 1fr 5.5rem',
                      gridTemplateRows: 'auto 1fr auto',
                    }}
                  >
                    <div style={{ gridArea: 'norte' }} className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Norte
                      </span>
                      <input
                        list={datalistId}
                        className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-accent-500/60"
                        value={colindancias[planta]?.[ambiente]?.norte || ''}
                        onChange={(e) => onCambioValor(planta, ambiente, 'norte', e.target.value)}
                        placeholder="Sin detectar…"
                      />
                    </div>

                    <div style={{ gridArea: 'oeste' }} className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Oeste
                      </span>
                      <input
                        list={datalistId}
                        className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-accent-500/60"
                        value={colindancias[planta]?.[ambiente]?.oeste || ''}
                        onChange={(e) => onCambioValor(planta, ambiente, 'oeste', e.target.value)}
                        placeholder="Sin detectar…"
                      />
                    </div>

                    <div
                      style={{ gridArea: 'imagen' }}
                      className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      {imagenUrl ? (
                        <img
                          src={imagenUrl}
                          alt={`Plano ${planta}`}
                          className="max-h-full max-w-full object-contain transition-transform"
                          style={{ transform: `rotate(${-angleDeg}deg)` }}
                        />
                      ) : (
                        <span className="px-2 text-center text-[10px] text-slate-400">Cargando plano…</span>
                      )}
                    </div>

                    <div style={{ gridArea: 'este' }} className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Este
                      </span>
                      <input
                        list={datalistId}
                        className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-accent-500/60"
                        value={colindancias[planta]?.[ambiente]?.este || ''}
                        onChange={(e) => onCambioValor(planta, ambiente, 'este', e.target.value)}
                        placeholder="Sin detectar…"
                      />
                    </div>

                    <div style={{ gridArea: 'sud' }} className="flex flex-col items-center">
                      <input
                        list={datalistId}
                        className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-[11px] outline-none focus:border-accent-500/60"
                        value={colindancias[planta]?.[ambiente]?.sud || ''}
                        onChange={(e) => onCambioValor(planta, ambiente, 'sud', e.target.value)}
                        placeholder="Sin detectar…"
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sud</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
