import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FileUp, Trash2, XCircle, FileSpreadsheet,
  Save, ScanLine, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'react-toastify'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Card, Button, IconButton, EmptyState } from '@/shared/ui'
import { cn } from '@/shared/utils'
import { geoextractionApi } from '../api/geoextraction.api'
import { CoordinatesTable } from '../components/CoordinatesTable'
import { PolygonQueue } from '../components/PolygonQueue'
import { MobileCaptures } from '../components/MobileCaptures'
import { useCapturesUpdates } from '../utils/useCapturesUpdates'

/** Packs parcels (page-internal shape) into the format the backend expects. */
function toTerrainsPayload(terrenos) {
  return {
    terrenos: terrenos.map((t) => ({
      puntos: t.points.map((p) => ({ x: p.x, y: p.y })),
      atributos: t.attributes,
    })),
  }
}

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const ZOOM_STEP = 0.5
const ZOOM_BASE_PX = 500

function downloadBlob(blob, nombreArchivo) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * OCR capture: cartographic digitization from scanned documents. Crops the coordinates
 * area, extracts with OCR, edits the resulting table, and exports to Excel or Shapefile.
 * Adapted from geo-extract/frontend/src/pages/Capture.jsx — same X/Y column detection,
 * cell editing, and Ctrl+U shortcut, on top of ERP design and authentication.
 */
export default function CapturePage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)
  const [zoom, setZoom] = useState(ZOOM_MIN)
  const imgRef = useRef(null)
  const viewerRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [columnTypes, setColumnTypes] = useState({})
  const [pendingTerrains, setPendingTerrains] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [newRowIds, setNewRowIds] = useState([])
  const [lastAppendCount, setLastAppendCount] = useState(0)
  const [isAppendMode, setIsAppendMode] = useState(false)
  const [mobileCaptures, setMobileCaptures] = useState([])
  const [loadingCaptureId, setLoadingCaptureId] = useState(null)

  const getShortTS = () => {
    const d = new Date()
    return `${d.getHours()}${d.getMinutes()}${d.getSeconds()}`
  }

  const isHeaderRow = (row) => {
    if (!row || !row.items) return false
    return row.items.some((item) => {
      const txt = item.text.toLowerCase()
      return txt.includes('este') || txt.includes('norte') || txt.includes('vert') || txt === 'x' || txt === 'y'
    })
  }

  /**
   * Infers which column is X (East) and which is Y (North) from the header or, if there are
   * no text hints, from the typical digit count of each coordinate in Cochabamba (6 for East,
   * 7 for North). If they came swapped, reorders the rows. Computed once when a new extraction
   * arrives (not in an effect) — avoids reordering when the user already edited column types.
   */
  const inferColumns = (rows) => {
    if (rows.length === 0) return { rows, columnTypes: {} }

    const dataRow = rows.find((row) => row.items.some((item) => /\d/.test(item.text))) || rows[0]
    const headerRow = rows[0].items
    const newTypes = {}

    headerRow.forEach((cell, idx) => {
      const text = cell.text.toLowerCase()
      if (text.includes('este') || text === 'x') newTypes[idx] = 'x'
      else if (text.includes('norte') || text === 'y') newTypes[idx] = 'y'
    })

    dataRow.items.forEach((cell, idx) => {
      if (!newTypes[idx] && /\d/.test(cell.text)) {
        const textBeforeDot = cell.text.split(/[.,]/)[0].replace(/\D/g, '')

        if (textBeforeDot.length === 6) {
          newTypes[idx] = 'x'
        } else if (textBeforeDot.length === 7) {
          newTypes[idx] = 'y'
        }
      }
    })

    if (!Object.values(newTypes).includes('x') && headerRow.length >= 1) newTypes[0] = 'x'
    if (!Object.values(newTypes).includes('y') && headerRow.length >= 2) newTypes[1] = 'y'

    const xKey = Object.keys(newTypes).find((k) => newTypes[k] === 'x')
    const yKey = Object.keys(newTypes).find((k) => newTypes[k] === 'y')

    let reordenadas = rows
    if (xKey !== undefined && yKey !== undefined) {
      const xIdx = parseInt(xKey)
      const yIdx = parseInt(yKey)

      if (yIdx < xIdx) {
        reordenadas = rows.map((row) => {
          const newItems = [...row.items]
          const temp = newItems[xIdx]
          newItems[xIdx] = newItems[yIdx]
          newItems[yIdx] = temp
          return { ...row, items: newItems }
        })

        newTypes[yIdx] = 'x'
        newTypes[xIdx] = 'y'

        toast.info('Columnas reordenadas a Este (X) - Norte (Y)')
      }
    }

    return { rows: reordenadas, columnTypes: newTypes }
  }

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      setImageSrc(URL.createObjectURL(file))
      setResults([])
      setCrop(undefined)
      setCompletedCrop(null)
      setColumnTypes({})
      setNewRowIds([])
      setLastAppendCount(0)
      setZoom(ZOOM_MIN)
      toast.info('Imagen cargada correctamente.')
    } else {
      toast.error('Por favor, sube un archivo de imagen válido (JPG, PNG).')
    }
  }

  const zoomReset = () => setZoom(ZOOM_MIN)

  const refreshMobileCaptures = useCallback(async () => {
    try {
      setMobileCaptures(await geoextractionApi.listCaptures())
    } catch {
      // Silent: if listing fails (backend down, network), the rest of the page
      // keeps working the same as before mobile captures existed.
    }
  }, [])

  useEffect(() => {
    refreshMobileCaptures()
  }, [refreshMobileCaptures])

  // WS notifies instantly, but only if the browser landed on the same backend
  // worker that received the change (backend runs multiple workers, each with
  // its own socket registry — see CapturesConnectionManager). As a fallback,
  // polling every 10s keeps the list fresh without depending on which worker
  // each connection hit, instead of staying stale until a manual reload.
  useCapturesUpdates(refreshMobileCaptures)
  useEffect(() => {
    const interval = setInterval(refreshMobileCaptures, 10000)
    return () => clearInterval(interval)
  }, [refreshMobileCaptures])

  // Both actions below remove the capture from the local list *before* calling
  // the backend (optimistic): otherwise, while the request is in flight, the
  // 10s poll or a WS notify from another tab can refetch the still-pending
  // capture and let it be clicked a second time, so the second call 404s /
  // "no hay ninguna captura pendiente" against an id already consumed by the
  // first. If the backend call actually fails, refreshMobileCaptures()
  // resyncs the list from the server instead of leaving it wrongly removed.
  const loadMobileCapture = async (id) => {
    if (results.length > 0 && !confirm('Cambiar imagen perderá los datos actuales de la tabla. ¿Continuar?')) {
      return
    }
    setLoadingCaptureId(id)
    setMobileCaptures((prev) => prev.filter((c) => c.capture_id !== id))
    try {
      const blob = await geoextractionApi.captureBlob(id)
      processFile(new File([blob], `captura_movil_${id}.jpg`, { type: blob.type || 'image/jpeg' }))
      await geoextractionApi.discardCapture(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar la foto del celular.')
      refreshMobileCaptures()
    } finally {
      setLoadingCaptureId(null)
    }
  }

  const discardMobileCapture = async (id) => {
    setMobileCaptures((prev) => prev.filter((c) => c.capture_id !== id))
    try {
      await geoextractionApi.discardCapture(id)
    } catch (err) {
      toast.error(err.message || 'No se pudo descartar la foto.')
      refreshMobileCaptures()
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (results.length > 0 && !confirm('Cambiar imagen perderá los datos actuales de la tabla. ¿Continuar?')) {
      e.target.value = ''
      return
    }
    processFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (results.length > 0 && !confirm('Cambiar imagen perderá los datos actuales de la tabla. ¿Continuar?')) {
      return
    }
    processFile(file)
  }

  const processOCR = async (append = false) => {
    if (!imageSrc) {
      toast.error('Cargue una imagen')
      return
    }

    if (append) {
      setIsAppendMode(true)
    }

    setLoading(true)
    try {
      const fileToUpload = await (async () => {
        if (!completedCrop || !completedCrop.width) return selectedFile
        const canvas = document.createElement('canvas')
        const image = imgRef.current
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height
        canvas.width = completedCrop.width * scaleX
        canvas.height = completedCrop.height * scaleY
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, canvas.width, canvas.height)
        return new Promise((r) => canvas.toBlob((b) => r(new File([b], 'crop.jpg', { type: 'image/jpeg' })), 'image/jpeg'))
      })()

      const jobId = await geoextractionApi.uploadOcrImage(fileToUpload)
      const parsedData = await geoextractionApi.waitForOcrResult(jobId)

      if (append) {
        const newIds = parsedData.map((row) => ({ ...row, id: `r-${Date.now()}-${Math.random()}` }))
        newIds.forEach((row) => {
          row.items = row.items.map((cell) => ({ ...cell, id: `c-${Date.now()}-${Math.random()}` }))
        })

        setNewRowIds(newIds.map((row) => row.id))
        setResults((prev) => [...prev, ...newIds])
        setLastAppendCount(newIds.length)

        toast.success(
          <div>
            <strong>✓ {newIds.length} filas añadidas</strong>
            <div className="text-[10px]">Total: {results.length + newIds.length} filas</div>
          </div>,
          { autoClose: 3000 }
        )

        setTimeout(() => {
          setNewRowIds([])
          setLastAppendCount(0)
          setIsAppendMode(false)
        }, 3000)
      } else {
        const { rows, columnTypes: inferredTypes } = inferColumns(parsedData)
        setResults(rows)
        setColumnTypes(inferredTypes)
        setNewRowIds([])
        setLastAppendCount(0)
        toast.success('Extracción finalizada')
      }
    } catch (err) {
      toast.error(err.message)
      setIsAppendMode(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'u' && completedCrop && results.length > 0 && !loading) {
        e.preventDefault()
        processOCR(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedCrop, results, loading])

  const getTableData = () => {
    const xIdx = Object.keys(columnTypes).find((k) => columnTypes[k] === 'x')
    const yIdx = Object.keys(columnTypes).find((k) => columnTypes[k] === 'y')
    if (xIdx === undefined || yIdx === undefined) {
      toast.warn('Asigne las columnas X e Y antes de continuar.')
      return null
    }
    const points = []
    let attributes = {}
    const startIndex = isHeaderRow(results[0]) ? 1 : 0
    for (let i = startIndex; i < results.length; i++) {
      const row = results[i]
      const xVal = parseFloat(row.items[xIdx]?.text.replace(',', '.'))
      const yVal = parseFloat(row.items[yIdx]?.text.replace(',', '.'))
      if (!isNaN(xVal) && !isNaN(yVal)) {
        points.push({ x: xVal, y: yVal })
        if (Object.keys(attributes).length === 0) {
          row.items.forEach((cell, idx) => {
            if (idx != xIdx && idx != yIdx) {
              const h = results[0].items[idx]?.text || `Dato_${idx + 1}`
              attributes[h] = cell.text
            }
          })
        }
      }
    }
    return { points, attributes }
  }

  const exportToExcel = () => {
    const data = getTableData()
    if (!data) return

    const aoa = data.points.map((p, i) => {
      const otherAttrs = []
      const row = results.find((r) => !isHeaderRow(r) && results.indexOf(r) === (i + (isHeaderRow(results[0]) ? 1 : 0)))

      if (row) {
        row.items.forEach((cell, idx) => {
          if (columnTypes[idx] !== 'x' && columnTypes[idx] !== 'y') {
            otherAttrs.push(cell.text)
          }
        })
      }
      return [p.x, p.y, ...otherAttrs]
    })

    const extraHeaders = []
    if (results.length > 0) {
      results[0].items.forEach((cell, idx) => {
        if (columnTypes[idx] !== 'x' && columnTypes[idx] !== 'y') {
          extraHeaders.push(cell.text || `Dato_${idx + 1}`)
        }
      })
    }
    const header = ['X', 'Y', ...extraHeaders]

    aoa.unshift(header)

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catastro_GMC')
    XLSX.writeFile(wb, `PREDIO_${getShortTS()}.xlsx`)

    toast.success('Excel generado con orden X-Y')
  }

  const exportSingleShapefile = async () => {
    const data = getTableData()
    if (!data || data.points.length < 3) return
    setLoading(true)
    try {
      const blob = await geoextractionApi.generateShapefile(toTerrainsPayload([data]))
      downloadBlob(blob, `poligono_${getShortTS()}.zip`)
      toast.success('Shapefile generado correctamente')
    } catch (error) {
      toast.error(error.message || 'Error en backend.')
    } finally {
      setLoading(false)
    }
  }

  const addToLayer = () => {
    const data = getTableData()
    if (!data) return
    setPendingTerrains((p) => [...p, data])
    setImageSrc(null); setResults([]); setSelectedFile(null); setCrop(undefined); setColumnTypes({})
    setNewRowIds([])
    setZoom(ZOOM_MIN)
    toast.success(`Polígono añadido a la capa. Total: ${pendingTerrains.length + 1}`)
  }

  const exportMasiveShapefile = async () => {
    if (pendingTerrains.length === 0) return
    setLoading(true)
    try {
      const blob = await geoextractionApi.generateShapefile(toTerrainsPayload(pendingTerrains))
      downloadBlob(blob, `capa_unida_${getShortTS()}.zip`)
      setPendingTerrains([])
      toast.success(`${pendingTerrains.length} polígonos exportados`)
    } catch (error) {
      toast.error(error.message || 'Error masivo.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (rId, cId, val) => {
    setResults((prev) => prev.map((r) => r.id === rId ? {
      ...r, items: r.items.map((c) => c.id === cId ? { ...c, text: val, confidence: 1 } : c),
    } : r))
  }

  const deleteRow = (id) => setResults((prev) => prev.filter((r) => r.id !== id))

  const addRow = () => results.length && setResults([...results, { id: `r-${Date.now()}`, items: Array(results[0].items.length).fill(null).map((_, i) => ({ id: `c-${Date.now()}-${i}`, text: '', confidence: 1 })) }])

  const addColumn = () => setResults((prev) => prev.map((r) => ({ ...r, items: [...r.items, { id: `c-${Date.now()}`, text: '', confidence: 1 }] })))

  const deleteColumn = (colIndex) => {
    if (results[0].items.length <= 1) {
      toast.warn('No es posible eliminar la única columna existente.')
      return
    }

    setResults((prev) => prev.map((row) => ({
      ...row,
      items: row.items.filter((_, idx) => idx !== colIndex),
    })))

    setColumnTypes((prev) => {
      const newTypes = {}
      Object.keys(prev).forEach((key) => {
        const numKey = parseInt(key)
        if (numKey < colIndex) {
          newTypes[numKey] = prev[key]
        } else if (numKey > colIndex) {
          newTypes[numKey - 1] = prev[key]
        }
      })
      return newTypes
    })
  }

  const invertColumns = () => {
    if (results.length === 0 || results[0].items.length < 2) {
      toast.warn('Se requieren al menos 2 columnas para invertir.')
      return
    }

    setResults((prev) => prev.map((row) => {
      const newItems = [...row.items]
      const temp = newItems[0]
      newItems[0] = newItems[1]
      newItems[1] = temp
      return { ...row, items: newItems }
    }))

    setColumnTypes((prev) => {
      const newTypes = { ...prev }
      const tempType = newTypes[0]
      newTypes[0] = newTypes[1]
      newTypes[1] = tempType
      return newTypes
    })

    toast.info('Columnas 1 y 2 invertidas manualmente')
  }

  const clearTable = () => {
    if (confirm('¿Limpiar toda la tabla? Esta acción no se puede deshacer.')) {
      setResults([])
      setColumnTypes({})
      setNewRowIds([])
      setLastAppendCount(0)
      toast.info('Tabla limpiada')
    }
  }

  // Results table only appears once "Extraer" is pressed (loading) or data already exists —
  // before that, the screen only shows image capture.
  const showTable = loading || results.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">Digitalización Cartográfica</h1>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Geo-Extract · G.A.M.C.</p>
        </div>
        <PolygonQueue count={pendingTerrains.length} onExport={exportMasiveShapefile} onDiscard={() => { setPendingTerrains([]); setCrop(undefined) }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent-600">Nota: Seleccione solo el área de números de las coordenadas</p>

      <div className={cn('grid grid-cols-1 gap-6', showTable && 'xl:grid-cols-12')}>
        <Card className={showTable ? 'xl:col-span-5' : 'mx-auto w-full max-w-2xl'}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-slate-400">Visor Documental</span>
              <MobileCaptures
                captures={mobileCaptures}
                loadingId={loadingCaptureId}
                onLoad={loadMobileCapture}
                onDiscard={discardMobileCapture}
              />
              {imageSrc && (
                <div className="flex items-center gap-1.5 normal-case">
                  <IconButton
                    icon={ZoomOut}
                    size={14}
                    className="p-1"
                    onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
                    disabled={zoom <= ZOOM_MIN}
                    title="Alejar"
                  />
                  <button
                    onClick={() => setZoom(ZOOM_MIN)}
                    title="Restablecer zoom"
                    className="w-9 text-center text-[10px] font-black text-slate-400 hover:text-slate-700"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <IconButton
                    icon={ZoomIn}
                    size={14}
                    className="p-1"
                    onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
                    disabled={zoom >= ZOOM_MAX}
                    title="Acercar"
                  />
                  {zoom !== ZOOM_MIN && (
                    <IconButton icon={RotateCcw} size={12} className="p-1" onClick={zoomReset} title="Zoom 100%" />
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {completedCrop && completedCrop.width > 5 && (
                <button onClick={() => { setCompletedCrop(null); setCrop(undefined) }} className="flex items-center gap-1.5 text-state-amber transition-colors hover:text-state-orange-deep">
                  <XCircle size={14} /> Limpiar Selección
                </button>
              )}
              {imageSrc && (
                <button
                  onClick={() => {
                    setImageSrc(null)
                    setResults([])
                    setSelectedFile(null)
                    setCrop(undefined)
                    setColumnTypes({})
                    setNewRowIds([])
                    setZoom(ZOOM_MIN)
                  }}
                  className="flex items-center gap-1.5 text-state-danger transition-colors hover:text-state-magenta"
                >
                  <Trash2 size={14} /> Descartar Todo
                </button>
              )}
            </div>
          </div>

          <div
            ref={viewerRef}
            className={cn(
              'flex min-h-[450px] flex-col rounded-2xl border-2 transition-all duration-200 ease-in-out',
              imageSrc ? 'max-h-[500px] items-start justify-start overflow-auto border-slate-200 bg-slate-50/20' :
                isDragging ? 'scale-[1.01] items-center justify-center overflow-hidden border-dashed border-accent-500 bg-accent-50' : 'items-center justify-center overflow-hidden border-dashed border-slate-300 bg-slate-50/20 hover:bg-slate-50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {imageSrc ? (
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} style={{ maxWidth: 'none' }}>
                <img
                  ref={imgRef}
                  src={imageSrc}
                  className="w-auto cursor-crosshair"
                  style={{ height: `${zoom * ZOOM_BASE_PX}px`, maxWidth: 'none', maxHeight: 'none' }}
                  onLoad={(e) => (imgRef.current = e.currentTarget)}
                />
              </ReactCrop>
            ) : (
              <div className="pointer-events-none p-10 text-center">
                <EmptyState
                  icon={FileSpreadsheet}
                  iconClassName={isDragging ? 'text-accent-500' : undefined}
                  title={isDragging ? 'Suelte la imagen aquí' : 'Arrastre un documento escaneado'}
                  subtitle={!isDragging ? 'o, si lo prefiere…' : undefined}
                />

                <label className="pointer-events-auto mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-800 px-8 py-3.5 text-[10px] font-black uppercase text-white shadow-md shadow-brand-800/20 transition-all hover:bg-brand-600">
                  <FileUp size={16} /> Explorar Archivos
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-4 rounded-xl border border-accent-400/30 bg-accent-300/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-accent-600">Tabla actual:</span>
                  <span className="text-slate-700">{results.length} filas</span>
                  {lastAppendCount > 0 && <span className="animate-pulse text-state-success">+{lastAppendCount} nuevas</span>}
                  {pendingTerrains.length > 0 && <span className="text-state-amber">| {pendingTerrains.length} polígonos en capa</span>}
                </div>
                <button onClick={clearTable} className="text-[10px] font-bold text-state-danger hover:text-state-magenta">
                  Limpiar tabla
                </button>
              </div>
              {isAppendMode && <div className="mt-2 animate-pulse text-[10px] text-state-success">Agregando nuevas filas...</div>}
            </div>
          )}

          {imageSrc && !loading && (
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="primary" size="lg" icon={ScanLine} onClick={() => processOCR(false)} className="w-full uppercase tracking-widest">
                {completedCrop && completedCrop.width > 5 && results.length > 0 ? 'Extraer nuevos datos' : 'Extraer área seleccionada'}
              </Button>

              {completedCrop && completedCrop.width > 5 && results.length > 0 && (
                <Button variant="secondary" size="md" icon={Save} onClick={() => processOCR(true)} className="w-full uppercase tracking-widest text-state-success">
                  + Extraer y unir a tabla actual (Ctrl+U)
                </Button>
              )}
            </div>
          )}
        </Card>

        {showTable && (
          <div className="xl:col-span-7">
            <CoordinatesTable
              results={results}
              columnTypes={columnTypes}
              onColumnTypeChange={(idx, value) => setColumnTypes({ ...columnTypes, [idx]: value })}
              onDeleteColumn={deleteColumn}
              onEdit={handleEdit}
              onDeleteRow={deleteRow}
              onAddRow={addRow}
              onAddColumn={addColumn}
              onInvertColumns={invertColumns}
              newRowIds={newRowIds}
              loading={loading}
              onExportExcel={exportToExcel}
              onExportShapefile={exportSingleShapefile}
              onAddToLayer={addToLayer}
            />
          </div>
        )}
      </div>
    </div>
  )
}
