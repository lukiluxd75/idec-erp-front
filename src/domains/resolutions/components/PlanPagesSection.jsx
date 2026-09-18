import { Landmark, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { PLANTAS_RESUMEN } from '@/domains/resolutions/utils/plantasCatalog'
import { pdfToImages } from '@/domains/resolutions/utils/planoPdf'
import { Button, Card, SectionHeader, Spinner } from '@/shared/ui'

/**
 * Páginas del plano de división (una foto/imagen por planta), usadas para
 * calcular colindancias. A diferencia de la tabla de superficies (que hoy
 * solo sube el celular), esta sección deja subir desde CUALQUIER canal --
 * la app y la web pegan al mismo endpoint (`source` en resolutions.api.js es
 * solo metadata de quien subió, no cambia nada del flujo).
 *
 * Si el archivo elegido es un PDF, se convierte a una imagen JPEG por
 * página ANTES de subir (ver planoPdf.js): el backend y la futura detección
 * por visión por computadora solo trabajan con imágenes, igual que las
 * fotos que ya manda el celular -- así nunca hay dos formatos distintos que
 * detectar.
 */
export function PlanPagesSection({ resolutionId, planPages, onChanged }) {
  const [imagenes, setImagenes] = useState({}) // { [order_index]: objectURL }
  const [loadingImgs, setLoadingImgs] = useState(true)
  const [pendientes, setPendientes] = useState([]) // [{ blob, url, planta }]
  const [procesandoArchivo, setProcesandoArchivo] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    let alive = true
    const urls = []
    ;(async () => {
      const mapa = {}
      for (const p of planPages) {
        try {
          const blob = await resolutionsApi.planPageBlob(resolutionId, p.order_index)
          const url = URL.createObjectURL(blob)
          urls.push(url)
          mapa[p.order_index] = url
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
  }, [resolutionId, planPages])

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
          imagenesDelPdf.forEach((blob) => nuevos.push({ blob, url: URL.createObjectURL(blob), planta: '' }))
        } else {
          nuevos.push({ blob: file, url: URL.createObjectURL(file), planta: '' })
        }
      }
      setPendientes((prev) => [...prev, ...nuevos])
    } catch (err) {
      toast.error(`No se pudo leer el archivo: ${err.message}`)
    } finally {
      setProcesandoArchivo(false)
    }
  }

  const onPlantaPendiente = (idx, planta) =>
    setPendientes((prev) => prev.map((p, i) => (i === idx ? { ...p, planta } : p)))

  const quitarPendiente = (idx) =>
    setPendientes((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })

  const subirPendientes = async () => {
    if (pendientes.some((p) => !p.planta)) {
      toast.error('Asigne la planta de cada página antes de subir.')
      return
    }
    setSubiendo(true)
    try {
      await resolutionsApi.addPlanPages(resolutionId, pendientes)
      pendientes.forEach((p) => URL.revokeObjectURL(p.url))
      setPendientes([])
      toast.success('Páginas del plano agregadas.')
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

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Landmark}
        eyebrow="Plano de división"
        title="Páginas del plano (colindancias)"
        subtitle="Foto o PDF del plano aprobado, una página por planta — desde el celular o directo desde la web, indistinto."
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
            <div key={p.order_index} className="flex flex-col items-center gap-1">
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
              <span className="max-w-24 truncate text-center text-xs text-slate-500" title={p.planta}>
                {p.planta}
              </span>
              <button
                type="button"
                className="text-slate-400 transition-colors hover:text-state-danger"
                onClick={() => eliminarPagina(p.order_index)}
                title="Quitar página"
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
          <p className="text-sm font-medium text-slate-600">Asigne la planta de cada página antes de subir:</p>
          <div className="flex flex-wrap gap-4">
            {pendientes.map((p, i) => (
              <div key={p.url} className="flex flex-col items-center gap-1">
                <img src={p.url} alt="" className="h-28 w-24 rounded-xl border border-white/60 object-cover" />
                <select
                  className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-accent-500/60"
                  value={p.planta}
                  onChange={(e) => onPlantaPendiente(i, e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {PLANTAS_RESUMEN.map((planta) => (
                    <option key={planta} value={planta}>
                      {planta}
                    </option>
                  ))}
                </select>
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
