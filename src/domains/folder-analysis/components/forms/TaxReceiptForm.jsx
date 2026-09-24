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

/** Review form for a FUR property tax payment receipt. */
export function TaxReceiptForm({ value, onChange }) {
  const set = (key, v) => onChange({ ...value, [key]: v })
  const [receipt, ...rest] = TAX_RECEIPT_GROUPS
  const fieldsOf = (group) =>
    group.fields.map(([key, label]) => (
      <FieldInput key={key} label={label} value={value[key]} multiline={key === 'location'}
        onChange={(v) => set(key, v)} />
    ))

  return (
    <div className="flex flex-col gap-5">
      <Group title={receipt.title}>{fieldsOf(receipt)}</Group>
      <Group title="Contribuyente">
        {TAXPAYER_FIELDS.map(([key, label]) => (
          <FieldInput key={key} label={label} value={value.taxpayer[key]}
            onChange={(v) => set('taxpayer', { ...value.taxpayer, [key]: v })} />
        ))}
      </Group>
      {rest.map((group) => (
        <Group key={group.title} title={group.title}>{fieldsOf(group)}</Group>
      ))}
    </div>
  )
}
