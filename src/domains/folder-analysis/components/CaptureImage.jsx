import { ImageOff } from 'lucide-react'

import { useCaptureUrl } from '@/domains/folder-analysis/utils/captureImages'
import { Spinner } from '@/shared/ui'
import { cn } from '@/shared/utils'

/**
 * A capture's photo in a list row or a page strip.
 *
 * Anything bigger than the thumbnail shows the thumbnail first, blurred, and
 * swaps it for the real one when it arrives: the row never jumps and there is
 * something to look at from the first moment.
 */
export function CaptureImage({
  captureId,
  variant = 'thumbnail',
  alt = 'Foto',
  className = '',
  onClick,
}) {
  const main = useCaptureUrl(captureId, variant)
  const placeholder = useCaptureUrl(variant === 'thumbnail' ? null : captureId, 'thumbnail')
  const shown = main.url || placeholder.url

  if (main.failed && !shown) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)}>
        <ImageOff className="h-4 w-4" />
      </div>
    )
  }
  if (!shown) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100', className)}>
        <Spinner className="h-4 w-4" />
      </div>
    )
  }
  return (
    <img
      src={shown}
      alt={alt}
      draggable={false}
      onClick={onClick}
      className={cn('object-cover transition-[filter] duration-300', !main.url && 'blur-[2px]', className)}
    />
  )
}
