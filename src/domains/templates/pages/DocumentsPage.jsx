import { Download, FileOutput } from 'lucide-react'
import { Button, Card, SectionHeader } from '@/shared/ui'

export default function DocumentsPage() {
  return <Card className="animate-card-in"><SectionHeader icon={FileOutput} eyebrow="Plantillas dinámicas" title="Generación de documentos" subtitle="Seleccione una plantilla y complete sus variables para generar la versión final." /><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-7 text-center"><FileOutput className="mx-auto h-8 w-8 text-accent-600" /><h3 className="mt-3 font-bold text-slate-800">Documento desde plantilla</h3><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">La descarga DOCX estará disponible al conectar el servicio de generación ya existente, sin crear ni alterar tablas desde IDEC.</p><Button className="mt-5" icon={Download} disabled>Generar documento</Button></div></Card>
}
