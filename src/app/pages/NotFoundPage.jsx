import { Link } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Card } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-600">Error 404</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">No encontramos esa página</h1>
        <p className="mt-2 text-sm text-slate-600">La dirección puede ser incorrecta o la página ya no existe.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-600">
            <LayoutDashboard className="h-4 w-4" /> Ir al dashboard
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-xs hover:bg-white">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio
          </Link>
        </div>
      </Card>
    </main>
  )
}

export default NotFoundPage
