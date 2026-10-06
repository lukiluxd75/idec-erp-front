import { FolderTree, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DOC_TYPES, LANE_THEME, formatDateTime } from '@/domains/folder-analysis/utils/documentMeta'
import {
  isRecentlySaved,
  normalizeSearch,
  savedDocumentHaystack,
  savedDocumentTitle,
} from '@/domains/folder-analysis/utils/savedDocuments'
import { Badge, EmptyState } from '@/shared/ui'

/**
 * Picks the saved documents that go into a carpeta, in the lanes the module works
 * with.
 *
 * A document lives in one carpeta, so the ones already filed in another are left
 * out of the list instead of sitting in it greyed out: what is offered here is
 * what can actually be filed, and a pile of untickable rows only makes the
 * document being looked for harder to find. They are counted underneath and can
 * be shown, so a document is never silently missing.
 *
 * @param {object[]} documents every saved review of the user
 * @param {string[]} selectedIds the picked ids, in filing order
 * @param {Record<string, string>} filedElsewhere document id -> name of the carpeta holding it
 */
export function SavedDocumentPicker({ documents, selectedIds, onChange, filedElsewhere = {} }) {
  const [query, setQuery] = useState('')
  const [showFiled, setShowFiled] = useState(false)
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])

  const filedCount = useMemo(
    () => documents.filter((document) => filedElsewhere[document.id]).length,
    [documents, filedElsewhere]
  )

  const byType = useMemo(() => {
    const term = normalizeSearch(query)
    const available = showFiled
      ? documents
      : documents.filter((document) => !filedElsewhere[document.id])
    const matching = term
      ? available.filter((d) => savedDocumentHaystack(d).includes(term))
      : available
    return DOC_TYPES.map((type) => ({
      type,
      rows: matching.filter((document) => document.doc_type === type.id),
    }))
  }, [documents, query, filedElsewhere, showFiled])

  // Ticking appends, so the carpeta keeps the order the architect picked things in.
  const toggle = (documentId) =>
    onChange(
      selected.has(documentId)
        ? selectedIds.filter((id) => id !== documentId)
        : [...selectedIds, documentId]
    )

  const total = byType.reduce((sum, group) => sum + group.rows.length, 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="folder-picker-search"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-accent-500/60"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            id="folder-picker-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por matrícula, nombre o datos…"
            className="min-w-0 flex-1 py-2.5 text-sm outline-none"
          />
        </label>
        <Badge variant={selectedIds.length ? 'accent' : 'neutral'}>
          {selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10">
          <EmptyState
            icon={FolderTree}
            title={
              documents.length
                ? query
                  ? 'Ningún documento coincide'
                  : 'No queda nada por archivar'
                : 'Aún no hay documentos guardados'
            }
            subtitle={
              documents.length
                ? query
                  ? 'Pruebe con otro texto.'
                  : 'Todos los documentos guardados ya están en una carpeta.'
                : 'Guarde la revisión de un folio, un impuesto o un plano y podrá archivarlo aquí.'
            }
          />
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-2xl sm:max-h-[22rem] border border-slate-200 bg-slate-50/60 p-2">
          {byType.filter(({ rows }) => rows.length > 0).map(({ type, rows }) => (
            <fieldset key={type.id} className="mb-2 last:mb-0">
              <legend className="flex w-full items-center gap-2 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <type.icon className="h-3.5 w-3.5" aria-hidden />
                {type.label}
                <span className="font-semibold normal-case tracking-normal text-slate-400">
                  ({rows.length})
                </span>
              </legend>
              <div className="grid gap-1.5">
                {rows.map((document) => {
                  const holder = filedElsewhere[document.id]
                  const isSelected = selected.has(document.id)
                  return (
                    <label
                      key={document.id}
                      className={`flex items-start gap-3 rounded-xl border-l-4 bg-white px-3 py-2.5 ring-1 transition-colors ${
                        LANE_THEME[type.id]?.workAccent || 'border-l-slate-300'
                      } ${
                        holder
                          ? 'cursor-not-allowed opacity-60 ring-slate-200'
                          : isSelected
                            ? 'cursor-pointer ring-accent-400/60'
                            : 'cursor-pointer ring-slate-200 hover:ring-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent-600"
                        checked={isSelected}
                        disabled={Boolean(holder)}
                        onChange={() => toggle(document.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                            {savedDocumentTitle(document)}
                          </span>
                          {isRecentlySaved(document) && (
                            <Badge variant="accent" className="shrink-0">Recién guardado</Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          Guardado {formatDateTime(document.reviewed_at)} ·{' '}
                          {document.id.slice(0, 8).toUpperCase()}
                        </span>
                        {holder && (
                          <span className="mt-1 block text-xs font-semibold text-state-amber">
                            Ya está en la carpeta “{holder}”
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {filedCount > 0 && (
        <p className="text-xs text-slate-500">
          {filedCount} {filedCount === 1 ? 'documento ya está' : 'documentos ya están'} en otra
          carpeta y {filedCount === 1 ? 'no se muestra' : 'no se muestran'}.{' '}
          <button
            type="button"
            onClick={() => setShowFiled((previous) => !previous)}
            className="font-semibold text-accent-700 underline-offset-2 hover:underline"
          >
            {showFiled ? 'Ocultarlos' : 'Ver dónde están'}
          </button>
        </p>
      )}
    </div>
  )
}

export default SavedDocumentPicker
