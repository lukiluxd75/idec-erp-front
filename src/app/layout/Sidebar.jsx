import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ArrowLeft, ChevronRight, LayoutGrid, X } from 'lucide-react'
import { useAuth } from '@/auth/hooks/useAuth'
import {
  NAV_SECTIONS,
  canViewChild,
  compareNavLabels,
  getCurrentDomain,
  getVisibleNavChildren,
} from '@/shared/nav'

const INICIO = NAV_SECTIONS.find((section) => section.path === '/dashboard')

/** Funciones visibles de un nodo, en orden alfabético. Vacío si es una hoja. */
function nestedOf(node, permissions) {
  return (node.children || []).filter((item) => canViewChild(permissions, item)).sort(compareNavLabels)
}

function pathMatches(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

/** Si la pantalla abierta es el propio nodo o cualquiera de sus descendientes. */
function containsPath(node, pathname, permissions) {
  if (node.path && pathMatches(pathname, node.path)) return true
  return nestedOf(node, permissions).some((child) => containsPath(child, pathname, permissions))
}

/** Rutas de los grupos que esconden la pantalla abierta: esos nacen abiertos. */
function groupsHiding(nodes, pathname, permissions) {
  return nodes.flatMap((node) => {
    const nested = nestedOf(node, permissions)
    if (nested.length === 0 || !containsPath(node, pathname, permissions)) return []
    return [node.path, ...groupsHiding(nested, pathname, permissions)]
  })
}

const rowBase =
  'flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-xl text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/50'

function rowTone(isActive, { group = false } = {}) {
  if (isActive) {
    return group
      ? 'bg-brand-800/[0.08] font-semibold text-brand-900'
      : 'bg-brand-800 font-semibold text-white shadow-sm shadow-brand-900/20'
  }
  return 'font-medium text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-950'
}

/**
 * Una función del menú: un enlace. `depth` > 0 es lo que sale al abrir un grupo,
 * un poco más compacto para que se lea como contenido del grupo y no como otro
 * módulo.
 */
function NavLeaf({ node, depth, end = true }) {
  const NodeIcon = node.icon
  const nested = depth > 0
  return (
    <NavLink
      to={node.path}
      end={end}
      className={({ isActive }) =>
        `${rowBase} ${nested ? 'px-2.5 py-2 text-[13px]' : 'px-3 py-2.5 text-sm'} ${rowTone(isActive)}`
      }
    >
      {NodeIcon && <NodeIcon className={`shrink-0 ${nested ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} aria-hidden />}
      <span className="min-w-0 flex-1 leading-snug">{node.label}</span>
    </NavLink>
  )
}

/**
 * Un módulo con funciones dentro. La fila entera es el botón: se abre solo cuando
 * el usuario la pulsa, y sus funciones salen en abanico justo debajo (ver
 * `.nav-fan` en index.css). Pulsarla de nuevo la cierra.
 *
 * La fila no navega: si el módulo tiene pantalla propia (p. ej. el panel general
 * de una herramienta) aparece como la primera función del abanico, "Vista general"
 * o el nombre que ese módulo le dé en `overviewLabel` (navConfig) cuando su pantalla
 * propia es una herramienta con nombre y no un panel de resumen.
 * Así abrir un grupo no te saca de donde estás, y en móvil, donde cambiar de
 * pantalla cierra el cajón, el abanico no se cierra solo antes de poder usarlo.
 */
function NavGroup({ node, nested, expanded, onToggle, pathname, permissions, depth }) {
  const NodeIcon = node.icon
  const isOpen = expanded.has(node.path)
  const isActive = containsPath(node, pathname, permissions)
  const panelId = `sidebar-group-${node.path.replace(/\W+/g, '-')}`

  // Un grupo con pantalla propia que ningún hijo repite la ofrece como primera entrada.
  const ownScreen = nested.some((child) => child.path === node.path)
    ? []
    : [{ label: node.overviewLabel || 'Vista general', path: node.path, icon: LayoutGrid, own: true }]
  const entries = [...ownScreen, ...nested]

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.path)}
        // ← y → abren y cierran el grupo sin apuntar con el mouse.
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && !isOpen) onToggle(node.path)
          else if (event.key === 'ArrowLeft' && isOpen) onToggle(node.path)
          else return
          event.preventDefault()
        }}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`${rowBase} px-3 py-2.5 text-sm ${rowTone(isActive, { group: true })}`}
      >
        <NodeIcon
          className={`h-[18px] w-[18px] shrink-0 transition-colors duration-150 ${isActive ? 'text-brand-800' : ''}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1 leading-snug">{node.label}</span>
        {/* Cuántas funciones esconde: solo mientras está cerrado, para que quien
            busca algo sepa si vale la pena abrirlo. */}
        <span
          aria-hidden
          className={`shrink-0 rounded-full px-1.5 text-[11px] font-bold tabular-nums transition-opacity duration-150 ${
            isOpen ? 'opacity-0' : 'opacity-100'
          } ${isActive ? 'bg-brand-800/10 text-brand-800' : 'bg-slate-900/[0.06] text-slate-500'}`}
        >
          {entries.length}
        </span>
        <ChevronRight
          className={`nav-chevron h-4 w-4 shrink-0 ${isActive ? 'text-brand-800' : 'text-slate-400'}`}
          data-open={isOpen}
          aria-hidden
        />
      </button>

      <div id={panelId} className="nav-fan" data-open={isOpen}>
        <div className="nav-fan-inner">
          <ul className="ml-[1.4rem] space-y-0.5 border-l border-slate-200 py-1 pl-2.5">
            {entries.map((entry, index) => (
              <li key={entry.path} className="nav-fan-item" style={{ '--i': index }}>
                <NavNode
                  node={entry}
                  expanded={expanded}
                  onToggle={onToggle}
                  pathname={pathname}
                  permissions={permissions}
                  depth={depth + 1}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function NavNode({ node, expanded, onToggle, pathname, permissions, depth }) {
  const nested = nestedOf(node, permissions)
  if (nested.length === 0) return <NavLeaf node={node} depth={depth} end={!node.children?.length} />
  return (
    <NavGroup
      node={node}
      nested={nested}
      expanded={expanded}
      onToggle={onToggle}
      pathname={pathname}
      permissions={permissions}
      depth={depth}
    />
  )
}

/**
 * Contextual sidebar: frosted glass (misma familia "liquid glass" que el resto del ERP),
 * pero con opacidad alta a propósito — es navegación densa de lectura constante, necesita
 * más contraste que una tarjeta de contenido.
 *
 * Los módulos con funciones dentro nacen cerrados y se abren en abanico solo cuando se
 * pulsa su fila; el que esconde la pantalla abierta nace abierto, para no perder de vista
 * dónde estás. No se recuerda lo abierto entre visitas: cerrado es el estado de descanso.
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
  const permissions = user?.permisos
  const currentDomain = getCurrentDomain(pathname)

  const visibleChildren = currentDomain ? getVisibleNavChildren(permissions, currentDomain.children) : []
  const moduleNavItems =
    visibleChildren.length > 0
      ? visibleChildren
      : currentDomain?.path && currentDomain.path !== '/dashboard'
        ? [{ label: currentDomain.label, path: currentDomain.path, icon: currentDomain.icon }]
        : []

  const [expanded, setExpanded] = useState(() => new Set(groupsHiding(moduleNavItems, pathname, permissions)))

  // Al llegar a una pantalla escondida en un grupo cerrado (un enlace de otra parte,
  // el botón Atrás), ese grupo se abre. Los que el usuario abrió no se tocan.
  // Ajuste de estado durante el render, como en AppShell.
  const [syncedPath, setSyncedPath] = useState(pathname)
  if (pathname !== syncedPath) {
    setSyncedPath(pathname)
    const missing = groupsHiding(moduleNavItems, pathname, permissions).filter((path) => !expanded.has(path))
    if (missing.length > 0) setExpanded(new Set([...expanded, ...missing]))
  }

  const toggleGroup = (path) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  if (!currentDomain) return null

  const DomainIcon = currentDomain.icon

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
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-800 to-brand-600 text-white shadow-sm shadow-brand-900/25">
                <DomainIcon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900">{currentDomain.label}</p>
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

          <nav aria-label={`Menú de ${currentDomain.label}`} className="flex-1 overflow-y-auto px-3 py-3">
            <NavLink
              to={INICIO.path}
              className={`${rowBase} mb-3 px-3 py-2 text-[13px] font-medium text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-900`}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              <span>Volver a Inicio</span>
            </NavLink>

            <ul className="space-y-1">
              {moduleNavItems.map((item) => (
                <li key={item.path}>
                  <NavNode
                    node={item}
                    expanded={expanded}
                    onToggle={toggleGroup}
                    pathname={pathname}
                    permissions={permissions}
                    depth={0}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  )
}

export default Sidebar
