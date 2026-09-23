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
 *
 * Una misma foto puede aplicar a varias plantas iguales (ej. "PLANTA TIPO"
 * repetida del 2º al 4º piso en el plano aprobado): en vez de modelar un
 * grupo de plantas en la base (rompería el VLOOKUP fijo de RESUMEN contra
 * PLANTAS_RESUMEN), se elige más de una planta para la misma página y se
 * sube una copia por cada una -- quedan como páginas independientes, cada
 * planta con su propia foto para las colindancias, igual que si se hubiera
 * subido una por una.
 */
export function PlanPagesSection({ resolutionId, planPages, onChanged }) {
  const [imagenes, setImagenes] = useState({}) // { [order_index]: objectURL }
  const [loadingImgs, setLoadingImgs] = useState(true)
  const [pendientes, setPendientes] = useState([]) // [{ blob, url, plantas: string[] }]
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
    setPendientes((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p
        const yaElegida = p.plantas.includes(planta)
        return { ...p, plantas: yaElegida ? p.plantas.filter((x) => x !== planta) : [...p.plantas, planta] }
      }),
    )

  const quitarPendiente = (idx) =>
    setPendientes((prev) => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })

  const subirPendientes = async () => {
    if (pendientes.some((p) => p.plantas.length === 0)) {
      toast.error('Asigne al menos una planta a cada página antes de subir.')
      return
    }
    setSubiendo(true)
    try {
      // Una entrada por (página, planta): si una foto aplica a varias plantas
      // iguales, se repite el mismo blob una vez por planta elegida (ver
      // docstring de arriba).
      const paginas = pendientes.flatMap((p) => p.plantas.map((planta) => ({ blob: p.blob, planta })))
      await resolutionsApi.addPlanPages(resolutionId, paginas)
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
          <p className="text-sm font-medium text-slate-600">
            Asigne la planta de cada página antes de subir — si el plano es igual en varios pisos (ej. "planta
            tipo" del 2º al 4º), marque todas las que correspondan.
          </p>
          <div className="flex flex-wrap gap-4">
            {pendientes.map((p, i) => (
              <div key={p.url} className="flex flex-col items-center gap-1">
                <img src={p.url} alt="" className="h-28 w-24 rounded-xl border border-white/60 object-cover" />
                <div className="max-h-32 w-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5">
                  {PLANTAS_RESUMEN.map((planta) => (
                    <label key={planta} className="flex items-center gap-1.5 py-0.5 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={p.plantas.includes(planta)}
                        onChange={() => onTogglePlantaPendiente(i, planta)}
                      />
                      {planta}
                    </label>
                  ))}
                </div>
                {p.plantas.length > 0 && (
                  <p className="max-w-36 text-center text-[10px] text-slate-400">{p.plantas.join(', ')}</p>
                )}
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
