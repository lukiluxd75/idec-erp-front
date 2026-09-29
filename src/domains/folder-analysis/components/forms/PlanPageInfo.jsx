import { useState } from 'react'

/**
 * What the server read from the plano page currently shown in PagesViewer, in
 * the architect's own words -- the raw JSON blob is what this replaces.
 */
export function PlanPageInfo({ value, onChange, pageIndex }) {
  const [showText, setShowText] = useState(false)
  const pages = Array.isArray(value?.pages) ? value.pages : []
  const page = pages[pageIndex]

  if (!page) {
    return <p className="text-sm text-slate-500">Esta página todavía no tiene datos leídos.</p>
  }

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
      </div>

      {page.fields?.length > 0 ? (
        <div className="flex flex-col gap-3">
          {page.fields.map((field, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {field.name}
              </span>
              <textarea
                value={field.value}
                onChange={(e) => updateField(i, e.target.value)}
                rows={Math.min(6, Math.max(2, Math.ceil((field.value?.length || 0) / 70)))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-accent-300/40"
              />
            </label>
          ))}
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

      {page.full_text && (
        <div>
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            className="text-xs font-semibold text-accent-700 hover:underline"
          >
            {showText ? 'Ocultar' : 'Ver'} todo el texto leído en esta página
          </button>
          {showText && (
            <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {page.full_text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
