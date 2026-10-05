import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ExternalLink,
  FileText,
  Layers3,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from 'lucide-react'
import { cadastralViewerApi } from '../api/cadastralViewerApi'
import AdvertisementPlayer from '../components/AdvertisementPlayer'

const SECTIONS = [
  { id: 'procedures', label: 'Trámites', icon: FileText },
  { id: 'advertisements', label: 'Videos', icon: Video },
  { id: 'layers', label: 'Capas', icon: Layers3 },
]

const EMPTY_PROCEDURE = {
  code: '', name: '', description: '', category: 'services',
  requirements: '', estimated_days: '', location: '', status: 'published', display_order: 0,
}
const EMPTY_LAYER = {
  code: '', name: '', layer_type: 'imagery', service_type: 'wms', service_url: '',
  service_layer: '0', year: '', source: '', is_active: true, display_order: 0,
}
const EMPTY_ADVERTISEMENT = {
  title: '', is_active: false, display_order: 0,
}

const SECTION_META = {
  procedures: { title: 'Trámite', noun: 'trámite' },
  advertisements: { title: 'Video publicitario', noun: 'video' },
  layers: { title: 'Capa cartográfica', noun: 'capa' },
}

function formatBytes(value) {
  if (!value) return 'Enlace externo'
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function getErrorMessage(error) {
  return error?.message || 'No se pudo completar la operación.'
}

export default function CadastralViewerAdminPage() {
  const [section, setSection] = useState('procedures')
  const [items, setItems] = useState({ procedures: [], advertisements: [], layers: [] })
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_PROCEDURE)
  const [selectedFile, setSelectedFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [procedures, advertisements, layers] = await Promise.all([
        cadastralViewerApi.listProcedures(true),
        cadastralViewerApi.listAdvertisements(true),
        cadastralViewerApi.listLayers(true),
      ])
      setItems({ procedures, advertisements, layers })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    Promise.all([
      cadastralViewerApi.listProcedures(true),
      cadastralViewerApi.listAdvertisements(true),
      cadastralViewerApi.listLayers(true),
    ]).then(([procedures, advertisements, layers]) => {
      if (alive) setItems({ procedures, advertisements, layers })
    }).catch((requestError) => {
      if (alive) setError(getErrorMessage(requestError))
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [])

  function beginCreate() {
    setShowForm(true)
    setEditing(null)
    setForm(section === 'procedures' ? EMPTY_PROCEDURE : section === 'layers' ? EMPTY_LAYER : EMPTY_ADVERTISEMENT)
    setSelectedFile(null)
    setError('')
    setNotice('')
  }

  function beginEdit(item) {
    setShowForm(true)
    setEditing(item)
    if (section === 'procedures') {
      setForm({ ...item, requirements: (item.requirements || []).join('\n') })
    } else if (section === 'layers') {
      setForm({ ...item, year: item.year ?? '' })
    } else {
      setForm({ title: item.title, is_active: item.is_active, display_order: item.display_order })
    }
    setSelectedFile(null)
    setError('')
    setNotice('')
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setSelectedFile(null)
  }

  function updateField(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (section === 'procedures') {
        const payload = {
          ...form,
          requirements: String(form.requirements || '').split('\n').map((line) => line.trim()).filter(Boolean),
          display_order: Number(form.display_order || 0),
        }
        await cadastralViewerApi.saveProcedure(payload, editing?.id)
      } else if (section === 'layers') {
        const payload = { ...form, year: form.year === '' ? null : Number(form.year), display_order: Number(form.display_order || 0) }
        await cadastralViewerApi.saveLayer(payload, editing?.id)
      } else if (selectedFile) {
        const payload = new FormData()
        payload.append('file', selectedFile)
        payload.append('title', form.title)
        payload.append('is_active', String(Boolean(form.is_active)))
        payload.append('display_order', String(Number(form.display_order || 0)))
        await cadastralViewerApi.uploadAdvertisement(payload)
      } else if (editing) {
        await cadastralViewerApi.updateAdvertisement(editing.id, {
          title: form.title,
          is_active: Boolean(form.is_active),
          display_order: Number(form.display_order || 0),
        })
      } else if (!editing) {
        throw new Error('Selecciona un archivo de video.')
      }
      setNotice(`${SECTION_META[section].title} guardado.`)
      closeForm()
      await refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function toggleAdvertisement(item) {
    setBusy(true)
    setError('')
    try {
      await cadastralViewerApi.updateAdvertisement(item.id, { is_active: !item.is_active })
      await refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(item) {
    if (!window.confirm(`¿Eliminar ${SECTION_META[section].noun} «${item.name || item.title}»?`)) return
    setBusy(true)
    setError('')
    try {
      if (section === 'procedures') await cadastralViewerApi.deleteProcedure(item.id)
      else if (section === 'layers') await cadastralViewerApi.deleteLayer(item.id)
      else await cadastralViewerApi.deleteAdvertisement(item.id)
      setNotice(`${SECTION_META[section].title} eliminado.`)
      await refresh()
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const currentItems = items[section]
  const filteredItems = currentItems.filter((item) =>
    JSON.stringify(item).toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))
  )
  const ActiveIcon = SECTIONS.find((entry) => entry.id === section)?.icon

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">Visor catastral</p>
          <Link to="/kiosk" className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm font-semibold text-cyan-800 hover:border-cyan-300 hover:bg-cyan-100">
            <ExternalLink size={15} /> Ver StoreFront
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Gestión del visor</h1>
          <p className="mt-1 text-sm text-slate-600">Administra los trámites, videos publicitarios y servicios cartográficos del kiosco.</p>
        </div>
        <button type="button" onClick={beginCreate} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800">
          <Plus size={17} /> Nuevo {SECTION_META[section].noun}
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-slate-200" aria-label="Secciones de gestión">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { setSection(id); setQuery(''); setError(''); setNotice('') }}
            className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${section === id ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon size={16} /> {label}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{items[id].length}</span>
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${SECTION_META[section].noun}…`}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100" />
        </div>
        <span className="text-sm text-slate-500">{filteredItems.length} registros</span>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Cargando datos…</div>
        ) : filteredItems.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-6 text-center">
            <div><ActiveIcon size={28} className="mx-auto text-slate-300" /><h2 className="mt-3 font-semibold text-slate-800">No hay {SECTION_META[section].noun}s para mostrar</h2><p className="mt-1 text-sm text-slate-500">Crea el primer registro con el botón «Nuevo».</p></div>
          </div>
        ) : section === 'procedures' ? (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-cyan-50 text-xl">📋</span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.name}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'published' ? 'Publicado' : item.status === 'draft' ? 'Borrador' : 'Archivado'}</span></div><p className="mt-1 text-sm text-slate-500">{item.code} · {item.category} · {item.estimated_days || 'Plazo no indicado'}</p></div>
              <div className="flex gap-1"><ActionButton label="Editar trámite" onClick={() => beginEdit(item)}><Pencil size={16} /></ActionButton><ActionButton label="Eliminar trámite" onClick={() => deleteItem(item)}><Trash2 size={16} /></ActionButton></div>
            </article>)}
          </div>
        ) : section === 'layers' ? (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-cyan-50 text-cyan-800"><Layers3 size={19} /></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.name}</h2><span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800">{item.layer_type === 'imagery' ? 'Imagen' : 'Vectorial'}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.is_active ? 'Visible' : 'Oculta'}</span></div><p className="mt-1 truncate text-xs text-slate-500">{item.service_url} · {item.year || 'Sin año'} · {item.source || 'Sin fuente'}</p></div>
              <div className="flex gap-1"><ActionButton label="Editar capa" onClick={() => beginEdit(item)}><Pencil size={16} /></ActionButton><ActionButton label="Eliminar capa" onClick={() => deleteItem(item)}><Trash2 size={16} /></ActionButton></div>
            </article>)}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => <article key={item.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
              <AdvertisementPlayer advertisement={item} className="h-16 w-28 rounded bg-slate-900 object-cover" />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.title}</h2><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span></div><p className="mt-1 text-sm text-slate-500">{item.source_type === 'url' ? 'Enlace externo (legado)' : item.original_file_name} · {formatBytes(item.file_size)}</p></div>
              <button type="button" disabled={busy} onClick={() => toggleAdvertisement(item)} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${item.is_active ? 'border border-slate-300 text-slate-700' : 'bg-emerald-700 text-white'}`}>{item.is_active ? 'Desactivar' : 'Activar'}</button>
              <div className="flex gap-1"><ActionButton label="Editar video" onClick={() => beginEdit(item)}><Pencil size={16} /></ActionButton><ActionButton label="Eliminar video" onClick={() => deleteItem(item)}><Trash2 size={16} /></ActionButton></div>
            </article>)}
          </div>
        )}
      </section>

      {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-6">
        <form role="dialog" aria-modal="true" aria-labelledby="cadastral-form-title" onSubmit={save} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white shadow-2xl sm:rounded-lg">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-cyan-700">{editing ? 'Editar' : 'Nuevo'}</p><h2 id="cadastral-form-title" className="mt-1 text-lg font-bold text-slate-900">{SECTION_META[section].title}</h2></div>
            <button type="button" onClick={closeForm} aria-label="Cerrar" className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100">×</button>
          </header>
          <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
            {section === 'procedures' && <>
              <FormField label="Nombre" required><input required name="name" value={form.name} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Código"><input name="code" value={form.code} onChange={updateField} placeholder="Se genera desde el nombre" className={inputClass} /></FormField>
              <FormField label="Categoría"><input name="category" value={form.category} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Plazo estimado"><input name="estimated_days" value={form.estimated_days || ''} onChange={updateField} placeholder="5 días hábiles" className={inputClass} /></FormField>
              <FormField label="Ubicación"><input name="location" value={form.location || ''} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Estado"><select name="status" value={form.status} onChange={updateField} className={inputClass}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></FormField>
              <FormField label="Orden"><input name="display_order" type="number" value={form.display_order} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Descripción" wide><textarea name="description" value={form.description || ''} onChange={updateField} rows={3} className={inputClass} /></FormField>
              <FormField label="Requisitos (uno por línea)" wide><textarea name="requirements" value={form.requirements} onChange={updateField} rows={4} className={inputClass} /></FormField>
            </>}
            {section === 'layers' && <>
              <FormField label="Nombre" required><input required name="name" value={form.name} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Código"><input name="code" value={form.code} onChange={updateField} placeholder="Se genera desde el nombre" className={inputClass} /></FormField>
              <FormField label="Tipo"><select name="layer_type" value={form.layer_type} onChange={updateField} className={inputClass}><option value="imagery">Imagen satelital</option><option value="vector">Capa vectorial</option></select></FormField>
              <FormField label="Año"><input name="year" type="number" min="1900" max="2200" value={form.year} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Servicio"><select name="service_type" value={form.service_type} onChange={updateField} className={inputClass}><option value="wms">WMS</option></select></FormField>
              <FormField label="Nombre de capa WMS"><input name="service_layer" value={form.service_layer} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="URL del servicio" wide required><input required type="url" name="service_url" value={form.service_url} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Fuente"><input name="source" value={form.source || ''} onChange={updateField} className={inputClass} /></FormField>
              <FormField label="Orden"><input name="display_order" type="number" value={form.display_order} onChange={updateField} className={inputClass} /></FormField>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={updateField} /> Visible en StoreFront</label>
            </>}
            {section === 'advertisements' && <>
              <FormField label="Título" wide required><input required name="title" value={form.title} onChange={updateField} className={inputClass} /></FormField>
              {!editing && <FormField label="Archivo de video" wide required><input required type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg,.m4v" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className={inputClass} /><small className="mt-1 block text-xs text-slate-500">Tamaño máximo: 250 MB.</small></FormField>}
              {editing && <p className="sm:col-span-2 text-sm text-slate-500">{editing.source_type === 'upload' ? editing.original_file_name : 'Video externo legado'}. Para cambiar el archivo, elimina este registro y crea uno nuevo subiendo un archivo.</p>}
              <FormField label="Orden"><input name="display_order" type="number" value={form.display_order} onChange={updateField} className={inputClass} /></FormField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700"><input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={updateField} /> Mostrar en StoreFront</label>
            </>}
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button type="button" onClick={closeForm} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700">Cancelar</button>
            <button type="submit" disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{busy && <LoaderCircle size={15} className="animate-spin" />}Guardar</button>
          </footer>
        </form>
      </div>}
    </div>
  )
}

const inputClass = 'min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100'

function FormField({ label, required = false, wide = false, children }) {
  return <label className={`block text-sm font-medium text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="mb-1.5 block">{label}{required && <span className="text-red-600"> *</span>}</span>
    {children}
  </label>
}

function ActionButton({ label, onClick, children }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="grid size-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900">{children}</button>
}