import { Braces, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, DataTable, SectionHeader } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { VariableFormModal } from '../components/VariableFormModal'

const PAGE_SIZE = 50

export default function VariablesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadVariables = useCallback((requestedPage = 1) => {
    setLoading(true)
    setError(null)
    return templatesApi
      .listVariablesPage(PAGE_SIZE, (requestedPage - 1) * PAGE_SIZE)
      .then(({ items: data, total: count }) => {
        setItems(data)
        setTotal(count)
        setPage(requestedPage)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadVariables()
  }, [loadVariables])

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={Braces}
        eyebrow="Plantillas dinámicas"
        title="Variables"
        subtitle="Campos reutilizables para completar documentos de forma consistente."
        actions={<Button icon={Plus} onClick={() => setModalOpen(true)}>Registrar variable</Button>}
      />

      {error ? <Alert type="error">{error}</Alert> : (
        <DataTable
          caption="Variables disponibles para documentos"
          rows={items}
          rowKey="id"
          loading={loading}
          emptyMessage="Todavía no hay variables registradas."
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={loadVariables}
          className="rounded-xl border border-slate-200/70"
          columns={[
            { key: 'clave', label: 'Variable', cellClassName: 'font-mono text-xs font-semibold text-brand-800', render: (item) => `{{${item.clave}}}` },
            { key: 'nombre', label: 'Descripción' },
            { key: 'tipo_dato', label: 'Tipo', render: (item) => <Badge variant="neutral">{item.tipo_dato}</Badge> },
            { key: 'valor_predeterminado', label: 'Valor por defecto', render: (item) => item.valor_predeterminado || '—' },
          ]}
        />
      )}

      <VariableFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadVariables} />
    </Card>
  )
}
