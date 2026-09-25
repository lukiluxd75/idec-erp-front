import { FileSpreadsheet, Map as MapIcon, Receipt, ScrollText } from 'lucide-react'

/** The three sections of the screen, in display order. */
export const DOC_TYPES = [
  {
    id: 'folio',
    label: 'Folio',
    icon: ScrollText,
    hint: 'Folio Real de Derechos Reales. Puede tener varias páginas.',
    multiPage: true,
  },
  {
    id: 'tax_receipt',
    label: 'Impuesto',
    icon: Receipt,
    hint: 'Comprobante de pago del impuesto a la propiedad (FUR).',
    multiPage: false,
  },
  {
    id: 'plan',
    label: 'Plano',
    icon: MapIcon,
    hint: 'Planos arquitectónicos. Por ahora se extrae el texto, los datos y las tablas.',
    multiPage: true,
  },
]

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
