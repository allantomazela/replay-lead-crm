import { cn } from '@/lib/utils'
import replaySportsIcon from '@/assets/replay-sports-icon.png'

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
}

const padMap = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2.5',
}

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl',
        'bg-gradient-to-b from-slate-900 to-black',
        'ring-1 ring-black/10 shadow-[0_8px_20px_-8px_rgba(3,4,94,0.45)]',
        sizeMap[size],
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
