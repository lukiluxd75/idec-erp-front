import { FolderInput } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'

import { folderAnalysisApi } from '@/domains/folder-analysis/api/folderAnalysis.api'
import { DOC_TYPE_BY_ID, IN_PROGRESS } from '@/domains/folder-analysis/utils/documentMeta'
import { Alert, Button, Input, Modal } from '@/shared/ui'

const MAX_NUMBER_LENGTH = 120

/** "2 folios · 1 plano" for what is about to be saved. */
function summary(documents) {
  const counts = {}
  for (const document of documents) counts[document.doc_type] = (counts[document.doc_type] || 0) + 1
  return Object.entries(counts)
    .map(([docType, count]) => `${count} ${(DOC_TYPE_BY_ID[docType]?.label || docType).toLowerCase()}`)
    .join(' · ')
}

export function SaveToFolderModal({ documents, folderType, folderTypeLabel, looseCaptures, onClose, onSaved }) {
  const [number, setNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const analyzing = documents.filter((document) => IN_PROGRESS.has(document.status)).length

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const folder = await folderAnalysisApi.saveBoardToFolder({
        folderNumber: number.trim(),
        folderType,
        documentIds: documents.map((document) => document.id),
      })
      onSaved(folder)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} icon={FolderInput} title="Guardar en carpeta">
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          Se guardarán <strong>{documents.length}</strong>{' '}
          {documents.length === 1 ? 'documento' : 'documentos'} ({summary(documents)}) en una carpeta
          registrada nueva
          {folderTypeLabel ? ` de tipo ${folderTypeLabel.toLowerCase()}` : ''}. El número que escriba
          será el nombre de la carpeta.
        </p>

        <Input
          id="folder-number"
          label="Número de carpeta"
          placeholder="Ej.: 1520"
          value={number}
          onChange={(event) => setNumber(event.target.value)}
          maxLength={MAX_NUMBER_LENGTH}
          required
          autoFocus
        />

        {analyzing > 0 && (
          <Alert type="info">
            {analyzing === 1 ? 'Hay 1 documento que se está' : `Hay ${analyzing} documentos que se están`}{' '}
            leyendo todavía. Se guardan igual y terminan de leerse dentro de la carpeta.
          </Alert>
        )}
        {looseCaptures > 0 && (
          <Alert type="warning">
            {looseCaptures === 1
              ? 'Queda 1 foto sin clasificar en la bandeja. No se guarda en la carpeta.'
              : `Quedan ${looseCaptures} fotos sin clasificar en la bandeja. No se guardan en la carpeta.`}
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" icon={FolderInput} loading={saving} disabled={!number.trim()}>
            Guardar en carpeta
          </Button>
        </div>
      </form>
    </Modal>
  )
}
