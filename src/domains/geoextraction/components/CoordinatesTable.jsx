import { Download, MapPin, Save, Trash2, XCircle, ArrowLeftRight, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button, IconButton, EmptyState } from '@/shared/ui'
import { cn } from '@/shared/utils'
import { ENV } from '@/core/config/env.config'

function getInputClass(confidence, text) {
  if (!text) return 'bg-transparent border-slate-200'
  return confidence < ENV.OCR_CONFIDENCE_THRESHOLD
    ? 'bg-state-danger/10 border-state-danger/50 text-state-danger font-bold'
    : 'bg-state-success/10 border-state-success/30 text-slate-800'
}

export function CoordinatesTable({
  results,
  columnTypes,
  onColumnTypeChange,
  onDeleteColumn,
  onEdit,
  onDeleteRow,
  onAddRow,
  onAddColumn,
  onInvertColumns,
  newRowIds,
  loading,
  onExportExcel,
  onExportShapefile,
  onAddToLayer,
}) {
  return (
    <div className="liquid-glass-panel flex min-h-[550px] flex-1 flex-col overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/40 bg-white/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>Edición de Datos</span>
          <div className="flex flex-wrap gap-3 border-l border-slate-200 pl-4 font-bold lowercase text-accent-600">
            <button onClick={onAddRow} className="hover:underline">+ Fila</button>
            <button onClick={onAddColumn} className="hover:underline">+ Columna</button>
            <button onClick={onInvertColumns} className="flex items-center gap-1 hover:underline">
              <ArrowLeftRight size={12} /> Invertir
            </button>
          </div>
        </div>
        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={Download} onClick={onExportExcel}>Excel</Button>
            <Button size="sm" variant="secondary" icon={MapPin} onClick={onExportShapefile}>SHP</Button>
            <Button size="sm" variant="primary" icon={Save} onClick={onAddToLayer}>Añadir a capa</Button>
          </div>
        )}
      </div>

      <div className="relative flex-1 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/25 backdrop-blur-md">
            <Loader2 className="mb-3 animate-spin text-accent-600" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Digitalizando...</p>
          </div>
        )}
        {results.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/25 text-left text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {[...Array(results[0].items.length)].map((_, i) => (
                  <th key={i} className="min-w-[140px] border-b border-slate-100 p-3">
                    <div className="flex flex-col gap-2">
                      <select
                        value={columnTypes[i] || 'none'}
                        onChange={(e) => onColumnTypeChange(i, e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-1 py-1 text-[9px] font-bold text-slate-600 outline-none"
                      >
                        <option value="none">OMITIR</option>
                        <option value="x">ESTE (X)</option>
                        <option value="y">NORTE (Y)</option>
                      </select>
                      <div className="flex items-center justify-between text-[8px] font-black opacity-60">
                        <span>COL {i + 1}</span>
                        <IconButton icon={Trash2} size={12} tone="danger" className="p-0" onClick={() => onDeleteColumn(i)} title="Eliminar Columna" />
                      </div>
                    </div>
                  </th>
                ))}
                <th className="w-10 border-b border-slate-100 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((row) => (
                <tr key={row.id} className={cn('transition-all duration-300 hover:bg-white/20', newRowIds.includes(row.id) && 'animate-slide-down bg-state-success/10')}>
                  {row.items.map((cell) => (
                    <td key={cell.id} className="p-1 align-top">
                      <div className="flex flex-col gap-0.5">
                        <input
                          type="text"
                          value={cell.text}
                          onChange={(e) => onEdit(row.id, cell.id, e.target.value)}
                          className={cn('w-full rounded border p-2 font-mono text-xs outline-none transition-all focus:ring-1', getInputClass(cell.confidence, cell.text))}
                        />
                        {cell.text && (
                          <span className={cn('px-1 text-[8px] font-bold', cell.confidence < ENV.OCR_CONFIDENCE_THRESHOLD ? 'text-state-danger' : 'text-state-success')}>
                            {cell.confidence.toFixed(4)}%
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <IconButton icon={XCircle} size={18} tone="danger" className="p-1" onClick={() => onDeleteRow(row.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full items-center justify-center py-40">
            <EmptyState icon={FileSpreadsheet} iconSize={64} tone="muted" title="Extracción Pendiente" />
          </div>
        )}
      </div>
    </div>
  )
}

export default CoordinatesTable
