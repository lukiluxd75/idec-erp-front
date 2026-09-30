import { useEffect, useState } from 'react'
import { FilePlus2, Pencil } from 'lucide-react'
import { toast } from 'react-toastify'
import { Modal, Input, Button, Spinner } from '@/shared/ui'
import { templatesApi } from '../api/templates.api'

const EMPTY_FORM = {
  nombre: '',
  codigo: '',
  area: '',
  tipo_documento: '',
  descripcion: '',
  contenido_html: '',
}

/**
 * Creates a new template or edits an existing one. Parent must mount this with
 * a `key` that changes on each open (see TemplatesCatalogPage) so the form
 * starts fresh each time instead of carrying over the previous edit's state.
 *
 * `templateId` (not the row's list item) because the catalog list omits
 * `contenido_html`/`descripcion` — editing fetches the full detail on open.
 */
export function TemplateFormModal({ open, onClose, templateId, onSaved }) {
  const isEditing = Boolean(templateId)
  const [form, setForm] = useState(EMPTY_FORM)
  const [activa, setActiva] = useState(true)
  const [loading, setLoading] = useState(isEditing)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !isEditing) return
    let cancelled = false
    templatesApi
      .get(templateId)
      .then((detail) => {
        if (cancelled) return
        setForm({
          nombre: detail.nombre,
          codigo: detail.codigo,
          area: detail.area,
          tipo_documento: detail.tipo_documento,
          descripcion: detail.descripcion || '',
          contenido_html: detail.contenido_html,
        })
        setActiva(detail.activa)
      })
      .catch((err) => {
        toast.error(err.message || 'No se pudo cargar la plantilla.')
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      area: form.area.trim(),
      tipo_documento: form.tipo_documento.trim(),
      contenido_html: form.contenido_html.trim(),
      descripcion: form.descripcion.trim() || null,
    }
    if (!payload.nombre || !payload.codigo || !payload.area || !payload.tipo_documento || !payload.contenido_html) {
      toast.warn('Nombre, código, área, tipo de documento y contenido HTML son obligatorios.')
      return
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await templatesApi.update(templateId, payload)
        toast.success(`Plantilla "${payload.nombre}" actualizada.`)
      } else {
        await templatesApi.create(payload)
        toast.success(`Plantilla "${payload.nombre}" creada.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la plantilla.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async () => {
    if (activa && !confirm(`¿Desactivar la plantilla "${form.nombre}"? Podrá reactivarla después.`)) return

    setSubmitting(true)
    try {
      if (activa) {
        await templatesApi.deactivate(templateId)
        toast.info(`Plantilla "${form.nombre}" desactivada.`)
      } else {
        await templatesApi.update(templateId, { activa: true })
        toast.success(`Plantilla "${form.nombre}" reactivada.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado de la plantilla.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar plantilla' : 'Nueva plantilla'}
      icon={isEditing ? Pencil : FilePlus2}
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={form.nombre} onChange={setField('nombre')} placeholder="Ej. Informe técnico catastral" autoFocus />
            <Input label="Código" value={form.codigo} onChange={setField('codigo')} placeholder="Ej. INF-TEC-001" />
            <Input label="Área" value={form.area} onChange={setField('area')} placeholder="Ej. Catastro" />
            <Input label="Tipo de documento" value={form.tipo_documento} onChange={setField('tipo_documento')} placeholder="Ej. Informe" />
          </div>

          <Input
            label="Descripción (opcional)"
            value={form.descripcion}
            onChange={setField('descripcion')}
            placeholder="Breve descripción del uso de esta plantilla"
          />

          <div className="flex flex-col">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Contenido HTML</label>
            <textarea
              value={form.contenido_html}
              onChange={setField('contenido_html')}
              rows={8}
              placeholder="<p>Use variables como {{nombre_solicitante}}…</p>"
              className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3 font-mono text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            {isEditing ? (
              <Button type="button" variant={activa ? 'danger' : 'secondary'} onClick={handleToggleActive} disabled={submitting}>
                {activa ? 'Desactivar' : 'Reactivar'}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear plantilla'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default TemplateFormModal
