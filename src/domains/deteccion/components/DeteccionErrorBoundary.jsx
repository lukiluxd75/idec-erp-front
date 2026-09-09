import { Component } from 'react'
import { Alert, Button, Card } from '@/shared/ui'

/** Catches render errors so the ERP shell does not collapse to the cyan backdrop. */
export class DeteccionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Deteccion module crashed', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <Card glass={false}>
          <Alert
            type="error"
            title="No se pudo cargar el módulo de detección"
            message="Se produjo un error inesperado en la interfaz. Puede reintentar o recargar la página."
          />
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap break-words">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="mt-4">
            <Button type="button" variant="secondary" onClick={() => this.setState({ error: null })}>
              Reintentar
            </Button>
          </div>
        </Card>
      )
    }
    return this.props.children
  }
}

export default DeteccionErrorBoundary
