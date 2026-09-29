import { FieldInput } from '@/domains/folder-analysis/components/forms/FieldInput'
import { TAX_RECEIPT_GROUPS, TAXPAYER_FIELDS } from '@/domains/folder-analysis/utils/documentMeta'

function Group({ title, children }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-600">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

/**
 * Review form for a FUR property tax payment receipt. `lowConfidence` holds the
 * fields the reading was not sure about, already in this form's own keys (the
 * taxpayer's ones dotted), so they are marked for the architect to compare
 * against the photo.
 */
export function TaxReceiptForm({ value, onChange, lowConfidence: flagged }) {
  const lowConfidence = new Set(flagged || [])
  const set = (key, v) => onChange({ ...value, [key]: v })
  const [receipt, ...rest] = TAX_RECEIPT_GROUPS
  const fieldsOf = (group) =>
    group.fields.map(([key, label]) => (
      <FieldInput key={key} label={label} value={value[key]} multiline={key === 'location'}
        warn={lowConfidence.has(key)} onChange={(v) => set(key, v)} />
    ))

  return (
    <div className="flex flex-col gap-5">
      <Group title={receipt.title}>{fieldsOf(receipt)}</Group>
      <Group title="Contribuyente">
        {TAXPAYER_FIELDS.map(([key, label]) => (
          <FieldInput key={key} label={label} value={value.taxpayer[key]}
            warn={lowConfidence.has(`taxpayer.${key}`)}
            onChange={(v) => set('taxpayer', { ...value.taxpayer, [key]: v })} />
        ))}
      </Group>
      {rest.map((group) => (
        <Group key={group.title} title={group.title}>{fieldsOf(group)}</Group>
      ))}
    </div>
  )
}
