import { Check, Download, FileText, Lock, MapPinned } from 'lucide-react'

import { FieldInput } from '@/domains/folder-analysis/components/forms/FieldInput'
import { DOC_TYPE_BY_ID } from '@/domains/folder-analysis/utils/documentMeta'
import { alreadyMatches } from '@/domains/folder-analysis/utils/folderSheetFill'
import { cn } from '@/shared/utils'

/**
 * La hoja propia de una carpeta, dibujada desde el catálogo.
 *
 * Ni los grupos ni los campos están escritos acá: llegan del back
 * (domain/folder_types.py) con el tipo de carpeta, así que un tipo nuevo se ve
 * en pantalla sin tocar este archivo.
 *
 * Cada campo dice de dónde sale, que es lo que el arquitecto necesita saber
 * antes de llenarlo: del IDE se copia (el ERP todavía no se conecta con él), de
 * un documento de la carpeta sale al analizarlo, y el fijo no se escribe porque
 * la regla de oficina ya lo decidió.
 */

const SOURCE_BADGE = {
  ide: { label: 'Del IDE', icon: MapPinned, className: 'bg-accent-600/10 text-accent-800' },
  document: { label: 'Del documento', icon: FileText, className: 'bg-brand-800/10 text-brand-800' },
  fixed: { label: 'Fijo', icon: Lock, className: 'bg-slate-200/70 text-slate-600' },
}

function badgeOf(field) {
  const badge = SOURCE_BADGE[field.source]
  if (!badge) return null
  if (field.source !== 'document') return badge
  const type = DOC_TYPE_BY_ID[field.from_document]
  return { ...badge, label: type ? `De ${type.noun}` : badge.label }
}

/**
 * Lo que un documento revisado de la carpeta trae para este campo: se ofrece,
 * no se aplica solo. Si la hoja ya dice lo mismo, lo dice y calla; si dice otra
 * cosa, la muestra -- puede ser una corrección a mano que no hay que pisar.
 */
function DocumentValue({ suggestion, sheetValue, onApply }) {
  // El catálogo nombra cada documento con su artículo ("el plano", "la
  // declaración jurada"), que es lo que deja armar la frase sin casos raros.
  const noun = DOC_TYPE_BY_ID[suggestion.document.doc_type]?.noun || 'el documento'
  const de = noun.startsWith('el ') ? `del ${noun.slice(3)}` : `de ${noun}`
  const subject = noun.charAt(0).toUpperCase() + noun.slice(1)

  if (alreadyMatches(sheetValue, suggestion)) {
    return (
      <p className="flex items-center gap-1 text-[11px] text-slate-400">
        <Check className="h-3 w-3 shrink-0" aria-hidden />
        Coincide con lo leído {de}.
      </p>
    )
  }

  const empty = String(sheetValue ?? '').trim() === ''
  return (
    <button
      type="button"
      onClick={() => onApply(suggestion.value)}
      title={`Copiar "${suggestion.value}" a este campo`}
      className="flex items-start gap-1 rounded text-left text-[11px] font-semibold text-accent-700 underline-offset-2 hover:underline"
    >
      <Download className="mt-px h-3 w-3 shrink-0" aria-hidden />
      <span>
        {empty ? `Traer ${de}` : `${subject} dice`}: «{suggestion.value}»
      </span>
    </button>
  )
}

function SheetField({ field, value, onChange, readOnly, suggestion, onApply }) {
  const badge = badgeOf(field)
  const fixed = field.source === 'fixed'
  const Icon = badge?.icon

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {field.label}
        </span>
        {badge && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-px text-[9px] font-bold uppercase',
              badge.className
            )}
          >
            {Icon && <Icon className="h-2.5 w-2.5" aria-hidden />}
            {badge.label}
          </span>
        )}
      </div>

      {fixed ? (
        // No es editable: lo que vale acá lo decide el tipo de carpeta, no quien
        // la carga. Se muestra igual para que la hoja se lea entera.
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">
          {field.value || '—'}
        </p>
      ) : (
        <FieldInput
          label=""
          value={value ?? null}
          onChange={(next) => onChange(field.key, next)}
          multiline={field.key === 'boundaries'}
          className={cn(readOnly && 'pointer-events-none opacity-70')}
        />
      )}

      {!fixed && suggestion && !readOnly && (
        <DocumentValue
          suggestion={suggestion}
          sheetValue={value}
          onApply={(next) => onApply(field.key, next)}
        />
      )}

      {field.hint && <p className="text-[11px] leading-snug text-slate-500">{field.hint}</p>}
    </div>
  )
}

/**
 * @param {Record<string, {value: string, document: object}>} suggestions lo que
 *   los documentos revisados de la carpeta traen para cada campo (folderSheetFill)
 */
export function FolderSheet({
  folderType,
  value,
  onChange,
  readOnly = false,
  suggestions = {},
  onApply,
}) {
  const groups = folderType?.field_groups || []
  if (groups.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <fieldset key={group.key} className="min-w-0">
          <legend className="mb-2 text-sm font-bold text-slate-800">{group.title}</legend>
          <div className="grid gap-x-5 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {group.fields.map((field) => (
              <SheetField
                key={field.key}
                field={field}
                value={value?.[field.key]}
                onChange={onChange}
                readOnly={readOnly}
                suggestion={onApply ? suggestions[field.key] : undefined}
                onApply={onApply}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
