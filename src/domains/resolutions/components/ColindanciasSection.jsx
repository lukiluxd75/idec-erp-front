import { Compass, RotateCcw, RotateCw, ScanSearch } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'

import { ocrImage, resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { LEYENDAS_COLINDANCIA, detectColindancias } from '@/domains/resolutions/utils/colindanciasDetector'
import { detectNorth } from '@/domains/resolutions/utils/planNorthDetector'
import { Alert, Button, Card, SectionHeader } from '@/shared/ui'

const DIRECCIONES = [
  ['norte', 'Norte'],
  ['este', 'Este'],
  ['sud', 'Sud'],
  ['oeste', 'Oeste'],
]

/**
 * Revisión/confirmación de colindancias (columna E de COLINDANCIAS, ver
 * sheet2Excel.js) por planta, a partir de las páginas del plano de división
 * ya subidas (PlanPagesSection). Por cada página:
 *
 *   1. Corre el mismo servicio de OCR que ya usa la tabla de superficies.
 *   2. Detecta hacia dónde apunta el norte dibujado (planNorthDetector.js).
 *   3. Sugiere, para cada unidad de esa planta, su vecino en cada dirección
 *      (colindanciasDetector.js).
 *
 * Es "asistido": las sugerencias se guardan en `colindancias` (estado de
 * ResolutionPage.jsx, mismo JSON opaco que datosGenerales/paginasTabla) pero
 * SIEMPRE quedan en un <input> editable con lista de opciones -- el usuario
 * tiene la última palabra antes de generar el Excel. Si el norte detectado
 * quedó mal, los botones de rotación lo corrigen sin volver a llamar al OCR
 * (se guarda el resultado crudo del OCR por página para recalcular local).
 */
export function ColindanciasSection({ resolutionId, planPages, unidadesPorPlanta, colindancias, setColindancias }) {
  const [detectando, setDetectando] = useState(false)
  const [datosPorPagina, setDatosPorPagina] = useState({}) // { [orden]: { ancho, alto, bloques, angleDeg, confidence, planta } }

  const plantasConPlano = [...new Set(planPages.map((p) => p.planta))].filter(
    (planta) => (unidadesPorPlanta[planta] || []).length > 0,
  )

  const recalcular = (orden, angleDeg) => {
    const datos = datosPorPagina[orden]
    if (!datos) return
    const nombres = unidadesPorPlanta[datos.planta] || []
    const sugerencias = detectColindancias(datos.bloques, nombres, { angleDeg }, {
      width: datos.ancho,
      height: datos.alto,
    })
    setDatosPorPagina((prev) => ({ ...prev, [orden]: { ...prev[orden], angleDeg } }))
    setColindancias((prev) => ({
      ...prev,
      [datos.planta]: { ...(prev[datos.planta] || {}), ...sugerencias },
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

        nuevosDatos[p.order_index] = { ancho, alto, bloques, angleDeg: norte.angleDeg, confidence: norte.confidence, planta: p.planta }
        nuevasColindancias[p.planta] = { ...(nuevasColindancias[p.planta] || {}), ...sugerencias }
      }
      setDatosPorPagina(nuevosDatos)
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
        const pagina = planPages.find((p) => p.planta === planta)
        const datos = pagina ? datosPorPagina[pagina.order_index] : null
        const opcionesDatalist = [...LEYENDAS_COLINDANCIA, ...nombres]

        return (
          <div key={planta} className="mt-6 border-t border-slate-100 pt-5 first:mt-4 first:border-0 first:pt-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">{planta}</p>
              {datos && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    Norte detectado: {Math.round(datos.angleDeg)}°{' '}
                    {datos.confidence === 'baja' && (
                      <span className="text-state-warning">(baja confianza, revise)</span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                    title="Rotar -90°"
                    onClick={() => recalcular(pagina.order_index, (datos.angleDeg - 90 + 360) % 360)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 p-1 hover:border-accent-400 hover:text-accent-600"
                    title="Rotar +90°"
                    onClick={() => recalcular(pagina.order_index, (datos.angleDeg + 90) % 360)}
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
                    value={Math.round(datos.angleDeg)}
                    onChange={(e) => recalcular(pagina.order_index, Number(e.target.value) || 0)}
                    title="Ángulo del norte, en grados (0 = arriba de la foto)"
                  />
                  <span>°</span>
                </div>
              )}
            </div>

            <datalist id={`colindancia-opciones-${planta.replace(/\s+/g, '-')}`}>
              {opcionesDatalist.map((op) => (
                <option key={op} value={op} />
              ))}
            </datalist>

            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-1 pr-3">Unidad</th>
                    {DIRECCIONES.map(([, label]) => (
                      <th key={label} className="py-1 pr-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nombres.map((ambiente) => (
                    <tr key={ambiente} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-medium text-slate-700">{ambiente}</td>
                      {DIRECCIONES.map(([dir]) => (
                        <td key={dir} className="py-1.5 pr-3">
                          <input
                            list={`colindancia-opciones-${planta.replace(/\s+/g, '-')}`}
                            className="w-48 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-accent-500/60"
                            value={colindancias[planta]?.[ambiente]?.[dir] || ''}
                            onChange={(e) => onCambioValor(planta, ambiente, dir, e.target.value)}
                            placeholder="Sin detectar…"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
