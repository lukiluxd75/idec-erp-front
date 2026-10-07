import { Check, Download, FolderOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Alert } from '@/shared/ui'

/**
 * El aviso de que el predio de esta carpeta ya está en otra carpeta: el mismo
 * código catastral, otro trámite, de otro momento.
 *
 * Lo que esa carpeta tiene escrito del predio --la superficie, las medidas, la
 * calle, las colindancias-- se ofrece campo por campo, y nada se copia solo: la
 * carpeta vieja puede tener un dato mal cargado, y el trámite que se está
 * haciendo ahora es el que manda. Lo de su trámite (el notario, sus poseedores,
 * la fecha de su declaración) no llega hasta acá: el servidor no lo ofrece.
 */

/** Un valor sirve si dice algo: "" y null no. */
function written(value) {
  return String(value ?? '').trim()
}

function ParcelValue({ field, sheetValue, onApply }) {
  const current = written(sheetValue)

  if (current === field.value) {
    return (
      <li className="flex items-center gap-1.5 text-slate-500">
        <Check className="h-3 w-3 shrink-0" aria-hidden />
        <span className="font-semibold">{field.label}:</span> coincide con lo que dice esta carpeta.
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-baseline gap-1.5">
      <span className="font-semibold">{field.label}:</span>
      <span>«{field.value}»</span>
      <button
        type="button"
        onClick={() => onApply(field.key, field.value)}
        title={`Copiar "${field.value}" a ${field.label} de esta carpeta`}
        className="inline-flex items-center gap-1 rounded font-semibold text-accent-700 underline-offset-2 hover:underline"
      >
        <Download className="h-3 w-3 shrink-0" aria-hidden />
        {current === '' ? 'Traer' : 'Reemplazar lo cargado'}
      </button>
      {current !== '' && <span className="text-slate-500">(acá dice «{current}»)</span>}
    </li>
  )
}

export function SameParcelNotice({ folders = [], sheet = {}, onApply }) {
  if (folders.length === 0) return null

  return (
    <Alert
      type="info"
      title={
        folders.length === 1
          ? 'Este predio ya está en otra carpeta'
          : `Este predio ya está en ${folders.length} carpetas`
      }
    >
      <p className="mt-0.5">
        Mismo código catastral ({folders[0].printed_code}), otro trámite. Lo que esas carpetas
        tienen cargado del predio se puede traer; nada se copia solo, revíselo antes de guardar.
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {folders.map((folder) => (
          <div key={folder.id} className="rounded-xl border border-accent-400/30 bg-white/70 p-2.5">
            <Link
              to={`/folder-analysis/folders/${folder.id}`}
              className="flex items-center gap-1.5 font-semibold text-accent-700 underline-offset-2 hover:underline"
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Carpeta {folder.name}
            </Link>
            <ul className="mt-1.5 flex flex-col gap-1">
              {folder.values.map((field) => (
                <ParcelValue
                  key={field.key}
                  field={field}
                  sheetValue={sheet?.[field.key]}
                  onApply={onApply}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Alert>
  )
}
