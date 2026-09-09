import { NavLink } from 'react-router-dom'
import { ChevronRight, LayoutGrid, UserRound } from 'lucide-react'
import { Card, EmptyState } from '@/shared/ui'
import { useAuth } from '@/auth/hooks/useAuth'
import { NAV_SECTIONS, puedeVerModulo } from '@/shared/nav'

function ModuleRow({ label, path, icon: Icon, children }) {
  const subtitle = children?.length
    ? `${children.length} función${children.length === 1 ? '' : 'es'} disponible${children.length === 1 ? '' : 's'}`
    : 'Abrir módulo'

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
        <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-accent-600" />
    </NavLink>
  )
}

/**
 * Home del ERP: bienvenida clara y módulos en filas profesionales.
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

      <Card glass={false} className="space-y-4 !p-5 sm:!p-6">
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
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <ModuleRow key={module.path} {...module} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DashboardPage
