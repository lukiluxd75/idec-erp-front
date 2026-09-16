import { useRef } from 'react'
import { Camera, Send, X } from 'lucide-react'
import { Spinner } from '@/shared/ui'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  imagePreview,
  onAttachImage,
  onRemoveImage,
  loading,
  placeholder = 'Escriba su consulta sobre trámites catastrales…',
}) {
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_BYTES) return
    onAttachImage(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading) return
    if (!value.trim() && !imagePreview) return
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {imagePreview && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <img src={imagePreview} alt="Adjunto" className="h-12 w-12 rounded-lg object-cover" />
          <p className="flex-1 text-xs text-slate-500">Imagen adjunta</p>
          <button
            type="button"
            onClick={onRemoveImage}
            aria-label="Quitar imagen"
            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:border-accent-500/60 focus-within:ring-2 focus-within:ring-accent-400/40">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adjuntar imagen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <Camera className="h-[18px] w-[18px]" />
        </button>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />

        <button
          type="submit"
          disabled={loading || (!value.trim() && !imagePreview)}
          aria-label="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-800 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  )
}

export default ChatComposer
