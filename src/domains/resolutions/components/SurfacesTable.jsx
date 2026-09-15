import { Trash2 } from 'lucide-react'

import { ENV } from '@/core/config/env.config'
import { cn } from '@/shared/utils'
import { ROLES } from '@/domains/resolutions/utils/surfacesOcrParser'

const inputCls =
  'rounded-lg border border-slate-200 bg-white/70 px-2 py-1 text-xs outline-none transition-colors focus:border-accent-500/60 focus:bg-white focus-visible:ring-2 focus-visible:ring-accent-400/30'

// On paper, "Planta" is one vertical label for a stretch of rows, not a
// per-row value. Count consecutive rows sharing the same value to render one
// <td rowSpan> per stretch instead of repeating it on every row.
function calcularTramosPlanta(rows) {
  const tramos = new Array(rows.length).fill(0)
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && (rows[j].planta || '') === (rows[i].planta || '')) j++
    tramos[i] = j - i
    i = j
  }
  return tramos
}

// Hide two kinds of detected columns so the on-screen table matches the photo:
//   - "Omitir" with no data in any row (ghost column from OCR jitter). If it
//     does have text (misclassified), keep showing it so the role can be fixed.
//   - "Planta (columna)" (rol `planta_col`): es el texto crudo de OCR que ya
//     se usa para completar el campo "Planta" editable de mas a la
//     izquierda (ver `plantaActual` en surfacesOcrParser.js) -- mostrarla
//     aparte solo duplica el mismo dato dos veces en la fila.
function calcularColumnasOcultas(pagina) {
  const ocultas = new Array(pagina.columnCount).fill(false)
  for (let i = 0; i < pagina.columnCount; i++) {
    if (pagina.columnRoles[i] === 'planta_col') {
      ocultas[i] = true
    } else if (pagina.columnRoles[i] === 'omitir') {
      ocultas[i] = pagina.rows.every((row) => !(row.cells[i]?.text || '').trim())
    }
  }
  return ocultas
}

/**
 * Tabla editable de la "RELACION DE SUPERFICIE" reconstruida por OCR (por
 * posicion). Los <select> de rol vienen pre-seleccionados por el parser; las
 * celdas de baja confianza salen en rojo; Planta y Bloque son texto libre por
 * fila (ninguna de las dos se detecta del OCR: Planta se completa sola cuando
 * la tabla trae "PLANTA X PISO", Bloque siempre la escribe el usuario). Si la
 * pagina trae `filaTotal` (la fila "SUPERFICIE TOTAL" del papel, ver
 * surfacesOcrParser.js), se muestra de solo lectura al final de la tabla
 * -- solo de referencia visual, nunca se manda al Excel (buildRows en
 * sheet2Excel.js no la lee).
 */
export function SurfacesTable({ paginas, onRoleChange, onCellChange, onPlantaChange, onBloqueChange, onDeleteRow }) {
  return (
    <div className="flex flex-col gap-8">
      {paginas.map((pagina, pageIdx) => {
        const tramosPlanta = calcularTramosPlanta(pagina.rows)
        const columnasOcultas = calcularColumnasOcultas(pagina)
        // "Bloque" nunca lo detecta el OCR (siempre lo escribe el usuario a
        // mano) -- se oculta mientras ninguna fila de esta pagina tenga un
        // valor cargado, igual que las demas columnas sin dato.
        const bloqueOculto = pagina.rows.every((row) => !(row.bloque || '').trim())
        return (
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
                  {!bloqueOculto && (
                    <th className="border border-l-0 border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-xs font-semibold text-slate-600">
                      Bloque
                    </th>
                  )}
                  {Array.from({ length: pagina.columnCount }).map(
                    (_, colIdx) =>
                      !columnasOcultas[colIdx] && (
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
                      ),
                  )}
                  <th className="rounded-tr-lg border border-l-0 border-slate-200 bg-slate-50 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {pagina.rows.map((row, rowIdx) => (
                  <tr key={row.id}>
                    {tramosPlanta[rowIdx] > 0 && (
                      <td
                        rowSpan={tramosPlanta[rowIdx]}
                        className="border border-t-0 border-slate-200 px-1.5 py-1 align-top"
                      >
                        <input
                          className={cn(inputCls, 'w-32')}
                          value={row.planta || ''}
                          placeholder="Planta"
                          onChange={(e) => onPlantaChange(pageIdx, row.id, e.target.value)}
                        />
                      </td>
                    )}
                    {!bloqueOculto && (
                      <td className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1">
                        <input
                          className={cn(inputCls, 'w-24')}
                          value={row.bloque || ''}
                          placeholder="Bloque"
                          onChange={(e) => onBloqueChange(pageIdx, row.id, e.target.value)}
                        />
                      </td>
                    )}
                    {row.cells.map((cell, cellIdx) => {
                      if (columnasOcultas[cellIdx]) return null
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
                {pagina.filaTotal && (
                  <tr className="bg-slate-50/80 font-semibold text-slate-600">
                    <td className="border border-t-0 border-slate-200 px-1.5 py-1.5">TOTAL</td>
                    {!bloqueOculto && <td className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1.5" />}
                    {pagina.filaTotal.cells.map(
                      (cell, cellIdx) =>
                        !columnasOcultas[cellIdx] && (
                          <td
                            key={cellIdx}
                            className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1.5"
                          >
                            {cell.text}
                          </td>
                        ),
                    )}
                    <td className="border border-l-0 border-t-0 border-slate-200 px-1.5 py-1.5" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
