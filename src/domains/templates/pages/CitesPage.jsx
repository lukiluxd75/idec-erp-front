import { FileOutput, Hash, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, DataTable, Input, SectionHeader } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { CiteConfiguracionFormModal } from '../components/CiteConfiguracionFormModal'
import { GenerateCiteModal } from '../components/GenerateCiteModal'

const PAGE_SIZE = 50

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return ''
  }
}

export default function CitesPage() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadCites = useCallback((requestedPage = 1) => {
    setLoading(true)
    setError(null)
    return templatesApi
      .listCitesPage(PAGE_SIZE, (requestedPage - 1) * PAGE_SIZE)
      .then(({ items: data, total: count }) => {
        setItems(data)
        setTotal(count)
        setPage(requestedPage)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCites()
  }, [loadCites])

  const rows = useMemo(
    () => items.filter((item) => `${item.codigo} ${item.tramite_id || ''}`.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  )

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Hash}
        eyebrow="Plantillas dinámicas"
        title="CITES"
        subtitle="Historial de códigos correlativos generados y su asociación documental."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setConfigModalOpen(true)}>Nueva sigla</Button>
            <Button icon={FileOutput} onClick={() => setGenerateModalOpen(true)}>Generar CITE</Button>
          </div>
        )}
      />
      <div className="mb-5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} icon={Search} placeholder="Buscar en esta página…" />
      </div>

      {error ? <Alert type="error">{error}</Alert> : (
        <DataTable
          caption="Historial de CITES generados"
          rows={rows}
          rowKey="id"
          loading={loading}
          emptyMessage={items.length === 0 ? 'Aún no hay CITES generados.' : 'Ningún CITE coincide con la búsqueda.'}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={loadCites}
          className="rounded-xl border border-slate-200/70"
          columns={[
            { key: 'codigo', label: 'CITE', cellClassName: 'font-mono text-xs font-semibold text-brand-800' },
            { key: 'tramite_id', label: 'Trámite', render: (item) => item.tramite_id ?? '—' },
            { key: 'estado', label: 'Estado', render: (item) => <Badge variant={item.estado === 'ANULADO' ? 'danger' : 'success'} dot>{item.estado}</Badge> },
            { key: 'generado_en', label: 'Generado', render: (item) => formatDate(item.generado_en) },
          ]}
        />
      )}

      <CiteConfiguracionFormModal open={configModalOpen} onClose={() => setConfigModalOpen(false)} onSaved={loadCites} />
      <GenerateCiteModal open={generateModalOpen} onClose={() => setGenerateModalOpen(false)} onSaved={loadCites} />
    </Card>
  )
}
