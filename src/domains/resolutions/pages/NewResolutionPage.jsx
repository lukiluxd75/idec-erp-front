import { ArrowLeft, ArrowDown, ArrowUp, Camera, FileUp, FileText, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import { resolutionsApi } from '@/domains/resolutions/api/resolutions.api'
import { Button, Card, Input, SectionHeader } from '@/shared/ui'

let nextPageId = 0

/**
 * "Escanear" flow: lets the web (desktop or phone browser) create a resolution
 * directly, instead of only through the external mobile app that already POSTs
 * to the same backend endpoint (see resolutionsApi.create). The "Escanear
 * página" input uses `capture="environment"` so it opens the camera directly
 * on a phone; on desktop `capture` is simply ignored and it behaves like a
 * normal file picker.
 */
export default function NewResolutionPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [resolutionNumber, setResolutionNumber] = useState('')
  const [pages, setPages] = useState([]) // [{ id, file, url }]
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return () => pages.forEach((p) => URL.revokeObjectURL(p.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addFiles = (fileList) => {
    const files = Array.from(fileList || [])
    if (files.length === 0) return
    setPages((prev) => [
      ...prev,
      ...files.map((file) => ({ id: nextPageId++, file, url: URL.createObjectURL(file) })),
    ])
  }

  const removePage = (id) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const movePage = (id, direction) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      const swapWith = idx + direction
      if (idx === -1 || swapWith < 0 || swapWith >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim() || !resolutionNumber.trim()) {
      toast.error('Complete el nombre y el N° de resolución.')
      return
    }
    if (pages.length === 0) {
      toast.error('Escanee o suba al menos una página.')
      return
    }
    setSaving(true)
    try {
      const created = await resolutionsApi.create(
        name.trim(),
        resolutionNumber.trim(),
        pages.map((p) => p.file),
      )
      toast.success('Resolución creada.')
      navigate(`/resolutions/${created.resolution_id}`)
    } catch (e) {
      toast.error(e.message || 'No se pudo crear la resolución.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="animate-card-in">
      <Link
        to="/resolutions"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-500"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <SectionHeader
        icon={FileText}
        eyebrow="Lector OCR de Resoluciones P.H."
        title="Nueva resolución"
        subtitle="Escanee las páginas desde la cámara (celular) o súbalas como archivo (PC)."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" placeholder="Ej. Resolución PH Edificio Don Juan" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="N° de resolución"
          placeholder="Ej. 0123/2026"
          value={resolutionNumber}
          onChange={(e) => setResolutionNumber(e.target.value)}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-800 px-6 py-3 text-[10px] font-black uppercase text-white shadow-md shadow-brand-800/20 transition-all hover:bg-brand-600">
          <Camera size={16} /> Escanear página
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-[10px] font-black uppercase text-slate-600 transition-all hover:bg-slate-50">
          <FileUp size={16} /> Subir archivos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {pages.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-3">
          {pages.map((p, idx) => (
            <div key={p.id} className="w-28 rounded-xl border border-white/60 bg-white/70 p-2 shadow-xs">
              <img src={p.url} alt={`Página ${idx + 1}`} className="h-28 w-full rounded-lg object-cover" />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">Pág. {idx + 1}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => movePage(p.id, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Subir"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => movePage(p.id, 1)}
                    disabled={idx === pages.length - 1}
                    className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    title="Bajar"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    onClick={() => removePage(p.id)}
                    className="rounded p-0.5 text-state-danger hover:text-state-magenta"
                    title="Quitar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Button icon={Save} onClick={handleSave} loading={saving}>
          Guardar resolución
        </Button>
      </div>
    </Card>
  )
}
