import { useState } from 'react'
import { Hash } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'

const EMPTY_FORM = {
  area_codigo: '',
  tipo_documento_codigo: '',
  nombre: '',
  formato: '',
  longitud_numero: '5',
  reinicia_por_gestion: true,
}

export function CiteConfiguracionFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    const areaCodigo = form.area_codigo.trim()
    const tipoCodigo = form.tipo_documento_codigo.trim()
    const nombre = form.nombre.trim()
    const formato = form.formato.trim()
    const longitud = parseInt(form.longitud_numero, 10)
    if (!areaCodigo || !tipoCodigo || !nombre || !formato) {
      toast.warn('Código de área, código de tipo de documento, nombre y formato son obligatorios.')
      return
    }
    if (!formato.includes('{numero}')) {
      toast.warn('El formato debe incluir {numero} para que el contador sea visible en el CITE.')
      return
    }

    setSubmitting(true)
    try {
      await templatesApi.createCiteConfiguracion({
        area_codigo: areaCodigo,
        tipo_documento_codigo: tipoCodigo,
        nombre,
        formato,
        longitud_numero: Number.isFinite(longitud) ? longitud : 5,
        reinicia_por_gestion: form.reinicia_por_gestion,
      })
      toast.success(`Sigla "${nombre}" registrada.`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar la sigla.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva sigla de CITE" icon={Hash}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Código de área" value={form.area_codigo} onChange={setField('area_codigo')} placeholder="Ej. CAT" data-modal-initial-focus />
          <Input
            label="Código de tipo de documento"
            value={form.tipo_documento_codigo}
            onChange={setField('tipo_documento_codigo')}
            placeholder="Ej. INF"
          />
        </div>
        <Input label="Nombre" value={form.nombre} onChange={setField('nombre')} placeholder="Ej. Informe técnico de Catastro" />
        <Input
          label="Formato"
          value={form.formato}
          onChange={setField('formato')}
          placeholder="Ej. GAMC-{area}-{tipo}-{numero}/{gestion}"
        />
        <p className="-mt-2 text-xs text-slate-400">
          Placeholders disponibles: {'{area}'}, {'{tipo}'}, {'{numero}'}, {'{gestion}'}.
        </p>
        <Input
          label="Dígitos del número correlativo"
          type="number"
          min="1"
          max="12"
          value={form.longitud_numero}
          onChange={setField('longitud_numero')}
        />
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.reinicia_por_gestion}
            onChange={(e) => setForm((prev) => ({ ...prev, reinicia_por_gestion: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-accent-400"
          />
          Reiniciar el contador cada gestión (año)
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Registrar sigla'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CiteConfiguracionFormModal
