import { NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '@/auth/hooks/useAuth'
import {
  NAV_SECTIONS,
  canViewChild,
  compareNavLabels,
  getCurrentDomain,
  getVisibleNavChildren,
} from '@/shared/nav'

const INICIO = NAV_SECTIONS.find((section) => section.path === '/dashboard')

const linkBase =
  'group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150'

function FunctionLinks({ items, permissions, depth = 0 }) {
  return items.map((child) => {
    const ChildIcon = child.icon
    const nested = (child.children || [])
      .filter((item) => canViewChild(permissions, item))
      .sort(compareNavLabels)
    return (
      <div key={child.path} className="space-y-1">
        <NavLink
          to={child.path}
          end={nested.length === 0}
          className={({ isActive }) => `${linkBase} ${
            isActive
              ? nested.length > 0
                ? 'bg-brand-50 font-semibold text-brand-900'
                : 'bg-brand-800 font-semibold text-white shadow-sm shadow-brand-900/15'
              : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950'
          }`}
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? nested.length > 0 ? 'bg-white text-brand-800' : 'bg-white/15 text-white'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-brand-800'
              }`}>
                <ChildIcon className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 flex-1 leading-snug">{child.label}</span>
              {nested.length > 0 && <span className={`text-xs ${isActive ? 'text-brand-700' : 'text-slate-400'}`} aria-hidden>›</span>}
            </>
          )}
        </NavLink>
        {nested.length > 0 ? (
          <div className="ml-[1.35rem] border-l border-slate-200 py-1 pl-3">
            <FunctionLinks items={nested} permissions={permissions} depth={depth + 1} />
          </div>
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
  const visibleChildren = getVisibleNavChildren(user?.permisos, currentDomain.children)

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
        <div className="border-b border-slate-200/80 px-4 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Estás en</p>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-700 text-white shadow-sm shadow-brand-900/20">
              <DomainIcon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-snug text-slate-900">{currentDomain.label}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">Módulo actual</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <NavLink
            to={INICIO.path}
            className={`${linkBase} mb-4 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span>Volver a Inicio</span>
          </NavLink>

          {visibleChildren.length > 0 && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Navegación del módulo
            </p>
          )}

          <FunctionLinks items={visibleChildren} permissions={user?.permisos} />
        </nav>
      </aside>
    </div>
  )
}

export default Sidebar
