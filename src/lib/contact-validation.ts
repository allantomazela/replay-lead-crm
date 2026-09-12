import { cleanPhoneNumber } from '@/lib/format'

export type ContactChannel = 'whatsapp' | 'email' | 'website' | 'address' | 'phone'

export type ContactQualityLevel = 'alto' | 'medio' | 'baixo' | 'sem_contato'

export interface ContactQuality {
  score: number
  level: ContactQualityLevel
  hasWhatsApp: boolean
  hasValidWhatsApp: boolean
  hasPhone: boolean
  hasValidPhone: boolean
  hasEmail: boolean
  hasValidEmail: boolean
  hasWebsite: boolean
  hasAddress: boolean
  issues: string[]
  readyToContact: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

export function splitRawContactValues(raw?: string | null): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[;,|/]/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function normalizeEmail(email?: string | null): string {
  if (!email) return ''
  return email.trim().toLowerCase()
}

export function isValidEmail(email?: string | null): boolean {
  const value = normalizeEmail(email)
  return Boolean(value) && EMAIL_RE.test(value)
}

/** Celular BR típico para WhatsApp: 55 + DDD + 9 + 8 dígitos (13 no total). */
export function isValidBrazilianWhatsApp(digits?: string | null): boolean {
  if (!digits) return false
  const clean = digits.replace(/\D/g, '')
  // 55 + DDD(2) + 9xxxxxxxx => 13 dígitos, com nono dígito = 9
  return clean.startsWith('55') && clean.length === 13 && clean[4] === '9'
}

export function isValidBrazilianPhone(digits?: string | null): boolean {
  if (!digits) return false
  const clean = digits.replace(/\D/g, '')
  if (!clean.startsWith('55')) {
    return clean.length === 10 || clean.length === 11
  }
  return clean.length === 12 || clean.length === 13
}

export function pickBestWhatsApp(rawCandidates: Array<string | undefined | null>): string {
  const normalized: string[] = []
  for (const raw of rawCandidates) {
    for (const part of splitRawContactValues(raw)) {
      const digits = cleanPhoneNumber(part)
      if (digits) normalized.push(digits)
    }
  }

  const unique = Array.from(new Set(normalized))
  const mobiles = unique.filter(isValidBrazilianWhatsApp)
  if (mobiles.length > 0) return mobiles[0]

  const phones = unique.filter(isValidBrazilianPhone)
  if (phones.length > 0) return phones[0]

  return unique[0] || ''
}

export function pickBestEmail(rawCandidates: Array<string | undefined | null>): string {
  for (const raw of rawCandidates) {
    for (const part of splitRawContactValues(raw)) {
      const email = normalizeEmail(part)
      if (isValidEmail(email)) return email
    }
  }
  return ''
}

export function normalizeWebsite(raw?: string | null): string {
  if (!raw?.trim()) return ''
  const value = raw.trim()
  if (/^https?:\/\//i.test(value)) return value
  if (value.includes('.') && !value.includes(' ')) return `https://${value}`
  return ''
}

export function assessContactQuality(input: {
  whatsApp?: string | null
  email?: string | null
  website?: string | null
  endereco?: string | null
}): ContactQuality {
  const whatsApp = (input.whatsApp || '').replace(/\D/g, '')
  const email = normalizeEmail(input.email)
  const website = normalizeWebsite(input.website)
  const endereco = (input.endereco || '').trim()
  const hasAddress =
    Boolean(endereco) &&
    !endereco.toLowerCase().includes('não informado') &&
    !endereco.toLowerCase().includes('nao informado')

  const hasWhatsApp = Boolean(whatsApp)
  const hasValidWhatsApp = isValidBrazilianWhatsApp(whatsApp)
  const hasValidPhone = isValidBrazilianPhone(whatsApp)
  const hasPhone = hasWhatsApp
  const hasEmail = Boolean(email)
  const hasValidEmail = isValidEmail(email)
  const hasWebsite = Boolean(website)

  const issues: string[] = []
  if (hasWhatsApp && !hasValidWhatsApp && !hasValidPhone) {
    issues.push('Telefone/WhatsApp com formato duvidoso para contato BR')
  } else if (hasValidPhone && !hasValidWhatsApp) {
    issues.push('Telefone parece fixo (melhor para ligação do que WhatsApp)')
  }
  if (hasEmail && !hasValidEmail) {
    issues.push('E-mail em formato inválido')
  }
  if (!hasValidWhatsApp && !hasValidEmail && !hasValidPhone) {
    issues.push('Sem canal direto (WhatsApp, telefone ou e-mail)')
  }
  if (!hasAddress) {
    issues.push('Endereço ausente ou genérico')
  }

  let score = 0
  if (hasValidWhatsApp) score += 45
  else if (hasValidPhone) score += 25
  else if (hasWhatsApp) score += 10
  if (hasValidEmail) score += 30
  else if (hasEmail) score += 10
  if (hasWebsite) score += 15
  if (hasAddress) score += 10

  let level: ContactQualityLevel = 'sem_contato'
  if (score >= 70) level = 'alto'
  else if (score >= 40) level = 'medio'
  else if (score > 0) level = 'baixo'

  return {
    score,
    level,
    hasWhatsApp,
    hasValidWhatsApp,
    hasPhone,
    hasValidPhone,
    hasEmail,
    hasValidEmail,
    hasWebsite,
    hasAddress,
    issues,
    readyToContact: hasValidWhatsApp || hasValidEmail || hasValidPhone,
  }
}

export function contactQualityLabel(level: ContactQualityLevel): string {
  switch (level) {
    case 'alto':
      return 'Contato confiável'
    case 'medio':
      return 'Contato parcial'
    case 'baixo':
      return 'Contato fraco'
    default:
      return 'Sem contato'
  }
}

export function summarizeContactQuality(items: ContactQuality[]) {
  const total = items.length
  const ready = items.filter((i) => i.readyToContact).length
  const high = items.filter((i) => i.level === 'alto').length
  const medium = items.filter((i) => i.level === 'medio').length
  const low = items.filter((i) => i.level === 'baixo').length
  const none = items.filter((i) => i.level === 'sem_contato').length
  return { total, ready, high, medium, low, none }
}
