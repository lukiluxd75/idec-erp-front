import { useState } from 'react'
import { NavLink, useLocation, useMatch } from 'react-router-dom'
import { ArrowLeft, ChevronDown, X } from 'lucide-react'
import { useAuth } from '@/auth/hooks/useAuth'
import {
  NAV_SECTIONS,
  canViewChild,
  compareNavLabels,
  getCurrentDomain,
  getVisibleNavChildren,
} from '@/shared/nav'

const INICIO = NAV_SECTIONS.find((section) => section.path === '/dashboard')

/**
 * Qué grupos dejó contraídos el usuario, por `path` del módulo padre. Se guarda
 * porque contraer sirve para ganar espacio: si se reabriera en cada navegación
 * habría que volver a cerrarlo a cada rato.
 */
const COLLAPSED_STORAGE_KEY = 'idec-erp.sidebar.collapsed'

function readCollapsed() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(COLLAPSED_STORAGE_KEY))
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function writeCollapsed(paths) {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...paths]))
  } catch {
    /* ignore private-mode storage errors */
  }
}

const linkBase =
  'group flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150'

/**
 * Una fila del menú del módulo. El fondo (hover y activo) vive en el contenedor y
 * no en el enlace, para que la fila se pinte entera — flecha incluida — y se lea
 * como una sola pieza en lugar de un enlace con un botón pegado al lado.
 *
 * Dentro de la fila hay dos objetivos distintos: el nombre navega a la pantalla y
 * la flecha contrae el grupo. Una línea vertical fina aparece entre ambos al pasar
 * el mouse, que es lo que avisa de que la flecha se pulsa por separado.
 */
function NavRow({ node, permissions, collapsed, onToggle, depth }) {
  const NodeIcon = node.icon
  const nested = (node.children || [])
    .filter((item) => canViewChild(permissions, item))
    .sort(compareNavLabels)
  const isGroup = nested.length > 0
  const isOpen = isGroup && !collapsed.has(node.path)
  // Un grupo sigue marcándose como activo cuando la pantalla abierta es una de
  // las que esconde, así que contraer nunca deja al usuario sin saber dónde está.
  const isActive = Boolean(useMatch({ path: node.path, end: !isGroup }))
  const panelId = `sidebar-group-${node.path.replace(/\W+/g, '-')}`

  const rowTone = isActive
    ? isGroup
      ? 'bg-brand-800/10 text-brand-900'
      : 'bg-brand-800 text-white shadow-sm shadow-brand-900/15'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'

  return (
    <div className="space-y-1">
      <div className={`group/row flex items-center rounded-xl transition-colors duration-150 ${rowTone}`}>
        <NavLink
          to={node.path}
          end={!isGroup}
          // Flechas ← → sobre el nombre: contraer y expandir sin apuntar a la
          // flecha, como en cualquier árbol.
          onKeyDown={(event) => {
            if (!isGroup) return
            if (event.key === 'ArrowRight' && !isOpen) onToggle(node.path)
            else if (event.key === 'ArrowLeft' && isOpen) onToggle(node.path)
            else return
            event.preventDefault()
          }}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
            isActive ? 'font-semibold' : 'font-medium'
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
              isActive
                ? isGroup
                  ? 'bg-white text-brand-800'
                  : 'bg-white/15 text-white'
                : 'bg-slate-100 text-slate-500 group-hover/row:bg-white group-hover/row:text-brand-800'
            }`}
          >
            <NodeIcon className="h-[17px] w-[17px]" />
          </span>
          <span className="min-w-0 flex-1 leading-snug">{node.label}</span>
        </NavLink>

        {isGroup && (
          <>
            {/* Contraído: cuántas funciones quedan escondidas ahí dentro. Sigue
                ocupando su sitio al expandirse, para que la fila no salte. */}
            <span
              aria-hidden
              className={`shrink-0 text-[11px] font-bold tabular-nums transition-opacity duration-150 ${
                isOpen ? 'opacity-0' : isActive ? 'text-brand-800' : 'text-slate-400'
              }`}
            >
              {nested.length}
            </span>
            <span
              aria-hidden
              className={`mx-1.5 h-5 w-px shrink-0 transition-colors duration-150 ${
                isActive ? 'bg-brand-800/20' : 'bg-slate-300/0 group-hover/row:bg-slate-300/80'
              }`}
            />
            <button
              type="button"
              onClick={() => onToggle(node.path)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              title={isOpen ? `Contraer ${node.label}` : `Expandir ${node.label}`}
              aria-label={`${isOpen ? 'Contraer' : 'Expandir'} ${node.label} (${nested.length} ${
                nested.length === 1 ? 'función' : 'funciones'
              })`}
              className={`mr-1.5 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50 ${
                isActive
                  ? 'text-brand-800 hover:bg-white hover:text-brand-900'
                  : 'text-slate-400 hover:bg-white hover:text-brand-800 hover:shadow-xs'
              }`}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ease-out ${isOpen ? '' : '-rotate-90'}`}
                aria-hidden
              />
            </button>
          </>
        )}
      </div>

      {isOpen ? (
        <div id={panelId} className="animate-slide-down ml-[1.35rem] border-l border-slate-200 py-1 pl-3">
          <FunctionLinks
            items={nested}
            permissions={permissions}
            collapsed={collapsed}
            onToggle={onToggle}
            depth={depth + 1}
          />
        </div>
      ) : null}
    </div>
  )
}

function FunctionLinks({ items, permissions, collapsed, onToggle, depth = 0 }) {
  return items.map((child) => (
    <NavRow
      key={child.path}
      node={child}
      permissions={permissions}
      collapsed={collapsed}
      onToggle={onToggle}
      depth={depth}
    />
  ))
}

/**
 * Contextual sidebar: frosted glass (misma familia "liquid glass" que el resto del ERP),
 * pero con opacidad alta a propósito — es navegación densa de lectura constante, necesita
 * más contraste que una tarjeta de contenido.
 *
 * Los módulos con submódulos se contraen con la flecha de su derecha (o con ← y →
 * desde el teclado), para ahorrar espacio cuando el dominio tiene muchas funciones
 * anidadas.
 *
 * Dos comportamientos según el ancho, porque 16rem de menú no caben al lado del
 * contenido en un teléfono:
 *  - desde `lg`: en el flujo, empujando el contenido, animando su ancho (como siempre).
 *  - por debajo: cajón fijo por encima del contenido, con fondo oscuro detrás; se
 *    cierra tocando ese fondo, con su propia X, o al abrir una pantalla (AppShell).
 */
export function Sidebar({ open = true, onClose }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const currentDomain = getCurrentDomain(pathname)

  const toggleGroup = (path) =>
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      writeCollapsed(next)
      return next
    })

  if (!currentDomain) return null

  const DomainIcon = currentDomain.icon
  const visibleChildren = getVisibleNavChildren(user?.permisos, currentDomain.children)
  const moduleNavItems =
    visibleChildren.length > 0
      ? visibleChildren
      : currentDomain.path && currentDomain.path !== '/dashboard'
        ? [{ label: currentDomain.label, path: currentDomain.path, icon: currentDomain.icon }]
        : []

  return (
    <>
      {/* Fondo oscuro del cajón: solo existe en móvil, y cerrarlo es tocarlo. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="sr-only">Cerrar el menú</span>
      </button>

      <div
        className={`z-40 shrink-0 overflow-hidden transition-[width,transform,visibility] duration-300 ease-in-out will-change-[width,transform] max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-64 ${
          open ? 'max-lg:translate-x-0 lg:w-64' : 'invisible max-lg:-translate-x-full lg:w-0'
        }`}
      >
        <aside
          className={`liquid-glass-bar flex h-dvh w-64 flex-col border-r transition-opacity duration-200 ease-in-out max-lg:shadow-2xl ${
            open ? 'opacity-100 delay-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 px-4 py-5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Estás en</p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-white shadow-sm shadow-brand-900/20">
                  <DomainIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold leading-snug text-slate-900">{currentDomain.label}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">Módulo actual</p>
                </div>
              </div>
            </div>
            {/* En móvil el cajón tapa el contenido, así que necesita su propia
                salida además del fondo oscuro. */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar el menú"
              className="-mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
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

            {moduleNavItems.length > 0 && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Navegación del módulo
              </p>
            )}

            <div className="space-y-1">
              <FunctionLinks
                items={moduleNavItems}
                permissions={user?.permisos}
                collapsed={collapsed}
                onToggle={toggleGroup}
              />
            </div>
          </nav>
        </aside>
      </div>
    </>
  )
}

export default Sidebar
