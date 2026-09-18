import { MessageSquarePlus, Trash2 } from 'lucide-react'

import { Button, IconButton, Input } from '@/shared/ui'

/**
 * Point-by-point observations the reviewer writes below the read-only appraisal data —
 * no appraisal field is editable, only this list of remarks.
 */
export function ObservationsEditor({ observations, onChange }) {
  const setLine = (idx, value) => onChange(observations.map((o, i) => (i === idx ? value : o)))
  const removeLine = (idx) => onChange(observations.filter((_, i) => i !== idx))
  const addLine = () => onChange([...observations, ''])

  return (
    <div className="space-y-3">
      {observations.length === 0 && (
        <p className="text-sm text-slate-500">
          Sin observaciones — si todo está correcto, puede migrar directamente.
        </p>
      )}
      {observations.map((text, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="mt-3 w-5 shrink-0 text-right text-xs font-medium text-slate-400">{idx + 1}.</span>
          <Input
            containerClassName="flex-1"
            placeholder="Describa la observación"
            value={text}
            onChange={(e) => setLine(idx, e.target.value)}
          />
          <IconButton icon={Trash2} tone="danger" className="mt-2.5" onClick={() => removeLine(idx)} />
        </div>
      ))}
      <Button variant="secondary" icon={MessageSquarePlus} onClick={addLine}>
        Agregar observación
      </Button>
    </div>
  )
}

export default ObservationsEditor
