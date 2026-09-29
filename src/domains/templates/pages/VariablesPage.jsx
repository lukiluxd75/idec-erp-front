import { Braces, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { VariableFormModal } from '../components/VariableFormModal'

export default function VariablesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadVariables = useCallback(() => {
    setLoading(true)
    setError(null)
    return templatesApi
      .listVariables()
      .then((data) => setItems(data))
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
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Registrar variable
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <EmptyState icon={Braces} title="Todavía no hay variables registradas" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-3">Variable</th>
                <th className="py-3 pr-3">Descripción</th>
                <th className="py-3 pr-3">Tipo</th>
                <th className="py-3">Valor por defecto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3 font-mono text-xs font-semibold text-brand-800">{`{{${item.clave}}}`}</td>
                  <td className="py-3 pr-3 text-slate-700">{item.nombre}</td>
                  <td className="py-3 pr-3">
                    <Badge variant="neutral">{item.tipo_dato}</Badge>
                  </td>
                  <td className="py-3 text-slate-500">{item.valor_predeterminado || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VariableFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadVariables} />
    </Card>
  )
}
