import DataTable from '@/shared/ui/DataTable'
import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, FileQuestion, Pencil, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import { Alert, Badge, Card, Input, Modal, SectionHeader, Spinner, EmptyState } from '@/shared/ui'
import { chatbotApi } from '@/domains/chatbot/api/chatbot.api'
import { ProcedureEditForm } from '@/domains/chatbot/components/ProcedureEditForm'

export default function ProceduresAdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return chatbotApi
      .listProcedures()
      .then((data) => setItems(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = items.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
  })

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      await chatbotApi.updateProcedure(editing.code, payload)
      toast.success('Trámite actualizado.')
      setEditing(null)
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={ClipboardList}
        eyebrow="Asistente de Trámites"
        title="Catálogo de trámites"
        subtitle="Base de conocimiento que usa el asistente para responder a los ciudadanos."
        actions={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
            icon={Search}
            containerClassName="w-64"
          />
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileQuestion} title="No se encontraron trámites" />
      ) : (
        <div className="overflow-x-auto">
          <DataTable>
<table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3 font-semibold">Código</th>
                <th className="py-2 pr-3 font-semibold">Trámite</th>
                <th className="py-2 pr-3 font-semibold">Costo</th>
                <th className="py-2 pr-3 font-semibold">Estado</th>
                <th className="py-2 pr-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.code}>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{p.code}</td>
                  <td className="py-2.5 pr-3 font-medium text-slate-800">{p.name}</td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {p.amount != null ? `${p.currency || ''} ${p.amount}`.trim() : p.cost_note || '—'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={p.is_active ? 'success' : 'neutral'} dot>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
</DataTable>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar trámite" icon={Pencil}>
        {editing && (
          <ProcedureEditForm
            procedure={editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        )}
      </Modal>
    </Card>
  )
}
