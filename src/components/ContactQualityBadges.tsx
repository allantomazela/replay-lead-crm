import { Mail, MapPin, MessageCircle, Globe2, ShieldCheck, ShieldAlert, Shield, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactQuality } from '@/lib/contact-validation'
import { contactQualityLabel } from '@/lib/contact-validation'
import { formatPhoneNumber } from '@/lib/format'

type ContactQualityBadgesProps = {
  quality?: ContactQuality
  whatsApp?: string
  email?: string
  website?: string
  compact?: boolean
}

const levelStyles = {
  alto: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  medio: 'bg-amber-50 text-amber-800 border-amber-200',
  baixo: 'bg-orange-50 text-orange-800 border-orange-200',
  sem_contato: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function ContactQualityBadges({
  quality,
  whatsApp,
  email,
  website,
  compact = false,
}: ContactQualityBadgesProps) {
  if (!quality) return null

  const LevelIcon =
    quality.level === 'alto' ? ShieldCheck : quality.level === 'sem_contato' ? ShieldAlert : Shield

  return (
    <div className={cn('flex flex-col gap-1.5', compact ? 'mt-1' : 'mt-1.5')}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
            levelStyles[quality.level],
          )}
          title={quality.issues.join(' | ') || contactQualityLabel(quality.level)}
        >
          <LevelIcon className="h-3 w-3" />
          {contactQualityLabel(quality.level)} · {quality.score}
        </span>

        {quality.hasValidWhatsApp && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </span>
        )}
        {quality.hasValidPhone && !quality.hasValidWhatsApp && (
          <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
            <Phone className="h-3 w-3" />
            Telefone
          </span>
        )}
        {quality.hasValidEmail && (
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            <Mail className="h-3 w-3" />
            E-mail
          </span>
        )}
        {quality.hasWebsite && (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            <Globe2 className="h-3 w-3" />
            Site
          </span>
        )}
        {quality.hasAddress && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            <MapPin className="h-3 w-3" />
            Endereço
          </span>
        )}
      </div>

      {!compact && (
        <div className="space-y-0.5 text-[11px] text-slate-500">
          {whatsApp ? <p>WhatsApp: {formatPhoneNumber(whatsApp)}</p> : null}
          {email ? <p>E-mail: {email}</p> : null}
          {website ? (
            <p className="truncate">
              Site:{' '}
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#03045e] hover:underline"
              >
                {website.replace(/^https?:\/\//, '')}
              </a>
            </p>
          ) : null}
          {quality.issues.length > 0 ? (
            <p className="text-amber-700">{quality.issues[0]}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
