import { FilePlus2, FileText, Pencil, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, Input, SectionHeader, Spinner } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'
import { TemplateFormModal } from '../components/TemplateFormModal'

export default function TemplatesCatalogPage() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(undefined)
  const [modalToken, setModalToken] = useState(0)

  const openModal = (id) => {
    setEditingId(id ?? null)
    setModalToken((token) => token + 1)
  }

  const loadTemplates = useCallback((showFullSpinner) => {
    if (showFullSpinner) setLoading(true)
    setError(null)
    return templatesApi
      .list()
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => {
        if (showFullSpinner) setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadTemplates(true)
  }, [loadTemplates])

  const rows = useMemo(
    () =>
      items.filter((item) =>
        `${item.nombre} ${item.codigo} ${item.area}`.toLowerCase().includes(query.toLowerCase())
      ),
    [items, query]
  )

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={FileText}
        eyebrow="Plantillas dinámicas"
        title="Catálogo de plantillas"
        subtitle="Formatos institucionales disponibles para generación documental."
        actions={
          <Button icon={FilePlus2} onClick={() => openModal(null)}>
            Nueva plantilla
          </Button>
        }
      />
      <div className="mb-5">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} icon={Search} placeholder="Buscar por nombre, código o área…" />
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
                <th className="py-3 pr-3">Plantilla</th>
                <th className="py-3 pr-3">Área</th>
                <th className="py-3 pr-3">Tipo</th>
                <th className="py-3 pr-3">Estado</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-slate-800">{item.nombre}</p>
                    <p className="font-mono text-xs text-slate-400">{item.codigo}</p>
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{item.area}</td>
                  <td className="py-3 pr-3 text-slate-600">{item.tipo_documento}</td>
                  <td className="py-3 pr-3">
                    <Badge variant={item.activa ? 'success' : 'neutral'} dot>
                      {item.activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => openModal(item.id)}
                      title="Editar plantilla"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Todavía no hay plantillas registradas"
          subtitle="Las plantillas creadas en el servicio documental aparecerán aquí."
        />
      ) : (
        <EmptyState icon={Search} title="No se encontraron plantillas" />
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
