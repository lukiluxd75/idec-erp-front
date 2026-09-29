import { FileOutput, Hash, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { CiteConfiguracionFormModal } from '../components/CiteConfiguracionFormModal'
import { GenerateCiteModal } from '../components/GenerateCiteModal'

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

  const loadCites = useCallback(() => {
    setLoading(true)
    setError(null)
    return templatesApi
      .listCites()
      .then((data) => setItems(data))
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
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Plus} onClick={() => setConfigModalOpen(true)}>
              Nueva sigla
            </Button>
            <Button icon={FileOutput} onClick={() => setGenerateModalOpen(true)}>
              Generar CITE
            </Button>
          </div>
        }
      />
      <div className="mb-5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} icon={Search} placeholder="Buscar por CITE o trámite…" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-3">CITE</th>
                <th className="py-3 pr-3">Trámite</th>
                <th className="py-3 pr-3">Estado</th>
                <th className="py-3">Generado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3 font-mono text-xs font-semibold text-brand-800">{item.codigo}</td>
                  <td className="py-3 pr-3 text-slate-600">{item.tramite_id ?? '—'}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={item.estado === 'ANULADO' ? 'danger' : 'success'} dot>
                      {item.estado}
                    </Badge>
                  </td>
                  <td className="py-3 text-slate-500">{formatDate(item.generado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Hash}
          title="Aún no hay CITES generados"
          subtitle="Registre una sigla (área + tipo de documento) y luego genere el primer CITE."
        />
      ) : (
        <EmptyState icon={Search} title="Ningún CITE coincide con la búsqueda" />
      )}

      <CiteConfiguracionFormModal open={configModalOpen} onClose={() => setConfigModalOpen(false)} onSaved={loadCites} />
      <GenerateCiteModal open={generateModalOpen} onClose={() => setGenerateModalOpen(false)} onSaved={loadCites} />
    </Card>
  )
}
