import { Link } from 'react-router-dom'
import { ArrowRight, Compass, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleSwitchLinksProps {
  current: 'arenas' | 'parceiros'
  className?: string
  /** Aparência no hero escuro (Arenas / Prospecção de Parceiros) */
  tone?: 'onDark' | 'onLight'
}

export function ModuleSwitchLinks({
  current,
  className,
  tone = 'onDark',
}: ModuleSwitchLinksProps) {
  const onDark = tone === 'onDark'

  if (current === 'parceiros') {
    return (
      <Link
        to="/arenas"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
          onDark
            ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
            : 'bg-violet-50 border border-violet-200 text-violet-900 hover:bg-violet-100',
          className,
        )}
      >
        <Compass className="w-4 h-4 shrink-0" />
        Ir para Arenas
        <ArrowRight className="w-3.5 h-3.5 opacity-70" />
      </Link>
    )
  }

  return (
    <Link
      to="/parceiros"
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
        onDark
          ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
          : 'bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100',
        className,
      )}
    >
      <Wrench className="w-4 h-4 shrink-0" />
      Ir para Parceiros
      <ArrowRight className="w-3.5 h-3.5 opacity-70" />
    </Link>
  )
}
