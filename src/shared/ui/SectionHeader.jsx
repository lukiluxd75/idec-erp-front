import { cn } from '@/shared/utils'

/** Encabezado ícono + eyebrow + título usado al inicio de cards de sección (DomainHome, páginas de dominio). */
export function SectionHeader({ icon: Icon, eyebrow, title, className = '' }) {
  return (
    <div className={cn('mb-6 flex items-center gap-3 border-b border-slate-200/60 pb-4', className)}>
      {Icon && (
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">{eyebrow}</p>}
        {title && <h2 className="text-lg font-bold text-slate-900">{title}</h2>}
      </div>
    </div>
  )
}

export default SectionHeader
