import { FileSearch, ScrollText } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { foliosApi } from '@/domains/folios/api/folios.api'
import { FolioStatusBadge } from '@/domains/folios/components/FolioStatusBadge'
import { IN_PROGRESS, formatDateTime } from '@/domains/folios/utils/folioData'
import { useFoliosUpdates, usePollWhile } from '@/domains/folios/utils/useFoliosUpdates'
import { Alert, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

export default function FoliosListPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // `loading` only covers the first load; websocket/poll refreshes are silent.
  const refresh = useCallback(
    () =>
      foliosApi
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

  useFoliosUpdates(refresh)
  usePollWhile(items.some((f) => IN_PROGRESS.has(f.status)), refresh)

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FileSearch}
        eyebrow="Detección de Folios"
        title="Mis folios"
        subtitle="Se escanean desde la app móvil (Escaneo Folios). Aquí revisa y confirma los datos detectados."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Todavía no hay folios"
          subtitle="Escanee uno desde el apartado Escaneo Folios de la aplicación móvil y va a aparecer aquí."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((f) => (
            <Link key={f.id} to={`/folios/${f.id}`}>
              <div className="flex h-full items-start gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-xs transition hover:border-accent-300 hover:bg-white hover:shadow-md">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600 ring-1 ring-accent-200">
                  <ScrollText className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {f.matricula ? `Matrícula ${f.matricula}` : IN_PROGRESS.has(f.status) ? 'Detectando datos…' : 'Sin matrícula'}
                    </p>
                    <FolioStatusBadge status={f.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {f.page_count} {f.page_count === 1 ? 'página' : 'páginas'}
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
