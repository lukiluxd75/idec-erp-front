import {
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  IdCard,
  Map as MapIcon,
  Receipt,
  ScrollText,
  Signature,
} from 'lucide-react'

/**
 * Every kind of document the module can classify, in display order.
 *
 * Which of them a carpeta actually shows is the catalogue's business (the back's
 * domain/folder_types.py, read through utils/catalog.js): a carpeta de
 * poseedores has no folio lane. What lives here is only how each one looks --
 * its icon, its colour and the words the screen puts around it.
 */
export const DOC_TYPES = [
  {
    id: 'folio',
    label: 'Folio',
    noun: 'el folio',
    icon: ScrollText,
    hint: 'Folio Real de Derechos Reales. Puede tener varias páginas.',
    multiPage: true,
  },
  {
    id: 'tax_receipt',
    label: 'Impuesto',
    noun: 'el comprobante',
    icon: Receipt,
    hint: 'Comprobante de pago del impuesto a la propiedad (FUR).',
    multiPage: false,
  },
  {
    id: 'plan',
    label: 'Plano',
    noun: 'el plano',
    icon: MapIcon,
    hint: 'Planos arquitectónicos. Se extrae el texto, los datos y los cuadros con OCR + OpenCV.',
    multiPage: true,
  },
  {
    id: 'appraisal',
    label: 'Avalúo',
    noun: 'el avalúo',
    icon: Calculator,
    hint: 'Avalúo del inmueble. Puede tener varias páginas.',
    multiPage: true,
  },
  {
    id: 'form',
    label: 'Formulario',
    noun: 'el formulario',
    icon: ClipboardList,
    hint: 'Formulario del trámite. Puede tener varias páginas.',
    multiPage: true,
  },
  {
    id: 'sworn_statement',
    label: 'Declaración jurada',
    noun: 'la declaración jurada',
    icon: Signature,
    hint: 'Declaración jurada ante notario. Puede tener varias páginas.',
    multiPage: true,
  },
  {
    id: 'id_card',
    label: 'Carnets',
    noun: 'el carnet',
    icon: IdCard,
    hint: 'Carnets de identidad. Un documento por persona, anverso y reverso.',
    multiPage: true,
  },
]

/**
 * Every lane is read on the server with the GAMC PaddleOCR service and OpenCV
 * (seconds), and the screen follows them photo by photo. Nothing goes to the
 * architects' PCs any more: the plano used to be read there by the vision model
 * and took minutes per hoja.
 */
export const SERVER_READ = new Set(DOC_TYPES.map((type) => type.id))

export const DOC_TYPE_BY_ID = Object.fromEntries(DOC_TYPES.map((t) => [t.id, t]))

/** Visual theme per lane (workbench — not module catalog tiles). */
export const LANE_THEME = {
  folio: {
    accentBar: 'bg-brand-900',
    iconWrap: 'bg-brand-900/10 text-brand-900 ring-brand-900/20',
    lane: 'workbench-lane--folio',
    workAccent: 'border-l-brand-800',
    assignBtn:
      'ring-brand-900/15 text-brand-900 hover:bg-brand-900/10 hover:ring-brand-900/30 focus-visible:ring-brand-900/40',
  },
  tax_receipt: {
    accentBar: 'bg-emerald-600',
    iconWrap: 'bg-emerald-600/10 text-emerald-800 ring-emerald-600/20',
    lane: 'workbench-lane--tax',
    workAccent: 'border-l-emerald-600',
    assignBtn:
      'ring-emerald-600/15 text-emerald-800 hover:bg-emerald-600/10 hover:ring-emerald-600/30 focus-visible:ring-emerald-600/40',
  },
  plan: {
    accentBar: 'bg-accent-600',
    iconWrap: 'bg-accent-600/10 text-accent-800 ring-accent-600/25',
    lane: 'workbench-lane--plan',
    workAccent: 'border-l-accent-600',
    assignBtn:
      'ring-accent-600/15 text-accent-800 hover:bg-accent-600/10 hover:ring-accent-600/30 focus-visible:ring-accent-600/40',
  },
  appraisal: {
    accentBar: 'bg-amber-600',
    iconWrap: 'bg-amber-600/10 text-amber-800 ring-amber-600/20',
    lane: 'workbench-lane--appraisal',
    workAccent: 'border-l-amber-600',
    assignBtn:
      'ring-amber-600/15 text-amber-800 hover:bg-amber-600/10 hover:ring-amber-600/30 focus-visible:ring-amber-600/40',
  },
  form: {
    accentBar: 'bg-indigo-600',
    iconWrap: 'bg-indigo-600/10 text-indigo-800 ring-indigo-600/20',
    lane: 'workbench-lane--form',
    workAccent: 'border-l-indigo-600',
    assignBtn:
      'ring-indigo-600/15 text-indigo-800 hover:bg-indigo-600/10 hover:ring-indigo-600/30 focus-visible:ring-indigo-600/40',
  },
  sworn_statement: {
    accentBar: 'bg-rose-600',
    iconWrap: 'bg-rose-600/10 text-rose-800 ring-rose-600/20',
    lane: 'workbench-lane--sworn',
    workAccent: 'border-l-rose-600',
    assignBtn:
      'ring-rose-600/15 text-rose-800 hover:bg-rose-600/10 hover:ring-rose-600/30 focus-visible:ring-rose-600/40',
  },
  id_card: {
    accentBar: 'bg-teal-600',
    iconWrap: 'bg-teal-600/10 text-teal-800 ring-teal-600/20',
    lane: 'workbench-lane--id',
    workAccent: 'border-l-teal-600',
    assignBtn:
      'ring-teal-600/15 text-teal-800 hover:bg-teal-600/10 hover:ring-teal-600/30 focus-visible:ring-teal-600/40',
  },
}

export const LANE_ACCENT_CLASS = Object.fromEntries(
  Object.entries(LANE_THEME).map(([id, t]) => [id, t.workAccent])
)

export const FALLBACK_ICON = FileSpreadsheet

export const STATUS_META = {
  draft: { label: 'Borrador', variant: 'neutral' },
  queued: { label: 'En cola', variant: 'accent' },
  processing: { label: 'Analizando', variant: 'accent' },
  extracted: { label: 'Por revisar', variant: 'warning' },
  failed: { label: 'Falló', variant: 'danger' },
  reviewed: { label: 'Revisado', variant: 'success' },
}

export const IN_PROGRESS = new Set(['queued', 'processing'])

/** Spanish labels for the extracted keys (the backend keys are English). */
export const FOLIO_FIELDS = [
  ['registration_number', 'Matrícula Nº'],
  ['registration_status', 'Estado de la matrícula'],
  ['administrative_location', 'Ubicación administrativa'],
  ['cadastre', 'Catastro'],
  ['property_type', 'Tipo de inmueble'],
  ['location', 'Ubicación'],
  ['designation', 'Designación S/Tít.'],
  ['surface', 'Superficie'],
  ['measures', 'Medidas'],
  ['property', 'Propiedad'],
  ['prior_title', 'Antecedente dominial'],
  ['date', 'Fecha'],
]

export const BOUNDARY_FIELDS = [
  ['north', 'Norte'],
  ['south', 'Sur'],
  ['east', 'Este'],
  ['west', 'Oeste'],
]

export const ENTRY_FIELDS = [
  ['share', 'Proporción'],
  ['act', 'Acto'],
  ['document', 'Documento'],
  ['authority', 'Notario / autoridad'],
  ['filing', 'Presentación'],
]

export const OWNER_FIELDS = [
  ['name', 'Nombre'],
  ['id_number', 'C.I.'],
  ['id_issued_at', 'Expedido'],
  ['marital_status', 'Estado civil'],
  ['role', 'Rol'],
]

export const TAX_RECEIPT_GROUPS = [
  {
    title: 'Comprobante',
    fields: [
      ['receipt_type', 'Tipo de comprobante'],
      ['receipt_number', 'Nº de comprobante'],
      ['municipality', 'Gobierno municipal'],
      ['paid_at', 'Fecha y hora de pago'],
      ['collecting_entity', 'Entidad recaudadora'],
      ['correspondent', 'Corresponsal'],
      ['branch', 'Sucursal'],
      ['agency', 'Agencia'],
      ['cashier', 'Cajero'],
      ['folio', 'Folio'],
      ['concept', 'Concepto'],
      ['tax_year', 'Gestión'],
    ],
  },
  {
    title: 'Inmueble',
    fields: [
      ['property_number', 'Nº de inmueble'],
      ['cadastral_code', 'Código catastral'],
      ['property_class', 'Clase'],
      ['ownership_type', 'Tipo de propiedad'],
      ['location', 'Ubicación'],
      ['land_area', 'Superficie del terreno'],
      ['built_area', 'Superficie construida'],
      ['age_factor', 'Factor de antigüedad'],
    ],
  },
  {
    title: 'Liquidación (Bs)',
    fields: [
      ['ufv', 'UFV'],
      ['taxable_base', 'Base imponible'],
      ['assessed_tax', 'Impuesto determinado'],
      ['exemption', 'Exención'],
      ['discount_10', 'Descuento 10%'],
      ['discount_app_5', 'Descuento APP 5%'],
      ['amount_due', 'Importe a pagar'],
      ['amount_paid', 'Monto pagado'],
      ['balance', 'Saldo gestión'],
    ],
  },
]

export const TAXPAYER_FIELDS = [
  ['type', 'Tipo de contribuyente'],
  ['id_number', 'C.I.'],
  ['name', 'Nombre'],
]

export function formatDateTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
