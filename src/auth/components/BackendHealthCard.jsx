import { Server, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react'
import { Card, Button, Alert, Spinner } from '@/shared/ui'

export function BackendHealthCard({
  loading,
  apiStatus,
  onVerify,
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-4">
        <div className="flex items-center gap-2.5">
          <Server className="h-5 w-5 text-accent-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Estado de Conexión con el Backend</h3>
            <p className="text-xs text-slate-500">FastAPI en puerto 8061</p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onVerify}
          loading={loading}
          icon={RefreshCw}
        >
          Verificar Conexión
        </Button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-xs text-slate-600 backdrop-blur-sm">
            <Spinner className="h-4 w-4 text-accent-500" />
            <span>Comprobando token con FastAPI...</span>
          </div>
        ) : apiStatus?.success ? (
          <div className="flex items-center gap-3 rounded-2xl border border-state-success/30 bg-state-success/10 p-4 text-xs text-slate-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-state-success" />
            <div className="flex-1">
              <p className="font-semibold text-slate-900">200 OK - Backend conectado y token validado</p>
              <p className="mt-0.5 text-slate-600">{apiStatus.message}</p>
            </div>
            {apiStatus.time && (
              <span className="text-[11px] font-mono text-slate-500">{apiStatus.time}</span>
            )}
          </div>
        ) : apiStatus && !apiStatus.success ? (
          <Alert
            type="error"
            title="Error al conectar con el backend:"
            message={apiStatus.message}
          />
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-xs text-slate-600 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-accent-500" />
            <span>Haz clic en &quot;Verificar Conexión&quot; para comprobar la comunicación con FastAPI.</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default BackendHealthCard
