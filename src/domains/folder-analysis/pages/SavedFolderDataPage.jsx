import { FileSearch, FolderSearch, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DOC_TYPES, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import { Alert, Button, Card, EmptyState, SectionHeader, Spinner } from '@/shared/ui'

const LABELS = {
  registration_number: 'Matrícula', registration_status: 'Estado de matrícula', administrative_location: 'Ubicación administrativa',
  cadastre: 'Catastro', property_type: 'Tipo de inmueble', location: 'Ubicación', designation: 'Designación', surface: 'Superficie',
  measures: 'Medidas', property: 'Propiedad', prior_title: 'Antecedente dominial', date: 'Fecha', boundaries: 'Linderos',
  north: 'Norte', south: 'Sur', east: 'Este', west: 'Oeste', ownership_entries: 'Asientos de titularidad', entry_number: 'Nº de asiento',
  owners: 'Titulares', name: 'Nombre', id_number: 'C.I.', id_issued_at: 'Expedido en', marital_status: 'Estado civil', role: 'Rol',
  share: 'Proporción', act: 'Acto', document: 'Documento', authority: 'Notario / autoridad', filing: 'Presentación',
  receipt_type: 'Tipo de comprobante', receipt_number: 'Nº de comprobante', municipality: 'Gobierno municipal', paid_at: 'Fecha de pago',
  collecting_entity: 'Entidad recaudadora', correspondent: 'Corresponsal', branch: 'Sucursal', agency: 'Agencia', cashier: 'Cajero',
  folio: 'Folio', concept: 'Concepto', tax_year: 'Gestión', taxpayer: 'Contribuyente', property_number: 'Nº de inmueble',
  cadastral_code: 'Código catastral', property_class: 'Clase', ownership_type: 'Tipo de propiedad', land_area: 'Superficie del terreno',
  built_area: 'Superficie construida', age_factor: 'Factor de antigüedad', ufv: 'UFV', taxable_base: 'Base imponible',
  assessed_tax: 'Impuesto determinado', exemption: 'Exención', discount_10: 'Descuento 10%', discount_app_5: 'Descuento APP 5%',
  amount_due: 'Importe a pagar', amount_paid: 'Monto pagado', balance: 'Saldo de gestión', text: 'Texto', tables: 'Tablas', pages: 'Páginas',
}

function labelFor(key) {
  return LABELS[key] || key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function findRegistrationNumber(value) {
  if (!value || typeof value !== 'object') return ''
  if (!Array.isArray(value) && value.registration_number) return String(value.registration_number)
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findRegistrationNumber(item)
        if (found) return found
      }
    } else if (child && typeof child === 'object') {
      const found = findRegistrationNumber(child)
      if (found) return found
    }
  }
  return ''
}

function normalizeSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/[^a-z0-9]/g, '')
}

function ReadableValue({ value, depth = 0 }) {
  if (value == null || value === '') return <span className="text-slate-400">Sin dato</span>
  if (typeof value === 'boolean') return <span>{value ? 'Sí' : 'No'}</span>
  if (typeof value !== 'object') return <span className="break-words text-slate-800">{String(value)}</span>
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-slate-400">Sin registros</span>
    return <div className="mt-2 grid gap-2">{value.map((item, index) => (
      <details key={index} open={depth === 0} className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">{item?.entry_number ? `Asiento ${item.entry_number}` : `Registro ${index + 1}`}</summary>
        <div className="grid gap-x-5 gap-y-3 border-t border-slate-100 p-3 sm:grid-cols-2"><ReadableValue value={item} depth={depth + 1} /></div>
      </details>
    ))}</div>
  }
  const entries = Object.entries(value)
  if (!entries.length) return <span className="text-slate-400">Sin datos</span>
  if (depth > 0) return <div className="contents">{entries.map(([key, child]) => <Field key={key} label={labelFor(key)} value={child} depth={depth + 1} />)}</div>
  return <div className="contents">{entries.map(([key, child]) => <Field key={key} label={labelFor(key)} value={child} depth={depth + 1} />)}</div>
}

function Field({ label, value, depth }) {
  const nested = value !== null && typeof value === 'object'
  return <div className={nested ? 'sm:col-span-2' : ''}>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm leading-relaxed"><ReadableValue value={value} depth={depth} /></dd>
  </div>
}

export default function SavedFolderDataPage() {
  const [docType, setDocType] = useState('')
  const [query, setQuery] = useState('')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    folderAnalysisApi.reviewedDocuments(docType || undefined)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [docType])

  useEffect(() => { load() }, [load])

  const filteredDocuments = useMemo(() => {
    const term = normalizeSearch(query)
    if (!term) return documents
    return documents.filter((document) => {
      const data = document.reviewed_data || document.data || {}
      return normalizeSearch(`${findRegistrationNumber(data)} ${document.id} ${JSON.stringify(data)}`).includes(term)
    })
  }, [documents, query])

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader icon={FolderSearch} eyebrow="Analizador y extractor de datos de carpetas" title="Datos guardados"
        subtitle="Consulta rápidamente las revisiones confirmadas y sus datos principales."
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={load}>Actualizar</Button>} />

      <Card className="grid gap-3 sm:grid-cols-[minmax(180px,0.7fr)_minmax(240px,1.3fr)] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="saved-doc-type">Tipo de documento
          <select id="saved-doc-type" value={docType} onChange={(event) => setDocType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-accent-500/60">
            <option value="">Todos los tipos</option>{DOC_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-700" htmlFor="saved-search">Buscar por matrícula
          <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-accent-500/60">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input id="saved-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribe el número de matrícula…"
              className="min-w-0 flex-1 py-2.5 font-normal outline-none" />
          </span>
        </label>
        <p className="text-xs text-slate-500 sm:col-span-2">{filteredDocuments.length} {filteredDocuments.length === 1 ? 'revisión' : 'revisiones'}</p>
      </Card>

      {error && <Alert type="error">{error}</Alert>}
      {loading ? <Card className="flex justify-center py-16"><Spinner className="h-6 w-6" /></Card> : filteredDocuments.length === 0 ? (
        <Card><EmptyState icon={FileSearch} title={documents.length ? 'No se encontraron coincidencias' : 'No hay revisiones guardadas'}
          subtitle={documents.length ? 'Prueba con otro texto o cambia el tipo de documento.' : 'Al guardar una revisión, aparecerá aquí.'} /></Card>
      ) : <div className="grid gap-4">{filteredDocuments.map((document) => {
        const type = DOC_TYPES.find((item) => item.id === document.doc_type)
        const data = document.reviewed_data || document.data || {}
        const registrationNumber = findRegistrationNumber(data)
        const planName = document.doc_type === 'plan' ? (data.plan_name || data.name || data.title) : ''
        const receiptNumber = document.doc_type === 'tax_receipt' ? data.receipt_number : ''
        const displayName = planName || (registrationNumber ? `Matrícula ${registrationNumber}` : receiptNumber ? `Comprobante ${receiptNumber}` : (type?.label || document.doc_type))
        return <Card key={document.id} className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-lg bg-accent-600/10 p-2 text-accent-700"><FileSearch className="h-5 w-5" /></span>
              <div className="min-w-0"><p className="font-bold text-slate-800">{displayName}</p>
                {(registrationNumber || planName || receiptNumber) && <p className="mt-0.5 text-xs text-slate-500">{type?.label || document.doc_type}{registrationNumber ? ` · Matrícula ${registrationNumber}` : ''}</p>}
                <p className="mt-0.5 text-xs text-slate-500">Guardado {formatDateTime(document.reviewed_at)} · {document.id.slice(0, 8).toUpperCase()}</p></div>
            </div>
            <Link to={`/folder-analysis/documents/${document.id}`}><Button size="sm" variant="secondary">Abrir revisión</Button></Link>
          </div>
          <details className="group">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-accent-700 hover:bg-slate-50 sm:px-5">
              <span className="group-open:hidden">Ver todos los datos guardados</span>
              <span className="hidden group-open:inline">Ocultar datos</span>
            </summary>
            <dl className="grid gap-x-6 gap-y-4 border-t border-slate-100 bg-white p-4 sm:grid-cols-2 sm:p-5">
              <ReadableValue value={data} />
            </dl>
          </details>
        </Card>
      })}</div>}
    </div>
  )
}
