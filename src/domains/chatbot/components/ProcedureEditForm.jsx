import { useState } from 'react'
import { Button, Input } from '@/shared/ui'

export function ProcedureEditForm({ procedure, onSave, onCancel, saving }) {
  const [name, setName] = useState(procedure.name || '')
  const [description, setDescription] = useState(procedure.description || '')
  const [amount, setAmount] = useState(procedure.amount ?? '')
  const [currency, setCurrency] = useState(procedure.currency || 'Bs.')
  const [isActive, setIsActive] = useState(procedure.is_active)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      amount: amount === '' ? null : Number(amount),
      currency: currency.trim() || null,
      is_active: isActive,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Nombre del trámite" value={name} onChange={(e) => setName(e.target.value)} required />

      <div className="flex flex-col">
        <label htmlFor="procedure-description" className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</label>
        <textarea
          id="procedure-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/40"
        />
      </div>

      {procedure.cost_note && (
        <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <span className="font-semibold">Costo cargado del catálogo original: </span>
          {procedure.cost_note}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Monto (opcional)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input label="Moneda" value={currency} onChange={(e) => setCurrency(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-accent-400"
        />
        Trámite activo (visible para el asistente)
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  )
}

export default ProcedureEditForm
