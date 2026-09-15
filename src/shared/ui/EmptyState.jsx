import { cn } from '@/shared/utils'

const PRESETS = {
  default: {
    icon: 'text-slate-200',
    title: 'mb-1 text-sm font-bold text-slate-600',
    subtitle: 'mt-1 text-xs font-medium text-slate-400',
  },
  muted: {
    icon: 'opacity-10 text-slate-200',
    title: 'text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-40',
    subtitle: 'mt-1 text-xs text-slate-400',
  },
}

/** Centered icon + title + subtitle block for empty states (upload zones, pending tables). */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  tone = 'default',
  iconSize = 48,
  iconClassName = '',
  className = '',
  children,
}) {
  const preset = PRESETS[tone] || PRESETS.default

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      {Icon && <Icon size={iconSize} className={cn('mb-4', preset.icon, iconClassName)} aria-hidden="true" />}
      {title && <p className={preset.title}>{title}</p>}
      {subtitle && <p className={preset.subtitle}>{subtitle}</p>}
      {children}
    </div>
  )
}

export default EmptyState
