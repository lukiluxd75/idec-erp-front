import { FilePlus2, FileText, Pencil, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, DataTable, Input, SectionHeader } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { TemplateFormModal } from '../components/TemplateFormModal'

const PAGE_SIZE = 50

export default function TemplatesCatalogPage() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(undefined)
  const [modalToken, setModalToken] = useState(0)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const openModal = (id) => {
    setEditingId(id ?? null)
    setModalToken((token) => token + 1)
  }

  const loadTemplates = useCallback((showFullSpinner, requestedPage = 1) => {
    if (showFullSpinner) setLoading(true)
    setError(null)
    return templatesApi
      .listPage(PAGE_SIZE, (requestedPage - 1) * PAGE_SIZE)
      .then(({ items: data, total: count }) => {
        setItems(data)
        setTotal(count)
        setPage(requestedPage)
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        if (showFullSpinner) setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadTemplates(true)
  }, [loadTemplates])

  const rows = useMemo(
    () => items.filter((item) => `${item.nombre} ${item.codigo} ${item.area}`.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  )

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FileText}
        eyebrow="Plantillas dinámicas"
        title="Catálogo de plantillas"
        subtitle="Formatos institucionales disponibles para generación documental."
        actions={<Button icon={FilePlus2} onClick={() => openModal(null)}>Nueva plantilla</Button>}
      />
      <div className="mb-5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} icon={Search} placeholder="Buscar en esta página…" />
      </div>

      {error ? <Alert type="error">{error}</Alert> : (
        <DataTable
          caption="Catálogo de plantillas"
          rows={rows}
          rowKey="id"
          loading={loading}
          emptyMessage={items.length === 0 ? 'Todavía no hay plantillas registradas.' : 'No se encontraron plantillas.'}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={(nextPage) => loadTemplates(true, nextPage)}
          className="rounded-xl border border-slate-200/70"
          columns={[
            { key: 'nombre', label: 'Plantilla', render: (item) => <><p className="font-semibold text-slate-800">{item.nombre}</p><p className="font-mono text-xs text-slate-400">{item.codigo}</p></> },
            { key: 'area', label: 'Área' },
            { key: 'tipo_documento', label: 'Tipo' },
            { key: 'activa', label: 'Estado', render: (item) => <Badge variant={item.activa ? 'success' : 'neutral'} dot>{item.activa ? 'Activa' : 'Inactiva'}</Badge> },
            { key: 'actions', label: 'Acciones', headerClassName: 'bg-slate-50 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500', cellClassName: 'text-right', render: (item) => (
              <button type="button" className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" onClick={() => openModal(item.id)} title="Editar plantilla" aria-label={`Editar plantilla ${item.nombre}`}>
                <Pencil className="h-4 w-4" />
              </button>
            ) },
          ]}
        />
      )}

      <TemplateFormModal
        key={modalToken}
        open={editingId !== undefined}
        onClose={() => setEditingId(undefined)}
        templateId={editingId || null}
        onSaved={() => loadTemplates(false)}
      />
    </Card>
  )
}
