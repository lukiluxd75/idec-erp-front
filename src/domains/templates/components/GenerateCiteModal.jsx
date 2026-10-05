import { useEffect, useState } from 'react'
import { FileOutput } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Select, Input, Button, Spinner } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'

/** Emits the next CITE for a chosen sigla. */
export function GenerateCiteModal({ open, onClose, onSaved }) {
  const [configuraciones, setConfiguraciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [configuracionId, setConfiguracionId] = useState('')
  const [tramiteId, setTramiteId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    templatesApi
      .listCiteConfiguraciones()
      .then((data) => {
        const activas = data.filter((c) => c.activa)
        setConfiguraciones(activas)
        setConfiguracionId(activas[0] ? String(activas[0].id) : '')
      })
      .catch((err) => toast.error(err.message || 'No se pudieron cargar las siglas.'))
      .finally(() => setLoading(false))
  }, [open])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const configuracion = configuraciones.find((c) => String(c.id) === configuracionId)
    if (!configuracion) {
      toast.warn('Elija una sigla.')
      return
    }

    setSubmitting(true)
    try {
      const cite = await templatesApi.generateCite({
        area_codigo: configuracion.area_codigo,
        tipo_documento_codigo: configuracion.tipo_documento_codigo,
        tramite_id: tramiteId.trim() ? Number(tramiteId.trim()) : null,
      })
      toast.success(`CITE generado: ${cite.codigo}`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo generar el CITE.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generar CITE" icon={FileOutput}>
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : configuraciones.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no hay siglas registradas. Cree una con "Nueva sigla" antes de generar un CITE.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Sigla" value={configuracionId} onChange={(e) => setConfiguracionId(e.target.value)} autoFocus>
            {configuraciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.area_codigo}/{c.tipo_documento_codigo})
              </option>
            ))}
          </Select>
          <Input
            label="N° de trámite (opcional)"
            type="number"
            value={tramiteId}
            onChange={(e) => setTramiteId(e.target.value)}
            placeholder="Ej. 1024"
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Generando…' : 'Generar CITE'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default GenerateCiteModal
