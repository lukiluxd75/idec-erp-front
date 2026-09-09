import { NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { NAV_SECTIONS, getCurrentDomain } from '@/shared/nav'

const INICIO = NAV_SECTIONS.find((section) => section.path === '/dashboard')

const linkBase =
  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200'
const linkActive = 'bg-brand-800 text-white shadow-sm'
const linkInactive = 'text-brand-600 hover:bg-brand-900/10 hover:text-brand-800'

/**
 * Sidebar contextual: no se muestra en Inicio. Al entrar a un dominio (ver
 * shared/nav/navConfig.js) aparece mostrando únicamente los subapartados de ESE dominio,
 * más un link para volver a Inicio (donde están todos los demás módulos).
 */
export function Sidebar({ open = true }) {
  const { pathname } = useLocation()
  const currentDomain = getCurrentDomain(pathname)

  if (!currentDomain) return null

  const DomainIcon = currentDomain.icon

  return (
    <div
      className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out will-change-[width] ${
        open ? 'w-64' : 'w-0'
      }`}
    >
      <aside className="flex h-dvh w-64 flex-col border-r border-brand-600/20 bg-accent-300 shadow-sm">
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <NavLink
            to={INICIO.path}
            className={`${linkBase} ${linkInactive} mb-3 border-b border-brand-600/20 pb-4`}
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
            <span>Volver a Inicio</span>
          </NavLink>

          <div className="flex items-center gap-2.5 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-brand-600/70">
            <DomainIcon className="h-4 w-4 shrink-0" />
            <span>{currentDomain.label}</span>
          </div>

          {currentDomain.children?.map((child) => {
            const ChildIcon = child.icon
            return (
              <NavLink
                key={child.path}
                to={child.path}
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                <ChildIcon className="h-[18px] w-[18px] shrink-0" />
                <span>{child.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
