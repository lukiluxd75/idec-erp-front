import { MonitorUp } from 'lucide-react'
import { useState } from 'react'

import { CAPTURE_ACCEPT } from '@/domains/folder-analysis/utils/captureUpload'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

/** True only for a drag coming from the desktop, not for a photo dragged between lanes. */
const isFileDrag = (event) => Array.from(event.dataTransfer?.types || []).includes('Files')

/**
 * Second way into the inbox, next to the mobile app: photos and PDFs chosen in
 * the computer's file explorer or dropped here from the desktop. A PDF is
 * separated on the server into one photo per page.
 */
export function CaptureUploader({ disabled, uploading, onFiles }) {
  const [isDragging, setIsDragging] = useState(false)
  const blocked = disabled || uploading

  const handleDrop = (event) => {
    if (!isFileDrag(event)) return
    event.preventDefault()
    setIsDragging(false)
    if (blocked) return
    const files = event.dataTransfer.files
    if (files?.length) onFiles(files)
  }

  const handleSelect = (event) => {
    const files = event.target.files
    if (files?.length) onFiles(files)
    // Lets the same photo be picked again after it is deleted from the inbox.
    event.target.value = ''
  }

  return (
    <label
      onDragOver={(e) => {
        if (!isFileDrag(e)) return
        e.preventDefault()
        if (!blocked) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-left transition',
        isDragging
          ? 'border-accent-500 bg-accent-50'
          : 'border-slate-300 bg-white/60 hover:border-accent-400 hover:bg-accent-50/50',
        blocked && 'pointer-events-none opacity-55'
      )}
    >
      {uploading ? (
        <Spinner className="h-4 w-4 shrink-0" />
      ) : (
        <MonitorUp className={cn('h-4 w-4 shrink-0', isDragging ? 'text-accent-600' : 'text-accent-500')} aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-slate-700">
          {uploading ? 'Subiendo archivos…' : isDragging ? 'Suelte los archivos aquí' : 'Subir desde el equipo'}
        </span>
        <span className="block text-[11px] leading-snug text-slate-500">
          Explorador o arrastre · JPG, PNG, WEBP o PDF (una foto por página)
        </span>
      </span>
      <input
        type="file"
        multiple
        accept={CAPTURE_ACCEPT}
        className="hidden"
        disabled={blocked}
        onChange={handleSelect}
      />
    </label>
  )
}
