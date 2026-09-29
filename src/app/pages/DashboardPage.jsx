import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight, LayoutGrid, Search, UserRound } from 'lucide-react'
import { Card, EmptyState, Input, Select } from '@/shared/ui'
import { useAuth } from '@/auth/hooks/useAuth'
import { NAV_SECTIONS, collectNavLabels, getModuleEntryPath, canViewModule } from '@/shared/nav'

const SORT_STORAGE_KEY = 'idec-erp.dashboard.sort'

const SORT_OPTIONS = [
  { id: 'catalog', label: 'Orden del catálogo' },
  { id: 'az', label: 'Nombre (A–Z)' },
  { id: 'za', label: 'Nombre (Z–A)' },
  { id: 'functions-desc', label: 'Más funciones' },
  { id: 'functions-asc', label: 'Menos funciones' },
]

function countFunctions(section) {
  const roots = section.menuChildren || section.children
  const walk = (nodes) =>
    (nodes || []).reduce((total, node) => total + 1 + walk(node.children), 0)
  const nested = walk(roots)
  return nested || 1
}

function readStoredSort() {
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY)
    return SORT_OPTIONS.some((option) => option.id === stored) ? stored : 'catalog'
  } catch {
    return 'catalog'
  }
}

function ModuleCard({ label, icon: Icon, menuChildren, entryPath }) {
  const subtitle =
    menuChildren?.length === 1
      ? 'Abrir módulo'
      : menuChildren?.length
        ? `${menuChildren.length} funciones`
        : 'Abrir módulo'

  return (
    <NavLink
      to={entryPath}
      className="liquid-glass-tile group relative flex aspect-square flex-col overflow-hidden rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 sm:p-5"
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
          Módulo
        </span>
        <span className="block text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-[1.05rem]">
          {label}
        </span>
        <span className="block text-xs leading-relaxed text-slate-500">{subtitle}</span>
      </div>
    </NavLink>
  )
}

/**
 * ERP home: welcome and module catalog in square cards.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(readStoredSort)

  const displayName = user?.username || 'Usuario'
  const modules = NAV_SECTIONS.filter(
    (section) => section.path !== '/dashboard' && canViewModule(user?.permisos, section)
  )

  const visibleModules = useMemo(() => {
    const term = query.trim().toLowerCase()
    const matched = modules
      .map((section) => {
        const labels = collectNavLabels(section)
        const hit = !term || labels.some((label) => label.toLowerCase().includes(term))
        if (!hit) return null
        return {
          path: section.path,
          label: section.label,
          icon: section.icon,
          menuChildren: section.children,
          entryPath: getModuleEntryPath(section, user?.permisos),
        }
      })
      .filter(Boolean)

    const ordered = [...matched]
    if (sort === 'az' || sort === 'za') {
      ordered.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }))
      if (sort === 'za') ordered.reverse()
    } else if (sort === 'functions-desc' || sort === 'functions-asc') {
      ordered.sort((a, b) => countFunctions(a) - countFunctions(b) || a.label.localeCompare(b.label, 'es'))
      if (sort === 'functions-desc') ordered.reverse()
    }
    return ordered
  }, [modules, query, sort, user?.permisos])

  const changeSort = (value) => {
    setSort(value)
    try {
      window.localStorage.setItem(SORT_STORAGE_KEY, value)
    } catch {
      /* ignore private-mode storage errors */
    }
  }

  return (
    <div className="space-y-5">
      <Card glass={false} className="liquid-glass-tint !p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <UserRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                Sesión iniciada
              </p>
              <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
              <p className="mt-0.5 text-sm text-white/80">
                Seleccione un módulo para continuar su trabajo.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card glass={false} className="liquid-glass space-y-5 !p-5 sm:!p-6">
        <div className="flex flex-col gap-4 border-b border-white/25 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
              <LayoutGrid className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Catálogo
              </p>
              <h2 className="text-sm font-bold text-slate-900">Módulos del IDEC</h2>
            </div>
          </div>

          {modules.length > 0 ? (
            <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_13.5rem]">
              <Input
                icon={Search}
                placeholder="Buscar módulo o herramienta…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar módulos"
              />
              <Select
                aria-label="Ordenar módulos"
                value={sort}
                onChange={(event) => changeSort(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {modules.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Todavía no tiene ningún módulo asignado"
            subtitle="Solicite a un administrador que le asigne un rol y un área en Seguridad → Permisos."
            className="py-10"
          />
        ) : visibleModules.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Ningún módulo coincide con la búsqueda"
            subtitle="Pruebe con otro nombre o limpie el texto para ver el catálogo completo."
            className="py-10"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {visibleModules.map((module) => (
              <ModuleCard key={module.path} {...module} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DashboardPage
