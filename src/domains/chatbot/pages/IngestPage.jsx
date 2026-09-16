import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, FileUp, Loader2, ScanLine, UploadCloud } from 'lucide-react'
import { toast } from 'react-toastify'
import { Alert, Badge, Button, Card, SectionHeader } from '@/shared/ui'
import { chatbotApi } from '@/domains/chatbot/api/chatbot.api'

export default function IngestPage() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setResult(null)
    setError(null)
    setFile(selected)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(selected.type.startsWith('image/') ? URL.createObjectURL(selected) : null)
  }

  const handleIngest = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await chatbotApi.ingestDocument(file)
      setResult(data)
      toast.success(data.message)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="animate-card-in">
      <SectionHeader
        icon={ScanLine}
        eyebrow="Asistente de Trámites"
        title="Ingesta OCR de normativa"
        subtitle="Suba una foto o escaneo de un documento normativo y el modelo lo estructura como un nuevo trámite del catálogo."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-accent-400 hover:bg-accent-50/40">
            <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
            {preview ? (
              <img src={preview} alt="Documento" className="max-h-48 rounded-lg object-contain" />
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">{file ? file.name : 'Seleccionar documento'}</p>
                <p className="text-xs text-slate-400">Imagen del documento (foto o escaneo)</p>
              </>
            )}
          </label>

          <Button onClick={handleIngest} disabled={!file} loading={loading} icon={FileUp} className="w-full">
            Ingestar trámite
          </Button>

          {loading && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Leyendo documento con OCR y estructurando con el modelo de IA…
            </p>
          )}

          {error && <Alert type="error">{error}</Alert>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Resultado</p>
          {!result ? (
            <p className="text-sm text-slate-400">Todavía no se ingestó ningún documento.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="success" dot>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Cargado en la base de datos
                </Badge>
                <Badge variant="success" dot>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Vector reindexado
                </Badge>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400">Trámite detectado</p>
                <p className="text-sm font-medium text-slate-800">{result.name}</p>
                <p className="font-mono text-xs text-slate-400">{result.code}</p>
              </div>
              {result.cost_note && (
                <div>
                  <p className="text-xs font-semibold text-slate-400">Costo</p>
                  <p className="text-sm text-slate-700">{result.cost_note}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-400">Requisitos identificados</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {result.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Circle className="mt-1 h-1.5 w-1.5 shrink-0 fill-slate-300 text-slate-300" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
