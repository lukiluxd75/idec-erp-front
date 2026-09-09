import { NavLink, useLocation } from 'react-router-dom'
import { Card, SectionHeader } from '@/shared/ui'
import { DOMAIN_SECTIONS } from '@/shared/nav'

function SubsystemTile({ label, path, icon: Icon }) {
  return (
    <NavLink
      to={path}
      className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-6 text-center shadow-xs backdrop-blur-sm transition-colors duration-150 hover:border-accent-300 hover:bg-white hover:shadow-md"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-accent-500 group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-sm font-semibold text-slate-700 transition-colors duration-200 group-hover:text-slate-900">
        {label}
      </span>
    </NavLink>
  )
}

/**
 * Pantalla de entrada a un dominio (Catastro, Administración, ...): muestra sus
 * subsistemas como botones grandes, en vez de un submenú anidado en el sidebar.
 */
export function DomainHome() {
  const { pathname } = useLocation()
  const domain = DOMAIN_SECTIONS.find((section) => section.path === pathname)

  if (!domain) return null

  return (
    <Card>
      <SectionHeader icon={domain.icon} eyebrow="Módulo" title={domain.label} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {domain.children.map((item) => (
          <SubsystemTile key={item.path} {...item} />
        ))}
      </div>
    </Card>
  )
}

export default DomainHome
