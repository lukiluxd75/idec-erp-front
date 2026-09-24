import { Plus, Trash2, UserPlus } from 'lucide-react'

import { FieldInput } from '@/domains/folder-analysis/components/forms/FieldInput'
import {
  BOUNDARY_FIELDS,
  ENTRY_FIELDS,
  FOLIO_FIELDS,
  OWNER_FIELDS,
} from '@/domains/folder-analysis/utils/documentMeta'
import { emptyEntry, emptyOwner } from '@/domains/folder-analysis/utils/formDefaults'
import { Button } from '@/shared/ui'

const MULTILINE = new Set(['location', 'authority', 'document', 'filing'])

/**
 * Review form for a Folio Real: the property description block and column
 * "A) Titularidad sobre el dominio", one card per asiento.
 */
export function FolioForm({ value, onChange }) {
  const entries = value.ownership_entries
  const set = (key, v) => onChange({ ...value, [key]: v })
  const setEntries = (next) => set('ownership_entries', next)
  const setEntry = (i, patch) => setEntries(entries.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const setOwner = (i, k, patch) =>
    setEntry(i, { owners: entries[i].owners.map((o, j) => (j === k ? { ...o, ...patch } : o)) })

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-600">
          Dirección Administrativa Financiera
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {FOLIO_FIELDS.map(([key, label]) => (
            <FieldInput key={key} label={label} value={value[key]} multiline={MULTILINE.has(key)}
              onChange={(v) => set(key, v)} />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BOUNDARY_FIELDS.map(([key, label]) => (
            <FieldInput key={key} label={`Lindero ${label}`} value={value.boundaries[key]}
              onChange={(v) => set('boundaries', { ...value.boundaries, [key]: v })} />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-accent-600">
          A) Titularidad sobre el dominio
        </legend>
        {entries.length === 0 && <p className="text-sm text-slate-500">No se detectaron asientos.</p>}
        {entries.map((entry, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-end gap-2">
              <FieldInput label="Asiento Nº" value={entry.entry_number} className="w-28"
                onChange={(v) => setEntry(i, { entry_number: v })} />
              <button type="button" title="Quitar asiento" onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                className="mb-1 ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-state-danger/10 hover:text-state-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {entry.owners.map((owner, k) => (
              <div key={k} className="grid gap-2 rounded-lg bg-white p-2 ring-1 ring-slate-200 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
                {OWNER_FIELDS.map(([key, label]) => (
                  <FieldInput key={key} label={label} value={owner[key]} onChange={(v) => setOwner(i, k, { [key]: v })} />
                ))}
                <button type="button" title="Quitar titular" disabled={entry.owners.length === 1}
                  onClick={() => setEntry(i, { owners: entry.owners.filter((_, j) => j !== k) })}
                  className="self-end rounded-lg p-1.5 text-slate-400 hover:text-state-danger disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={UserPlus} className="self-start"
              onClick={() => setEntry(i, { owners: [...entry.owners, emptyOwner()] })}>
              Agregar titular
            </Button>

            <div className="grid gap-3 sm:grid-cols-2">
              {ENTRY_FIELDS.map(([key, label]) => (
                <FieldInput key={key} label={label} value={entry[key]} multiline={MULTILINE.has(key)}
                  onChange={(v) => setEntry(i, { [key]: v })} />
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="secondary" icon={Plus} className="self-start"
          onClick={() => setEntries([...entries, emptyEntry()])}>
          Agregar asiento
        </Button>
      </fieldset>
    </div>
  )
}
