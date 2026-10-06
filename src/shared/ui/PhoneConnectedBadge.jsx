import { Smartphone } from 'lucide-react'
import { Badge } from './Badge'

export function PhoneConnectedBadge({ connected }) {
  return (
    <div className="flex items-center gap-2 normal-case">
      <Smartphone size={14} className={`shrink-0 ${connected ? 'text-state-success' : 'text-slate-400'}`} />
      <Badge variant={connected ? 'success' : 'neutral'} dot dotPulse={connected}>
        {connected ? 'Celular conectado' : 'Celular no conectado'}
      </Badge>
    </div>
  )
}

export default PhoneConnectedBadge
