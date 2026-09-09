import { useState } from 'react'
import { Layers, UploadCloud, Trash2, FileArchive } from 'lucide-react'
import { toast } from 'react-toastify'
import { Card, Button, IconButton, SectionHeader } from '@/shared/ui'
import { cn } from '@/shared/utils'
import { geoextraccionApi } from '../api/geoextraccion.api'

/**
 * Fusión de Shapefiles: sube varios ZIP (uno por polígono/capa) y devuelve una sola capa unida.
 * Adaptado de geo-extract/frontend/src/pages/MergeShapefiles.jsx.
 */
export default function FusionPage() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const processFiles = (filesArray) => {
    const zipFiles = filesArray.filter((f) => f.name.endsWith('.zip'))

    if (zipFiles.length !== filesArray.length) {
      toast.warn('Solo se permiten archivos .zip')
    }

    if (zipFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...zipFiles])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files))
      e.target.value = null
    }
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
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files))
    }
  }

  const removeFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      toast.warn('Se requieren al menos 2 archivos ZIP para unirlos.')
      return
    }

    setLoading(true)
    try {
      const blob = await geoextraccionApi.fusionarShapefiles(selectedFiles)

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Capa_Unida_${Date.now()}.zip`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('¡Shapefiles unidos con éxito!')
      setSelectedFiles([])
    } catch (error) {
      toast.error(error.message || 'Error al unir los shapefiles.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <SectionHeader icon={Layers} eyebrow="Geo-Extract" title="Fusión de Shapefiles" />

      <p className="mb-5 text-sm text-slate-500">Cargue múltiples archivos ZIP generados para unirlos en una sola capa.</p>

      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200',
          isDragging ? 'scale-[1.02] border-accent-500 bg-accent-50' : 'border-accent-300 bg-accent-50/40 hover:bg-accent-50'
        )}
      >
        <UploadCloud size={40} className={cn('mb-3 transition-colors', isDragging ? 'text-accent-600' : 'text-accent-500')} />
        <p className="font-bold text-slate-700">
          {isDragging ? 'Suelte los archivos aquí' : 'Pulse o arrastre sus archivos .ZIP aquí'}
        </p>
        <p className="mt-1 text-xs text-slate-400">Solo se aceptan archivos ZIP que contengan un Shapefile</p>
        <input type="file" multiple accept=".zip" className="hidden" onChange={handleFileSelect} />
      </label>

      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            Archivos listos para unir ({selectedFiles.length})
          </h3>
          <ul className="mb-5 space-y-2">
            {selectedFiles.map((file, idx) => (
              <li key={idx} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/70 p-3">
                <div className="flex items-center gap-3">
                  <FileArchive size={18} className="text-state-success" />
                  <span className="font-mono text-sm text-slate-700">{file.name}</span>
                </div>
                <IconButton icon={Trash2} size={16} tone="danger" onClick={() => removeFile(idx)} />
              </li>
            ))}
          </ul>

          <Button
            onClick={handleMerge}
            disabled={selectedFiles.length < 2}
            loading={loading}
            icon={loading ? undefined : Layers}
            size="lg"
            className="w-full"
          >
            {loading ? 'Uniendo capas...' : 'Generar capa maestra'}
          </Button>
        </div>
      )}
    </Card>
  )
}
