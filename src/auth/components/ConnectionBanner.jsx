import { CheckCircle2 } from 'lucide-react'
import { Card, Badge } from '@/shared/ui'

export function ConnectionBanner() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-center sm:gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-state-success/10 text-state-success ring-1 ring-state-success/30 shadow-xs mb-4 sm:mb-0">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900">¡Conexión Exitosa!</h2>
            <Badge variant="success" dot dotPulse>
              Autenticado
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Las credenciales fueron validadas correctamente. El token de sesión JWT se encuentra activo y listo para consumir el backend.
          </p>
        </div>
      </div>
    </Card>
  )
}

export default ConnectionBanner
