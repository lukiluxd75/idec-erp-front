import { NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/auth/hooks/useAuth'
import { NAV_SECTIONS, canViewChild, getCurrentDomain } from '@/shared/nav'

const INICIO = NAV_SECTIONS.find((section) => section.path === '/dashboard')

const linkBase =
  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150'
const linkActive = 'bg-brand-800 text-white shadow-sm shadow-brand-800/20'
const linkInactive = 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'

function FunctionLinks({ items, permissions, depth = 0 }) {
  return items.map((child) => {
    const ChildIcon = child.icon
    const nested = (child.children || []).filter((item) => canViewChild(permissions, item))
    return (
      <div key={child.path} className={depth ? 'space-y-1 pl-3' : 'space-y-1'}>
        <NavLink
          to={child.path}
          end={nested.length > 0}
          className={({ isActive }) =>
            `${linkBase} ${depth ? 'text-[13px] font-medium' : ''} ${isActive ? linkActive : linkInactive}`
          }
        >
          <ChildIcon className="h-[18px] w-[18px] shrink-0" />
          <span>{child.label}</span>
        </NavLink>
        {nested.length > 0 ? (
          <FunctionLinks items={nested} permissions={permissions} depth={depth + 1} />
        ) : null}
      </div>
    )
  })
}

/**
 * Contextual sidebar: frosted glass (misma familia "liquid glass" que el resto del ERP),
 * pero con opacidad alta a propósito — es navegación densa de lectura constante, necesita
 * más contraste que una tarjeta de contenido.
 */
export function Sidebar({ open = true }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const currentDomain = getCurrentDomain(pathname)

  if (!currentDomain) return null

  const DomainIcon = currentDomain.icon
  const visibleChildren = (currentDomain.children || []).filter((child) => canViewChild(user?.permisos, child))

  return (
    <div
      className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out will-change-[width] ${
        open ? 'w-64' : 'w-0'
      }`}
    >
      <aside
        className={`liquid-glass-bar flex h-dvh w-64 flex-col border-r transition-opacity duration-200 ease-in-out ${
          open ? 'opacity-100 delay-100' : 'opacity-0'
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Navegación</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white">
              <DomainIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{currentDomain.label}</p>
              <p className="truncate text-[11px] text-slate-500">Módulo activo</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavLink
            to={INICIO.path}
            className={`${linkBase} ${linkInactive} mb-2`}
          >
            <ArrowLeft className="h-[18px] w-[18px] shrink-0 text-slate-500" />
            <span>Volver a Inicio</span>
          </NavLink>

          {visibleChildren.length > 0 && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Funciones
            </p>
          )}

          <FunctionLinks items={visibleChildren} permissions={user?.permisos} />
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
