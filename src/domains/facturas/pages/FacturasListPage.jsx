import { Receipt, ReceiptText } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { facturasApi } from '@/domains/facturas/api/facturas.api'
import { FacturaStatusBadge } from '@/domains/facturas/components/FacturaStatusBadge'
import { IN_PROGRESS, formatDateTime } from '@/domains/facturas/utils/facturaData'
import { useFacturasUpdates, usePollWhile } from '@/domains/facturas/utils/useFacturasUpdates'
import { Alert, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

export default function FacturasListPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `loading` only covers the first load; websocket/poll refreshes are silent.
  const refresh = useCallback(
    () =>
      facturasApi
        .list()
        .then((data) => {
          setItems(data)
          setError(null)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  useFacturasUpdates(refresh)
  usePollWhile(items.some((f) => IN_PROGRESS.has(f.status)), refresh)

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Receipt}
        eyebrow="Facturas"
        title="Mis facturas"
        subtitle="Se fotografían desde la app móvil (Escaneo de Facturas). Aquí revisa y confirma los datos leídos."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Todavía no hay facturas"
          subtitle="Saque una foto desde el apartado Escaneo de Facturas de la aplicación móvil y va a aparecer aquí."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((f) => (
            <Link key={f.id} to={`/facturas/${f.id}`}>
              <div className="flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs transition hover:border-accent-300 hover:bg-white hover:shadow-md">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                  <ReceiptText className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {f.numero_comprobante
                        ? `Comprobante ${f.numero_comprobante}`
                        : IN_PROGRESS.has(f.status)
                          ? 'Leyendo la factura…'
                          : 'Sin número de comprobante'}
                    </p>
                    <FacturaStatusBadge status={f.status} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {f.contribuyente || '—'}
                    {f.monto_pagado ? ` · Bs ${f.monto_pagado}` : ''}
                    {f.status === 'failed' && f.error_message ? ` · ${f.error_message}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(f.created_at)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}
