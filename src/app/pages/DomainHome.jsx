import { NavLink, Navigate, useLocation } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Card, SectionHeader } from '@/shared/ui'
import { DOMAIN_SECTIONS } from '@/shared/nav'

function SubsystemCard({ label, path, icon: Icon }) {
  return (
    <NavLink
      to={path}
      className="group relative flex aspect-square flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-700/30 hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 sm:p-5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-brand-800 to-accent-500 transition-transform duration-300 group-hover:scale-x-100"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-800/[0.04] transition-transform duration-300 group-hover:scale-110"
      />

      <div className="relative flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 transition-all duration-200 group-hover:bg-brand-800 group-hover:text-white group-hover:ring-brand-800 sm:h-14 sm:w-14">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-300 transition-colors duration-200 group-hover:bg-accent-50 group-hover:text-accent-600">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <div className="relative mt-auto space-y-1.5 pt-6">
        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors group-hover:text-accent-600">
          Función
        </span>
        <span className="block text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-[1.05rem]">
          {label}
        </span>
        <span className="block text-xs leading-relaxed text-slate-500">Abrir</span>
      </div>
    </NavLink>
  )
}

/**
 * Domain entry screen: functions in square cards.
 * If the module has only one function, redirects straight to it.
 */
export function DomainHome() {
  const { pathname } = useLocation()
  const domain = DOMAIN_SECTIONS.find((section) => section.path === pathname)

  if (!domain) return null

  if (domain.children?.length === 1) {
    return <Navigate to={domain.children[0].path} replace />
  }

  return (
    <Card glass={false} className="space-y-5 !p-5 sm:!p-6">
      <SectionHeader icon={domain.icon} eyebrow="Módulo" title={domain.label} className="mb-0" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {domain.children.map((item) => (
          <SubsystemCard key={item.path} {...item} />
        ))}
      </div>
    </Card>
  )
}

export default DomainHome
