import { Landmark, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'

import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { PLANTAS_RESUMEN, plantasDePagina } from '@/domains/resolutions/utils/plantasCatalog'
import { pdfToImages } from '@/domains/resolutions/utils/planoPdf'
import { Button, Card, SectionHeader, Spinner } from '@/shared/ui'

// Mientras alguna página está leyendo su título, se vuelve a pedir la
// resolución cada tanto para mostrar la planta apenas quede (el backend
// avisa por WS, pero esta pantalla no lo escucha y entre workers no llega).
const POLL_DETECCION_MS = 3000

/** "PLANTA 2º PISO, 3º PISO, 4º PISO" -- corto para la miniatura. */
function resumenPlantas(plantas) {
  if (plantas.length <= 1) return plantas[0] || ''
  return plantas.map((p, i) => (i === 0 ? p : p.replace(/^PLANTA /, ''))).join(', ')
}

function ChecklistPlantas({ elegidas, onToggle }) {
  return (
    <div className="max-h-32 w-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5">
      {PLANTAS_RESUMEN.map((planta) => (
        <label key={planta} className="flex items-center gap-1.5 py-0.5 text-[11px] text-slate-600">
          <input type="checkbox" checked={elegidas.includes(planta)} onChange={() => onToggle(planta)} />
          {planta}
        </label>
      ))}
    </div>
  )
}

const toggle = (lista, planta) => (lista.includes(planta) ? lista.filter((x) => x !== planta) : [...lista, planta])

/** Estado de la planta de una página ya subida (ver PlantaStatus en el backend). */
function EstadoPlanta({ pagina }) {
  const plantas = plantasDePagina(pagina)
  switch (pagina.planta_status) {
    case 'detectando':
      return (
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <Spinner className="h-3 w-3" /> Leyendo el título…
        </span>
      )
    case 'sin_titulo':
      return (
        <span className="text-center text-[11px] text-state-danger" title={pagina.planta_detection?.motivo || ''}>
          No se leyó el título — asigne la planta
        </span>
      )
    case 'error':
      return (
        <span className="text-center text-[11px] text-state-danger" title={pagina.planta_detection?.motivo || ''}>
          Falló la lectura del título
        </span>
      )
    default:
      return (
        <span
          className="max-w-40 text-center text-xs text-slate-500"
          title={pagina.planta_title ? `Del título del plano: "${pagina.planta_title}"` : plantas.join(', ')}
        >
          {resumenPlantas(plantas)}
          {pagina.planta_status === 'detectada' && <span className="block text-[10px] text-slate-400">(del título)</span>}
        </span>
      )
  }
}

/**
 * Páginas del plano de división, usadas para calcular colindancias. A
 * diferencia de la tabla de superficies (que hoy solo sube el celular), esta
 * sección deja subir desde CUALQUIER canal -- la app y la web pegan al mismo
 * endpoint (`source` en resolutions.api.js es solo metadata de quien subió).
 *
 * La planta de cada página NO hace falta elegirla: si se sube sin marcar, el
 * backend la lee del título del plano ("PLANTA TIPO 2° - 4° PISO") en segundo
 * plano. Una misma hoja puede valer para varias plantas iguales (plano tipo):
 * se guarda UNA vez con todas sus plantas, y ColindanciasSection la usa para
 * cada una. Si el título no se pudo leer, se asigna acá a mano.
 *
 * Si el archivo elegido es un PDF, se convierte a una imagen JPEG por página
 * ANTES de subir (ver planoPdf.js): el backend y la detección por visión por
 * computadora solo trabajan con imágenes, igual que las fotos del celular.
 */
export function PlanPagesSection({ resolutionId, planPages, onChanged }) {
  const [imagenes, setImagenes] = useState({}) // { [order_index]: objectURL }
  const [loadingImgs, setLoadingImgs] = useState(true)
  const [pendientes, setPendientes] = useState([]) // [{ blob, url, plantas: string[] }]
  const [procesandoArchivo, setProcesandoArchivo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [editando, setEditando] = useState(null) // { orden, plantas }

  // Solo vuelve a bajar las miniaturas si cambian las páginas, no en cada
  // refresco del estado de detección.
  const ordenes = planPages.map((p) => p.order_index).join(',')
  useEffect(() => {
    let alive = true
    const urls = []
    ;(async () => {
      const mapa = {}
      for (const orden of ordenes ? ordenes.split(',').map(Number) : []) {
        try {
          const blob = await resolutionsApi.planPageBlob(resolutionId, orden)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          mapa[orden] = url
        } catch {
          // se muestra sin miniatura si esta pagina en particular falla
        }
      }
      if (alive) setImagenes(mapa)
      if (alive) setLoadingImgs(false)
    })()
    return () => {
      alive = false
      urls.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [resolutionId, ordenes])

  // En un ref: el callback del padre cambia en cada render y no debe
  // reiniciar el intervalo.
  const onChangedRef = useRef(onChanged)
  useEffect(() => {
    onChangedRef.current = onChanged
  })
  const detectando = planPages.some((p) => p.planta_status === 'detectando')
  useEffect(() => {
    if (!detectando) return undefined
    const t = setInterval(() => onChangedRef.current?.(), POLL_DETECCION_MS)
    return () => clearInterval(t)
  }, [detectando])

  const onFilesSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // permite volver a elegir el mismo archivo despues
    if (files.length === 0) return
    setProcesandoArchivo(true)
    try {
      const nuevos = []
      for (const file of files) {
        if (file.type === 'application/pdf') {
          const imagenesDelPdf = await pdfToImages(file)
          imagenesDelPdf.forEach((blob) => nuevos.push({ blob, url: URL.createObjectURL(blob), plantas: [] }))
        } else {
          nuevos.push({ blob: file, url: URL.createObjectURL(file), plantas: [] })
        }
      }
      setPendientes((prev) => [...prev, ...nuevos])
    } catch (err) {
      toast.error(`No se pudo leer el archivo: ${err.message}`)
    } finally {
      setProcesandoArchivo(false)
    }
  }

  const onTogglePlantaPendiente = (idx, planta) =>
    setPendientes((prev) => prev.map((p, i) => (i === idx ? { ...p, plantas: toggle(p.plantas, planta) } : p)))

  const quitarPendiente = (idx) =>
    setPendientes((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })

  const subirPendientes = async () => {
    setSubiendo(true)
    try {
      await resolutionsApi.addPlanPages(
        resolutionId,
        pendientes.map((p) => ({ blob: p.blob, plantas: p.plantas })),
      )
      const sinPlanta = pendientes.filter((p) => p.plantas.length === 0).length
      pendientes.forEach((p) => URL.revokeObjectURL(p.url))
      setPendientes([])
      toast.success(
        sinPlanta
          ? 'Páginas del plano agregadas. La planta se está leyendo del título del plano.'
          : 'Páginas del plano agregadas.',
      )
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  const eliminarPagina = async (orden) => {
    try {
      await resolutionsApi.removePlanPage(resolutionId, orden)
      toast.success('Página eliminada.')
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const guardarPlantas = async () => {
    if (editando.plantas.length === 0) {
      toast.error('Marque al menos una planta.')
      return
    }
    try {
      await resolutionsApi.setPlanPagePlantas(resolutionId, editando.orden, editando.plantas)
      setEditando(null)
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const reintentarDeteccion = async (orden) => {
    try {
      await resolutionsApi.detectPlanPagePlanta(resolutionId, orden)
      onChanged?.()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Landmark}
        eyebrow="Plano de división"
        title="Páginas del plano (colindancias)"
        subtitle="Foto o PDF del plano aprobado, desde el celular o directo desde la web. La planta se lee sola del título del plano."
      />

      {loadingImgs ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5" />
        </div>
      ) : planPages.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay páginas del plano cargadas.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {planPages.map((p) => (
            <div key={p.order_index} className="flex w-40 flex-col items-center gap-1">
              {imagenes[p.order_index] ? (
                <a href={imagenes[p.order_index]} target="_blank" rel="noreferrer">
                  <img
                    src={imagenes[p.order_index]}
                    alt={p.planta}
                    className="h-28 w-24 rounded-xl border border-white/60 object-cover shadow-xs transition hover:shadow-md"
                  />
                </a>
              ) : (
                <div className="flex h-28 w-24 items-center justify-center rounded-xl border border-white/60 bg-slate-50 text-xs text-slate-400">
                  Sin vista previa
                </div>
              )}

              {editando?.orden === p.order_index ? (
                <>
                  <ChecklistPlantas
                    elegidas={editando.plantas}
                    onToggle={(planta) => setEditando((e) => ({ ...e, plantas: toggle(e.plantas, planta) }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={guardarPlantas}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <EstadoPlanta pagina={p} />
              )}

              <div className="flex items-center gap-2">
                {p.planta_status !== 'detectando' && editando?.orden !== p.order_index && (
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-accent-600"
                    onClick={() => setEditando({ orden: p.order_index, plantas: plantasDePagina(p) })}
                    title="Cambiar planta"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {['error', 'sin_titulo'].includes(p.planta_status) && (
                  <button
                    type="button"
                    className="text-slate-400 transition-colors hover:text-accent-600"
                    onClick={() => reintentarDeteccion(p.order_index)}
                    title="Volver a leer el título"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  className="text-slate-400 transition-colors hover:text-state-danger"
                  onClick={() => eliminarPagina(p.order_index)}
                  title="Quitar página"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-accent-400 hover:text-accent-600">
          <Upload className="h-4 w-4" />
          Agregar página del plano (foto o PDF)
          <input
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={onFilesSelected}
            disabled={procesandoArchivo}
          />
        </label>
        {procesandoArchivo && <span className="ml-3 text-xs text-slate-400">Leyendo archivo…</span>}
      </div>

      {pendientes.length > 0 && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-600">
            No hace falta marcar la planta: se lee del título del plano ("PLANTA 1° PISO", "PLANTA TIPO 2° - 4°
            PISO"…). Márquela solo si quiere fijarla a mano.
          </p>
          <div className="flex flex-wrap gap-4">
            {pendientes.map((p, i) => (
              <div key={p.url} className="flex flex-col items-center gap-1">
                <img src={p.url} alt="" className="h-28 w-24 rounded-xl border border-white/60 object-cover" />
                <ChecklistPlantas elegidas={p.plantas} onToggle={(planta) => onTogglePlantaPendiente(i, planta)} />
                <p className="max-w-40 text-center text-[10px] text-slate-400">
                  {p.plantas.length > 0 ? p.plantas.join(', ') : 'Se detecta del título'}
                </p>
                <button
                  type="button"
                  className="text-slate-400 transition-colors hover:text-state-danger"
                  onClick={() => quitarPendiente(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <Button icon={Upload} onClick={subirPendientes} loading={subiendo}>
            Subir {pendientes.length === 1 ? 'página' : `${pendientes.length} páginas`}
          </Button>
        </div>
      )}
    </Card>
  )
}
