import { Component } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error, info) {
    console.error('Error al mostrar esta pantalla', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-state-danger/20 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-state-danger" />
          <div>
            <h2 className="font-bold text-slate-900">No se pudo abrir esta pantalla</h2>
            <p className="mt-1 text-sm text-slate-600">Vuelve a intentarlo o regresa al dashboard.</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => this.setState({ error: null })} className="inline-flex items-center gap-2 rounded-lg bg-brand-800 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                <RotateCcw className="h-4 w-4" /> Reintentar
              </button>
              <Link to="/dashboard" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Ir al dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }
}

export default ErrorBoundary
