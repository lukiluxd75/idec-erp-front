import { Construction } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Card, Badge } from '@/shared/ui'
import { PLACEHOLDER_ROUTES } from '@/shared/nav'

/**
 * Pantalla genérica para los módulos del ERP que todavía no tienen funcionalidad real.
 * Su único propósito es mostrar la forma completa de la navegación en este dashboard de prueba.
 */
export function ModulePlaceholder() {
  const { pathname } = useLocation()
  const route = PLACEHOLDER_ROUTES.find((r) => r.path === pathname)

  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 ring-1 ring-accent-200">
          <Construction className="h-8 w-8" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-600">
            {route?.section || 'Módulo'}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{route?.label || 'En construcción'}</h2>
        </div>

        <p className="max-w-sm text-sm text-slate-500">
          Este módulo es un marcador de posición para mostrar la navegación completa del ERP.
          Todavía no tiene funcionalidad real implementada.
        </p>

        <Badge variant="neutral">Próximamente</Badge>
      </div>
    </Card>
  )
}

export default ModulePlaceholder
