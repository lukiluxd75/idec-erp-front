import { Check, Copy, Download } from 'lucide-react'
import { useState } from 'react'

import { downloadJson } from '@/domains/folios/utils/folioData'
import { Button } from '@/shared/ui'

/** The folio as structured JSON (what gets saved), with copy / download. */
export function JsonPanel({ data, filename }) {
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(data, null, 2)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        <Button variant="secondary" size="sm" icon={Download} onClick={() => downloadJson(data, filename)}>
          Descargar JSON
        </Button>
      </div>
      <pre className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-900/95 p-4 font-mono text-xs leading-relaxed text-slate-100">
        {text}
      </pre>
    </div>
  )
}
