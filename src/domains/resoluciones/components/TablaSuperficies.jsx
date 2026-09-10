import { Trash2 } from 'lucide-react'

import { ENV } from '@/core/config/env.config'
import { cn } from '@/shared/utils'
import { ROLES } from '@/domains/resoluciones/utils/superficiesOcrParser'

const inputCls =
  'rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-xs outline-none transition-colors focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/30'

/**
 * Tabla editable de la "RELACION DE SUPERFICIE" reconstruida por OCR (por
 * posicion). Los <select> de rol vienen pre-seleccionados por el parser; las
 * celdas de baja confianza salen en rojo; Planta y Bloque son texto libre por
 * fila (ninguna de las dos se detecta del OCR: Planta se completa sola cuando
 * la tabla trae "PLANTA X PISO", Bloque siempre la escribe el usuario).
 */
export function TablaSuperficies({ paginas, onRoleChange, onCellChange, onPlantaChange, onBloqueChange, onDeleteRow }) {
  return (
    <div className="flex flex-col gap-8">
      {paginas.map((pagina, pageIdx) => (
        <div key={pagina.pagina}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Página {pagina.pagina}
          </p>
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="rounded-tl-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold text-slate-600">
                  Planta
                </th>
                <th className="border border-l-0 border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold text-slate-600">
                  Bloque
                </th>
                {Array.from({ length: pagina.columnCount }).map((_, colIdx) => (
                  <th key={colIdx} className="border border-l-0 border-slate-200 bg-slate-50 px-2 py-1.5">
                    <select
                      className={cn(inputCls, 'w-36')}
                      value={pagina.columnRoles[colIdx] ?? 'omitir'}
                      onChange={(e) => onRoleChange(pageIdx, colIdx, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
                <th className="rounded-tr-lg border border-l-0 border-slate-200 bg-slate-50 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {pagina.rows.map((row) => (
                <tr key={row.id}>
                  <td className="border border-t-0 border-slate-200 px-1.5 py-1">
                    <input
                      className={cn(inputCls, 'w-32')}
                      value={row.planta || ''}
                      placeholder="Planta"
                      onChange={(e) => onPlantaChange(pageIdx, row.id, e.target.value)}
                    />
                  </td>
                  <td className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1">
                    <input
                      className={cn(inputCls, 'w-24')}
                      value={row.bloque || ''}
                      placeholder="Bloque"
                      onChange={(e) => onBloqueChange(pageIdx, row.id, e.target.value)}
                    />
                  </td>
                  {row.cells.map((cell, cellIdx) => {
                    const low = cell.text && cell.confidence < ENV.OCR_CONFIDENCE_THRESHOLD
                    return (
                      <td key={cellIdx} className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1">
                        <input
                          className={cn(
                            inputCls,
                            'w-28',
                            low && 'border-state-danger/60 bg-state-danger/5 text-state-danger',
                          )}
                          value={cell.text}
                          onChange={(e) => onCellChange(pageIdx, row.id, cellIdx, e.target.value)}
                        />
                      </td>
                    )
                  })}
                  <td className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1 text-center">
                    <button
                      type="button"
                      className="text-slate-400 transition-colors hover:text-state-danger"
                      onClick={() => onDeleteRow(pageIdx, row.id)}
                      title="Quitar fila"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
