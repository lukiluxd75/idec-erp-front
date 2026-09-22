import { useState } from 'react'
import { Braces } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'

const EMPTY_FORM = { nombre: '', clave: '', tipo_dato: '', descripcion: '', valor_predeterminado: '' }

const CLAVE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/

/** Registers a new reusable variable (placeholder). There is no edit/delete yet
 * -- the catalog only exposes "Registrar variable", so that is all this wires up. */
export function VariableFormModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    const clave = form.clave.trim()
    const nombre = form.nombre.trim()
    const tipoDato = form.tipo_dato.trim()
    if (!nombre || !clave || !tipoDato) {
      toast.warn('Nombre, clave y tipo de dato son obligatorios.')
      return
    }
    if (!CLAVE_PATTERN.test(clave)) {
      toast.warn('La clave debe empezar con una letra y solo contener letras, números o guion bajo (ej. nombre_solicitante).')
      return
    }

    setSubmitting(true)
    try {
      await templatesApi.createVariable({
        nombre,
        clave,
        tipo_dato: tipoDato,
        descripcion: form.descripcion.trim() || null,
        valor_predeterminado: form.valor_predeterminado.trim() || null,
      })
      toast.success(`Variable "{{${clave}}}" registrada.`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo registrar la variable.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar variable" icon={Braces}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Nombre" value={form.nombre} onChange={setField('nombre')} placeholder="Ej. Nombre del solicitante" autoFocus />
        <Input
          label="Clave"
          value={form.clave}
          onChange={setField('clave')}
          placeholder="Ej. nombre_solicitante"
          badgeText={form.clave ? `{{${form.clave}}}` : undefined}
        />
        <Input label="Tipo de dato" value={form.tipo_dato} onChange={setField('tipo_dato')} placeholder="Ej. Texto, Fecha, Número" />
        <Input label="Descripción (opcional)" value={form.descripcion} onChange={setField('descripcion')} placeholder="Uso de esta variable" />
        <Input
          label="Valor por defecto (opcional)"
          value={form.valor_predeterminado}
          onChange={setField('valor_predeterminado')}
          placeholder="Ej. Automático"
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Registrar variable'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default VariableFormModal
