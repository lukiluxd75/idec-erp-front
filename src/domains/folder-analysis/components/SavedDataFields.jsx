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

/**
 * Renders the saved JSON of a review as readable Spanish fields, at any depth the
 * extractor produced. Used by "Datos guardados" and by each document inside a
 * carpeta registrada, so both read the same.
 *
 * Expects to be placed inside a <dl> grid (it renders <dt>/<dd> pairs).
 */
export function ReadableValue({ value, depth = 0 }) {
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
  return <div className="contents">{entries.map(([key, child]) => <Field key={key} label={labelFor(key)} value={child} depth={depth + 1} />)}</div>
}

function Field({ label, value, depth }) {
  const nested = value !== null && typeof value === 'object'
  return <div className={nested ? 'sm:col-span-2' : ''}>
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm leading-relaxed"><ReadableValue value={value} depth={depth} /></dd>
  </div>
}

export default ReadableValue
