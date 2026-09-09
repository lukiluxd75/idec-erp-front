import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card, SectionHeader } from '@/shared/ui'
import { DOMAIN_SECTIONS } from '@/shared/nav'

function SubsystemRow({ label, path, icon: Icon }) {
  return (
    <NavLink
      to={path}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-all duration-150 hover:border-accent-300 hover:bg-accent-50/40 hover:shadow-sm"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-brand-800 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">Abrir función</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-accent-600" />
    </NavLink>
  )
}

/**
 * Pantalla de entrada a un dominio: lista profesional de funciones.
 */
export function DomainHome() {
  const { pathname } = useLocation()
  const domain = DOMAIN_SECTIONS.find((section) => section.path === pathname)

  if (!domain) return null

  return (
    <Card glass={false} className="space-y-5 !p-5 sm:!p-6">
      <SectionHeader icon={domain.icon} eyebrow="Módulo" title={domain.label} className="mb-0" />

      <div className="grid gap-3 sm:grid-cols-2">
        {domain.children.map((item) => (
          <SubsystemRow key={item.path} {...item} />
        ))}
      </div>
    </Card>
  )
}

export default DomainHome
