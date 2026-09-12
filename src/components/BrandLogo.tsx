import { cn } from '@/lib/utils'
import replaySportsIcon from '@/assets/replay-sports-icon.png'

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'dark' | 'light'
  className?: string
}

const sizeMap = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-[4.5rem] w-[4.5rem]',
  xl: 'h-24 w-24',
}

const padMap = {
  sm: 'p-[3px]',
  md: 'p-1',
  lg: 'p-1.5',
  xl: 'p-2',
}

export function BrandLogo({ size = 'md', variant = 'dark', className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl',
        sizeMap[size],
        variant === 'dark' &&
          'bg-[#03045e] shadow-[0_10px_28px_-12px_rgba(3,4,94,0.75)] ring-1 ring-white/15',
        variant === 'light' &&
          'bg-[#03045e] shadow-[0_12px_32px_-14px_rgba(3,4,94,0.55)] ring-1 ring-[#03045e]/20',
        className,
      )}
    >
      <img
        src={replaySportsIcon}
        alt="Replay Sports"
        className={cn('h-full w-full object-contain', padMap[size])}
        draggable={false}
      />
    </div>
  )
}

type BrandMarkProps = {
  layout?: 'horizontal' | 'vertical'
  size?: 'md' | 'lg' | 'xl'
  theme?: 'dark' | 'light'
  subtitle?: string
  className?: string
}

export function BrandMark({
  layout = 'horizontal',
  size = 'md',
  theme = 'dark',
  subtitle = 'Gravação de Jogadas',
  className,
}: BrandMarkProps) {
  const logoSize = size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : 'md'
  const titleClass =
    size === 'xl'
      ? 'text-3xl'
      : size === 'lg'
        ? 'text-2xl'
        : 'text-lg'

  if (layout === 'vertical') {
    return (
      <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
        <BrandLogo size={logoSize} variant={theme === 'light' ? 'light' : 'dark'} />
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span
              className={cn(
                'font-extrabold tracking-tight',
                titleClass,
                theme === 'light' ? 'text-slate-900' : 'text-white',
              )}
            >
              ReplayLead
            </span>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]',
                theme === 'light'
                  ? 'bg-[#03045e]/10 text-[#03045e] ring-1 ring-[#03045e]/15'
                  : 'bg-white/10 text-sky-100 ring-1 ring-white/15',
              )}
            >
              CRM
            </span>
          </div>
          {subtitle ? (
            <p
              className={cn(
                'text-sm font-medium',
                theme === 'light' ? 'text-slate-500' : 'text-slate-300',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <BrandLogo size={logoSize} variant={theme === 'light' ? 'light' : 'dark'} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate font-extrabold tracking-tight',
              titleClass,
              theme === 'light' ? 'text-slate-900' : 'text-white',
            )}
          >
            ReplayLead
          </span>
          <span
            className={cn(
              'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]',
              theme === 'light'
                ? 'bg-[#03045e]/10 text-[#03045e] ring-1 ring-[#03045e]/15'
                : 'bg-white/10 text-sky-100 ring-1 ring-white/15',
            )}
          >
            CRM
          </span>
        </div>
        {subtitle ? (
          <p
            className={cn(
              'truncate text-[11px] font-medium',
              theme === 'light' ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}
