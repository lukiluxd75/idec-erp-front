import { cn } from '@/shared/utils'

const TONES = {
  default: 'text-slate-400 hover:text-slate-700',
  danger: 'text-slate-400 hover:text-state-danger',
  dangerActive: 'text-state-danger/70 hover:text-state-danger',
}

/** Botón de solo ícono (zoom, eliminar fila/columna, cerrar) con tono consistente en toda la app. */
export function IconButton({
  icon: Icon,
  size = 16,
  tone = 'default',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:cursor-not-allowed disabled:opacity-30',
        TONES[tone] || TONES.default,
        className
      )}
      {...props}
    >
      <Icon size={size} aria-hidden="true" />
    </button>
  )
}

export default IconButton
