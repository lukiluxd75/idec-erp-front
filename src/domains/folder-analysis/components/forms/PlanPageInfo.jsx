import { DoorOpen, Hash, Layers, MapPin, Ruler, Scaling } from 'lucide-react'
import { useState } from 'react'

import { PageText } from '@/domains/folder-analysis/components/forms/PageText'
import {
  categorizePlanChunk,
  chunkPlanNote,
  extractLoteId,
  formatArea,
  planFieldLabel,
} from '@/domains/folder-analysis/utils/planFieldChunks'

// One look per kind of note, so the eye sorts them before even reading the text.
const CATEGORY_META = {
  area: { icon: Ruler, classes: 'bg-emerald-600/10 text-emerald-800' },
  scale: { icon: Scaling, classes: 'bg-accent-600/10 text-accent-800' },
  planta: { icon: Layers, classes: 'bg-brand-900/10 text-brand-900' },
  lote: { icon: MapPin, classes: 'bg-brand-900/10 text-brand-900' },
  room: { icon: DoorOpen, classes: 'bg-slate-100 text-slate-700' },
  other: { icon: Hash, classes: 'bg-slate-100 text-slate-700' },
}

// What each icon means, spelled out once so a first-time viewer does not have to guess it from color alone.
const CATEGORY_LABELS = {
  area: 'Superficie',
  scale: 'Escala',
  planta: 'Planta',
  lote: 'Lote',
  room: 'Ambiente',
  other: 'Otro dato',
}

export function PlanPageInfo({ value, onChange, pageIndex }) {
  const [editingField, setEditingField] = useState(null)
  const pages = Array.isArray(value?.pages) ? value.pages : []
  const page = pages[pageIndex]

  if (!page) {
    return <p className="text-sm text-slate-500">Esta página todavía no tiene datos leídos.</p>
  }

  const areas = (page.fields || [])
    .flatMap((field) => chunkPlanNote(field.value))
    .filter((chunk) => categorizePlanChunk(chunk) === 'area')

  const loteId = extractLoteId(page.full_text || (page.fields || []).map((f) => f.value).join(' '))

  const updateField = (fieldIndex, nextValue) => {
    const nextFields = page.fields.map((field, i) =>
      i === fieldIndex ? { ...field, value: nextValue } : field
    )
    const nextPages = pages.map((p, i) => (i === pageIndex ? { ...p, fields: nextFields } : p))
    onChange({ ...value, pages: nextPages })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Página {pageIndex + 1} de {pages.length}
        </p>
        <h3 className="text-base font-semibold text-slate-800">
          {page.document_type || 'Sin título detectado en esta página'}
        </h3>
        {loteId && <p className="text-sm text-slate-500">Lote N°{loteId}</p>}
      </div>

      <p className="text-xs text-slate-500">
        Esto es lo que el sistema leyó automáticamente de la foto. Compárelo con la imagen y
        corrija lo que haga falta antes de guardar.
      </p>

      {areas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {areas.map((area, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <Ruler className="h-4 w-4 shrink-0 text-emerald-700" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Superficie
                </p>
                <p className="text-sm font-bold leading-tight text-emerald-900">{formatArea(area)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {page.fields?.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const Icon = CATEGORY_META[key].icon
              return (
                <span key={key} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Icon className="h-3 w-3 shrink-0" />
                  {label}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">Toque un campo para corregirlo.</p>
          {page.fields.map((field, i) => {
            const chunks = chunkPlanNote(field.value)
            const isEditing = editingField === i
            return (
              <div key={i} className="flex flex-col gap-1.5 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {planFieldLabel(field.name)}
                </span>

                {isEditing ? (
                  <textarea
                    autoFocus
                    value={field.value}
                    onChange={(e) => updateField(i, e.target.value)}
                    onBlur={() => setEditingField(null)}
                    rows={Math.min(6, Math.max(2, Math.ceil((field.value?.length || 0) / 70)))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-300/40"
                  />
                ) : chunks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setEditingField(i)}
                    className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-left"
                  >
                    {chunks.map((chunk, ci) => {
                      const meta = CATEGORY_META[categorizePlanChunk(chunk)]
                      const Icon = meta.icon
                      return (
                        <span
                          key={ci}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${meta.classes}`}
                        >
                          <Icon className="h-3 w-3 shrink-0" />
                          {chunk}
                        </span>
                      )
                    })}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingField(i)}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-left text-slate-800"
                  >
                    {field.value || '—'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No se detectaron datos etiquetados en esta página.</p>
      )}

      {page.tables?.length > 0 &&
        page.tables.map((table, ti) => (
          <div key={ti} className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {table.map((row, ri) => (
                  <tr key={ri} className={ri === 0 ? 'bg-slate-50 font-semibold' : 'odd:bg-white even:bg-slate-50/60'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-slate-200 px-2.5 py-1.5 text-slate-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      <PageText text={page.full_text} />
    </div>
  )
}
