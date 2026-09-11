import { NavLink } from 'react-router-dom'
import { ArrowUpRight, LayoutGrid, UserRound } from 'lucide-react'
import { Card, EmptyState } from '@/shared/ui'
import { useAuth } from '@/auth/hooks/useAuth'
import { NAV_SECTIONS, getModuleEntryPath, puedeVerModulo } from '@/shared/nav'

function ModuleCard({ label, path, icon: Icon, children }) {
  const entryPath = getModuleEntryPath({ path, children })
  const subtitle =
    children?.length === 1
      ? 'Abrir módulo'
      : children?.length
        ? `${children.length} funciones`
        : 'Abrir módulo'

  return (
    <NavLink
      to={entryPath}
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
 * Home del ERP: bienvenida y catálogo de módulos en tarjetas cuadradas.
 */
export function DashboardPage() {
  const { user } = useAuth()

  const displayName = user?.username || 'Usuario'
  const modules = NAV_SECTIONS.filter(
    (section) => section.path !== '/dashboard' && puedeVerModulo(user?.permisos, section)
  )

  return (
    <div className="space-y-5">
      <Card glass={false} className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-5 text-white sm:px-6">
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

      <Card glass={false} className="space-y-5 !p-5 sm:!p-6">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
            <LayoutGrid className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Catálogo
            </p>
            <h2 className="text-sm font-bold text-slate-900">Módulos del ERP</h2>
          </div>
        </div>

        {modules.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Todavía no tiene ningún módulo asignado"
            subtitle="Solicite a un administrador que le asigne un rol y un área en Seguridad → Permisos."
            className="py-10"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {modules.map((module) => (
              <ModuleCard key={module.path} {...module} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DashboardPage
