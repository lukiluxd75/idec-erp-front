import { FileText, FolderOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { resolucionesApi } from '@/domains/resoluciones/api/resoluciones.api'
import { EstadoBadge } from '@/domains/resoluciones/components/EstadoBadge'
import { useResolucionesUpdates } from '@/domains/resoluciones/utils/useResolucionesUpdates'
import { Alert, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

function fecha(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function ListaResolucionesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `mostrarSpinnerCompleto` solo para la primera carga: las actualizaciones
  // que llegan por websocket (alguien subio algo desde el celular) refrescan
  // en silencio, sin tapar la lista actual con el spinner grande.
  const cargar = useCallback((mostrarSpinnerCompleto) => {
    if (mostrarSpinnerCompleto) setLoading(true)
    setError(null)
    return resolucionesApi
      .listar()
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => {
        if (mostrarSpinnerCompleto) setLoading(false)
      })
  }, [])

  useEffect(() => {
    cargar(true)
  }, [cargar])

  useResolucionesUpdates(useCallback(() => cargar(false), [cargar]))

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FolderOpen}
        eyebrow="Lector OCR de Resoluciones P.H."
        title="Mis resoluciones"
        subtitle="Se escanean desde la app móvil. Aquí extrae la tabla de superficies y genera el excel."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay resoluciones"
          subtitle="Suba una desde el apartado Resoluciones de la aplicación móvil y va a aparecer aquí."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <Link key={r.id_resolucion} to={`/resoluciones/${r.id_resolucion}`}>
              <div className="flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs transition hover:border-accent-300 hover:bg-white hover:shadow-md">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                  <FileText className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">{r.nombre}</p>
                    <EstadoBadge estado={r.estado} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    N° {r.nro_resolucion} · {r.total_paginas}{' '}
                    {r.total_paginas === 1 ? 'página' : 'páginas'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{fecha(r.fecha_creacion)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
